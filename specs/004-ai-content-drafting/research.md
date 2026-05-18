# Research: AI Content Drafting

**Feature**: 004-ai-content-drafting  
**Date**: 2026-05-18  
**Status**: Complete

---

## R-001: Markdown-to-Lexical JSON Conversion

**Context**: FR-003 requires the Content Authoring Service to stream standard Markdown, which must then be converted to Payload CMS Lexical JSON.

> **⚠️ Spec Amendment**: FR-003 originally mandated "client-side" conversion. This was formally amended to "server-side API route" conversion because client-side Lexical conversion requires shipping the full Payload editor config (including custom server-only node types) to the browser, which is impractical and fragile. See spec.md clarification session 2026-05-18.

**Decision**: Use `@payloadcms/richtext-lexical`'s `$convertFromMarkdownString` with a headless Lexical editor instance on the **CMS Engine server side** (Next.js API route), not in the browser.

**Rationale**:
- Payload 3.x ships `convertMarkdownToLexical` and `$convertFromMarkdownString` utilities in `@payloadcms/richtext-lexical`.
- Using a headless editor on the server (Next.js API route) ensures correct node resolution using the full Payload editor config, including custom blocks.
- Conversion on each SSE chunk is impractical; instead, buffer the full Markdown for the Body field, then convert once on save/auto-save.
- The streaming UI renders raw Markdown in a preview component; the final Lexical JSON is produced only when persisting to `DraftingSession`.

**Alternatives Considered**:
- **Client-side browser conversion**: Rejected — requires shipping the full Lexical editor config to the browser and doesn't support custom server-only node types. *(This was the original spec mandate; amended after architectural analysis.)*
- **AI outputs Lexical JSON directly**: Rejected — Lexical JSON is deeply nested and fragile; LLMs produce far better Markdown. The spec explicitly mandates Markdown streaming.

---

## R-002: SSE Streaming Architecture (FastAPI → Next.js → Browser)

**Context**: FR-003 requires real-time field population via Server-Sent Events. FR-004 requires a global "Pause" control.

**Decision**: Two-hop SSE relay architecture:
1. **Content Authoring Service** (FastAPI `StreamingResponse`) → SSE stream with typed events.
2. **CMS Engine** (Next.js API route) → Proxies the SSE stream to the browser, adding CMS-level auth and tenant scoping.
3. **Browser** → Consumes via `fetch()` with `ReadableStream` reader (not `EventSource`, since POST bodies are needed).

**Rationale**:
- FastAPI's `StreamingResponse` with `media_type="text/event-stream"` is battle-tested.
- The CMS Engine proxy route adds Payload session auth validation and tenant-scoping before forwarding.
- `fetch()` + `ReadableStream` is preferred over `EventSource` because the browser needs to send POST bodies (prompt, schema context, session ID).
- Disable buffering headers: `Cache-Control: no-cache`, `X-Accel-Buffering: no`.

**Event Schema**:
```
event: TEXT_DELTA       → Incremental text for a specific field
event: FIELD_START      → A field is beginning generation (includes field name + type)
event: FIELD_COMPLETE   → A field is fully generated (includes field name + value)
event: SCHEMA_UPDATED   → Schema was created/modified via tool call (includes new schema)
event: STATUS_UPDATE    → Session status change (generating, paused, completed, failed)
event: IMAGE_READY      → Image generation complete (includes media reference)
event: TOKEN_USAGE      → Token consumption for audit logging
event: ERROR            → Error details
```

**Pause/Resume Architecture (FR-004)**:
- **Pause**: The client aborts the `fetch()` request via `AbortController.abort()`. The CMS proxy detects the closed connection and drops its upstream fetch to the AI service. The FastAPI generator detects the disconnect and stops LLM streaming.
- **On Pause**: The client saves whatever partial Markdown has been received so far into the `DraftingSession` via the auto-save PATCH. The UI shows the partial content with a "Paused — Resume" indicator.
- **Resume**: The client sends a **new** `/api/ai/draft` request with the partial text injected into `session_context` as an `AssistantMessage`. The system prompt instructs the LLM: _"The previous generation was interrupted. Continue generating content from EXACTLY where the following partial output left off. Do not repeat or summarize what was already generated."_
- **State Tracking**: The React `DraftingState.isPaused` flag controls the UI toggle. No server-side pause state is needed — the architecture is stateless between requests.

**Alternatives Considered**:
- **WebSockets**: Rejected — overkill for unidirectional streaming; adds connection management complexity.
- **Direct browser-to-AI-service**: Rejected — bypasses tenant auth and violates the hybrid architecture principle.
- **Server-side pause (holding connection open)**: Rejected — SSE is unidirectional; you cannot send a "pause" signal over the same stream. Aborting + resuming is the only viable pattern.

---

## R-003: LangChain Tool Calling for Image Generation

**Context**: FR-008 requires AI-driven image generation orchestrated via LangChain tool calls.

**Decision**: Define a `generate_image` LangChain tool in the Content Authoring Service. The tool calls an image generation provider (e.g., DALL-E, Stability AI) via LangChain's tool calling protocol, returns a temporary URL, and emits an SSE event. The CMS Engine then proactively downloads the image and persists it to the Payload Media collection.

**Rationale**:
- LangChain's `@tool` decorator with Pydantic input schemas provides structured, validated tool invocations.
- The LLM decides when image generation is contextually appropriate (e.g., "Main Media" field).
- Provider-agnostic: `init_chat_model` + tool binding works across OpenAI, Anthropic, Google models.
- CMS Engine downloads to Media collection for permanent local reference (no external URL dependency).

**Implementation**:
```python
@tool
async def generate_image(prompt: str, aspect_ratio: str = "16:9") -> dict:
    """Generate an image for a content field. Use when the content requires visual media."""
    # Call image provider via LangChain
    # Return { "url": "https://...", "alt_text": "..." }
```

**Image Download Strategy (CMS Engine)**:
- The CMS Engine MUST use a **streaming pipeline** (`fetch` piped directly to Payload's Media creation API) rather than buffering the full image binary in Node.js process memory.
- This prevents out-of-memory (OOM) errors under load when multiple users generate images concurrently.
- Implementation: Use Node.js `Readable.fromWeb(response.body)` to pipe the fetch response stream directly into Payload's `create()` call with a file stream.

**Alternatives Considered**:
- **Direct API calls without tool framework**: Rejected — loses the LLM's ability to decide contextually when to generate images.
- **Client-side image generation**: Rejected — violates the server-side orchestration architecture.
- **Buffer-then-upload**: Rejected — risks OOM under concurrent load; streaming pipeline is safer.

---

## R-004: DraftingSession Locking & Lifecycle

**Context**: FR-011 requires single-user locking per schema; FR-015 requires 24-hour recovery window.

**Decision**: Implement as a Payload CMS collection (`drafting-sessions`) with **database-level unique constraint** + Payload hooks for lock management.

**Implementation**:
- **Lock acquisition (two layers)**:
  1. **Database-level unique constraint**: A **partial unique index** on `(tenant, contentType)` WHERE `status = 'active'`. This is the authoritative lock — if two users race to create a session within milliseconds, the DB rejects the second insert with a uniqueness violation, which Payload catches and returns as a 409.
  2. **`beforeChange` hook (advisory)**: A softer check that queries for existing active sessions and returns a user-friendly 409 error message before hitting the DB constraint. This provides a better UX error message but is NOT the sole lock mechanism.
- **Lock release**: Three mechanisms:
  1. **Proactive release**: CMS Engine exposes `DELETE /api/drafting-sessions/:id/lock` endpoint, called on `beforeunload` and explicit navigation.
  2. **Inactivity timeout**: Background cron job (or Payload scheduled task) queries sessions where `lastActivityAt < now() - 10min` and `status = 'active'` → sets status to `expired`.
  3. **Cleanup purge**: Separate job deletes sessions where `status = 'expired'` and `updatedAt < now() - 24h`.

**State Machine**:
```
[active] --save/publish--> [promoted] --> DELETE
[active] --10min idle----> [expired]
[active] --explicit exit-> [released] --> DELETE
[expired] --recover------> [active]
[expired] --24h----------> DELETE (purged)
```

**Rationale**:
- The DB-level constraint eliminates race conditions entirely — a `beforeChange` hook alone is subject to TOCTOU (time-of-check-time-of-use) races under concurrent requests.
- Storing in Payload CMS (not the AI service) keeps session state co-located with the content data and benefits from Payload's built-in multi-tenant ACLs.
- The spec explicitly mandates Payload CMS collection for `DraftingSession`.

**Alternatives Considered**:
- **Hook-only locking (no DB constraint)**: Rejected — vulnerable to race conditions when two users click "Start Session" within milliseconds of each other.
- **Redis-based distributed locks**: Rejected — adds infrastructure complexity; Postgres partial unique index is sufficient and already in the stack.
- **AI service owns session state**: Rejected — spec mandates CMS Engine Postgres (port 5432).

---

## R-005: Rate Limiting Strategy

**Context**: FR-014 requires 10 AI requests/minute/user with HTTP 429 responses. Target platform is Kubernetes/Docker (multi-pod).

**Decision**: Application-level rate limiting in the CMS Engine's proxy API route using a **Postgres-backed sliding window** counter.

**Implementation**:
- New Payload CMS collection `ai-rate-limits` (or raw SQL table via Payload's `db.drizzle`) with columns: `userId`, `requestTimestamp`.
- On each AI request, the proxy route:
  1. `COUNT(*)` rows for the user where `requestTimestamp > NOW() - INTERVAL '60 seconds'`.
  2. If `count >= 10` → return HTTP 429 with `Retry-After` header.
  3. Otherwise, `INSERT` a new row and forward the request.
- A periodic cleanup job (`DELETE WHERE requestTimestamp < NOW() - INTERVAL '5 minutes'`) prevents table bloat.
- The Postgres query uses an index on `(userId, requestTimestamp)` for O(log n) lookups.

**Rationale**:
- Rate limiting at the CMS proxy layer (not the AI service) prevents unauthorized requests from reaching the AI service at all.
- **Postgres-backed** (not in-memory) is required because the Technical Context specifies Kubernetes as the target platform. An in-memory `Map` would give users `10 × N` requests across N pods, completely defeating the rate limit.
- Postgres is already in the stack (port 5432) — no new infrastructure dependency needed.

**Alternatives Considered**:
- **In-memory Map**: Rejected — breaks under multi-pod K8s deployment; users get 10 req/pod instead of 10 req/total.
- **Redis**: Rejected for MVP — Redis is not in the current `docker-compose.yml` stack (only Postgres/Kafka/Zookeeper). Can be added later for sub-millisecond rate checks at scale.
- **AI service rate limiting**: Rejected — the CMS Engine is the auth boundary; rate limiting should happen before forwarding.
- **Nginx rate limiting**: Rejected — lacks per-user granularity tied to Payload session auth.

---

## R-006: Auto-Save Strategy for DraftingSession

**Context**: Clarification mandates "immediate field-level auto-saving" to the DraftingSession collection.

**Decision**: Debounced client-side auto-save (500ms after last change) via Payload's REST API (`PATCH /api/drafting-sessions/:id`).

**Implementation**:
- Each field update in the React editor triggers a debounced PATCH request.
- The PATCH payload includes only the changed field(s) in `draftData`.
- A `beforeChange` hook on `DraftingSession` updates the `updatedAt` timestamp (keeps the lock fresh).
- Version snapshots are created explicitly (not on every auto-save) when the user triggers a "Save Version" or when significant AI generation completes.

**Rationale**:
- Debouncing prevents excessive API calls during rapid editing.
- PATCH (partial update) minimizes payload size.
- `updatedAt` refresh on each save prevents the 10-minute inactivity timeout from triggering during active editing.

**Pause Recovery Auto-Save**: When the user triggers "Pause" (FR-004), the auto-save mechanism immediately persists the partially-streamed Markdown into `draftData`. This ensures the partial content is available for the resume request's `session_context`.

---

## R-007: Version Snapshot Strategy

**Context**: FR-009 requires up to 10 snapshot versions inside the DraftingSession.

**Decision**: Store snapshots as a JSON array field (`versions`) on the `DraftingSession` document. Each snapshot captures the full `draftData` state at a point in time.

**Implementation**:
- `versions` field: Payload `json` field, default `[]`.
- Snapshot creation: Triggered after each complete AI generation cycle or user-initiated "Save Version".
- Cap enforcement: `beforeChange` hook trims to the last 10 entries (FIFO).
- Rollback: Client sends a PATCH with the selected snapshot's `draftData`, which replaces the current `draftData`.

**Rationale**:
- Embedding snapshots in the same document avoids a separate collection and simplifies the atomic delete on promotion (FR-010).
- 10 snapshots × ~50KB average ≈ 500KB per session — well within Postgres JSONB limits.
- **Performance**: The `versions` field can bloat row sizes significantly with verbose Lexical JSON. To prevent this from degrading lock-check queries and list views, the Payload collection config MUST set `admin.hidden: true` on the `versions` field and configure it to be excluded from list/find queries (only fetched on explicit document-by-ID requests).

---

## R-013: Atomic Promotion Transaction Safety (FR-010)

**Context**: FR-010 mandates that the promotion of a Draft to a ContentItem and the deletion of the DraftingSession be atomic. If either operation fails, neither should persist.

**Decision**: The `promote` API route (`apps/content-management-engine/src/app/api/drafting-sessions/[id]/promote/route.ts`) MUST use Payload's database transaction API to wrap both operations in a single Postgres transaction.

**Implementation**:
```typescript
// In promote/route.ts
const req = { transactionID: await payload.db.beginTransaction() };

try {
  // 1. Create the ContentItem
  const contentItem = await payload.create({
    collection: 'content-items',
    data: { /* mapped from draftData */ },
    req, // passes transactionID
  });

  // 2. Delete the DraftingSession
  await payload.delete({
    collection: 'drafting-sessions',
    id: sessionId,
    req, // same transactionID
  });

  // 3. Commit only if both succeed
  await payload.db.commitTransaction(req.transactionID);
  
  return Response.json({ contentItem, sessionDeleted: true });
} catch (error) {
  // Rollback: neither operation persists
  await payload.db.rollbackTransaction(req.transactionID);
  throw error;
}
```

**Rationale**:
- Without a transaction, if `payload.create()` succeeds but `payload.delete()` fails (e.g., DB connection drop, process crash), a "ghost" DraftingSession remains that references published content — violating FR-010's atomicity guarantee.
- Payload 3.x exposes `payload.db.beginTransaction()`, `commitTransaction()`, and `rollbackTransaction()` which map directly to Postgres `BEGIN`/`COMMIT`/`ROLLBACK`.
- The `req.transactionID` pattern is Payload's standard mechanism for passing a transaction context through its Local API.

## R-008: StyleModifier Collection Design

**Context**: FR-006 requires tenant-scoped style/tone modifiers.

**Decision**: New Payload CMS collection `style-modifiers` with multi-tenant plugin scoping.

**Fields**:
- `name` (text, required, unique per tenant) — e.g., "Academic", "Punchy"
- `description` (text) — UI display description
- `systemPrompt` (textarea, required) — The actual system prompt instructions injected into AI requests
- `isDefault` (checkbox) — Whether this is the tenant's default tone

**Rationale**:
- Tenant-scoped via the multi-tenant plugin ensures isolation.
- `systemPrompt` is injected verbatim into the LLM context, giving tenant admins full control over tone.

---

## R-009: AIAuditLog Collection Design

**Context**: FR-012 requires logging every AI request with token counts and costs.

**Decision**: Extend the existing `AuditLogs` collection or create a dedicated `ai-audit-logs` collection.

**Decision**: Create a new dedicated `ai-audit-logs` collection (separate from general `AuditLogs`) for better query performance and schema clarity.

**Fields**:
- `tenant` (relationship to Tenants)
- `user` (relationship to Users)
- `sessionId` (text) — DraftingSession reference
- `requestType` (select: 'draft', 'refine', 'image-generate', 'schema-create')
- `model` (text) — LLM model identifier used
- `provider` (text) — Provider name (openai, anthropic, etc.)
- `promptTokens` (number)
- `completionTokens` (number)
- `totalTokens` (number)
- `estimatedCost` (number) — In USD microcents
- `durationMs` (number) — Request duration
- `createdAt` (date, auto)

**Rationale**:
- Separate collection from general AuditLogs prevents query bloat and allows AI-specific indexing.
- Token count and cost fields enable future billing and usage dashboards.

---

## R-010: Content Drafting Bounded Context in AI Service

**Context**: The AI service currently has a single bounded context (`ai_agent_session`) for schema generation. Content drafting requires a new bounded context.

**Decision**: Create a new `content_drafting` bounded context in the Content Authoring Service under `src/domain/content_drafting/`.

**Structure**:
```
src/domain/content_drafting/
├── __init__.py
├── models.py          # DraftingRequest, DraftField, ContentDraft value objects
└── prompts.py         # System prompts for content drafting

src/application/
├── drafting_service.py  # Orchestrates content generation with LangChain tools

src/infrastructure/
└── tools/
    ├── __init__.py
    ├── image_generator.py   # LangChain tool for image generation
    └── schema_resolver.py   # LangChain tool for schema lookup/creation
```

**Rationale**:
- Strict DDD (Constitution Principle VI) requires separate bounded contexts for distinct business capabilities.
- Content drafting has different aggregates (DraftField, ContentDraft) than schema generation (AIAgentSession).
- The application layer (`drafting_service.py`) orchestrates the LangChain agent with tool bindings.

---

## R-011: Locale Awareness (FR-018)

**Context**: FR-018 mandates that the AI co-creation session is strictly scoped to the active editor locale. All AI generation and refinement must match the user's selected locale.

**Decision**: Locale is a first-class parameter throughout the entire request chain: UI → CMS proxy → AI Service → LLM system prompt.

**Implementation**:
- **CMS Engine**: The `DraftingSession` captures `activeLocale` when initiated. The proxy API routes (`/api/ai/draft`, `/api/ai/refine`) pass this locale to the Content Authoring Service in every request.
- **AI Service**: The `content_drafting` domain injects a strict locale instruction into the system prompt:
  ```
  CRITICAL: You MUST generate ALL content strictly in the following language/locale: {locale}.
  Do not translate, mix languages, or default to English unless the locale is 'en'.
  ```
- **Refinements**: The refine endpoint also receives the locale and injects the same locale constraint.
- **Payload Lexical**: When converting Markdown to Lexical JSON on save, the `activeLocale` is passed to Payload's `update()` call to ensure the correct locale field is written.

**Rationale**:
- Without explicit locale injection, LLMs default to English or hallucinate languages, and Payload's Lexical JSON would overwrite the wrong locale data on save.
- The locale must be passed at every layer — not just stored in the session — because stateless refinements (`/api/ai/refine`) don't have session context.

---

## R-012: API Route Placement (Next.js App Router Guardrail)

**Context**: The project's GEMINI.md guardrails warn that Payload 3.x uses a catch-all route at `app/(payload)/api/[...slug]/route.ts` for its internal REST API.

**Decision**: All custom AI proxy and session management routes MUST be placed **outside** the `(payload)` route group, under `app/api/` (standard Next.js API directory).

**Implementation**:
```
src/app/api/                       # Standard Next.js API routes (outside Payload group)
├── ai/
│   ├── draft/route.ts             # SSE proxy to AI service
│   ├── refine/route.ts            # Refinement proxy
│   └── download-image/route.ts    # Image download + Media persist
└── drafting-sessions/
    └── [id]/
        ├── lock/route.ts          # Lock release endpoint
        └── promote/route.ts       # Draft → ContentItem promotion
```

**Rationale**:
- Placing custom routes inside `app/(payload)/api/...` conflicts with Payload's `[...slug]` catch-all route in Next.js 15+, causing unpredictable routing conflicts and module resolution errors.
- The standard `app/api/` directory is the correct Next.js convention for custom API routes that are not managed by Payload.
- These routes still have access to Payload's API via `getPayload()` for auth validation and collection operations.

# Feature Specification: AI Content Drafting

**Feature Branch**: `004-ai-content-drafting`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "Content Drafting with AI based on mockup"

## Clarifications

### Session 2026-05-18

- Q: How should the system handle the transition from an AI drafting workspace to a persisted CMS entry? → A: Drafts exist only in a temporary `DraftingSession` state until the user clicks "Save" or "Publish".
- Q: What are the acceptable latency targets for granular, field-level AI refinements? → A: Granular refinements (e.g., Title generation, paragraph simplification) must return the first token within 2 seconds.
- Q: How should the system handle concurrent AI drafting sessions? → A: Single-User Lock: Only one user can have an active drafting session for a specific schema at a time.
- Q: In which database and service layer should the temporary `DraftingSession` and its state be persisted? → A: Persistent Payload CMS Collection in the Content Management Engine (Postgres 5432) utilizing logical tenant-scoped ACLs.
- Q: What should be the concrete timeout duration for releasing the single-user lock on an inactive `DraftingSession`? → A: 10 minutes of inactivity.
- Q: How should progress in a `DraftingSession` be auto-saved to support recovery from network interruptions? → A: Immediate field-level auto-saving: Persist field updates to the `DraftingSession` collection immediately as each field completes generation or is edited.
- Q: How should AI-driven image generation for the `Main Media` field (`FR-008`) be orchestrated and integrated? → A: LangChain Tool Orchestration: Delegated to LangChain image generation tools configured within the `content-authoring-service`, triggered via agent tool calls.
- Q: How should we handle the relationship between schema creation and content drafting in a session? → A: Unified Inline Co-Creation: The conversational agent in `content-authoring-service` can dynamically create/modify Content Type schemas inline via tool calls and immediately draft content inside the same workspace, maintaining a seamless user experience.
- Q: How should the draft version tracking (FR-009) be persisted and capped to prevent bloating the database? → A: Snapshot-based collection: Saved as an array of snapshot states inside the DraftingSession, capped at the last 10 versions.
- Q: What functional features should be explicitly declared out of scope for this initial AI Content Drafting MVP? → A: Real-time multi-user concurrent editing (Google Docs style) and side-by-side multi-model comparison workspaces are out of scope.
- Q: Which streaming protocol should be used to deliver real-time AI suggestions from the Content Authoring Service to the Content Management Engine, and ultimately to the frontend editor? → A: Server-Sent Events (SSE) standard HTTP unidirectional streaming.
- Q: How should the system store and reference AI-generated images for the 'Main Media' field (FR-008)? → A: Proactive CMS Download: The CMS Engine downloads the generated image and persists it to the Payload Media collection, returning a permanent local CMS media reference.
- Q: How should the system monitor, log, and attribute AI token usage and costs for multi-tenant isolation and billing purposes? → A: Active Logging & Attribution: Log all AI requests to a dedicated, tenant-scoped `AIAuditLogs` collection in the CMS Engine, capturing tenant ID, user ID, prompt/response metadata, and tokens consumed.
- Q: Which User roles within a tenant should be authorized to initiate an AI Content Drafting session, generate content, and perform refinements? → A: All authenticated tenant users (e.g., `admin`, `editor`) who possess content creation/edit permissions are authorized.
- Q: What rate-limiting or budget-control mechanism should be implemented in the application layer to prevent a single user or tenant from consuming excessive AI API credits and costs? → A: Request-Rate Limiting: Enforce a maximum of 10 AI request/refinement attempts per minute per user, throwing a HTTP 429 when exceeded.
- Q: What should be the persistence lifecycle of inactive or expired `DraftingSession` entries? When a session is locked out or times out after 10 minutes of inactivity, does the system immediately delete the draft data, or do we retain it for recovery? → A: 24-Hour Recovery Window: Retain the session in an `expired` state for 24 hours to allow recovery, after which a background cleanup job permanently purges it.
- Q: When a user opens the drafting interface for a schema that has an expired (inactive) but recoverable `DraftingSession` (within the 24-hour retention window), how should the UI handle the recovery flow? → A: Recovery Prompt Dialog: Block the view with a glassmorphic modal dialog (using extra-diffused shadows, Outfit typography, and gold accents per Alexandria token guidelines): "An unsaved draft was found from [timestamp]. Would you like to resume drafting or start fresh?".
- Q: How should the system determine and switch between different LLM models/providers (e.g., OpenAI, Anthropic, Gemini) for a drafting session? → A: Tenant Default + User Override: Admin sets a tenant-wide default model, which the editor can optionally override via the drafting sidebar settings using LangChain's dynamic model routing.
- Q: How should the Content Authoring Service format and serialize the streamed content for the 'Body' field (FR-003, FR-008), given that Payload CMS 3.x utilizes a strict, block-based JSON Lexical editor? → A: Markdown-to-Lexical Conversion: The Content Authoring Service streams standard, clean Markdown, and the CMS Engine **server-side API route** converts the Markdown into Payload's Lexical JSON format using `@payloadcms/richtext-lexical`'s headless editor before persisting to the DraftingSession. The streaming UI renders raw Markdown in a preview component; the final Lexical JSON is produced only on save/auto-save. *(Amended 2026-05-18: Changed from "client-side" to "server-side API route" per R-001 architectural decision — client-side conversion is impractical because it requires shipping the full Lexical editor config and custom server-only node types to the browser.)*
- Q: What should be the lifecycle of the temporary `DraftingSession` and its version snapshots once the user explicitly clicks "Save" or "Publish" and successfully promotes the draft into a persistent `ContentItem` in the CMS? → A: Atomic Promotion & Purge: The `DraftingSession` and all its 10 associated version snapshots are immediately and permanently deleted upon successful creation/update of the `ContentItem`.
- Q: When a user explicitly closes the drafting workspace or navigates away (e.g., clicks a "Cancel/Back" button, closes the tab, or goes to another admin route), how should the single-user session lock be managed? → A: Proactive Release with Timeout Fallback: The CMS Engine UI makes a proactive API request to release the single-user lock immediately on explicit navigation/exit or browser tab closure, falling back to the 10-minute inactivity timeout only on network cutoffs.
- Q: How should the AI Content Drafting session co-create content for schemas that contain localized fields (e.g., fields marked `localized: true`) when the tenant has multiple active locales? → A: Active Editor Locale Focus: The drafting session is scoped strictly to the current active locale selected in the editor UI. The AI drafts and refines in that language. Editors handle other locales by switching the editor locale and requesting translation/refinement.
- Q: When a user highlights text in the rich-text editor and triggers a refinement (e.g., "Simplify" or "Expand" from the floating AI bar), how should this interaction be orchestrated and recorded relative to the `DraftingSession`? → A: Stateless Inline Refinement with UI Auto-Save: The floating bar calls a stateless refinement endpoint (similar to `CopilotService`). The revised text is replaced directly in the client-side editor, which then auto-saves the updated field value to the `DraftingSession` collection.
- Q: How should the visual/conversational "Style & Tone" modifiers (`StyleModifier`) be persisted and managed in the multi-tenant system? → A: Tenant-Scoped Collection: Persisted in a tenant-scoped Payload CMS collection, allowing tenant admins to define, edit, and delete custom tone prompts.
- Q: When an active SSE content generation stream is interrupted due to a network cutoff, how should the system handle the recovery of the streamed field? → A: Keep Partial Draft & Prompt to Regenerate: Keep the partially streamed text in the editor and `DraftingSession`, and display an inline warning with a manual "Regenerate" button.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema-Based AI Drafting (Priority: P1)

As a content author, I want to ask Alexandria AI to draft an entry based on a specific content type so that I can quickly generate a structured starting point for my content.

**Why this priority**: This is the core value proposition of the "AI-First" CMS, allowing rapid content creation.

**Independent Test**: Can be tested by initiating a chat, requesting a draft for a known schema, and verifying that the fields on the right-hand editor populate correctly.

**Acceptance Scenarios**:

1. **Given** the Command Center is open, **When** the user asks to "Draft an article about the future of AI in 2025 using our Tech Blog schema", **Then** the AI identifies the 'Technology Blog Post' schema and populates the Title, Slug, and Body fields.
2. **Given** an active drafting session, **When** the AI generates content, **Then** an "AI SUGGESTS" indicator appears next to the populated fields.

---

### User Story 2 - Iterative Field Refinement (Priority: P2)

As a content author, I want to refine specific fields using AI suggestions or floating action bars so that I can tune the content to my specific needs without manual rewriting.

**Why this priority**: Enhances the collaboration between user and AI, providing granular control over the generated content.

**Independent Test**: Can be tested by highlighting text in the body or clicking "AI SUGGESTS" on a field and verifying the content changes based on the request.

**Acceptance Scenarios**:

1. **Given** a populated Body field, **When** the user highlights a paragraph and selects "Simplify" from the floating AI bar, **Then** the paragraph is replaced with a more concise version.
2. **Given** a field with an "AI SUGGESTS" indicator, **When** the user clicks "Refresh", **Then** the AI generates an alternative suggestion for that specific field.

---

### User Story 3 - Global Style & Tone Application (Priority: P3)

As a content author, I want to set a global style and tone modifier so that all AI-generated suggestions align with my brand's voice.

**Why this priority**: Ensures consistency across multiple content entries and reduces the need for manual tone adjustment.

**Independent Test**: Can be tested by switching between "Technical" and "Punchy" tones and verifying that new generations reflect the chosen style.

**Acceptance Scenarios**:

1. **Given** the "Technical" tone is selected, **When** the AI drafts content, **Then** the language used is precise, data-driven, and structured.
2. **Given** the "Casual" tone is selected, **When** the user requests a refinement, **Then** the AI uses a conversational and approachable voice.

---

### User Story 4 - AI-Driven Image Generation (Priority: P4)

As a content author, I want to ask Alexandria AI to generate relevant images for my schema's media fields so that I can automatically populate media elements within my structured draft.

**Why this priority**: Enhances the completeness of the draft by co-creating rich media assets alongside text, matching the active design aesthetics.

**Independent Test**: Can be tested by requesting an image for a media field, verifying the FastAPI tool generates the asset, and verifying the CMS Engine downloads and saves it to the native Payload Media collection.

**Acceptance Scenarios**:

1. **Given** a schema with an upload or media field, **When** the user requests the AI to "generate a hero image of a serene library in Alexandria style", **Then** the AI invokes the `generate_image` tool, generates a temporary asset URL, and the CMS Engine streams the download directly into the Payload Media collection, populating the field reference.
2. **Given** an AI-generated image reference, **When** the user accepts the draft, **Then** the local CMS Media reference is persisted.

---

### User Story 5 - Draft Recovery & Version Rollback (Priority: P5)

As a content author, I want to recover my unsaved drafting sessions from network failures or idle lockouts and rollback to previous version snapshots so that I never lose work.

**Why this priority**: Provides essential safety and reliability guarantees against network dropouts, page closures, or idle timeouts.

**Independent Test**: Can be tested by navigating away from an active session, waiting for the lock to idle expire, returning to trigger the recovery dialog, resuming the draft, and using the version selector to roll back to a prior snapshot.

**Acceptance Scenarios**:

1. **Given** an expired drafting session within the 24-hour recovery window, **When** the user navigates back to the drafting workspace for that schema, **Then** the system blocks the screen with a glassmorphic modal "Recovery Dialog" (designed with extra-diffused shadows and Outfit typography per Alexandria token guidelines) offering to resume the draft or start fresh.
2. **Given** a session with multiple version snapshots, **When** the user selects a historical version from the sidebar version list, **Then** the structured editor rolls back all fields to the matching historical snapshot state.

---

### Edge Cases

- **Schema Mismatch**: What happens when the user asks to draft using a schema that doesn't exist? (System dynamically triggers schema creation inline via the `schema_resolver` tool in the same session, updates the Structured Editor view inline. The `content-authoring-service` sends a `SCHEMA_UPDATED` event carrying the new schema structure inside the Server-Sent Events stream, which the Next.js SSE proxy relays to the client. The client UI listens to this event and re-renders the Structured Editor fields dynamically on-the-fly).
- **Network Interruptions**: How does the system handle a lost connection during a long "Drafting..." state? (System retains the partially streamed field value in the `DraftingSession` collection and displays a "Stream Interrupted" warning alert with a manual "Regenerate" button, allowing the user to either continue editing the partial content or regenerate the field from scratch).
- **Tenant Isolation**: How does the AI ensure it only uses knowledge and schemas from the current tenant? (Strict tenant-scoping for all RAG and prompt context).
- **Concurrent Session Attempt**: When a user attempts to start a drafting session for a schema already being drafted by another user, the system MUST show a "Session in progress" message and prevent entry.
- **Stale Session**: Drafting sessions MUST have a timeout (10 minutes of inactivity) to release the single-user lock if the user leaves without saving. The system proactively releases this lock immediately upon explicit user exit or tab closure, with the 10-minute inactivity timeout serving as a safety fallback. To ensure logical tenant isolation of active session locks under multi-tenancy rules, active locks are backed by a PostgreSQL compound partial unique index on the tuple (tenant, contentType) where status = 'active'. The inactive session is transitioned from `'active'` to an `'expired'` status after 10 minutes of inactivity to release the active lock while retaining data for recovery. To bypass cron execution latency, the lock validation hook and session API routes MUST dynamically evaluate `lastActivityAt` on read/write attempts; if `now - lastActivityAt > 10 minutes`, the lock is treated as expired on-the-fly and entry is allowed (the session creation/acquisition endpoint MUST atomically transition the expired session's status to `'expired'` in the database prior to creating the new active session to avoid unique key index conflicts). The expired session and its snapshot data are retained in this `'expired'` state for 24 hours to allow recovery, after which a background cleanup job permanently purges them.
- **Recovering Expired Session**: When a user returns to a schema with an expired but recoverable drafting session (within the 24-hour retention window), the system MUST display a confirmation dialog prompting them to either resume the recovered draft or start fresh. Starting fresh will immediately trigger a `DELETE` request to permanently purge the recovered draft from the database. The complete list of 10 historical snapshots remains fully preserved upon recovery, allowing rollback to pre-expired snapshots.
- **Rate Limiting / Cost Control**: If a user exceeds 10 AI request/refinement attempts in a rolling 60-second window, the system MUST return a `429 Too Many Requests` error and prompt the user to wait before requesting more suggestions.

## Requirements *(mandatory)*

### Out of Scope

- **Real-Time Collaboration**: Multi-user concurrent editing (Google Docs style) is out of scope. Concurrent access is handled via the single-user session lock (FR-011).
- **Multi-Model Comparison**: A side-by-side comparison workspace of different LLM model generations is out of scope.

### Functional Requirements

- **FR-001**: System MUST provide a split-view interface with an AI Chat panel on the left and a Structured Editor on the right.
- **FR-002**: System MUST automatically identify the target Content Type (schema) from natural language prompts, or dynamically create/modify it inline via the shared `content-authoring-service` toolset if the schema does not exist.
- **FR-003**: System MUST support real-time population of structured fields (Title, Slug, Author, Media, Body) via Server-Sent Events (SSE) standard HTTP unidirectional streaming. The rich-text `Body` field MUST stream as standard Markdown and be converted to Payload Lexical JSON in the CMS Engine **server-side API route** (using `@payloadcms/richtext-lexical`'s headless editor). *(Amended 2026-05-18: Changed from "client-side" to "server-side API route" per R-001 — see Clarifications.)* If the stream is interrupted, the system MUST retain the partially streamed content in the `DraftingSession` and display an inline warning with a manual "Regenerate" option.
- **FR-004**: System MUST provide a global "Pause" control to halt active AI generation streams.
- **FR-005**: System MUST provide an "AI SUGGESTS" indicator and per-field actions (Edit, Accept, Refresh) for every AI-populated field.
- **FR-006**: System MUST feature a "Style & Tone" selector that loads options from the tenant-scoped `StyleModifier` collection, allowing brand tone prompts to be dynamically injected into subsequent AI generation requests.
- **FR-007**: System MUST provide a floating AI action bar for the rich-text editor with "Simplify", "Expand", and "Change Tone" capabilities, alongside a section-level "REFINE ALL" action (which applies the active StyleModifier tone to all drafted fields in parallel via batched, stateless refinement requests). These inline refinements MUST be stateless calls that replace highlighted text directly in the client-side editor, which then triggers a standard field-level auto-save to the `DraftingSession` database. The client MUST explicitly pass the active editor `locale` parameter and selected StyleModifier tone guidelines in the refinement request payload to preserve linguistic and tone consistency. The refinement operations 'Simplify' and 'Expand' will default to a 30% length decrease/increase targets respectively. To prevent instant rate-limit exhaustion during this concurrent parallel batch refinement, the `/api/ai/refine-all` orchestrator route MUST write only a single `AIRateLimits` request entry for the entire batch operation (consuming exactly 1 rate-limiting token), bypassing individual rate-limiting entries/checks for the downstream parallel sub-requests sent to the Content Authoring Service. Upon successful completion of all parallel field refinements in a "REFINE ALL" operation, the `/api/ai/refine-all` orchestrator route MUST compile, aggregate all consumed tokens and estimated costs across the sub-requests, and write a single aggregated `AIAuditLogs` entry containing total token counts, USD microdollars, and model parameters to ensure compliance with Principle I and FR-012 without bloating the database with separate logs.
- **FR-008**: System MUST support AI-driven image generation for "Main Media" fields based on content context, orchestrated via LangChain tool calling in the `content-authoring-service`, with the Content Management Engine proactively downloading and persisting the generated image directly to the Payload `Media` collection to obtain a permanent local reference. The default image generation tool in `content-authoring-service` will default to `openai/dall-e-3` unless configured otherwise.
- **FR-009**: System MUST support tracking "Versions" of the draft to allow users to navigate through iteration history, implemented as an array of up to 10 version snapshot states (capturing both `draftData` and `mainMedia` references) inside the `DraftingSession`'s `versions` field for rollback support. Rollback MUST be executed server-side via a dedicated `POST /api/ai-drafting/sessions/[id]/rollback` endpoint to restore snapshot values directly in the database without client-side conversion roundtrips.
- **FR-010**: System MUST maintain drafts exclusively within the temporary `DraftingSession` state; they are NOT persisted to formal `ContentItems` until the user explicitly clicks "Save" or "Publish". Upon successful creation or update of the `ContentItem`, the temporary `DraftingSession` and all its snapshots MUST be atomically and permanently deleted.
- **FR-011**: System MUST enforce a single-user lock per schema/drafting session; other users attempting to start a session for the same schema MUST receive a "Session in progress" notification. The system MUST proactively release the lock immediately upon explicit user exit or page unload, with a 10-minute inactivity timeout serving as a safety fallback. To release the active lock while retaining data for recovery, active sessions MUST transition to an `'expired'` status after 10 minutes of inactivity and be retained in this `'expired'` state for a 24-hour recovery window before they are permanently purged via a background cleanup process. To guarantee immediate lock release and bypass any latency in cron executions, both the lock validation hook and lock-checking routes MUST dynamically treat any session as expired on-the-fly if the difference between the current time and `lastActivityAt` exceeds 10 minutes, regardless of its persistent DB status, and atomically update the expired session's status in the database to `'expired'` before a new active session is initialized to avoid unique key conflicts. The background cleanup process MUST only purge expired rate limit records older than 5 minutes, ensuring active user rate-limiting windows are completely unaffected. Upon recovery of an expired session (previously FR-016), the system MUST present a confirmation dialog allowing the user to either resume drafting from the recovered state or discard it and start fresh (which triggers a `DELETE` request to permanently purge the expired session). The complete list of 10 historical snapshots remains fully preserved upon recovery, allowing rollback to pre-expired snapshots.
- **FR-012**: System MUST log every AI request and model response to a tenant-scoped `AIAuditLogs` collection in the CMS Engine, including token counts, costs, and user/session identifiers for auditing and usage attribution.
- **FR-013**: System MUST authorize all authenticated tenant users (e.g., `admin`, `editor` roles) who possess content creation/edit permissions to access and utilize AI Content Drafting sessions.
- **FR-014**: System MUST enforce a request rate limit of 10 AI requests/refinements per minute per user, returning an HTTP 429 status code upon violation.
- **FR-015**: [Merged into FR-011]
- **FR-016**: [Merged into FR-011]
- **FR-017**: System MUST support a tenant-configured default LLM model/provider (mapped via a standardized identifier like `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`, or `google/gemini-2.5-flash`), and allow editors to optionally override the selected model inside the drafting session sidebar using LangChain's dynamic model routing.
- **FR-018**: System MUST scope the co-creation session strictly to the user's active editor locale selected in the UI. All AI content generation, refinement, and streaming MUST match this active locale. Other locales MUST be edited or translated by explicitly switching the editor locale.
- **FR-019**: System MUST actively monitor client-side connection drops or cancellations (e.g. browser tab close, navigation away, or client-initiated aborts) in the CMS Engine SSE proxy route, and proactively abort the downstream HTTP connection to the FastAPI Content Authoring Service using standard abort signals to prevent runaway token costs and resource leakage. The Content Authoring Service's FastAPI routes MUST be asynchronous (`async def`) and actively monitor the request's disconnected state using standard ASGI check signals (e.g. `request.is_disconnected()`) to interrupt the LLM stream generation and cease model execution immediately.

## Key Entities & Database Schemas *(include if feature involves data)*

- **DraftingSessions**: A Payload CMS collection representing the active state of an AI drafting interaction.
  - `tenant`: Relationship to `Tenants` collection (required, multi-tenant scoped)
  - `user`: Relationship to `Users` collection (required)
  - `contentType`: Relationship to `ContentTypes` collection (required)
  - `status`: Select field with options `['active', 'expired']` (default: `'active'`)
  - `draftData`: JSON block field storing current field states (keys representing field names, values representing current generated strings/content)
  - `mainMedia`: Relationship to `Media` collection (optional, null when unpopulated)
  - `activeLocale`: Text field (required, default: `'en'`)
  - `selectedModel`: Text field (optional)
  - `lastActivityAt`: DateTime field (required, auto-updated on change)
  - `versions`: Array/Blocks field (capped at 10 items) storing history:
    - `timestamp`: DateTime
    - `draftData`: JSON block field
    - `mainMedia`: Relationship to `Media`
  - *Indexes*: PostgreSQL compound partial unique index on `(tenant, contentType)` WHERE `(status = 'active')`

- **AISuggestion**: A structural value object embedded directly within the `DraftingSession` snapshot array (representing field-level suggestions for refresh/undo actions), rather than a separate database collection.

- **StyleModifiers**: A tenant-scoped Payload CMS collection defining custom brand tone prompts.
  - `tenant`: Relationship to `Tenants` collection (required, multi-tenant scoped)
  - `name`: Text field (required, e.g. Academic, Punchy, Technical)
  - `systemPrompt`: Textarea field (required) containing the actual prompt instructions injected into the system message

- **AIAuditLogs**: A tenant-scoped Payload CMS collection documenting every AI request.
  - `tenant`: Relationship to `Tenants` collection (required, multi-tenant scoped)
  - `user`: Relationship to `Users` collection (required)
  - `session`: Relationship to `DraftingSessions` collection (optional)
  - `model`: Text field (required, e.g. `openai/gpt-4o`)
  - `promptTokens`: Number field (required)
  - `completionTokens`: Number field (required)
  - `totalTokens`: Number field (required)
  - `estimatedCost`: Number field (required, cost in USD microdollars, e.g. `150` microdollars = `0.00015` USD)
  - `parameters`: JSON block field (required, capturing temperature, top_p, penalty guidelines)

- **AIRateLimits**: A database-backed collection for tracking API request rate limits per user across a rolling 60-second window to prevent cost bloat. Globally user-scoped (bypassing tenant filters using `overrideAccess: true`).
  - `userId`: Text field (required)
  - `timestamp`: DateTime field (required, default: `now`)
  - `requestPath`: Text field (required, e.g., `/api/ai/draft`)
  - *Indexes*: Compound index on `(userId, timestamp)` to ensure sub-millisecond sliding window query performance under load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete 500-word structured draft in under 45 seconds (measured as Time-To-Last-Token (TTLT) of the SSE stream on the network connection).
- **SC-002 (Outcome KPI - Non-Buildable)**: 70% of AI-generated titles are accepted by the user without manual modification.
- **SC-003 (Outcome KPI - Non-Buildable)**: The floating AI bar reduces the time spent on paragraph editing by 30%.
- **SC-004**: All AI interactions must respect tenant boundaries, with 0% cross-tenant data leakage.
- **SC-005**: Granular field-level AI refinements (e.g., "Simplify") MUST return the first token (Time-to-First-Token) in under 2 seconds.

## Assumptions

- **Existing AI Service**: Relies on the `content-authoring-service` (FastAPI/LangChain) being functional and accessible.
- **Schema Availability**: Assumes that content drafting is initiated for an existing schema, or the user utilizes inline co-creation to dynamically define the schema if it does not exist.
- **Asset Storage**: Assumes the CMS has a configured media provider for storing AI-generated images returned by the `content-authoring-service`.
- **Auth**: CMS ↔ AI auth via `X-Internal-Secret` as per project rules.

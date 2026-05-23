# Tasks: AI Content Drafting

**Input**: Design documents from `/specs/004-ai-content-drafting/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test-First (TDD) approach is mandatory per the Hermes AI project constitution. Test tasks are placed at the beginning of each User Story phase to be written and verified as failing prior to implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial folder structures, configuration, and environment setup.

- [x] T001 Configure required environment variables for OpenAI, rate-limiting Postgres credentials, and the standard `INTERNAL_SERVICE_SECRET` environment variable (used to validate the `X-Internal-Secret` inter-service auth header) in `apps/content-management-engine/.env` and `apps/content-authoring-service/.env`
- [x] T002 Create the standard folder hierarchies for the new features in `apps/content-management-engine/src/collections/` (DraftingSessions, StyleModifiers, AIAuditLogs, AIRateLimits), `apps/content-management-engine/src/app/api/`, and `apps/content-authoring-service/src/domain/content_drafting/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core collections, schemas, libraries, and utilities that must be completed before any User Story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Write unit and hook validation tests for foundational components (sliding window rate limiter `rate-limiter.ts`, Markdown-to-Lexical converter `markdown-to-lexical.ts`, StyleModifiers collection CRUD/RBAC permissions, and DraftingSessions collection hooks) in `apps/content-management-engine/tests/` to guarantee test-first correctness prior to implementation, including explicit tests validating that active session locks are strictly tenant-isolated and do not leak or clash across boundaries (TDD)
- [x] T004 [P] Implement `AIRateLimits` collection definition (complete with a compound database index on `(userId, timestamp)` to optimize sliding window queries and strict access control policies restricting all operations to internal system proxy API routes with super-admin query bypass) in `apps/content-management-engine/src/collections/AIRateLimits/index.ts`
- [x] T005 [P] Implement `StyleModifiers` collection definition (complete with strict role-based access control policies restricting read/write capabilities strictly to authenticated tenant `admin` and `editor` roles to prevent unauthorized access or cross-tenant leakage) in `apps/content-management-engine/src/collections/StyleModifiers/index.ts`
- [x] T006 [P] Implement `AIAuditLogs` collection definition (complete with strict role-based access control policies restricting read access strictly to tenant `admin` and `super-admin` roles for privacy/billing protection, and preventing external write access) in `apps/content-management-engine/src/collections/AIAuditLogs/index.ts`
- [x] T007 [P] Implement Postgres-backed sliding window sliding rate limiter in `apps/content-management-engine/src/services/rate-limiter.ts` (ensuring that database queries to the `AIRateLimits` collection bypass tenant-scoping filters via the `overrideAccess: true` option in the local API, establishing a true global user limit across all tenants)
- [x] T008 [P] Implement headless Markdown-to-Lexical JSON conversion using `@lexical/headless` alongside the `@payloadcms/richtext-lexical` Markdown transformers in `apps/content-management-engine/src/services/markdown-to-lexical.ts`
- [x] T009 Implement `DraftingSessions` collection definition (complete with strict role-based access control policies permitting operations strictly to tenant `admin` and `editor` roles) in `apps/content-management-engine/src/collections/DraftingSessions/index.ts`. Establish individual hook files under `apps/content-management-engine/src/collections/DraftingSessions/hooks/`:
  - `validateLock.ts` (enforcing single-user active lock unique constraints, checking for locks strictly where `status === 'active'`, and dynamically treating any lock as expired if `now - lastActivityAt > 10 minutes` to bypass cron execution latency)
  - `refreshActivity.ts` (auto-updating lastActivityAt)
  - `capVersions.ts` (FIFO trimming version history to 10 versions max)
- [x] T010 Register new collections `DraftingSessions`, `StyleModifiers`, `AIAuditLogs`, and `AIRateLimits` in central Payload configuration `apps/content-management-engine/src/payload.config.ts` (ensuring that the lowercase kebab-case slugs `'drafting-sessions'`, `'style-modifiers'`, and `'ai-audit-logs'` are registered under the `collections` object of `multiTenantPlugin` to enable automatic logical multi-tenant isolation, while `AIRateLimits` is registered strictly outside the multiTenantPlugin as a global, user-scoped collection to enable platform-wide sliding window rate checking)
- [x] T010b [P] Update `Tenants` collection schema in `apps/content-management-engine/src/collections/Tenants/index.ts` to add `defaultLLMModel` and `defaultImageModel` select fields (with options representing available models using standardized identifiers like `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`, `google/gemini-2.5-flash`, and `openai/dall-e-3`)
- [x] T011 Run pnpm generators to regenerate typescript types and custom import maps in `apps/content-management-engine/` by running `pnpm payload generate:types` and `pnpm payload generate:importmap`
- [x] T011b [P] Generate and run database migrations for newly registered collections, modified `Tenants` schema, and custom indexes (using `pnpm payload migrate:create` and manually writing raw SQL via `await payload.db.drizzle.execute(sql\`...\`)` to bypass Payload's CollectionConfig limitations for partial unique indexes) to ensure a PostgreSQL compound partial unique index on the tuple (tenant, contentType) WHERE (status = 'active') is created for `DraftingSessions` locks, and a compound index on the tuple (userId, timestamp) is created for `AIRateLimits` to guarantee multi-tenant logical isolation, high-performance rate checking, and allow expired recoverable sessions to exist alongside new active ones
- [x] T012 [P] Implement Pydantic domain entities (`ContentDraft`, `DraftField`) in `apps/content-authoring-service/src/domain/content_drafting/models.py` (explicitly adding a required `locale` field to the drafting domain model to satisfy locale-scoped generation)
- [x] T013 [P] Formulate LLM prompts and strict system prompt templates in `apps/content-authoring-service/src/domain/content_drafting/prompts.py` (explicitly incorporating editor locale translation guidelines and dynamic language scoping based on the input `locale`)
- [x] T013b [P] Apply the existing FastAPI internal routing security dependency `require_internal_secret` from `apps/content-authoring-service/src/infrastructure/auth.py` to the new endpoints in `apps/content-authoring-service/src/main.py` (security guardrail) to validate the `X-Internal-Secret` header on all `/api/ai/*` endpoints and reject unauthorized external requests with HTTP 401.
- [x] T013c [P] Verify the existing SQLAlchemy database connection (`database.py`), `AIAgentSession` table model schema (`models.py`) for logging conversational message history, and repository layer (`session_repository.py`) in `apps/content-authoring-service/src/infrastructure/`, and run/apply the initial Alembic database migrations to setup the microservice DB on port 5433 (Principle VII context continuity).

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Schema-Based AI Drafting (Priority: P1) 🎯 MVP

**Goal**: Enable authors to initiate conversational AI content drafting sessions where structured fields (Title, Slug, Body) stream from the AI service in real-time, auto-saving into a logical tenant-isolated DraftingSession in Postgres.

**Independent Test**: Initiate a draft session through `/api/drafting-sessions`, trigger a streaming session at `/api/ai/draft`, check the SSE stream outputs (`FIELD_START`, `TEXT_DELTA`, `FIELD_COMPLETE`), and verify draft data maps perfectly to a persisted Payload DraftingSession.

### Tests for User Story 1 (TDD - Write first!)

- [x] T014 [P] [US1] Write FastAPI unit and mock streaming tests in `apps/content-authoring-service/tests/unit/test_drafting_service.py`
- [x] T014b [P] [US1] Write FastAPI unit and mock tests in `apps/content-authoring-service/tests/unit/test_schema_resolver.py` to verify safe, tenant-scoped schema updates via the resolver tool (TDD)
- [x] T015 [P] [US1] Write CMS collections and lock validation tests in `apps/content-management-engine/tests/collections/DraftingSessions/hooks.test.ts`, explicitly testing that Tenant B is completely isolated from Tenant A's active session locks and snapshot data, and cannot acquire or conflict with another tenant's lock (SC-004 TDD verification)

### Implementation for User Story 1

- [x] T016 [P] [US1] Build `schema_resolver` LangChain tool in `apps/content-authoring-service/src/infrastructure/tools/schema_resolver.py` (which makes secure, tenant-scoped schema updates on the CMS Engine's REST endpoints `POST/PATCH /api/content-types` using `X-Internal-Secret` header authentication)
- [x] T017 [US1] Implement primary LangChain generation workflow in `apps/content-authoring-service/src/application/drafting_service.py` (ensuring the `locale` parameter is parsed, validated, and passed to LLM prompt builders to steer language-scoped drafting, explicitly registering/binding the `schema_resolver` tool to the dynamic `init_chat_model` configurations, parsing/splitting the dynamic model identifier parameter such as 'openai/gpt-4o' into provider and model arguments, and persisting conversational message arrays into the `AIAgentSession` Postgres table model on each turn for context continuity, strictly enforcing Logical Tenant Scoping by filtering all context retrieval and update operations by `tenant_id` to prevent cross-tenant leakage)
- [x] T018 [P] [US1] Register FastAPI routing endpoints (using `async def` and actively monitoring standard ASGI client disconnection signals via `request.is_disconnected()` to immediately interrupt downstream streams and cease model execution upon client drops) for `/api/ai/draft` in `apps/content-authoring-service/src/main.py`
- [x] T019 [US1] Implement Next.js Custom API Routes outside Payload group: `/api/ai-drafting/sessions` (lock checks which MUST dynamically bypass persistent status and evaluate `lastActivityAt` on-the-fly to prevent cron lockout latency, and atomically transition any expired session in the database from `'active'` to `'expired'` status prior to inserting a new active session to prevent compound unique key index conflicts), `/api/ai-drafting/sessions/[id]` (auto-save, snapshot updates, and session deletion/discarding on start fresh via `DELETE`), and `/api/ai/draft` (SSE relay proxy). **CRITICAL SECURITY & LIMITING**: Each route MUST verify the user's active Payload session, enforce strict logical tenant isolation to prevent cross-tenant leakage, and invoke the rate limiter (`rate-limiter.ts`) using the `overrideAccess: true` option to throw HTTP 429 if the 10 requests/minute limit is exceeded. The SSE route must relay the stream (loading the active tenant's defaultLLMModel from the Tenants collection in Payload CMS to supply as the default `model_override` to the AI microservice if the incoming request lacks a `modelOverride` parameter), actively monitor client disconnection (`req.on('close')`) to send an abort signal to the FastAPI microservice (MUST NOT release/clean up the session lock or delete the session, as lock expiry is handled via inactivity timeout or explicit cancel), capture dynamic tokens in metadata, and write a tenant-scoped `AIAuditLogs` entry with cost recorded in USD microdollars ($1 = 1,000,000 microdollars) in `apps/content-management-engine/src/app/api/`
- [x] T020 [US1] Construct Main Split-View Workspace Component in `apps/content-management-engine/src/components/views/DraftingWorkspace.tsx` (ensuring that the component listens to the `SCHEMA_UPDATED` event on the SSE stream proxy, dynamically parses the new schema configuration, and triggers a dynamic field re-render when the conversational AI tool updates the underlying content type layout inline. NOTE: Since this component imports `ChatPanel.tsx` and `EditorPanel.tsx`, you must create simple named export stubs for `ChatPanel` and `EditorPanel` in their respective folders first to avoid compilation issues)
- [x] T021 [US1] Register custom admin views routing `/draft/:contentTypeId` in `apps/content-management-engine/src/payload.config.ts` (strictly adhering to Payload 3.x custom components registration rules: Named Exports only, absolute `/src/` pathing starting with `/src/components/views/DraftingWorkspace#DraftingWorkspace`, registering `path: '/draft/:contentTypeId'` relative to the admin prefix to avoid duplicate route nesting `/admin/admin/draft/...`, and lowercase view keys. To prevent Next.js compilation issues, this task should be executed AFTER constructing the main workspace component file in T020)
- [x] T021b [US1] Run manual import map regeneration to sync newly registered custom admin views in Payload CMS: `pnpm payload generate:importmap`
- [x] T022 [US1] Implement Chat Interface Panel and sidebar LLM selection triggers in `apps/content-management-engine/src/components/Editor/ChatPanel.tsx`
- [x] T023 [US1] Implement structured fields, Rich Text editor wrappers, and suggestion visual indicators in `apps/content-management-engine/src/components/Editor/EditorPanel.tsx`, `apps/content-management-engine/src/components/Editor/FieldRenderer.tsx`, and `apps/content-management-engine/src/components/Editor/AISuggestIndicator.tsx` (ensuring the active editor locale is forwarded, listening to the `SCHEMA_UPDATED` event to dynamically re-render field editors on-the-fly, adding an inline glassmorphic warning alert and manual 'Regenerate' option to handle interrupted streams cleanly, and ensuring the editor loads Lexical JSON directly from the DraftingSession and performs auto-saves by submitting updated Lexical JSON values directly (specifically managing the state flow by rendering a read-only Markdown preview during streaming, auto-saving the final Markdown on stream completion to produce the Lexical JSON, and then loading the returned Lexical JSON to initialize the interactive Lexical editor), without client-side Markdown-to-Lexical conversions. NOTE: Do not implement `RecoveryDialog.tsx` in this task; its implementation is scheduled strictly under US5 in T043)
- [x] T023b [US1] Integrate global "Pause/Cancel" request abort controllers and cleanup pipelines in UI streams (FR-004) to allow users to halt active AI generation streams. Ensure browser-side cancellation aborts the active stream fetch, which propagates connection termination to the server-side proxy route.
- [x] T024 [US1] Add proactive lock release handler `POST /api/ai-drafting/sessions/[id]/lock` and register unload/beforeunload/pagehide listeners in Next.js UI (explicitly using `fetch` with the `keepalive: true` option or `navigator.sendBeacon` to reliably fire the lock release request on exit/tab close)
- [x] T025 [US1] Implement postgres transaction logic mapping fields, creating a `ContentItem`, and atomically dropping `DraftingSession` in Next.js promotion route `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/promote/route.ts`. **SECURITY**: Verify active Payload session and validate user permissions for the matching tenant prior to promoting draft.

**Checkpoint**: User Story 1 is fully functional and testable. Authors can draft, stream fields, auto-save, and save drafts into permanent CMS ContentItems.

---

## Phase 4: User Story 2 - Iterative Field Refinement (Priority: P2)

**Goal**: Enable granular field-level or selection-level AI refinements, letting authors simplify, expand, or adjust language tone via an inline floating toolbar.

**Independent Test**: Highlight text inside the body Lexical editor, trigger `/api/ai/refine` with instruction, verify revised streamed tokens replace selected text, and verify updated field triggers database auto-save.

### Tests for User Story 2 (TDD)

- [x] T026 [P] [US2] Write unit and mock streaming tests for stateless refinements in `apps/content-authoring-service/tests/unit/test_refine_service.py` to ensure iterative feedback doesn't corrupt existing fields

### Implementation for User Story 2

- [x] T027 [US2] Implement stateless tone/text refinement services in `apps/content-authoring-service/src/application/refine_service.py` (ensuring the `locale` parameter is parsed, validated, and passed to LLM prompt builders to preserve linguistic and tone consistency, implementing prompt-based targets of a 30% length decrease for 'Simplify' and a 30% length increase for 'Expand' operations, and parsing/splitting the dynamic model identifier parameter into provider and model arguments for `init_chat_model`)
- [x] T028 [P] [US2] Add FastAPI routing `/api/ai/refine` in `apps/content-authoring-service/src/main.py`
- [x] T029 [US2] Create proxy routing endpoint for refinements in Next.js at `apps/content-management-engine/src/app/api/ai/refine/route.ts`. **SECURITY & AUDITING**: Verify user session, enforce strict logical tenant isolation, invoke the rate limiter (`rate-limiter.ts`) using the `overrideAccess: true` flag to bypass tenant-scoping filters on `AIRateLimits`, and write a tenant-scoped `AIAuditLogs` entry detailing token counts and cost estimation (recorded in USD microdollars ($1 = 1,000,000 microdollars)) upon completion per FR-012.
- [x] T029b [US2] Implement section-level parallel 'REFINE ALL' orchestrator logic in `apps/content-management-engine/src/app/api/ai/refine-all/route.ts`. The route MUST validate the active session, write a single global `AIRateLimits` request entry for the orchestrator request itself to consume only 1 rate limit token for the entire batch operation and prevent rate-limit exhaustion (bypassing individual rate-limit entries/checks for the downstream parallel sub-requests to the Content Authoring Service), trigger concurrent parallel refinement requests to the Content Authoring Service applying the active StyleModifier tone, and aggregate all consumed sub-request tokens/costs to write a single compiled `AIAuditLogs` entry detailing aggregated metrics in USD microdollars ($1 = 1,000,000 microdollars) per FR-007.
- [x] T030 [US2] Implement Lexical floating action bar UI component appearing on text selection in `apps/content-management-engine/src/components/Editor/FloatingAIBar.tsx`
- [x] T030b [US2] Implement a section-level 'REFINE ALL' UI button in the right-hand Structured Editor of `apps/content-management-engine/src/components/views/DraftingWorkspace.tsx` to trigger the concurrent parallel refinement stream
- [x] T031 [US2] Wire "AI SUGGESTS" indicator badge buttons in the Next.js editor to trigger field-level regeneration streaming from the refinement backend

**Checkpoint**: User Story 2 complete. Granular, field-level, and selection-level refinements are functional with immediate inline updates and database auto-saving.

---

## Phase 5: User Story 3 - Global Style & Tone Application (Priority: P3)

**Goal**: Support tenant-scoped style modifiers (e.g. Academic, Punchy) so all drafted content automatically adheres to the brand's specific tone guidelines.

**Independent Test**: Configure a StyleModifier with a distinct style system prompt, select it from the sidebar, request a new draft, and verify injected system prompt parameters appear in backend logs and result in appropriate voice styles.

### Tests for User Story 3

- [x] T032 [P] [US3] Write integration tests in `apps/content-authoring-service/tests/test_drafting_service.py` ensuring system prompt construction incorporates StyleModifier parameters

### Implementation for User Story 3

- [x] T033 [US3] Add complete admin panel CRUD capabilities and collection access control permissions for StyleModifiers in `apps/content-management-engine/src/collections/StyleModifiers/index.ts`
- [x] T034 [US3] Implement style tone selection chip controls in `apps/content-management-engine/src/components/Editor/ChatPanel.tsx` that load dynamic lists from the database
- [x] T035 [US3] Bind selected StyleModifier parameter to CMS proxy requests `/api/ai/draft` and `/api/ai/refine`
- [x] T036 [US3] Modify system prompt construction algorithms in `apps/content-authoring-service/src/application/drafting_service.py` and `apps/content-authoring-service/src/application/refine_service.py` to append tone definitions dynamically

**Checkpoint**: User Story 3 complete. Style and tone prompts are managed by tenant admins, toggled by authors, and correctly shape LLM output styles.

---

## Phase 6: User Story 4 - AI-Driven Image Generation (Priority: P4)

**Goal**: Provide AI-driven image generation for upload fields using LangChain tool calling, downloading images streamingly into the Payload Media database to prevent local memory overflow.

**Independent Test**: Initiate drafting with a schema possessing an upload field, see the AI trigger an image tool call during chat, verify `/api/ai/download-image` pipes response body streams directly to Payload media, and verify final local image references render in the editor.

### Tests for User Story 4

- [x] T037 [P] [US4] Write unit and mock tests for the LangChain tool in `apps/content-authoring-service/tests/unit/test_image_generator.py` (TDD)
- [x] T037b [P] [US4] Write unit/integration tests in `apps/content-management-engine/tests/` for Next.js image download proxy route `/api/ai/download-image` to verify streaming download pipelines, chunked data handling, and strict multi-tenant access restrictions (TDD)

### Implementation for User Story 4

- [x] T038 [US4] Implement `image_generator` tool in `apps/content-authoring-service/src/infrastructure/tools/image_generator.py`
- [x] T039 [US4] Register and bind `image_generator` tool to `init_chat_model` configurations in `apps/content-authoring-service/src/application/drafting_service.py`
- [x] T040 [US4] Implement Next.js streaming API pipeline endpoint in `apps/content-management-engine/src/app/api/ai/download-image/route.ts` using `Readable.fromWeb` piping directly to Payload's Media creation local API. **SECURITY**: Verify active Payload session, validate content edit permissions, and scope media storage strictly to the active tenant.
- [x] T041 [US4] Add custom image previews and direct generation actions inside `apps/content-management-engine/src/components/Editor/EditorPanel.tsx` and `apps/content-management-engine/src/components/Editor/FieldRenderer.tsx` (wiring the generation button to internally trigger a chat command message like 'Generate a hero image of [context]' sent directly to the SSE drafting proxy route, preserving the unified tool-calling pipeline)

**Checkpoint**: User Story 4 complete. LangChain tools generate images, which the Next.js backend downloads via streams to prevent memory bloat, updating the editor's upload fields automatically.

---

## Phase 7: User Story 5 - Draft Recovery & Version Rollback (Priority: P5)

**Goal**: Provide a 24-hour retention window for expired locks with recovery modal workflows, 10-minute lock expiration cron triggers, and 10-version JSON rollback selectors.

**Independent Test**: Artificially expire a session status, navigate to schema drafting, witness `RecoveryDialog` interrupt access, choose "Resume", select a historical snapshot from `VersionSelector`, and verify draft rollback updates structure.

### Tests for User Story 5

- [x] T042 [P] [US5] Write frontend unit tests for the recovery modal states in `apps/content-management-engine/tests/e2e/test_drafting_workspace.spec.ts` (TDD)
- [x] T042b [P] [US5] Write backend integration tests in `apps/content-management-engine/tests/` for rollback route `POST /api/ai-drafting/sessions/[id]/rollback` to verify direct database restoration, and cleanup route `POST /api/ai-drafting/sessions/cleanup` to verify inactivity timeout thresholds, lock transition, rate-limit deletion, and auth header checking (TDD)
- [x] T042c [P] [US5] Write backend Next.js API proxy integration tests in `apps/content-management-engine/tests/integration/test_api_proxies.ts` to verify Payload session auth checks, sliding-window rate limit token consumption (specifically the consolidated 1-token rate limit for batch 'REFINE ALL' operations), cost/token summation audit log compiling, and SSE relay stream abort propagation under client disconnection (TDD)

### Implementation for User Story 5

- [x] T043 [US5] Implement modal recovery overlay dialog in `apps/content-management-engine/src/components/Editor/RecoveryDialog.tsx` (allowing the user to resume drafting from the recovered state or discard it and start fresh. Starting fresh MUST trigger a DELETE request to permanently purge the expired session from the database)
- [x] T044 [US5] Implement inactivity and expired session cleanup trigger via a secure Next.js API route `POST /api/ai-drafting/sessions/cleanup` protected by `X-Internal-Secret` verification (which transitions active sessions with more than 10 minutes of inactivity from `'active'` to `'expired'` status to release the lock, and permanently deletes expired `DraftingSession` records older than 24 hours and expired `AIRateLimits` records older than 5 minutes to maintain database health). **CRITICAL**: Enforce secure internal routing headers, restricting execution to system crons.
- [x] T044b [US5] Create or update Kubernetes CronJob manifest under `k8s/cron-cleanup-sessions.yaml` (or Next.js cron scheduler config) to trigger the `POST /api/ai-drafting/sessions/cleanup` route securely every 5 minutes in production environments (ensuring the `X-Internal-Secret` header is supplied by fetching the secret securely from the container's environment variables).
- [x] T045 [US5] Implement server-side dedicated route `POST /api/ai-drafting/sessions/[id]/rollback` in `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/rollback/route.ts` to restore snapshot state (both `draftData` with Lexical JSON and `mainMedia` reference) directly in the database to avoid client-side JSON/Markdown conversion roundtrips.
- [x] T045b [US5] Implement dynamic Version Selector rollback UI interactions in `apps/content-management-engine/src/components/Editor/EditorPanel.tsx` that send the POST rollback request and update React state with the returned session data.

**Checkpoint**: User Story 5 complete. Sessions recover cleanly from network/idle disruptions, and iteration rollbacks support safe design exploration.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, visual styling alignment, rate limiting validations, and final E2E test suites.

- [x] T046 Implement polished drafting workspace layout (Side Nav, Top App Bar, Split View) matching Alexandria design system tokens (Noto Serif, glassmorphism, ghost borders).
- [x] T047 Write complete Playwright integration testing suites in `apps/content-management-engine/tests/e2e/test_drafting_workspace.spec.ts` (including automated latency verification ensuring the first streamed token for inline refinements is returned in under 2 seconds to validate SC-005, and that a full 500-word draft is completed in under 45 seconds of streaming to validate SC-001)
- [x] T048 [P] Update technical design documentation files under `docs/` and add comprehensive quickstart guide verification notes
- [x] T049 Validate quickstart guidelines, run final verification runs (benchmarking stream generation speed and rate limiter compliance), and confirm linting standards pass locally across both workspaces

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all subsequent user stories.
- **User Stories (Phases 3+)**: All depend on Foundational completion.
  - User Stories must progress sequentially or be allocated by functional boundaries (e.g. US1 MVP → US2 Refine → US3 Tone → US4 Media → US5 Recovery).
- **Polish (Final Phase)**: Depends on all user story task scopes completing.

### User Story Dependencies

- **User Story 1 (P1)**: Foundation prerequisite only. Blocks US2, US3, US4, US5 since it establishes the core split-view workspace, auto-saving logic, and custom API stream routes.
- **User Story 2 (P2)**: Integrates refinement engines over US1 rich-text fields.
- **User Story 3 (P3)**: Enhances US1 and US2 generation prompts with tone contexts.
- **User Story 4 (P4)**: Injects media generation tools into US1 workspace schemas.
- **User Story 5 (P5)**: Oversees recovery mechanisms and snaps of US1 `DraftingSession` states.

---

## Parallel Opportunities

- **Setup Phase 1**: All setup configurations can run concurrently.
- **Foundational Phase 2**: Standard collection schemas (T003, T004, T005), conversion utilities (T007), and python schemas (T011, T012) can be created in parallel.
- **User Story 1 Phase 3**: Unit service tests (T014) and collection lock tests (T015) can be developed in parallel before implementations, while LangChain agents (T017) and CMS proxy routes (T019) can progress concurrently.
- **User Story 2 Phase 4**: Stateless python services (T027) and UI floating components (T030) can be created in parallel.
- **User Story 4 Phase 6**: Python tools (T038) and Next.js stream downloads (T040) are completely parallelizable.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1 (core split-view drafting, streaming, auto-saving, promotion).
4. **STOP and VALIDATE**: Verify end-to-end functionality of conversational drafting with multiple test schemas.

### Incremental Delivery

1. Setup + Foundational Completed → Core architecture established.
2. Add User Story 1 → Independent testing completed → MVP workspace ready!
3. Add User Story 2 → Real-time inline selection refinements operational.
4. Add User Story 3 → Custom tone modifier rules injected.
5. Add User Story 4 → LangChain image generation tools streaming media.
6. Add User Story 5 → Version snapshot rollback and recovery overlays enabled.
7. Run Phase N Polish → Alexandria design system alignment and E2E Playwright coverage validated.
ia.
6. Add User Story 5 → Version snapshot rollback and recovery overlays enabled.
7. Run Phase N Polish → Alexandria design system alignment and E2E Playwright coverage validated.
esign system alignment and E2E Playwright coverage validated.

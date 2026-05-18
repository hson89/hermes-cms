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

- [ ] T001 Configure required environment variables for OpenAI, rate-limiting Postgres credentials, and X-Internal-Secret auth header in `apps/content-management-engine/.env` and `apps/content-authoring-service/.env`
- [ ] T002 Create the standard folder hierarchies for the new features in `apps/content-management-engine/src/collections/` (DraftingSessions, StyleModifiers, AIAuditLogs, AIRateLimits), `apps/content-management-engine/src/app/api/`, and `apps/content-authoring-service/src/domain/content_drafting/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core collections, schemas, libraries, and utilities that must be completed before any User Story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Implement `ai-rate-limits` collection definition in `apps/content-management-engine/src/collections/AIRateLimits/index.ts`
- [ ] T004 [P] Implement `style-modifiers` collection definition in `apps/content-management-engine/src/collections/StyleModifiers/index.ts`
- [ ] T005 [P] Implement `ai-audit-logs` collection definition in `apps/content-management-engine/src/collections/AIAuditLogs/index.ts`
- [ ] T006 [P] Implement Postgres-backed sliding window sliding rate limiter in `apps/content-management-engine/src/services/rate-limiter.ts`
- [ ] T007 [P] Implement headless Markdown-to-Lexical JSON conversion using Payload utility packages in `apps/content-management-engine/src/services/markdown-to-lexical.ts`
- [ ] T008 Implement `drafting-sessions` collection definition (complete with partial unique constraint index on active session lock, FIFO 10-version cap hooks, and lastActivityAt updates) in `apps/content-management-engine/src/collections/DraftingSessions/index.ts`
- [ ] T009 Register new collections `drafting-sessions`, `style-modifiers`, `ai-audit-logs`, and `ai-rate-limits` in central Payload configuration `apps/content-management-engine/src/payload.config.ts`
- [ ] T010 Run pnpm generators to regenerate typescript types and custom import maps in `apps/content-management-engine/` by running `pnpm payload generate:types` and `pnpm payload generate:importmap`
- [ ] T011 [P] Implement Pydantic domain entities (`ContentDraft`, `DraftField`) in `apps/content-authoring-service/src/domain/content_drafting/models.py`
- [ ] T012 [P] Formulate LLM prompts and strict system prompt templates in `apps/content-authoring-service/src/domain/content_drafting/prompts.py`
- [ ] T013 Create database migrations for the new Python models in `apps/content-authoring-service/` by executing `venv/bin/alembic revision --autogenerate` and `venv/bin/alembic upgrade head`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Schema-Based AI Drafting (Priority: P1) 🎯 MVP

**Goal**: Enable authors to initiate conversational AI content drafting sessions where structured fields (Title, Slug, Body) stream from the AI service in real-time, auto-saving into a logical tenant-isolated DraftingSession in Postgres.

**Independent Test**: Initiate a draft session through `/api/drafting-sessions`, trigger a streaming session at `/api/ai/draft`, check the SSE stream outputs (`FIELD_START`, `TEXT_DELTA`, `FIELD_COMPLETE`), and verify draft data maps perfectly to a persisted Payload DraftingSession.

### Tests for User Story 1 (TDD - Write first!)

- [ ] T014 [P] [US1] Write FastAPI unit and mock streaming tests in `apps/content-authoring-service/tests/test_drafting_service.py`
- [ ] T015 [P] [US1] Write CMS collections and lock validation tests in `apps/content-management-engine/tests/test_drafting_sessions.ts`

### Implementation for User Story 1

- [ ] T016 [P] [US1] Build `schema_resolver` LangChain tool in `apps/content-authoring-service/src/infrastructure/tools/schema_resolver.py`
- [ ] T017 [US1] Implement primary LangChain generation workflow in `apps/content-authoring-service/src/application/drafting_service.py`
- [ ] T018 [P] [US1] Register FastAPI routing endpoints for `/api/ai/draft` in `apps/content-authoring-service/src/main.py`
- [ ] T019 [US1] Implement Next.js Custom API Routes outside Payload group: `/api/drafting-sessions` (lock checks), `/api/drafting-sessions/[id]` (auto-save and snapshot updates), and `/api/ai/draft` (SSE relay proxy that handles locale forwarding, receives token counts in the SSE metadata chunk from FastAPI, and writes a tenant-scoped `AIAuditLog` entry upon completion) in `apps/content-management-engine/src/app/api/`
- [ ] T020 [US1] Register custom admin views routing `/admin/draft/:contentTypeId` in `apps/content-management-engine/src/payload.config.ts`
- [ ] T021 [US1] Construct Main Split-View Workspace Component in `apps/content-management-engine/src/components/views/DraftingWorkspace.tsx`
- [ ] T022 [US1] Implement Chat Interface Panel and sidebar LLM selection triggers in `apps/content-management-engine/src/components/Editor/ChatPanel.tsx`
- [ ] T023 [US1] Implement structured fields, Rich Text editor wrappers, and suggestion visual indicators in `apps/content-management-engine/src/components/Editor/EditorPanel.tsx`, `apps/content-management-engine/src/components/Editor/FieldRenderer.tsx`, and `apps/content-management-engine/src/components/Editor/AISuggestIndicator.tsx` (ensuring the active editor locale is explicitly forwarded in request headers or payloads to Next.js routes)
- [ ] T024 [US1] Add proactive lock release handler `DELETE /api/drafting-sessions/[id]/lock` and register unload listeners in Next.js UI to release locks immediately on exit
- [ ] T025 [US1] Implement postgres transaction logic mapping fields, creating a `ContentItem`, and atomically dropping `DraftingSession` in Next.js promotion route `apps/content-management-engine/src/app/api/drafting-sessions/[id]/promote/route.ts`

**Checkpoint**: User Story 1 is fully functional and testable. Authors can draft, stream fields, auto-save, and save drafts into permanent CMS ContentItems.

---

## Phase 4: User Story 2 - Iterative Field Refinement (Priority: P2)

**Goal**: Enable granular field-level or selection-level AI refinements, letting authors simplify, expand, or adjust language tone via an inline floating toolbar.

**Independent Test**: Highlight text inside the body Lexical editor, trigger `/api/ai/refine` with instruction, verify revised streamed tokens replace selected text, and verify updated field triggers database auto-save.

### Tests for User Story 2

- [ ] T026 [P] [US2] Write unit and mock streaming tests for stateless refinements in `apps/content-authoring-service/tests/test_refine_service.py`

### Implementation for User Story 2

- [ ] T027 [US2] Implement stateless tone/text refinement services in `apps/content-authoring-service/src/application/refine_service.py`
- [ ] T028 [P] [US2] Add FastAPI routing `/api/ai/refine` in `apps/content-authoring-service/src/main.py`
- [ ] T029 [US2] Create proxy routing endpoint for refinements in Next.js at `apps/content-management-engine/src/app/api/ai/refine/route.ts`
- [ ] T030 [US2] Implement Lexical floating action bar UI component appearing on text selection in `apps/content-management-engine/src/components/Editor/FloatingAIBar.tsx`
- [ ] T031 [US2] Wire "AI SUGGESTS" indicator badge buttons in the Next.js editor to trigger field-level regeneration streaming from the refinement backend

**Checkpoint**: User Story 2 complete. Granular, field-level, and selection-level refinements are functional with immediate inline updates and database auto-saving.

---

## Phase 5: User Story 3 - Global Style & Tone Application (Priority: P3)

**Goal**: Support tenant-scoped style modifiers (e.g. Academic, Punchy) so all drafted content automatically adheres to the brand's specific tone guidelines.

**Independent Test**: Configure a StyleModifier with a distinct style system prompt, select it from the sidebar, request a new draft, and verify injected system prompt parameters appear in backend logs and result in appropriate voice styles.

### Tests for User Story 3

- [ ] T032 [P] [US3] Write integration tests in `apps/content-authoring-service/tests/test_drafting_service.py` ensuring system prompt construction incorporates StyleModifier parameters

### Implementation for User Story 3

- [ ] T033 [US3] Add complete admin panel CRUD capabilities and collection access control permissions for StyleModifiers in `apps/content-management-engine/src/collections/StyleModifiers/index.ts`
- [ ] T034 [US3] Implement style tone selection chip controls in `apps/content-management-engine/src/components/Editor/ChatPanel.tsx` that load dynamic lists from the database
- [ ] T035 [US3] Bind selected StyleModifier parameter to CMS proxy requests `/api/ai/draft` and `/api/ai/refine`
- [ ] T036 [US3] Modify system prompt construction algorithms in `apps/content-authoring-service/src/application/drafting_service.py` and `apps/content-authoring-service/src/application/refine_service.py` to append tone definitions dynamically

**Checkpoint**: User Story 3 complete. Style and tone prompts are managed by tenant admins, toggled by authors, and correctly shape LLM output styles.

---

## Phase 6: User Story 4 - AI-Driven Image Generation (Priority: P4)

**Goal**: Provide AI-driven image generation for upload fields using LangChain tool calling, downloading images streamingly into the Payload Media database to prevent local memory overflow.

**Independent Test**: Initiate drafting with a schema possessing an upload field, see the AI trigger an image tool call during chat, verify `/api/ai/download-image` pipes response body streams directly to Payload media, and verify final local image references render in the editor.

### Tests for User Story 4

- [ ] T037 [P] [US4] Write unit and mock tests for the LangChain tool in `apps/content-authoring-service/tests/test_image_generator.py`

### Implementation for User Story 4

- [ ] T038 [US4] Implement `image_generator` tool in `apps/content-authoring-service/src/infrastructure/tools/image_generator.py`
- [ ] T039 [US4] Register and bind `image_generator` tool to `init_chat_model` configurations in `apps/content-authoring-service/src/application/drafting_service.py`
- [ ] T040 [US4] Implement Next.js streaming API pipeline endpoint in `apps/content-management-engine/src/app/api/ai/download-image/route.ts` using `Readable.fromWeb` piping directly to Payload's Media creation local API
- [ ] T041 [US4] Add custom image previews and generation actions inside `apps/content-management-engine/src/components/Editor/EditorPanel.tsx` and `apps/content-management-engine/src/components/Editor/FieldRenderer.tsx`

**Checkpoint**: User Story 4 complete. LangChain tools generate images, which the Next.js backend downloads via streams to prevent memory bloat, updating the editor's upload fields automatically.

---

## Phase 7: User Story 5 - Draft Recovery & Version Rollback (Priority: P5)

**Goal**: Provide a 24-hour retention window for expired locks with recovery modal workflows, 10-minute lock expiration cron triggers, and 10-version JSON rollback selectors.

**Independent Test**: Artificially expire a session status, navigate to schema drafting, witness `RecoveryDialog` interrupt access, choose "Resume", select a historical snapshot from `VersionSelector`, and verify draft rollback updates structure.

### Tests for User Story 5

- [ ] T042 [P] [US5] Write frontend unit tests for the recovery modal states in `apps/content-management-engine/tests/test_drafting_workspace.spec.ts`

### Implementation for User Story 5

- [ ] T043 [US5] Implement modal recovery overlay dialog in `apps/content-management-engine/src/components/Editor/RecoveryDialog.tsx`
- [ ] T044 [US5] Implement inactivity and expired session cleanup trigger via a secure Next.js API route `POST /api/drafting-sessions/cleanup` protected by `X-Internal-Secret` verification
- [ ] T045 [US5] Implement dynamic Version Selector rollback triggers in `apps/content-management-engine/src/components/Editor/EditorPanel.tsx` that replace current fields via PATCH

**Checkpoint**: User Story 5 complete. Sessions recover cleanly from network/idle disruptions, and iteration rollbacks support safe design exploration.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, visual styling alignment, rate limiting validations, and final E2E test suites.

- [ ] T046 Refine components styling using "Alexandria — High-End Editorial" design tokens (glassmorphism floats, outfit typographic hierarchies, gold accent pills)
- [ ] T047 Integrate global "Pause/Cancel" request abort controllers and cleanup pipelines in UI streams
- [ ] T048 Write complete Playwright integration testing suites in `apps/content-management-engine/tests/test_drafting_workspace.spec.ts` (including automated latency verification ensuring the first streamed token for inline refinements is returned in under 2 seconds)
- [ ] T049 [P] Update technical design documentation files under `docs/` and add comprehensive quickstart guide verification notes
- [ ] T050 Validate quickstart guidelines, run final verification runs (benchmarking stream generation speed and rate limiter compliance), and confirm linting standards pass locally across both workspaces

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

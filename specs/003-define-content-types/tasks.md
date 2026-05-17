# Tasks: Define Content Types

**Input**: Design documents from `/specs/003-define-content-types/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This project strictly follows TDD per the Hermes AI Constitution. Test tasks are generated at the start of each User Story phase and MUST be written and fail before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **CMS Monolith**: `apps/cms/src/`, `apps/cms/tests/`
- **AI Microservice**: `apps/ai-agent-service/src/`, `apps/ai-agent-service/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, environment integration, and shared testing structures.

- [ ] T001 Configure environment variables and API routing for service communication in `apps/cms/.env` and `apps/ai-agent-service/.env`
- [ ] T002 [P] Establish internal signature verification configurations (X-Internal-Secret) in both `apps/cms/src/services/auth.ts` and `apps/ai-agent-service/src/infrastructure/auth.py`
- [ ] T003 [P] Set up testing utility helpers and database fixtures in `apps/cms/tests/utils.ts` and `apps/ai-agent-service/tests/conftest.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data schemas and persistence structures that must be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create `AIAgentSession` table models and Alembic migration in `apps/ai-agent-service/src/infrastructure/migrations/`
- [ ] T005 [P] Declare abstract agent session repository interface in `apps/ai-agent-service/src/domain/repositories/session_repository.py` (Strict DDD boundary)
- [ ] T005b [P] Implement SQLAlchemy session repository class for CRUD tracking in `apps/ai-agent-service/src/infrastructure/repositories/session_repository.py` (inherits from abstract domain interface)
- [ ] T006 Initialize empty drafts schema collection configuration for `ContentTypes` in `apps/cms/src/collections/ContentTypes/index.ts`
- [ ] T007 Initialize dynamic entry store structure for `ContentItems` collection in `apps/cms/src/collections/ContentItems/index.ts`
- [ ] T007b Initialize prompt logging collection configuration for `AIPromptHistory` in `apps/cms/src/collections/AIPromptHistory/index.ts`
- [ ] T008 [P] Register the new collections (ContentTypes, ContentItems, AIPromptHistory) in the central configuration file `apps/cms/src/payload.config.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - AI-Assisted Schema Generation (Priority: P1) 🎯 MVP

**Goal**: Describe data model in natural language and automatically suggest a structured schema with appropriate fields and validations via LangChain.

**Independent Test**: Provide various domain-specific prompts (e.g., "Create a schema for a luxury car dealership inventory") to the custom endpoint `/api/ai/generate-schema` and verify that the AI service returns a valid, multi-field schema draft.

### Tests for User Story 1 (TDD Mandatory) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Write failing pytest contract and unit tests for `/api/ai/generate-schema` in `apps/ai-agent-service/tests/test_generate_schema.py`
- [ ] T010 [P] [US1] Write failing Jest integration tests for CMS proxy handler in `apps/cms/tests/collections/ContentTypes/endpoints.spec.ts`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Implement LangChain generation prompt and structural Pydantic validators in `apps/ai-agent-service/src/domain/schema_validator.py`
- [ ] T012 [US1] Implement corrective feedback loop retry logic (up to 3 retries) on invalid field types in `apps/ai-agent-service/src/application/ai_service.py`
- [ ] T013 [US1] Expose `/api/ai/generate-schema` and `/api/ai/sessions/{session_id}` endpoints in `apps/ai-agent-service/src/main.py`
- [ ] T014 [P] [US1] Implement internal proxy endpoints to communicate with AI microservice in `apps/cms/src/collections/ContentTypes/endpoints.ts`
- [ ] T015 [US1] Build Content Architect Admin Prompt, polling/subscription handler for async generation, and Generation Preview Panel in `apps/cms/src/components/views/ContentTypes/GeneratorView.tsx` (FR-001, FR-004, NFR-001)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Schema Refinement and Validation (Priority: P1)

**Goal**: Custom visual constraint adjustments (Required, Unique, Localized, Relationships), dynamic data validation of content entries, and destructive change locks.

**Independent Test**: Add custom validation (e.g. price >= 0) or relationships, publish the schema, and attempt to add a dynamic content item. Ensure dynamic validator rejects invalid inputs and blocks destructive alterations on populated models.

### Tests for User Story 2 (TDD Mandatory) ⚠️

- [ ] T016 [P] [US2] Write failing Jest unit tests for dynamic schema parsing and validation in `apps/cms/tests/collections/ContentItems/validation.spec.ts`
- [ ] T017 [P] [US2] Write failing Jest integration tests for destructive modification checks in `apps/cms/tests/collections/ContentTypes/hooks.spec.ts`
- [ ] T018 [P] [US2] Write failing Jest unit tests for optimistic concurrency draft checks in `apps/cms/tests/collections/ContentTypes/concurrency.spec.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement dynamic field validator logic in `apps/cms/src/collections/ContentItems/validation.ts` (enforce allowed types, required validation, and check dynamic slug/name uniqueness scoped strictly to the current tenant per FR-005)
- [ ] T020 [US2] Register dynamic validation in the `beforeValidate` collection hook in `apps/cms/src/collections/ContentItems/index.ts`
- [ ] T021 [P] [US2] Implement destructive change verification checking if ContentItems exist in `apps/cms/src/collections/ContentTypes/hooks.ts` (validate that newly added required fields define fallback default values when existing items are present to prevent API crashes, per FR-005 / FR-008)
- [ ] T021b [US2] Implement uniqueness validation hook for ContentType slug/name (scoped to tenant) and ensure nested schema field slugs are mutually unique in `apps/cms/src/collections/ContentTypes/hooks.ts` (FR-005)
- [ ] T022 [US2] Implement optimistic concurrency checking (comparing updatedAt client-submitted header) in `apps/cms/src/collections/ContentTypes/hooks.ts`
- [ ] T023 [US2] Integrate refinement controls for custom field overrides, relationships, and validations in `apps/cms/src/components/views/ContentTypes/EditorView.tsx`
- [ ] T023b [US2] Implement the publish schema deployment flow, transitioning `ContentTypes` status from draft to published and applying necessary validations/registrations in `apps/cms/src/collections/ContentTypes/hooks.ts` (FR-008)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Visual Schema Modeling (Priority: P2)

**Goal**: Visual interface allowing content architects to drag-and-drop or manually configure fields from scratch without AI assistance.

**Independent Test**: Build a content type schema completely from scratch by dragging a visual Rich Text field component into the builder workspace and successfully saving.

### Tests for User Story 3 (TDD Mandatory) ⚠️

- [ ] T024 [P] [US3] Write failing Playwright E2E visual builder interaction tests in `apps/cms/tests/e2e/visual_builder.spec.ts`

### Implementation for User Story 3

- [ ] T025 [US3] Create dynamic canvas workspace supporting manual selection and re-ordering of fields in `apps/cms/src/components/views/ContentTypes/VisualCanvas.tsx`
- [ ] T026 [US3] Bind visual builder layout schema state to active `ContentType` field configurations in `apps/cms/src/components/views/ContentTypes/EditorView.tsx`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Export templates, visual refinements, security scope assertions, and developer DX polishing.

- [ ] T027 [P] Implement schema exporter generating JSON/Payload 3.x TS definitions in `apps/cms/src/services/export-service.ts`
- [ ] T027b [US2/Polish] Register custom export API controller endpoints (`/api/content-types/:id/export` and `/api/content-types/:id/export/ts`) in `apps/cms/src/collections/ContentTypes/endpoints.ts` and add download action triggers in `EditorView.tsx` (satisfying FR-011 / Principle V)
- [ ] T028 Add visual AI-suggestion diff highlight indicators in `apps/cms/src/components/views/ContentTypes/DiffView.tsx`
- [ ] T029 Enforce delivery API key scoping matches active requested tenant context in `apps/cms/src/collections/APIKeys/hooks.ts`
- [ ] T030 [P] Complete developer documentation and verify quickstart instructions in `specs/003-define-content-types/quickstart.md`
- [ ] T031 Run developer suite verification checks and execute complete test pipeline suites.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Visual model builder.

### Within Each User Story

- Tests MUST be written and fail before implementation.
- Models before services.
- Services before endpoints/views.
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Once Foundational phase completes, both User Story 1 and User Story 2 can start in parallel (different developers).
- All tests for a user story marked [P] can run in parallel.
- Services/Controllers marked [P] within a story can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch TDD tests for User Story 1 concurrently:
Task: "Write failing pytest contract and unit tests for /api/ai/generate-schema in apps/ai-agent-service/tests/test_generate_schema.py"
Task: "Write failing Jest integration tests for CMS proxy handler in apps/cms/tests/collections/ContentTypes/endpoints.spec.ts"

# Launch logic & endpoint development concurrently:
Task: "Implement LangChain generation prompt and structural Pydantic validators in apps/ai-agent-service/src/domain/schema_validator.py"
Task: "Implement internal proxy endpoints to communicate with AI microservice in apps/cms/src/collections/ContentTypes/endpoints.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently via terminal, pytest, and browser endpoints.
5. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!).
3. Add User Story 2 → Test independently → Deploy/Demo (Refinements & Dynamic Validation).
4. Add User Story 3 → Test independently → Deploy/Demo (Visual Builder fallback).
5. Each story adds robust modular value without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable and testable.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence.

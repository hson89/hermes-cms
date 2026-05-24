# Tasks: Template Builder Engine

**Input**: Design documents from `/specs/006-template-builder/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Install `dnd-kit` and related dependencies in `apps/content-management-engine/package.json`
- [ ] T002 [P] Create Builder UI component directory structure in `apps/content-management-engine/src/components/Builder/`
- [ ] T003 [P] Setup test files for template services in `apps/content-management-engine/src/services/__tests__/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core collections and Registry API needed for all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Create `BuildingBlocks` collection with tenant isolation in `apps/content-management-engine/src/collections/BuildingBlocks.ts`
- [ ] T005 [P] Create base `PageTemplates` collection with tenant isolation in `apps/content-management-engine/src/collections/PageTemplates.ts`
- [ ] T006 [P] Implement multi-tenant access control rules for all new collections in `apps/content-management-engine/src/collections/access/`
- [ ] T007 Implement block registration service logic in `apps/content-management-engine/src/services/template_service.ts`
- [ ] T008 Implement Registry API endpoint (FR-006) in `apps/content-management-engine/src/app/(payload)/api/blocks/register/route.ts`
- [ ] T009 [P] Add unit tests for block registration and tenant isolation in `apps/content-management-engine/src/services/__tests__/registration.test.ts`

**Checkpoint**: Foundation ready - visual assembly and schema mapping can now begin

---

## Phase 3: User Story 1 - Visual Template Assembly (Priority: P1) 🎯 MVP

**Goal**: Allow Content Architects to visually assemble page templates using registered blocks.

**Independent Test**: Create a template, add blocks, reorder them, and save successfully.

### Tests for User Story 1 (TDD)

- [ ] T010 [P] [US1] Create E2E test for template creation and block dragging in `apps/content-management-engine/tests/builder-assembly.spec.ts`
- [ ] T011 [P] [US1] Create unit test for layout persistence in `apps/content-management-engine/src/services/__tests__/layout.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Register custom Builder view in `apps/content-management-engine/src/payload.config.ts`
- [ ] T013 [P] [US1] Implement `BuilderCanvas` with defined dropping "Slots" (FR-003) using `dnd-kit` in `apps/content-management-engine/src/components/Builder/BuilderCanvas.tsx`
- [ ] T014 [P] [US1] Implement `BlockLibrary` component in `apps/content-management-engine/src/components/Builder/BlockLibrary.tsx`
- [ ] T015 [US1] Implement `BuilderWorkspace` entry point using `AdminView` in `apps/content-management-engine/src/components/Builder/BuilderWorkspace.tsx`
- [ ] T016 [US1] Implement template persistence logic in `apps/content-management-engine/src/components/Builder/hooks/useTemplatePersistence.ts`

**Checkpoint**: User Story 1 is functional - blocks can be assembled visually.

---

## Phase 4: User Story 2 - Schema Association (Priority: P2)

**Goal**: Map building block properties to Content Type schema fields.

**Independent Test**: Bind a "Headline" block property to a "Promo Title" field and resolve the hydrated tree.

### Tests for User Story 2 (TDD)

- [ ] T017 [P] [US2] Create unit tests for Hydrated Block Tree Resolution (FR-011) in `apps/content-management-engine/src/services/__tests__/resolution.test.ts`
- [ ] T018 [P] [US2] Create contract test for Resolution API in `apps/content-management-engine/tests/contracts/resolution.test.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Update `PageTemplates` collection with mapping JSON schema in `apps/content-management-engine/src/collections/PageTemplates.ts`
- [ ] T020 [US2] Implement `MappingPanel` component for block settings in `apps/content-management-engine/src/components/Builder/MappingPanel.tsx`
- [ ] T021 [US2] Implement tree resolution engine in `apps/content-management-engine/src/services/template_service.ts`
- [ ] T022 [US2] Create resolution delivery API endpoint in `apps/content-management-engine/src/app/(payload)/api/templates/resolve/route.ts`

**Checkpoint**: User Story 2 is functional - data bindings work and frontend can fetch hydrated trees.

---

## Phase 5: User Story 3 - Deployment to Frontend (Priority: P3)

**Goal**: Publish templates and trigger sync webhooks to HostedSites.

**Independent Test**: Click "Deploy" and verify the target HostedSite receives the webhook payload.

### Tests for User Story 3 (TDD)

- [ ] T023 [P] [US3] Create integration test for deployment webhook trigger in `apps/content-management-engine/tests/deployment-webhooks.spec.ts`

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create `TemplateDeployments` collection with tenant isolation in `apps/content-management-engine/src/collections/TemplateDeployments.ts`
- [ ] T025 [P] [US3] Add `templateSyncWebhookUrl` field to `HostedSites` collection in `apps/content-management-engine/src/collections/HostedSites.ts`
- [ ] T026 [US3] Implement pre-deployment validation logic (FR-009) in `apps/content-management-engine/src/services/template_service.ts`
- [ ] T027 [US3] Extend `deployment_service.ts` to handle template sync events in `apps/content-management-engine/src/services/deployment_service.ts`
- [ ] T028 [US3] Implement `DeploymentToolbar` with validation feedback and status indicator in `apps/content-management-engine/src/components/Builder/DeploymentToolbar.tsx`

**Checkpoint**: User Story 3 is functional - templates can be deployed to production environments.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reliability, UI polish, and documentation

- [ ] T029 [P] Implement block deprecation logic and UI warnings (FR-012) in `apps/content-management-engine/src/services/template_service.ts`
- [ ] T030 [P] Apply Alexandria design system tokens and `:has()` reset rules in `apps/content-management-engine/src/app/(payload)/admin/globals.css`
- [ ] T031 [P] Implement Optimistic Concurrency Control (OCC) hooks for `PageTemplates` in `apps/content-management-engine/src/collections/PageTemplates.ts`
- [ ] T032 [P] Create performance benchmark for Resolution Engine (SC-004) in `apps/content-management-engine/src/services/__tests__/performance.test.ts`
- [ ] T033 [P] Perform manual UX validation: Assemble a 5-block landing page template (SC-001 goal: < 10 mins)
- [ ] T034 [P] Update `docs/architecture.md` with the new Template Builder Engine architecture
- [ ] T035 Final verification against `quickstart.md` manual scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - must run first.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion. US1 is the primary focus.
- **Polish (Phase 6)**: Depends on all user stories being functionally complete.

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2.
- **US2 (P2)**: Depends on US1 (needs a layout to map fields to).
- **US3 (P3)**: Depends on US1 and US2 (needs a valid, mapped template to deploy).

### Parallel Opportunities

- T004, T005, and T006 (Collections & Access) can be created in parallel.
- US1 UI components (T013, T014) can be built in parallel.
- All tasks marked [P] can run concurrently if managed in separate turns.

---

## Parallel Example: Foundational Phase

```bash
# Define collections in parallel
Task: "Create BuildingBlocks collection in apps/content-management-engine/src/collections/BuildingBlocks.ts"
Task: "Create base PageTemplates collection in apps/content-management-engine/src/collections/PageTemplates.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational collections.
2. Implement the Block Registry API (required to see any blocks in the builder).
3. Build the Builder UI shell and Drag & Drop canvas.
4. Verify that a template can be saved with a valid block sequence.

### Incremental Delivery

1. **Foundation**: API and Collections live.
2. **Visual Builder**: US1 completes. Architects can design layouts.
3. **Data Mapping**: US2 completes. Developers can bind data.
4. **Live Deployment**: US3 completes. Managers can push to production.

---

## Notes

- All Payload custom components MUST use named exports.
- Use `AdminView` for the builder workspace to maintain layout consistency.
- TDD: Write tests in `tests/` or `src/**/__tests__/` before implementing features.
- Multi-tenancy must be enforced via Payload's standard `tenant` field patterns.

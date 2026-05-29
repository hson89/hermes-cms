# Tasks: Template Builder Engine

**Input**: Design documents from `/specs/006-template-builder/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 [P] Install `dnd-kit` and related dependencies in `apps/content-management-engine/package.json`
- [X] T002 [P] Create Builder UI component directory structure in `apps/content-management-engine/src/components/Builder/`
- [X] T003 [P] Setup test files for template services in `apps/content-management-engine/src/services/__tests__/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core collections and Registry API needed for all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `BuildingBlocks` collection with tenant isolation in `apps/content-management-engine/src/collections/BuildingBlocks.ts`
- [X] T005 [P] Create base `PageTemplates` collection with tenant isolation in `apps/content-management-engine/src/collections/PageTemplates.ts`
- [X] T006 [P] Implement multi-tenant access control rules for all new collections in `apps/content-management-engine/src/collections/access/`
- [X] T007 Implement block registration service logic in `apps/content-management-engine/src/services/template_service.ts`
- [X] T008 Implement Registry API endpoint (FR-006) in `apps/content-management-engine/src/app/(payload)/api/blocks/register/route.ts`
- [X] T009 [P] Add unit tests for block registration and tenant isolation in `apps/content-management-engine/src/services/tests/registration.test.ts`

**Checkpoint**: Foundation ready - visual assembly and schema mapping can now begin

---

## Phase 3: User Story 1 - Visual Template Assembly (Priority: P1) 🎯 MVP

**Goal**: Allow Content Architects to visually assemble page templates using registered blocks.

**Independent Test**: Create a template, add blocks, reorder them, and save successfully.

### Tests for User Story 1 (TDD)

- [X] T010 [P] [US1] Create E2E test for template creation and block dragging in `apps/content-management-engine/tests/builder-assembly.spec.ts`
- [X] T011 [P] [US1] Create unit test for layout persistence in `apps/content-management-engine/src/services/tests/layout.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Register custom Builder view in `apps/content-management-engine/src/payload.config.ts`
- [X] T013 [P] [US1] Implement `BuilderCanvas` with defined dropping "Slots" (FR-003) using `dnd-kit` in `apps/content-management-engine/src/components/Builder/BuilderCanvas.tsx`
- [X] T014 [P] [US1] Implement `BlockLibrary` component in `apps/content-management-engine/src/components/Builder/BlockLibrary.tsx`
- [X] T015 [US1] Implement `BuilderWorkspace` entry point using `AdminView` in `apps/content-management-engine/src/components/Builder/BuilderWorkspace.tsx`
- [X] T016 [US1] Implement template persistence logic in `apps/content-management-engine/src/components/Builder/hooks/useTemplatePersistence.ts`

**Checkpoint**: User Story 1 is functional - blocks can be assembled visually.

---

## Phase 4: User Story 2 - Schema Association (Priority: P2)

**Goal**: Map building block properties to Content Type schema fields.

**Independent Test**: Bind a "Headline" block property to a "Promo Title" field and resolve the hydrated tree.

### Tests for User Story 2 (TDD)

- [X] T017 [P] [US2] Create unit tests for Hydrated Block Tree Resolution (FR-011) in `apps/content-management-engine/src/services/tests/resolution.test.ts`
- [X] T018 [P] [US2] Create contract test for Resolution API in `apps/content-management-engine/tests/contract/resolution.test.ts`

### Implementation for User Story 2

- [X] T019 [P] [US2] Update `PageTemplates` collection with mapping JSON schema in `apps/content-management-engine/src/collections/PageTemplates.ts`
- [X] T020 [US2] Implement `MappingPanel` component for block settings in `apps/content-management-engine/src/components/Builder/MappingPanel.tsx`
- [X] T021 [US2] Implement tree resolution engine in `apps/content-management-engine/src/services/template_service.ts`
- [X] T022 [US2] Create resolution delivery API endpoint in `apps/content-management-engine/src/app/(payload)/api/content/[id]/hydrate/route.ts`

**Checkpoint**: User Story 2 is functional - data bindings work and frontend can fetch hydrated trees.

---

## Phase 5: User Story 3 - Deployment to Frontend (Priority: P3)

**Goal**: Publish templates and trigger sync webhooks to HostedSites.

**Independent Test**: Click "Deploy" and verify the target HostedSite receives the webhook payload.

### Tests for User Story 3 (TDD)

- [X] T023 [P] [US3] Create integration test for deployment webhook trigger in `apps/content-management-engine/tests/deployment-webhooks.spec.ts`

### Implementation for User Story 3

- [X] T024 [P] [US3] Create `TemplateDeployments` collection with tenant isolation in `apps/content-management-engine/src/collections/TemplateDeployments.ts`
- [X] T025 [P] [US3] Add `templateSyncWebhookUrl` field to `HostedSites` collection in `apps/content-management-engine/src/collections/HostedSites.ts`
- [X] T026 [US3] Implement pre-deployment validation logic (FR-009) in `apps/content-management-engine/src/services/template_service.ts`
- [X] T027 [US3] Extend `deployment_service.ts` to handle template sync events in `apps/content-management-engine/src/services/deployment_service.ts`
- [X] T028 [US3] Implement `DeploymentToolbar` with validation feedback and status indicator in `apps/content-management-engine/src/components/Builder/DeploymentToolbar.tsx`

**Checkpoint**: User Story 3 is functional - templates can be deployed to production environments.

---

## Phase 7: Refined Implementation & Design Fidelity (ACTIVE)

**Goal**: Implement high-fidelity design, fix dnd-kit interaction bugs, and enforce strict schema alignment.

### Requirements Checklist
- [X] **R001**: High-fidelity `BuildingBlockLibrary` view matching user design.
- [X] **R002**: Fix dnd-kit collision indexing for library-to-canvas insertion.
- [X] **R003**: Enforce 8px activation distance for PointerSensor.
- [X] **R004**: Implement `instanceId` for deterministic layout tracking.
- [X] **R005**: Schema alignment `beforeValidate` hook for ContentType changes.
- [X] **R006**: Multi-tenant isolation for usage metrics.

### Tasks
- [X] T036 [P] Update `BuildingBlocks` collection with `category` and `status` fields in `apps/content-management-engine/src/collections/BuildingBlocks/index.ts`.
- [X] T037 Update `PageTemplates` collection to include `instanceId` and `validationMetadata` in `apps/content-management-engine/src/collections/PageTemplates/index.ts`.
- [X] T038 Implement high-fidelity `BuildingBlockLibrary.tsx` view matching provided design.
- [X] T039 Refactor `BuilderWorkspace.tsx` to fix collision indexing and add activation distance constraints.
- [X] T040 Update `BuilderCanvas.tsx` to use `instanceId` as the Sortable key.
- [X] T041 Implement `checkMappingHealth()` in `template_service.ts`.
- [X] T042 Add `beforeValidate` hook to `ContentTypes` to trigger mapping health checks.
- [X] T043 Add tenant-scoping to usage metrics in `template_service.ts`.
- [X] T044 Create unit tests for `checkMappingHealth` and tenant-scoped metrics.
- [X] T045 Update `specs/006-template-builder/data-model.md` and `research.md`.

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

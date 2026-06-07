# Tasks: Template Deployment History

**Input**: Design documents from `/specs/009-template-deployment-history/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: This implementation follows TDD as requested by the user ("ensure necessary tests across test pyramid").

**Organization**: Tasks are grouped by user story to enable incremental delivery and independent testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial wiring and navigation setup.

- [X] T001 Register custom view `TemplateHistoryPage` in `apps/content-management-engine/src/payload.config.ts` mapping to `/templates/history`
- [X] T002 Verify Deployment History link in `apps/content-management-engine/src/constants/navigation.ts` correctly points to the new route

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish test foundation and verify API connectivity.

- [X] T003 Create integration test for tenant-scoped API access in `apps/content-management-engine/tests/integration/template-deployments-api.test.ts`
- [X] T004 [P] Create E2E test skeleton in `apps/content-management-engine/tests/e2e/template-history.spec.ts` that navigates to the page and checks for the header

---

## Phase 3: User Story 1 - View Deployment History (Priority: P1) 🎯 MVP

**Goal**: Render a list of deployment records with core metadata in the Alexandria design style.

**Independent Test**: Navigate to `/admin/templates/history` and see a table populated with deployment records.

### Tests for User Story 1 (TDD) ⚠️

- [X] T005 [P] [US1] Add E2E test case to `apps/content-management-engine/tests/e2e/template-history.spec.ts` to verify table rendering with mock data
- [X] T006 [P] [US1] Add unit tests for status badge color mapping and date formatting in `apps/content-management-engine/tests/unit/status-mapping.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Scaffold `TemplateHistoryPage.tsx` in `apps/content-management-engine/src/components/views/` with `AdminView` and `RegistryHeader`
- [X] T008 [US1] Implement `fetchDeployments` effect using `fetch` to `/api/template-deployments?limit=10&depth=1`
- [X] T009 [US1] Integrate `RegistryTable` with columns for Template (Avatar), Site, Status, and Date
- [X] T010 [US1] Implement column rendering helpers for `status` (Alexandria Badge colors) and `createdAt` (Relative time)

**Checkpoint**: User Story 1 complete. Basic history list is functional and tested.

---

## Phase 4: User Story 2 - Search and Filter History (Priority: P2)

**Goal**: Enable troubleshooting via name search and status filtering.

**Independent Test**: Enter a template name in search or click a status chip; verify the list updates correctly.

### Tests for User Story 2 (TDD) ⚠️

- [X] T011 [P] [US2] Add E2E test case in `apps/content-management-engine/tests/e2e/template-history.spec.ts` for search and filter interaction

### Implementation for User Story 2

- [X] T012 [US2] Integrate `SearchInput` component and manage `search` state with `useDebounce`
- [X] T013 [US2] Integrate `FilterChips` component and manage `statusFilter` state ('all' | 'pending' | 'success' | 'failed')
- [X] T014 [US2] Update `fetchDeployments` to include `where` query parameters for search (template.name) and status

**Checkpoint**: User Story 2 complete. Troubleshooting tools (search/filter) are functional and tested.

---

## Phase 5: User Story 3 - Pagination (Priority: P3)

**Goal**: Ensure performance and usability for large histories.

**Independent Test**: Click "Next Page" and verify new records are loaded.

### Tests for User Story 3 (TDD) ⚠️

- [X] T015 [P] [US3] Add E2E test case in `apps/content-management-engine/tests/e2e/template-history.spec.ts` for pagination controls

### Implementation for User Story 3

- [X] T016 [US3] Integrate `RegistryPagination` component and manage `page` state
- [X] T017 [US3] Update `fetchDeployments` to use current `page` and update `totalPages`/`totalDocs` states

**Checkpoint**: All user stories complete. System is scalable and functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual refinements and layout safety.

- [X] T018 Add isolation class `custom-history-view` to wrapper and verify Alexandria layout offsets (18rem sidebar)
- [X] T019 [P] Add deep-ancestor layout reset for the history view in `apps/content-management-engine/src/app/globals.css`
- [X] T020 Run full test suite (`pnpm test` and Playwright) to ensure no regressions

---

## Dependencies & Execution Order

1. **Setup (T001-T002)**: Must be done first to enable routing.
2. **Foundational (T003-T004)**: Establish tests before implementation.
3. **User Story 1 (T005-T010)**: MVP list view.
4. **User Story 2 & 3**: Can be done in parallel after US1 is stable.

## Parallel Opportunities

- T003 (Integration) and T004 (E2E Skeleton) can run in parallel.
- T012 (Search) and T013 (Filter) can be implemented in parallel.
- T019 (CSS) can be done anytime after the component scaffold is created (T007).

---

## Implementation Strategy: MVP First

We will first deliver the basic list view (User Story 1) which provides the core value. Search, filtering, and pagination will be added as incremental enhancements, each with its own TDD cycle.

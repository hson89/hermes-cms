# Tasks: Template Builder Agent

**Input**: Design documents from `/specs/008-template-builder-agent/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and domain schema setup.

- [x] T001 Create domain folder `apps/content-authoring-service/src/domain/template_builder`
- [x] T002 Implement Pydantic structured output models (`TemplateBuilderOutput`, `FieldDefinition`, `BlockMapping`) in `apps/content-authoring-service/src/domain/template_builder/structures.py`
- [x] T003 Setup environment configuration for new template builder graph (recursion limits, timeouts) in `apps/content-authoring-service/src/infrastructure/config.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core client operations that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Extend `CMSClient` in `apps/content-authoring-service/src/infrastructure/clients/cms_client.py` with ContentType query, create, and update REST methods.
- [x] T005 Extend `CMSClient` in `apps/content-authoring-service/src/infrastructure/clients/cms_client.py` with PageTemplate query, create, and update REST methods.
- [ ] T006 Extend `CMSClient` in `apps/content-authoring-service/src/infrastructure/clients/cms_client.py` with BuildingBlock query/list methods.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Content Schema generation from HTML design (Priority: P1) 🎯 MVP

**Goal**: Parse HTML layouts and create/update Content Type schemas in the CMS.

**Independent Test**: Send raw HTML to the agent, verify it generates and registers a matching Content Type schema in the CMS.

### Tests for User Story 1 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Write unit tests for HTML layout parsing, field extraction, and Content Type registration in `apps/content-authoring-service/tests/application/graphs/test_template_builder.py`

### Implementation for User Story 1

- [x] T008 [US1] Create the schema analysis and persistence nodes (`analyze_html_and_suggest_node`, `save_to_cms_node`) in `apps/content-authoring-service/src/application/nodes/template_builder_nodes.py`
- [x] T009 [US1] Build the LangGraph compiler and builder configuration in `apps/content-authoring-service/src/application/graphs/template_builder_graph.py`
- [x] T010 [US1] Create the orchestration service `apps/content-authoring-service/src/application/template_builder_service.py` to run the graph and parse results.
- [x] T011 [US1] Mount the endpoint `POST /api/ai/template-builder/generate` in `apps/content-authoring-service/src/main.py`

**Checkpoint**: User Story 1 is fully functional - HTML layouts can be parsed and Content Types registered.

---

## Phase 4: User Story 2 - Reusable Page Template generation from HTML design (Priority: P2)

**Goal**: Convert HTML code into parameterized Page Templates linked to generated Content Types.

**Independent Test**: Verify the Page Template contains parameterized placeholder slots (`{{ field_name }}`) and links to the generated Content Type.

### Tests for User Story 2 (TDD) ⚠️

- [x] T012 [P] [US2] Write unit tests for Page Template parameterization and layout block mappings in `apps/content-authoring-service/tests/application/graphs/test_template_builder.py`

### Implementation for User Story 2

- [x] T013 [US2] Extend template nodes in `apps/content-authoring-service/src/application/nodes/template_builder_nodes.py` to identify dynamic sections and substitute with placeholder tokens.
- [x] T014 [US2] Update `apps/content-authoring-service/src/application/graphs/template_builder_graph.py` to orchestrate PageTemplate creation and relate it 1-to-1 to the ContentType.
- [x] T015 [US2] Verify Page Template mapping resolution and registration in `apps/content-authoring-service/src/application/template_builder_service.py`.

**Checkpoint**: User Story 2 is functional - reusable page templates are successfully registered.

---

## Phase 5: User Story 3 - MCP and SSE Integration (Priority: P3)

**Goal**: Access the template builder agent via external MCP tools.

**Independent Test**: Call the MCP tool `convert_html_to_template` with design input and check if it runs the conversion successfully.

### Tests for User Story 3 (TDD) ⚠️

- [ ] T016 [P] [US3] Write unit tests for the MCP tool mapping and session context execution in `apps/content-authoring-service/tests/application/mcp/test_template_builder_mcp.py`

### Implementation for User Story 3

- [ ] T017 [US3] Implement template builder tool registration and execution in `apps/content-authoring-service/src/application/mcp/server.py`
- [ ] T018 [US3] Map the template builder parameters and format text/A2UI output in `apps/content-authoring-service/src/application/mcp/tools.py`

**Checkpoint**: All user stories are complete and accessible externally.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, testing validation, and documentation.

- [ ] T019 [P] Update documentation in `specs/008-template-builder-agent/quickstart.md`
- [ ] T020 Run end-to-end integration tests and verify multi-tenant isolation constraints
- [ ] T021 Clean up unused imports, comply with formatting rules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must run first.
- **Foundational (Phase 2)**: Depends on Setup, BLOCKS all user stories.
- **User Stories (Phases 3+)**: Depend on Foundational completion.
- **Polish (Phase 6)**: Runs after all user stories are complete.

### Parallel Opportunities

- All Setup tasks (T001, T002, T003) can run in parallel.
- All Foundational tasks (T004, T005, T006) can run in parallel.
- Tests within each phase (T007, T012, T016) are marked [P] and can run in parallel with setup configurations.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup domains and models.
2. Extend `CMSClient` for Content Type CRUD.
3. Build the LangGraph parsing flow.
4. Mount the API endpoint and verify it generates a CMS Content Type schema from HTML.

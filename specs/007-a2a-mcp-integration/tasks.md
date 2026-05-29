# Tasks: A2A, MCP & A2UI Integration

**Input**: Design documents from `/specs/007-a2a-mcp-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Write all tests FIRST (Test-Driven Development) to verify correct validation, auth scoping, SSE connections, and A2UI formatting before starting actual implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, virtualenv configuration, and core dependency installation.

- [ ] T001 Add `mcp` SDK to Python dependencies list in `apps/content-authoring-service/requirements.txt`
- [ ] T002 Configure Python virtualenv and install new dependencies in `apps/content-authoring-service/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core authentication, internal REST validation, and service-to-service communication.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Write Jest unit tests for the Next.js API key validation route in `apps/content-management-engine/tests/api/api-keys/validate.test.ts`
- [ ] T004 Implement custom Payload API key validation Route Handler in `apps/content-management-engine/src/app/(payload)/api/api-keys/validate/route.ts`
- [ ] T005 [P] Write pytest unit tests for the CMS Client in `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- [ ] T006 Implement `CMSClient` class inside `apps/content-authoring-service/src/infrastructure/clients/cms_client.py` to communicate with Payload CMS validation endpoint
- [ ] T007 Implement ephemeral `MCPSessionContext` and in-memory session registry inside `apps/content-authoring-service/src/application/mcp/session.py`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Direct Interaction via Claude Desktop (Priority: P1) 🎯 MVP

**Goal**: Connect Claude Desktop to Hermes CMS using the Model Context Protocol (MCP) so that a content creator can draft and manage content using Hermes AI Agents directly within their AI tool.

**Independent Test**: Configure Claude Desktop with the Hermes MCP server (using the workspace wrapper script `scripts/run-mcp-stdio.sh` or `.ps1`) and successfully call a "Draft Content" tool from the Claude interface.

### Tests for User Story 1
- [ ] T008 [P] [US1] Write pytest tests for stdio transport and JSON-RPC message exchange in `apps/content-authoring-service/tests/application/mcp/test_mcp_stdio.py`

### Implementation for User Story 1
- [ ] T009 [P] [US1] Implement dynamic mapping of Hermes agent capabilities to MCP tools in `apps/content-authoring-service/src/application/mcp/tools.py`
- [ ] T010 [US1] Implement the core MCP server module with stdio transport interface in `apps/content-authoring-service/src/application/mcp/server.py`
- [ ] T011 [US1] Write Unix developer bootstrap shell script at `scripts/run-mcp-stdio.sh`
- [ ] T012 [US1] Write Windows developer bootstrap PowerShell script at `scripts/run-mcp-stdio.ps1`
- [ ] T013 [US1] Integrate standard Langfuse logging and trace grouping for all tool invocations inside `apps/content-authoring-service/src/application/mcp/server.py`

**Checkpoint**: User Story 1 (Claude stdio integration) is fully functional and testable.

---

## Phase 4: User Story 2 - Agent-to-Agent (A2A) Collaboration (Priority: P2)

**Goal**: Allow external AI assistants (like ChatGPT or custom LangChain agent) to delegate specific CMS tasks to Hermes Agents via standard Server-Sent Events (SSE) transport protocol.

**Independent Test**: Run a curl/script to connect to `/api/v1/mcp/sse` and verify it establishes a stream and successfully returns a tool response for `POST /api/v1/mcp/message`.

### Tests for User Story 2
- [ ] T014 [P] [US2] Write pytest integration tests for SSE connection and client JSON-RPC endpoint in `apps/content-authoring-service/tests/application/mcp/test_mcp_sse.py`

### Implementation for User Story 2
- [ ] T015 [P] [US2] Implement the SSE connection registry and protocol mapping in `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- [ ] T016 [US2] Register SSE route `GET /api/v1/mcp/sse` and message route `POST /api/v1/mcp/message` in `apps/content-authoring-service/src/main.py`

**Checkpoint**: User Story 2 (SSE connection streaming) is functional.

---

## Phase 5: User Story 3 - Rich Visual Feedback (A2UI / AGUI) (Priority: P2)

**Goal**: Provide rich, interactive UI components (like tables, charts, or content previews) directly in the AI interface utilizing Alexandria design system tokens.

**Independent Test**: Call the drafting agent via Claude or curl and verify that the response payload includes a `visual` block conforming to the Alexandria component schema.

### Tests for User Story 3
- [ ] T017 [P] [US3] Write pytest schema validation tests for agent-emitted A2UI components in `apps/content-authoring-service/tests/application/mcp/test_a2ui.py`

### Implementation for User Story 3
- [ ] T018 [US3] Define A2UI JSON schema/classes and Alexandria token style mapper inside `apps/content-authoring-service/src/application/mcp/a2ui.py`
- [ ] T019 [US3] Integrate A2UI visual response blocks into agent tool result formatting inside `apps/content-authoring-service/src/application/mcp/tools.py`

**Checkpoint**: User Story 3 (A2UI JSON payload generation) is functional.

---

## Phase 6: User Story 4 - Capability Discovery (Priority: P3)

**Goal**: Expose an endpoint or list mechanism so that external tools or agents can automatically discover what Hermes Agents are available and what specific tools they offer.

**Independent Test**: Query the MCP tool discovery endpoint and verify it returns all registered agents dynamically.

### Tests for User Story 4
- [ ] T020 [P] [US4] Write pytest tests for dynamic tool listing and schema discovery in `apps/content-authoring-service/tests/application/mcp/test_discovery.py`

### Implementation for User Story 4
- [ ] T021 [US4] Support dynamic agent lookup and automated discovery payload generation inside `apps/content-authoring-service/src/application/mcp/server.py`

**Checkpoint**: Dynamic capability discovery is functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Refactoring, optimization, security auditing, and documentation.

- [ ] T022 [P] Create and update user guides/docs in `docs/architecture.md` and `specs/007-a2a-mcp-integration/quickstart.md`
- [ ] T023 Code cleanup, PEP-8 compliance, and type annotations verification in all new python files
- [ ] T024 Run end-to-end integration checklist and verify Claude Desktop connection

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2 → P3).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable.
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2/US3 but should be independently testable.

### Within Each User Story

- Tests MUST be written and FAIL before implementation.
- Models before services.
- Services before endpoints.
- Core implementation before integration.
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows).
- All tests for a user story marked [P] can run in parallel.
- Models within a story marked [P] can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write pytest tests for stdio transport and JSON-RPC message exchange in apps/content-authoring-service/tests/application/mcp/test_mcp_stdio.py"

# Launch all models/tools mapping for User Story 1:
Task: "Implement dynamic mapping of Hermes agent capabilities to MCP tools in apps/content-authoring-service/src/application/mcp/tools.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently in Claude Desktop
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

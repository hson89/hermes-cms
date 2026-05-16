---
description: "Task list template for feature implementation"
---

# Tasks: Multi-tenant Headless CMS

**Input**: Design documents from `/specs/001-ai-headless-cms/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included based on the Test-First requirement in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **CMS app**: `apps/cms/`
- **AI Microservice**: `apps/ai-agent-service/`
- **Frontend Starters**: `apps/frontend-starters/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize Payload CMS project (Node.js 24+, TypeScript, Payload CMS 3.84+) in apps/cms/
- [x] T003 Initialize FastAPI Microservice project (Python 3.12+, FastAPI 0.136+) in apps/ai-agent-service/
- [x] T004 [P] Setup Python virtual environment in apps/ai-agent-service/
- [x] T005 [P] Configure Jest and Playwright in apps/cms/ and pytest in apps/ai-agent-service/
- [x] T006 [P] Setup Docker/Kubernetes configurations in docker/ and k8s/
- [x] T006a [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Setup PostgreSQL database schema and migrations for Payload CMS
- [x] T008 Setup separate database for AI Microservice
- [x] T009 Implement multi-tenancy using @payloadcms/plugin-multi-tenant in apps/cms/src/payload.config.ts
- [x] T010 [P] Configure message broker (Kafka or RabbitMQ) connection in both CMS and AI service
- [x] T011 [P] Setup base Payload Auth collections (Users & APIKeys) in apps/cms/src/collections/Users/ and apps/cms/src/collections/APIKeys/
- [x] T012 [P] Setup base Tenant collection in apps/cms/src/collections/Tenants/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI-Powered Content Creation (Priority: P1) 🎯 MVP

**Goal**: Users converse with an AI Agent through natural language to describe and generate complex, structured content schemas and initial drafts.

**Independent Test**: Can be fully tested by simulating a conversation with the AI interface to output a generated content structure and initial text.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Integration test for AI content creation flow in apps/ai-agent-service/tests/integration/test_ai_creation.py

### Implementation for User Story 1

- [x] T014 [P] [US1] Create AIAgentSession model in apps/ai-agent-service/src/domain/ai_agent_session/models.py
- [x] T015 [P] [US1] Implement Payload ContentType dynamic schema logic in apps/cms/src/collections/ContentTypes/index.ts
- [x] T016 [US1] Implement AI Agent service with LangChain 1.2+ for schema/content generation in apps/ai-agent-service/src/application/ai_service.py
- [x] T017 [US1] Implement POST /api/ai/generate-schema custom endpoint in apps/cms/src/collections/ContentTypes/endpoints.ts
- [x] T018 [US1] Integrate CMS endpoint with AI Microservice via message broker or REST

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Content Refinement via Traditional Editor with AI Copilot (Priority: P1)

**Goal**: After AI generation, users can open the drafted content in a traditional rich-text/block editor to make manual adjustments, while the AI Agent remains available as a side-by-side copilot for continuous back-and-forth updates.

**Independent Test**: Can be fully tested by opening an existing piece of content in the editor, making manual edits, and asking the copilot to adjust a specific section successfully.

- [x] T019 [P] [US2] Integration test for AI copilot edits in apps/cms/tests/integration/test_copilot_edits.ts
- [x] T020 [P] [US2] Create ContentItem collection in apps/cms/src/collections/ContentItems/index.ts
- [x] T021 [US2] Implement Block-based JSON AGUI editor in Payload Admin UI in apps/cms/src/components/Editor/
- [x] T022 [US2] Implement POST /api/ai/copilot/edit endpoint in apps/cms/src/collections/ContentItems/endpoints.ts
- [x] T023 [US2] Implement AI service logic for localized section editing in apps/ai-agent-service/src/application/copilot_service.py
- [x] T024 [US2] Integrate side-by-side copilot UI with traditional editor in apps/cms/src/components/Editor/CopilotSidebar.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - API-First Content Delivery (Priority: P1)

**Goal**: Developers can query the CMS via robust APIs to retrieve structured content for use in any front-end application or device.

**Independent Test**: Can be fully tested by making HTTP requests to the content delivery API and validating the response schema and data.

- [x] T025 [P] [US4] Contract test for content delivery API in apps/cms/tests/contract/test_delivery_api.ts
- [x] T026 [US4] Configure Payload CMS default REST and GraphQL endpoints for ContentItem
- [x] T027 [US4] Implement Tenant isolation checks on delivery endpoints in apps/cms/src/collections/ContentItems/access.ts
- [x] T028 [US4] Add APIKey authentication middleware for delivery endpoints

**Checkpoint**: User stories 1, 2, and 4 should be functional.

---

## Phase 6: User Story 3 - Self-Hosted Front-end Starter Deployment (Priority: P2)

**Goal**: Users can select from a gallery of managed front-end starter templates and deploy them directly onto the CMS's own infrastructure, automatically pre-configured with API connections to their tenant's content.

**Independent Test**: Can be fully tested by selecting a template and verifying the deployed site successfully serves content from the CMS's internal hosting infrastructure.

### Tests for User Story 3 ⚠️

- [x] T029 [P] [US3] Integration test for template deployment in apps/cms/tests/integration/test_deployment.ts
- [x] T030 [P] [US3] Create HostedSite collection in apps/cms/src/collections/HostedSites/index.ts
- [x] T031 [US3] Create Next.js and Astro starter templates in apps/frontend-starters/
- [x] T032 [US3] Implement internal deployment infrastructure orchestration service in apps/cms/src/services/deployment_service.ts
- [x] T033 [US3] Build deployment UI inside Payload Admin for tenant users

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T034 [P] Documentation updates in docs/ and README.md
- [x] T035 Run automated linters (ESLint, Ruff) and ensure zero warnings before final review
- [x] T036 Performance optimization (ensure <200ms p95 API response)
- [x] T037 Write automated test asserting cross-tenant data requests fail with 403 Forbidden to validate access controls
- [x] T038 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2)
- **User Story 4 (P1)**: Can start after Foundational (Phase 2)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1:
Task: T013 Integration test for AI content creation flow

# Launch models/setup for User Story 1 together:
Task: T014 Create AIAgentSession model
Task: T015 Implement Payload ContentType dynamic schema logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Add User Story 3 → Test independently → Deploy/Demo
y → Deploy/Demo
dently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Add User Story 3 → Test independently → Deploy/Demo
y → Deploy/Demo
dently → Deploy/Demo
mo
dependently → Deploy/Demo
5. Add User Story 3 → Test independently → Deploy/Demo
y → Deploy/Demo
dently → Deploy/Demo

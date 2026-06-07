# Implementation Plan: Template Builder Agent

**Branch**: `008-template-builder-agent` | **Date**: 2026-06-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-template-builder-agent/spec.md`

## Summary

Implementation of the Template Builder Agent in the Content Authoring Service. This agent parses raw HTML designs, extracts dynamic content structures, creates/updates corresponding Content Type schemas, parameterizes the HTML with placeholder tokens, and registers the Page Template in Payload CMS.

Key technical components:
1. **CMS Client Extensions**: Extending `CMSClient` in the `infrastructure/` layer to support querying, creating, and updating Content Types and Page Templates, and retrieving registered building blocks.
2. **LangGraph State Machine**: Implement a new `template_builder_graph` executing design extraction and CMS registration steps with self-correction/healing.
3. **Structured Outputs**: Use Pydantic structures for schema/template definition and layout mappings.
4. **FastAPI Endpoints**: Expose `POST /api/ai/template-builder/generate` to orchestrate this flow internally.
5. **MCP Server Tool**: Register `convert_html_to_template` in FastMCP for stdio/SSE integrations.

## Technical Context

**Language/Version**: Python 3.14+, TypeScript 6.0+, Node.js 26+  
**Primary Dependencies**: FastAPI 0.136+, LangChain 1.2+, langgraph, pydantic, httpx, Payload CMS 3.84+  
**Storage**: PostgreSQL 18 (via Payload CMS collections)  
**Testing**: pytest (for FastAPI graphs/endpoints)  
**Target Platform**: Linux Server / Web API  
**Project Type**: web-service (Agent service extension)  
**Performance Goals**: Design ingestion & registration completed in <15 seconds  
**Constraints**:
- **Strict Multi-tenant Isolation**: All schema/template operations must be scoped and authorized using the tenant ID.
- **Internal Secret Security**: Inter-service REST calls authenticated via `X-Internal-Secret` header.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Condition | Status |
|-----------|-----------|--------|
| Multi-tenancy | All database and API operations for Content Types and Page Templates must be tenant-scoped. | ✅ PASS |
| AI-First | Conversational/AI-driven template generation is the primary engine. | ✅ PASS |
| API-First | Access is exposed via REST API and MCP. | ✅ PASS |
| Test-First | pytest mock and end-to-end tests for the new graph and endpoints. | ✅ PASS |
| DDD Boundaries | Core models in `domain/`, graph in `application/`, client in `infrastructure/`. | ✅ PASS |
| Hybrid Arch | Communicate with CMS Monolith using REST client with internal headers. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/008-template-builder-agent/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions and state schemas
├── data-model.md        # Input/output entity schemas
├── quickstart.md        # Setup and verification instructions
├── contracts/
│   └── api.md           # API/MCP endpoint contracts
└── tasks.md             # Implementation tasks (generated in next phase)
```

### Source Code

```text
apps/content-authoring-service/
├── src/
│   ├── domain/
│   │   └── template_builder/         # [NEW] Domain representations & Pydantic outputs
│   │       ├── __init__.py
│   │       └── structures.py         # Pydantic schemas for LLM structured output
│   ├── application/
│   │   ├── graphs/
│   │   │   └── template_builder_graph.py # [NEW] LangGraph state machine config
│   │   ├── nodes/
│   │   │   └── template_builder_nodes.py # [NEW] LLM invocation & CMS persistence nodes
│   │   └── template_builder_service.py # [NEW] Application orchestration service
│   ├── infrastructure/
│   │   └── clients/
│   │       └── cms_client.py         # [MODIFY] Added CRUD operations for ContentTypes/PageTemplates
│   └── main.py                       # [MODIFY] Mount POST /api/ai/template-builder/generate
└── tests/
    └── application/
        └── graphs/
            └── test_template_builder.py # [NEW] Graph and node tests (TDD)
```

**Structure Decision**: Expose the Template Builder Agent from `apps/content-authoring-service` using a new `template_builder` module in domain and graph setup in application layer, mapping to extended CRUD methods on `CMSClient`.

## Complexity Tracking

No constitution violations detected. Logical multi-tenant boundaries and standard DDD layered architectures are strictly respected.

# Implementation Plan: A2A, MCP & A2UI Integration

**Branch**: `007-a2a-mcp-integration` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-a2a-mcp-integration/spec.md`

## Summary

This feature implements the **Agent-to-Agent (A2A)** and **Model Context Protocol (MCP)** integration, along with **Agent-to-UI / Agent-Generated UI (A2UI/AGUI)** support, allowing external AI systems (e.g. Claude Desktop, ChatGPT, Gemini) to work directly with the Hermes AI Agents without requiring interaction via the core CMS admin UI.

Key technical components include:
1. **API Key Validation Endpoint**: A custom Next.js REST route `/api/api-keys/validate` in `content-management-engine` to allow the FastAPI service to validate keys via the `X-Internal-Secret` header.
2. **MCP Server Integration**: Implementation of an MCP server using the official `mcp` SDK within `content-authoring-service`, supporting:
   - **Stdio Transport**: Used by local desktop tools like Claude Desktop.
   - **SSE (Server-Sent Events) Transport**: Exposing `GET /api/v1/mcp/sse` and `POST /api/v1/mcp/message` for cloud-based integrations.
3. **Dynamic Tool Mapping**: Automatic mapping of Hermes agent capabilities (like drafting, schema operations) to discoverable MCP tools.
4. **A2UI / AGUI Payloads**: Emitting lightweight, Alexandria-aligned JSON components (Cards, Tables, Charts, Forms) mapping semantic Alexandria design system tokens.
5. **Observability**: End-to-end trace propagation to Langfuse with tenant isolation tags.
6. **Developer Starters/Wrappers**: `scripts/run-mcp-stdio.sh` (Unix) and `scripts/run-mcp-stdio.ps1` (Windows) scripts to bootstrap local developers.

## Technical Context

**Language/Version**: Python 3.14+, TypeScript 6.0+, Node.js 26+
**Primary Dependencies**: `mcp` (Python SDK), FastAPI 0.136+, Payload CMS 3.84+, LangChain 1.2+, langfuse
**Storage**: PostgreSQL 18 (Payload CMS API Keys & content store; separate database for Authoring service)
**Testing**: pytest (FastAPI tests), Jest (Next.js API routes)
**Target Platform**: Linux Server / Developer Desktop
**Project Type**: web-service (Hybrid Monolith + Python microservice)
**Performance Goals**: API Key validation in <50ms, SSE connection establishment in <500ms
**Constraints**:
- **Logical Tenant Isolation**: Every tool operation or API key validation is strictly scoped to the matching tenant context.
- **Alexandria Tokens**: Generated UI JSON must map design styles to Alexandria tokens (`theme: "primary"`, `typography: "serif"`, etc.).
- **Observability**: Langfuse traces must group downstream LLM calls under the incoming MCP session trace.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Condition | Status |
|-----------|-----------|--------|
| Multi-tenancy | All external tool requests must validate the tenant context and logically isolate queries. | ✅ PASS |
| AI-First | Conversational AI agents are exposed directly to external tools, making the CMS accessible as an omnipresent agent. | ✅ PASS |
| API-First | Headless interaction via standard MCP/SSE JSON-RPC protocols. | ✅ PASS |
| Test-First | pytest mock and end-to-end tests for stdio/SSE/validation logic. Jest tests for the new validate route. | ✅ PASS |
| DDD Boundaries | Exposing MCP capabilities lives purely inside the authoring microservice's application layer, invoking application services. | ✅ PASS |
| Hybrid Arch | Communication between Authoring microservice and Payload CMS via synchronous internal REST using `X-Internal-Secret` header. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/007-a2a-mcp-integration/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 data representation
├── quickstart.md        # Feature bootstrap / Claude setup guide
├── contracts/           # API contract definitions (SSE and A2UI JSON schema)
└── tasks.md             # Implementation tasks (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/content-management-engine/
└── src/
    └── app/
        └── (payload)/
            └── api/
                └── api-keys/
                    └── validate/
                        └── route.ts  # [NEW] Next.js 15 route for validation

apps/content-authoring-service/
├── requirements.txt                  # [MODIFY] Added mcp package
└── src/
    ├── application/
    │   └── mcp/                      # [NEW] Application layer for MCP handling
    │       ├── __init__.py
    │       ├── server.py             # MCP Server setup and tools registry
    │       ├── sse_transport.py      # SSE connection registry and protocol mapping
    │       └── tools.py              # Individual MCP tools (draft, schema)
    ├── infrastructure/
    │   └── clients/
    │       └── cms_client.py         # [NEW] Client to fetch/validate keys with CMS
    └── main.py                       # [MODIFY] Mount SSE GET/POST endpoints

scripts/
├── run-mcp-stdio.sh                  # [NEW] Local developer stdio bootstrap
└── run-mcp-stdio.ps1                 # [NEW] Local developer stdio bootstrap (Windows)
```

**Structure Decision**: Expose MCP capabilities directly from `apps/content-authoring-service` using a new `mcp` module in the `application` layer. Expose validation endpoint inside `content-management-engine` as a custom Next.js Route Handler.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations detected. The multi-tenant constraints and hybrid service boundaries are strictly respected.

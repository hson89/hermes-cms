# Research: A2A, MCP & A2UI Integration

This document details the architectural decisions, tech stack choices, and integration patterns selected for implementing Agent-to-Agent (A2A), Model Context Protocol (MCP), and Agent-Generated UI (A2UI/AGUI) in Hermes CMS.

---

## 1. Authentication & Tenant Retrieval

- **Decision**: Validate tenant API keys synchronously using an internal REST call to `/api/api-keys/validate` in Next.js CMS (`content-management-engine`), passing a shared secret in the `X-Internal-Secret` header.
- **Rationale**: 
  - Centralizes key verification: Payload CMS manages user accounts, tenants, and API keys. The Python authoring service does not need direct database access to Payload CMS collections.
  - Simple, robust service-to-service authentication pattern.
  - Retains the multi-tenant logical boundaries defined by Payload's multi-tenancy plugin.
- **Alternatives Considered**: 
  - *Direct PostgreSQL read from Python service*: Rejected because it bypasses Payload's internal hashing/handling mechanisms for API keys and breaks service separation.
  - *JWT authorization*: Rejected for external local setups (e.g. Claude Desktop env vars) where long-lived API keys are highly preferred over dynamic token exchanges.

---

## 2. Model Context Protocol (MCP) Transports

- **Decision**: Support both Stdio and SSE (Server-Sent Events) transport layers in the FastAPI authoring microservice.
- **Rationale**:
  - **Stdio**: Required for integration with local host tools like Claude Desktop, where the client runs the server as a subprocess.
  - **SSE**: Required for cloud-based integrations (e.g. ChatGPT plugin interfaces or web-based IDEs) where stdio is not possible, utilizing standard RESTful SSE connections.
- **Alternatives Considered**:
  - *WebSockets*: Rejected because SSE is the official web/HTTP transport standard defined by the Model Context Protocol, offering better compatibility with standard serverless/load-balancing infrastructure.

---

## 3. Dynamic Tool Mapping

- **Decision**: Map Hermes Agent graphs and capabilities dynamically using the Python `mcp` SDK to register Tools dynamically at runtime.
- **Rationale**:
  - Ensures a single source of truth for tool definitions.
  - When new agents or graphs are added to the authoring microservice, external clients discover them automatically during tool list queries without redeployment.
- **Alternatives Considered**:
  - *Static JSON configuration*: Rejected because it requires manually duplicating schemas and updating two places when tool parameters or graphs change.

---

## 4. Agent-Generated UI (AGUI/A2UI) custom DSL

- **Decision**: Define a lightweight, JSON-serializable Alexandria component schema that agents emit under a `visual` property in tool responses.
- **Rationale**:
  - Decouples the Python service from CSS frameworks or React bundle versions.
  - Host applications (like Next.js starters or bespoke portals) interpret the structural JSON (defining columns, items, graphs, styles) and apply their own local Alexandria-aligned styling components.
- **Alternatives Considered**:
  - *HTML fragment returns*: Rejected because HTML strings are highly opinionated, difficult for external LLMs to parse, and hard to sanitize safely.
  - *Tailwind HTML chunks*: Rejected as it goes against Alexandria's theme-aware design system and violates the static color bans.

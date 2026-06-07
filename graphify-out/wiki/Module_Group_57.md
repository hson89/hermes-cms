# Module Group 57

> 22 nodes · cohesion 0.13

## Key Concepts

- **CMSClient** (15 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **validate_mcp_api_key()** (7 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **Request** (4 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **.validate_api_key()** (4 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **test_cms_client.py** (4 connections) — `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- **sse_transport.py** (4 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **handle_message()** (4 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **handle_sse()** (4 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **Any** (2 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **AsyncClient** (2 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **.__init__()** (2 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **test_cms_client_validation_http_error()** (2 connections) — `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- **test_cms_client_validation_success()** (2 connections) — `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- **test_cms_client_validation_unauthorized()** (2 connections) — `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- **test_cms_client_validation_uses_shared_client()** (2 connections) — `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`
- **Any** (1 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **cms_client.py** (1 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **Validates the provided API key with the Payload CMS monolith.                  R** (1 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **Client for communicating with the Next.js Content Management Engine.** (1 connections) — `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- **Helper to validate API key from request headers.** (1 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **Establishes the SSE stream connection for cloud-based MCP clients.** (1 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- **Receives JSON-RPC request messages from client.** (1 connections) — `apps/content-authoring-service/src/application/mcp/sse_transport.py`

## Relationships

- [[MCP Tool Adapters (Python)]] (4 shared connections)
- [[AI Copilot Drafting Service]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/mcp/sse_transport.py`
- `apps/content-authoring-service/src/infrastructure/clients/cms_client.py`
- `apps/content-authoring-service/tests/infrastructure/clients/test_cms_client.py`

## Audit Trail

- EXTRACTED: 49 (73%)
- INFERRED: 18 (27%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
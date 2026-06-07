# Module Group 70

> 21 nodes · cohesion 0.12

## Key Concepts

- **MCPSessionContext** (8 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **MCPSessionRegistry** (8 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.create_session()** (4 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.get_session()** (4 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.touch()** (3 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.remove_session()** (3 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Any** (2 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **session.py** (2 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.__init__()** (2 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **.clear()** (2 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **test_session.py** (2 connections) — `apps/content-authoring-service/tests/application/mcp/test_session.py`
- **test_mcp_session_context_creation()** (2 connections) — `apps/content-authoring-service/tests/application/mcp/test_session.py`
- **test_mcp_session_registry_lifecycle()** (2 connections) — `apps/content-authoring-service/tests/application/mcp/test_session.py`
- **.__init__()** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Update last active timestamp to keep the session alive.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **In-memory registry to store and manage active MCP client sessions.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Create a new session context and register it.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Retrieve a session by ID and update its active timestamp.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Revoke/remove a session from the registry.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Flush all registered sessions.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`
- **Tracks session state and tenant isolation context for connected MCP clients.** (1 connections) — `apps/content-authoring-service/src/application/mcp/session.py`

## Relationships

- No strong cross-community connections detected

## Source Files

- `apps/content-authoring-service/src/application/mcp/session.py`
- `apps/content-authoring-service/tests/application/mcp/test_session.py`

## Audit Trail

- EXTRACTED: 48 (92%)
- INFERRED: 4 (8%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
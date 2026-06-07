# Module Group 143

> 15 nodes · cohesion 0.18

## Key Concepts

- **MarketplaceService** (10 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **ExternalAppTool** (8 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **MarketplaceCircuitBreaker** (6 connections) — `apps/content-authoring-service/src/domain/marketplace.py`
- **.get_tool_for_app()** (3 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **JWTClaims** (3 connections) — `apps/content-authoring-service/src/domain/marketplace.py`
- **marketplace_service.py** (2 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **marketplace.py** (2 connections) — `apps/content-authoring-service/src/domain/marketplace.py`
- **._call_external_api()** (1 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **._run()** (1 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **.__init__()** (1 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **Orchestrates marketplace app registration and tool creation.** (1 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **LangChain Tool wrapper for 3rd-party marketplace apps.     Integrates pybreaker** (1 connections) — `apps/content-authoring-service/src/application/marketplace_service.py`
- **BaseTool** (1 connections)
- **.__init__()** (1 connections) — `apps/content-authoring-service/src/domain/marketplace.py`
- **Story 4: Circuit Breaker Policy     Trips after 3 failures, >5000ms timeout logi** (1 connections) — `apps/content-authoring-service/src/domain/marketplace.py`

## Relationships

- [[Module Group 200]] (3 shared connections)
- [[Module Group 319]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/marketplace_service.py`
- `apps/content-authoring-service/src/domain/marketplace.py`

## Audit Trail

- EXTRACTED: 28 (67%)
- INFERRED: 14 (33%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
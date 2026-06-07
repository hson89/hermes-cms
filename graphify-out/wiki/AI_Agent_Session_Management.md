# AI Agent Session Management

> 43 nodes · cohesion 0.07

## Key Concepts

- **SQLSessionRepository** (13 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **AISessionRepository** (12 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **AsyncSession** (7 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **AIAgentSession** (6 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **UUID** (6 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **to_domain_model()** (6 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **test_session_repository.py** (6 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **AIAgentSessionModel** (5 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **.get_by_id()** (5 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **session_repository.py** (4 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **UUID** (4 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **AsyncSession** (4 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **session_repository.py** (4 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **.get_by_id()** (4 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **.save()** (4 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **test_repository_delete()** (4 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **test_repository_save_and_retrieve()** (4 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **test_repository_update()** (4 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **AIAgentSession** (3 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **.delete()** (3 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **.save()** (3 connections) — `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- **.delete()** (3 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- **db_session()** (3 connections) — `apps/content-authoring-service/tests/unit/test_session_repository.py`
- **ABC** (2 connections)
- **.__init__()** (2 connections) — `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- *... and 18 more nodes in this community*

## Relationships

- [[AI Self-Correction Loop]] (9 shared connections)
- [[Module Group 48]] (7 shared connections)

## Source Files

- `apps/content-authoring-service/src/domain/repositories/session_repository.py`
- `apps/content-authoring-service/src/infrastructure/repositories/session_repository.py`
- `apps/content-authoring-service/tests/unit/test_session_repository.py`

## Audit Trail

- EXTRACTED: 106 (76%)
- INFERRED: 34 (24%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
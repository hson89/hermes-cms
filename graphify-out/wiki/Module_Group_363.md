# Module Group 363

> 7 nodes · cohesion 0.29

## Key Concepts

- **database.py** (3 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **get_db()** (3 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **get_db_checkpointer()** (3 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **AsyncSession** (1 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **SQLAlchemy database setup and session helpers. Satisfies T004 / T005b.** (1 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **Dependency to obtain a new database session.** (1 connections) — `apps/content-authoring-service/src/infrastructure/database.py`
- **Asynchronous context manager returning the AsyncPostgresSaver checkpointer conne** (1 connections) — `apps/content-authoring-service/src/infrastructure/database.py`

## Relationships

- [[AI Copilot Drafting Service]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/infrastructure/database.py`

## Audit Trail

- EXTRACTED: 12 (92%)
- INFERRED: 1 (8%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
# AI Self-Correction Loop

> 42 nodes · cohesion 0.06

## Key Concepts

- **AIService** (52 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **AIAgentSession** (31 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **.generate_draft_stream()** (6 connections) — `apps/content-authoring-service/src/application/drafting_service.py`
- **.refine_draft_stream()** (6 connections) — `apps/content-authoring-service/src/application/refine_service.py`
- **Any** (5 connections) — `apps/content-authoring-service/src/application/drafting_service.py`
- **AsyncSession** (5 connections) — `apps/content-authoring-service/src/application/drafting_service.py`
- **.refine_draft_stream()** (4 connections) — `apps/content-authoring-service/src/application/drafting_service.py`
- **AIService** (4 connections) — `apps/content-authoring-service/src/application/drafting_service.py`
- **.to_langchain_messages()** (3 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **ai_service.py** (3 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **.get_model()** (3 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **._llm()** (3 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **AIService** (3 connections) — `apps/content-authoring-service/src/application/refine_service.py`
- **Any** (3 connections) — `apps/content-authoring-service/src/application/refine_service.py`
- **AsyncSession** (3 connections) — `apps/content-authoring-service/src/application/refine_service.py`
- **.coerce_id_to_str()** (2 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **.complete()** (2 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **.fail()** (2 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **.langfuse_client()** (2 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **_extract_partial_explanation()** (2 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **.__init__()** (2 connections) — `apps/content-authoring-service/src/application/copilot_service.py`
- **.__init__()** (2 connections) — `apps/content-authoring-service/src/application/refine_service.py`
- **AIService** (2 connections) — `apps/content-authoring-service/src/application/copilot_service.py`
- **Any** (2 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **Schema Generation API Contract** (2 connections) — `specs/003-define-content-types/contracts/schema-generation.md`
- *... and 17 more nodes in this community*

## Relationships

- [[AI Copilot Drafting Service]] (26 shared connections)
- [[Module Group 48]] (14 shared connections)
- [[AI Agent Session Management]] (9 shared connections)
- [[AI Authoring Service Core]] (5 shared connections)
- [[MCP Tool Adapters (Python)]] (4 shared connections)
- [[Module Group 200]] (3 shared connections)
- [[Module Group 304]] (2 shared connections)
- [[Module Group 248]] (2 shared connections)
- [[Module Group 424]] (1 shared connections)
- [[Schema Validator Domain Tests]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/ai_service.py`
- `apps/content-authoring-service/src/application/copilot_service.py`
- `apps/content-authoring-service/src/application/drafting_service.py`
- `apps/content-authoring-service/src/application/refine_service.py`
- `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- `apps/content-authoring-service/src/domain/schema_validator.py`
- `apps/content-management-engine/src/collections/ContentTypes/endpoints.ts`
- `specs/003-define-content-types/contracts/schema-generation.md`
- `specs/003-define-content-types/research.md`

## Audit Trail

- EXTRACTED: 87 (51%)
- INFERRED: 84 (49%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
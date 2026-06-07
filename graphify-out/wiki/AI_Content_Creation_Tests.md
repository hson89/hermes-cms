# AI Content Creation Tests

> 48 nodes · cohesion 0.05

## Key Concepts

- **TestClient** (16 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **test_ai_creation.py** (10 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestGenerateSchemaEndpoint** (8 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestSessionStreamingEndpoint** (5 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestCopilotEditEndpoint** (4 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_llm_json_error_returns_422()** (4 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestRefineEndpoint** (4 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **client()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_copilot_edit_accepts_numeric_ids()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_copilot_edit_returns_edited_content()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_accepts_numeric_ids()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_rejects_empty_prompt()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_requires_tenant_id()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_returns_200_with_valid_schema()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_generate_schema_session_is_stored()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestHealthEndpoint** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_refine_draft_coerces_numeric_session_id()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_refine_draft_returns_stream()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **TestSessionEndpoint** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_get_nonexistent_session_returns_404()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_session_message_accepts_numeric_tenant_id()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_session_message_rejects_empty_prompt()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_session_message_streams_events()** (3 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **mock_llm_response()** (2 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- **.test_health_returns_ok()** (2 connections) — `apps/content-authoring-service/tests/integration/test_ai_creation.py`
- *... and 23 more nodes in this community*

## Relationships

- [[AI Copilot Drafting Service]] (1 shared connections)
- [[Module Group 48]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/tests/integration/test_ai_creation.py`

## Audit Trail

- EXTRACTED: 125 (99%)
- INFERRED: 1 (1%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*
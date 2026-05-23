import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from src.application.ai_service import AIService
from src.domain.ai_agent_session.models import SessionStatus

@pytest.fixture()
def ai_service() -> AIService:
    return AIService()

class MockSchemaGraph:
    def __init__(self, final_values=None):
        self.aget_state = AsyncMock(return_value=MagicMock(values=final_values or {}))
        self.aupdate_state = AsyncMock()
        self.final_values = final_values or {}

    async def astream_events(self, *args, **kwargs):
        # Emits empty events list, yielding is handled by get_state final evaluation
        if False:
            yield None

@pytest.mark.asyncio
async def test_continue_generation_session_stream_success(ai_service: AIService):
    """Verify that continuing a session yields the expected AG-UI events and updates DB."""
    tenant_id = str(uuid4())
    user_id = str(uuid4())
    session_id = str(uuid4())
    
    # Pre-seed session in the in-memory store
    from src.application.ai_service import _sessions
    from src.domain.ai_agent_session.models import AIAgentSession
    
    session = AIAgentSession(id=session_id, user_id=user_id, tenant_id=tenant_id)
    session.add_message("system", "Original system prompt")
    session.add_message("user", "Original user prompt")
    session.add_message("assistant", '{"explanation": "Original schema generated", "schema": {"name": "Watch", "fields": []}}')
    _sessions[session_id] = session

    current_schema = {
        "name": "Watch",
        "fields": [{"name": "price", "type": "number", "label": "Price"}]
    }

    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    final_values = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "explanation": "I have added a text field called serial_number.",
        "generated_schema": {
            "name": "Watch",
            "fields": [{"name": "serial_number", "type": "text", "label": "Serial Number"}]
        },
        "errors": [],
        "messages": [
            SystemMessage(content="Original system prompt"),
            HumanMessage(content="Original user prompt"),
            AIMessage(content='{"explanation": "Original schema generated", "schema": {"name": "Watch", "fields": []}}'),
            HumanMessage(content="add text field serial_number"),
            AIMessage(content='{"explanation": "I have added a text field called serial_number.", "schema": {"name": "Watch", "fields": [{"name": "serial_number", "type": "text", "label": "Serial Number"}]}}')
        ]
    }
    mock_graph = MockSchemaGraph(final_values)

    # Execute stream generator
    events = []
    async for event in ai_service.continue_generation_session_stream(
        session_id=session_id,
        prompt="add text field serial_number",
        current_schema=current_schema,
        schema_graph=mock_graph
    ):
        events.append(event)

    # Check emitted events
    text_deltas = [e for e in events if e["event"] == "TEXT_DELTA"]
    state_deltas = [e for e in events if e["event"] == "STATE_DELTA"]
    status_updates = [e for e in events if e["event"] == "STATUS_UPDATE"]

    assert len(text_deltas) > 0
    assert len(state_deltas) == 1
    assert len(status_updates) > 0

    full_text = "".join([d["data"] for d in text_deltas])
    assert "I have added a text field called serial_number." in full_text

    final_schema = state_deltas[0]["data"]
    assert final_schema["name"] == "Watch"
    assert len(final_schema["fields"]) == 1
    assert final_schema["fields"][0]["name"] == "serial_number"

    # Verify session is updated in the database/in-memory store
    updated_session = _sessions[session_id]
    assert updated_session.status == SessionStatus.COMPLETED
    assert len(updated_session.context) >= 4
    assert updated_session.context[-1].role == "assistant"
    assert "serial_number" in updated_session.context[-1].content


@pytest.mark.asyncio
async def test_generate_schema_with_current_schema_grounding(ai_service: AIService):
    """Verify that generate_schema supports optional initial current_schema parameter for seeding."""
    tenant_id = str(uuid4())
    user_id = str(uuid4())
    current_schema = {
        "name": "Legacy Product",
        "fields": [{"name": "sku", "type": "text", "label": "SKU"}]
    }

    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "mock-provider"
        mock_settings.LANGCHAIN_MODEL = "mock-model"
        mock_settings.LANGCHAIN_ENDPOINT_URL = ""

        from src.domain.content_drafting.structures import ContentSchemaOutput, FieldDefinition
        mock_llm = MagicMock()
        mock_structured_llm = MagicMock()
        mock_structured_llm.ainvoke = AsyncMock(return_value=ContentSchemaOutput(
            name="Legacy Product",
            fields=[
                FieldDefinition(name="sku", type="text", label="SKU"),
                FieldDefinition(name="price", type="number", label="Price")
            ]
        ))
        mock_llm.with_structured_output.return_value = mock_structured_llm
        mock_init.return_value = mock_llm

        result = await ai_service.generate_schema(
            prompt="add price",
            tenant_id=tenant_id,
            user_id=user_id,
            current_schema=current_schema
        )

        assert result["status"] == SessionStatus.COMPLETED
        assert result["schema"]["name"] == "Legacy Product"
        assert len(result["schema"]["fields"]) == 2
        assert result["schema"]["fields"][1]["name"] == "price"

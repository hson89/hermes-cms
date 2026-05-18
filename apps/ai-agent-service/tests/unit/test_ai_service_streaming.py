"""
Unit tests for AI service streaming and co-creation.
Satisfies TDD and constitution requirements.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from src.application.ai_service import AIService
from src.domain.ai_agent_session.models import SessionStatus


@pytest.fixture()
def ai_service() -> AIService:
    return AIService()


@pytest.fixture()
def mock_streaming_llm_response() -> MagicMock:
    """Mock a streaming LLM response yielding chunks of structured JSON."""
    chunks = [
        MagicMock(content='{"explanation": "I have added '),
        MagicMock(content='a text field called '),
        MagicMock(content='serial_number.","schema": {"name": "Watch", "fields": ['),
        MagicMock(content='{"name": "serial_number", "type": "text", "label": "Serial Number"}'),
        MagicMock(content=']}}'),
    ]
    
    # We want astream to return an async generator yielding these chunks
    async def mock_astream(*args, **kwargs):
        for chunk in chunks:
            yield chunk

    mock_llm = MagicMock()
    mock_llm.astream = mock_astream
    return mock_llm


@pytest.mark.asyncio
async def test_continue_generation_session_stream_success(ai_service: AIService, mock_streaming_llm_response: MagicMock):
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

    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "mock-provider"
        mock_settings.LANGCHAIN_MODEL = "mock-model"
        mock_settings.LANGCHAIN_ENDPOINT_URL = ""
        
        mock_init.return_value = mock_streaming_llm_response

        # Execute stream generator
        events = []
        async for event in ai_service.continue_generation_session_stream(
            session_id=session_id,
            prompt="add text field serial_number",
            current_schema=current_schema
        ):
            events.append(event)

        # Check emitted events
        # We expect several TEXT_DELTA events, a STATUS_UPDATE, and a STATE_DELTA
        text_deltas = [e for e in events if e["event"] == "TEXT_DELTA"]
        state_deltas = [e for e in events if e["event"] == "STATE_DELTA"]
        status_updates = [e for e in events if e["event"] == "STATUS_UPDATE"]

        assert len(text_deltas) > 0
        assert len(state_deltas) == 1
        assert len(status_updates) > 0

        # Assert full string accumulation in TEXT_DELTA events matches explanation
        full_text = "".join([d["data"] for d in text_deltas])
        assert "I have added a text field called serial_number." in full_text

        # Assert final state schema is correct
        final_schema = state_deltas[0]["data"]
        assert final_schema["name"] == "Watch"
        assert len(final_schema["fields"]) == 1
        assert final_schema["fields"][0]["name"] == "serial_number"

        # Verify session is updated in the database/in-memory store
        updated_session = _sessions[session_id]
        assert updated_session.status == SessionStatus.COMPLETED
        # The new messages: 1 user prompt (with grounding context) and 1 assistant response (the raw JSON string)
        # Note: the base session context in the store has the user's plain prompt for UX display,
        # but the LLM invocation had the grounding schema. Let's make sure the message count grew.
        assert len(updated_session.context) == 5 # 3 original + 1 user prompt + 1 assistant JSON response
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

    mock_llm_response = MagicMock()
    mock_llm_response.content = json.dumps({
        "explanation": "Added price",
        "schema": {
            "name": "Legacy Product",
            "fields": [
                {"name": "sku", "type": "text", "label": "SKU"},
                {"name": "price", "type": "number", "label": "Price"}
            ]
        }
    })

    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "mock-provider"
        mock_settings.LANGCHAIN_MODEL = "mock-model"
        mock_settings.LANGCHAIN_ENDPOINT_URL = ""

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)
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

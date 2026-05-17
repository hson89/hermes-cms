"""
Unit tests for the AIService.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from src.application.ai_service import AIService
from src.domain.ai_agent_session.models import SessionStatus


@pytest.fixture()
def ai_service() -> AIService:
    return AIService()


@pytest.fixture()
def mock_llm_response() -> MagicMock:
    response = MagicMock()
    response.content = json.dumps({
        "name": "Test Content Type",
        "fields": [{"name": "title", "type": "text", "required": True, "label": "Title"}]
    })
    return response


@pytest.mark.asyncio
async def test_generate_schema_uses_correct_provider(ai_service: AIService, mock_llm_response: MagicMock):
    """Verify that AIService correctly initialises the LLM with settings."""
    tenant_id = uuid4()
    user_id = uuid4()
    prompt = "A simple blog post"

    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL = "test-model"
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "test-provider"
        mock_settings.LANGCHAIN_ENDPOINT_URL = "http://test-url"
        
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)
        mock_init.return_value = mock_llm

        result = await ai_service.generate_schema(
            prompt=prompt,
            tenant_id=tenant_id,
            user_id=user_id
        )

        # Check init_chat_model call
        mock_init.assert_called_once_with(
            model="test-model",
            model_provider="test-provider",
            base_url="http://test-url"
        )
        
        assert result["status"] == SessionStatus.COMPLETED
        assert result["schema"]["name"] == "Test Content Type"


@pytest.mark.asyncio
async def test_generate_schema_session_lifecycle(ai_service: AIService, mock_llm_response: MagicMock):
    """Verify that the session is created and updated correctly."""
    tenant_id = uuid4()
    user_id = uuid4()
    
    with patch("src.application.ai_service.init_chat_model") as mock_init:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)
        mock_init.return_value = mock_llm

        result = await ai_service.generate_schema(
            prompt="test prompt",
            tenant_id=tenant_id,
            user_id=user_id
        )

        session_id = result["sessionId"]
        session = ai_service.get_session(session_id)
        
        assert session is not None
        assert session.status == SessionStatus.COMPLETED
        assert len(session.context) == 3 # System, User, Assistant
        assert session.tenant_id == tenant_id
        assert session.user_id == user_id


@pytest.mark.asyncio
async def test_generate_schema_handles_json_error(ai_service: AIService):
    """Verify that the service fails gracefully if LLM returns invalid JSON."""
    tenant_id = uuid4()
    user_id = uuid4()
    
    with patch("src.application.ai_service.init_chat_model") as mock_init:
        mock_llm = MagicMock()
        invalid_response = MagicMock()
        invalid_response.content = "NOT JSON"
        mock_llm.ainvoke = AsyncMock(return_value=invalid_response)
        mock_init.return_value = mock_llm

        with pytest.raises(ValueError, match="Failed to generate a valid schema after 3 retries"):
            await ai_service.generate_schema(
                prompt="test",
                tenant_id=tenant_id,
                user_id=user_id
            )
        
        # Session should be in FAILED status
        # Note: In-memory store is used, so we can't easily find the session ID without it being returned.
        # But we know there's only one.
        from src.application.ai_service import _sessions
        session = list(_sessions.values())[-1]
        assert session.status == SessionStatus.FAILED

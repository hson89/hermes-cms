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
    
    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "mock-provider"
        mock_settings.LANGCHAIN_MODEL = "mock-model"
        mock_settings.LANGCHAIN_ENDPOINT_URL = ""
        
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)
        mock_init.return_value = mock_llm

        result = await ai_service.generate_schema(
            prompt="test prompt",
            tenant_id=tenant_id,
            user_id=user_id
        )

        session_id = result["sessionId"]
        session = await ai_service.get_session(session_id)
        
        assert session is not None
        assert session.status == SessionStatus.COMPLETED
        assert len(session.context) == 3 # System, User, Assistant
        assert session.tenant_id == str(tenant_id)
        assert session.user_id == str(user_id)


@pytest.mark.asyncio
async def test_generate_schema_handles_json_error(ai_service: AIService):
    """Verify that the service fails gracefully if LLM returns invalid JSON."""
    tenant_id = uuid4()
    user_id = uuid4()
    
    with patch("src.application.ai_service.init_chat_model") as mock_init, \
         patch("src.application.ai_service.settings") as mock_settings:
        
        mock_settings.LANGCHAIN_MODEL = "test-model"
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "openai"
        mock_settings.LANGCHAIN_ENDPOINT_URL = None
        
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


@pytest.mark.asyncio
async def test_generate_schema_uses_nvidia_provider(ai_service: AIService, mock_llm_response: MagicMock):
    """Verify that AIService correctly initialises the NVIDIA provider when set."""
    tenant_id = uuid4()
    user_id = uuid4()
    prompt = "A simple blog post"

    with patch("src.application.ai_service.settings") as mock_settings, \
         patch("langchain_nvidia_ai_endpoints.ChatNVIDIA") as mock_chat_nvidia:
        
        mock_settings.LANGCHAIN_MODEL = "test-nvidia-model"
        mock_settings.LANGCHAIN_MODEL_PROVIDER = "nvidia"
        mock_settings.LANGCHAIN_ENDPOINT_URL = "http://test-nvidia-url"
        
        mock_settings.NVIDIA_API_KEY = "test-nvapi-key"
        mock_settings.NVIDIA_TEMPERATURE = 0.6
        mock_settings.NVIDIA_TOP_P = 0.95
        mock_settings.NVIDIA_MAX_TOKENS = 65536
        mock_settings.NVIDIA_REASONING_BUDGET = 16384
        mock_settings.NVIDIA_ENABLE_THINKING = True
        
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)
        mock_chat_nvidia.return_value = mock_llm

        result = await ai_service.generate_schema(
            prompt=prompt,
            tenant_id=tenant_id,
            user_id=user_id
        )

        # Check ChatNVIDIA constructor call
        mock_chat_nvidia.assert_called_once_with(
            model="test-nvidia-model",
            api_key="test-nvapi-key",
            temperature=0.6,
            top_p=0.95,
            max_tokens=65536,
            model_kwargs={
                "reasoning_budget": 16384,
                "chat_template_kwargs": {"enable_thinking": True},
            },
            base_url="http://test-nvidia-url",
        )
        
        assert result["status"] == SessionStatus.COMPLETED


def test_get_langfuse_handler_success(ai_service: AIService):
    """Verify that _get_langfuse_handler successfully returns a CallbackHandler with correct parameters."""
    with patch("src.application.ai_service.settings") as mock_settings, \
         patch("langfuse.langchain.CallbackHandler") as mock_callback_handler:
        
        mock_settings.LANGFUSE_PUBLIC_KEY = "test-public-key"
        mock_settings.LANGFUSE_SECRET_KEY = "test-secret-key"
        mock_settings.LANGFUSE_BASE_URL = "http://test-langfuse"
        
        # Mock langfuse_client lazy property to return a non-None value
        with patch.object(AIService, "langfuse_client", return_value=MagicMock()):
            handler = ai_service._get_langfuse_handler(trace_id="test-trace-id")
            
            mock_callback_handler.assert_called_once_with(
                public_key="test-public-key",
                trace_context={"trace_id": "test-trace-id"}
            )
            assert handler == mock_callback_handler.return_value

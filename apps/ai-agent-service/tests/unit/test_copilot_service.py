"""
Unit tests for the CopilotService.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from src.application.copilot_service import CopilotService


@pytest.fixture()
def copilot_service() -> CopilotService:
    return CopilotService()


@pytest.mark.asyncio
async def test_edit_section_invokes_llm(copilot_service: CopilotService):
    """Verify that edit_section invokes the LLM with correct prompts."""
    tenant_id = uuid4()
    user_id = uuid4()
    content_item_id = "item-123"
    section_id = "block-456"
    prompt = "Make it more professional"

    with patch("src.application.copilot_service.init_chat_model") as mock_init:
        mock_llm = MagicMock()
        mock_response = MagicMock()
        mock_response.content = "Professional version of the text."
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        mock_init.return_value = mock_llm

        result = await copilot_service.edit_section(
            content_item_id=content_item_id,
            section_id=section_id,
            prompt=prompt,
            tenant_id=tenant_id,
            user_id=user_id
        )

        assert result == "Professional version of the text."
        
        # Verify LLM was called with correct message structure
        args, _ = mock_llm.ainvoke.call_args
        messages = args[0]
        assert len(messages) == 2
        assert "professional writing assistant" in messages[0].content.lower()
        assert content_item_id in messages[1].content
        assert section_id in messages[1].content
        assert prompt in messages[1].content


@pytest.mark.asyncio
async def test_edit_section_handles_runtime_error(copilot_service: CopilotService):
    """Verify that edit_section wraps exceptions in RuntimeError."""
    tenant_id = uuid4()
    user_id = uuid4()

    with patch("src.application.copilot_service.init_chat_model") as mock_init:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("LLM Down"))
        mock_init.return_value = mock_llm

        with pytest.raises(RuntimeError, match="Copilot edit failed"):
            await copilot_service.edit_section(
                content_item_id="123",
                section_id="abc",
                prompt="fix",
                tenant_id=tenant_id,
                user_id=user_id
            )

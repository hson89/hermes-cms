"""
AI Copilot application service.

Handles localized section editing for the CMS rich-text editor.

T023 - Implement AI service logic for localized section editing
"""

from __future__ import annotations

import os
from uuid import UUID

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from src.application.ai_service import AIService

_COPILOT_SYSTEM_PROMPT = """\
You are a professional writing assistant embedded in a content management system.
You will receive a section of text and a user instruction.
Apply the instruction to the text and return ONLY the revised text with no
extra explanation, quotes, or markdown formatting.
"""


class CopilotService:
    """
    Application-layer service for the AI Copilot (inline content editing).

    The copilot receives a specific block/section ID plus a natural language
    edit instruction and returns the revised text for that section only.
    """

    def __init__(self, ai_service: AIService | None = None) -> None:
        self._model_id = os.environ.get("LANGCHAIN_MODEL", "gpt-4o-mini")
        self.__llm = None  # lazy
        self._ai_service = ai_service

    @property
    def _llm(self):
        """Return (or create) the LangChain chat model instance."""
        if self.__llm is None:
            self.__llm = init_chat_model(self._model_id)
        return self.__llm

    async def edit_section(
        self,
        *,
        content_item_id: str,
        section_id: str,
        prompt: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> str:
        """
        Apply an AI edit instruction to a content section.

        Args:
            content_item_id: The Payload ContentItem document ID.
            section_id:      The block/section identifier within the content.
            prompt:          The editing instruction (e.g. "make more formal").
            tenant_id:       UUID of the requesting tenant.
            user_id:         UUID of the requesting user.

        Returns:
            The revised text for the specified section.
        """
        messages = [
            SystemMessage(content=_COPILOT_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"Content item: {content_item_id}\n"
                    f"Section: {section_id}\n"
                    f"Instruction: {prompt}"
                )
            ),
        ]

        try:
            response = await self._llm.ainvoke(messages)
            return (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )
        except Exception as exc:
            raise RuntimeError(
                f"Copilot edit failed for section '{section_id}': {exc}"
            ) from exc

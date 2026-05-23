"""
AI Copilot application service.

Handles localized section editing for the CMS rich-text editor.

T023 - Implement AI service logic for localized section editing
"""

from __future__ import annotations

from uuid import UUID

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from src.domain.content_drafting.prompts import get_copilot_prompt
from src.application.ai_service import AIService
from src.infrastructure.config import settings


class CopilotService:
    """
    Application-layer service for the AI Copilot (inline content editing).

    The copilot receives a specific block/section ID plus a natural language
    edit instruction and returns the revised text for that section only.
    """

    def __init__(self, ai_service: AIService | None = None) -> None:
        self.__llm = None  # lazy
        self._ai_service = ai_service

    @property
    def _llm(self):
        """Return (or create) the LangChain chat model instance."""
        if self.__llm is None:
            if settings.LANGCHAIN_MODEL_PROVIDER == "nvidia":
                from langchain_nvidia_ai_endpoints import ChatNVIDIA
                kwargs = {
                    "model": settings.LANGCHAIN_MODEL,
                    "api_key": settings.NVIDIA_API_KEY,
                    "temperature": settings.NVIDIA_TEMPERATURE,
                    "top_p": settings.NVIDIA_TOP_P,
                    "max_tokens": settings.NVIDIA_MAX_TOKENS,
                    "model_kwargs": {
                        "reasoning_budget": settings.NVIDIA_REASONING_BUDGET,
                        "chat_template_kwargs": {"enable_thinking": settings.NVIDIA_ENABLE_THINKING},
                    },
                }
                if settings.LANGCHAIN_ENDPOINT_URL and "11434" not in settings.LANGCHAIN_ENDPOINT_URL:
                    kwargs["base_url"] = settings.LANGCHAIN_ENDPOINT_URL
                self.__llm = ChatNVIDIA(**kwargs)
            else:
                kwargs = {}
                if settings.LANGCHAIN_ENDPOINT_URL:
                    kwargs["base_url"] = settings.LANGCHAIN_ENDPOINT_URL

                self.__llm = init_chat_model(
                    model=settings.LANGCHAIN_MODEL,
                    model_provider=settings.LANGCHAIN_MODEL_PROVIDER,
                    **kwargs,
                )
        return self.__llm

    async def edit_section(
        self,
        *,
        content_item_id: str,
        section_id: str,
        prompt: str,
        tenant_id: UUID,
        user_id: UUID,
        langfuse_trace_id: str | None = None,
    ) -> str:
        """
        Apply an AI edit instruction to a content section.

        Args:
            content_item_id: The Payload ContentItem document ID.
            section_id:      The block/section identifier within the content.
            prompt:          The editing instruction (e.g. "make more formal").
            tenant_id:       UUID of the requesting tenant.
            user_id:         UUID of the requesting user.
            langfuse_trace_id: Optional trace ID to link this generation to a parent trace.

        Returns:
            The revised text for the specified section.
        """
        lf_client = self._ai_service.langfuse_client if self._ai_service else None
        copilot_prompt = get_copilot_prompt(lf_client)
        messages = copilot_prompt.format_messages(
            content_item_id=content_item_id,
            section_id=section_id,
            prompt=prompt
        )

        # Initialize Langfuse handler
        config = {}
        if self._ai_service:
            langfuse_handler = self._ai_service._get_langfuse_handler(trace_id=langfuse_trace_id)
            if langfuse_handler:
                config = {
                    "callbacks": [langfuse_handler],
                    "metadata": {
                        "langfuse_user_id": str(user_id),
                        "langfuse_tags": ["copilot-edit", f"tenant:{tenant_id}"],
                    }
                }

        try:
            response = await self._llm.ainvoke(messages, config=config)
            return (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )
        except Exception as exc:
            raise RuntimeError(
                f"Copilot edit failed for section '{section_id}': {exc}"
            ) from exc

"""
RefineService application service for handling AI content refinement.

T027 - Implement iterative refinement LangChain logic
"""

from __future__ import annotations

import json
import re
from typing import Any, AsyncGenerator, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ai_service import AIService
from src.application.stream_utils import handle_graph_stream
from src.domain.ai_agent_session.models import AIAgentSession
from src.infrastructure.config import settings


class RefineService:
    """
    Orchestrates the AI refinement workflow.
    """

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def refine_draft_stream(
        self,
        prompt: str,
        current_draft_json: dict,
        schema_json: dict,
        tenant_id: str,
        user_id: str,
        db: AsyncSession,
        locale: str = "en",
        style_modifier_id: Optional[str] = None,
        style_modifier_prompt: Optional[str] = None,
        model_override: Optional[str] = None,
        session_id: Optional[str] = None,
        langfuse_trace_id: Optional[str] = None,
        drafting_graph: Optional[Any] = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Refines an existing draft based on user feedback.
        """
        import uuid
        from datetime import datetime, timezone
        from langchain_core.messages import HumanMessage, AIMessage

        if drafting_graph is None:
            from src.application.graphs.drafting_graph import drafting_graph as compiled_graph
            drafting_graph = compiled_graph

        resolved_session_id = session_id or str(uuid.uuid4())
        style_modifier_instructions = style_modifier_prompt or ""

        # Initialize Langfuse handler
        langfuse_handler = self.ai_service._get_langfuse_handler(
            trace_id=langfuse_trace_id,
            session_id=resolved_session_id
        )
        # Safe check in case settings is mocked in unit tests
        recursion_limit = getattr(settings, "LANGGRAPH_RECURSION_LIMIT", 25)
        if not isinstance(recursion_limit, int):
            recursion_limit = 25

        config = {
            "configurable": {
                "thread_id": resolved_session_id,
                "ai_service": self.ai_service,
                "langfuse_client": self.ai_service.langfuse_client,
                "model_override": model_override,
            },
            "recursion_limit": recursion_limit,
            "callbacks": [langfuse_handler] if langfuse_handler else [],
            "metadata": {
                "langfuse_user_id": user_id,
                "langfuse_session_id": resolved_session_id,
                "langfuse_tags": ["content-refinement", f"tenant:{tenant_id}"],
            }
        }

        state_container = await drafting_graph.aget_state(config)

        if state_container and state_container.values:
            session_tenant = state_container.values.get("tenant_id")
            if session_tenant and str(session_tenant) != str(tenant_id):
                raise ValueError("Session does not belong to the active tenant context.")

        if not state_container or not state_container.values:
            # First turn: Initialize state
            inputs = {
                "messages": [HumanMessage(content=prompt)],
                "tenant_id": tenant_id,
                "user_id": user_id,
                "schema_json": schema_json,
                "current_draft_json": current_draft_json,
                "validation_payloads": [],
                "content_type_slug": None,
                "locale": locale,
                "style_modifier_prompt": style_modifier_instructions,
                "original_user_request": prompt,
                "user_input": prompt,
                "is_refinement": True,
            }
            event_inputs = inputs
        else:
            # Subsequent turn: Append user turn and update schema context
            await drafting_graph.aupdate_state(
                config,
                {
                    "messages": [HumanMessage(content=prompt)],
                    "current_draft_json": current_draft_json,
                    "schema_json": schema_json,
                },
                as_node="execute_tools"
            )
            event_inputs = {
                "user_input": prompt,
                "is_refinement": True,
                "current_draft_json": current_draft_json,
                "schema_json": schema_json,
            }

        resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
        
        async for event in handle_graph_stream(
            graph=drafting_graph,
            event_inputs=event_inputs,
            config=config,
            schema_json=schema_json,
            resolved_model=resolved_model,
            ai_service=self.ai_service,
            event_type="REFINE_COMPLETE"
        ):
            yield event

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

from src.domain.content_drafting.prompts import REFINEMENT_PROMPT
from src.application.ai_service import AIService
from src.infrastructure.repositories.session_repository import SQLSessionRepository
from src.domain.ai_agent_session.models import AIAgentSession


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
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Refines an existing draft based on user feedback.
        """
        repo = SQLSessionRepository(db)
        
        if session_id:
            session = await repo.get_by_id(UUID(session_id))
            if not session or str(session.tenant_id) != tenant_id:
                session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
        else:
            session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
            
        session.add_message("user", f"Refine draft: {prompt}")
        await repo.save(session)

        # Use style modifier instructions
        style_modifier_instructions = style_modifier_prompt or ""

        model = self.ai_service.get_model(model_override=model_override)
        history = session.to_langchain_messages()

        chain = REFINEMENT_PROMPT | model

        full_content = ""
        async for chunk in chain.astream(
            {
                "locale": locale,
                "style_modifier_instructions": style_modifier_instructions,
                "current_draft_json": json.dumps(current_draft_json, indent=2),
                "refinement_input": prompt,
                "schema_json": json.dumps(schema_json, indent=2),
                "history": history,
            }
        ):
            if hasattr(chunk, 'content'):
                content = chunk.content
                full_content += content
                yield {"event": "TEXT_DELTA", "data": content}

        session.add_message("assistant", full_content)
        await repo.save(session)

        try:
            start_idx = full_content.find('{')
            end_idx = full_content.rfind('}')
            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                json_str = full_content[start_idx:end_idx + 1]
            else:
                json_str = full_content
            refined_data = json.loads(json_str)
            yield {"event": "REFINE_COMPLETE", "data": {"draft": refined_data, "sessionId": str(session.id)}}
        except Exception as e:
            yield {"event": "ERROR", "data": {"detail": f"Failed to parse AI output as JSON: {e}"}}

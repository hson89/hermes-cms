import json
import re
from typing import Any, AsyncGenerator, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.content_drafting.prompts import DRAFTING_PROMPT, REFINEMENT_PROMPT
from src.application.ai_service import AIService
from src.infrastructure.tools.schema_resolver import schema_resolver
from src.infrastructure.tools.image_generator import image_generator
from src.infrastructure.repositories.session_repository import SQLSessionRepository
from src.domain.ai_agent_session.models import AIAgentSession


class DraftingService:
    """
    Orchestrates the AI drafting workflow, including streaming and tool calling.
    """

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def generate_draft_stream(
        self,
        prompt: str,
        content_type_slug: str,
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
        Generates a content draft using a streaming LLM.
        Yields events for explanation tokens and the final JSON draft.
        """
        repo = SQLSessionRepository(db)
        
        # 1. Handle session/history
        if session_id:
            session = await repo.get_by_id(UUID(session_id))
            if not session or str(session.tenant_id) != tenant_id:
                session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
        else:
            session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
            
        session.add_message("user", prompt)
        await repo.save(session)
        
        # 2. Use style modifier instructions
        style_modifier_instructions = style_modifier_prompt or ""

        # 3. Get the model and bind tools
        model = self.ai_service.get_model(model_override=model_override)
        model_with_tools = model.bind_tools([schema_resolver, image_generator])

        history = session.to_langchain_messages()

        chain = DRAFTING_PROMPT | model_with_tools

        full_content = ""
        async for chunk in chain.astream(
            {
                "locale": locale,
                "style_modifier_instructions": style_modifier_instructions,
                "content_type_slug": content_type_slug,
                "user_input": prompt,
                "schema_json": json.dumps(schema_json, indent=2),
                "history": history,
            }
        ):
            if hasattr(chunk, 'content'):
                content = chunk.content
                full_content += content
                yield {"event": "TEXT_DELTA", "data": content}

        # 4. Save AI response to history
        session.add_message("assistant", full_content)
        await repo.save(session)
        
        # 5. Extract and yield the final JSON
        try:
            start_idx = full_content.find('{')
            end_idx = full_content.rfind('}')
            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                json_str = full_content[start_idx:end_idx + 1]
            else:
                json_str = full_content
            draft_data = json.loads(json_str)
            yield {"event": "DRAFT_COMPLETE", "data": {"draft": draft_data, "sessionId": str(session.id)}}
        except Exception as e:
            yield {"event": "ERROR", "data": {"detail": f"Failed to parse AI output as JSON: {e}"}}

    async def refine_draft_stream(
        self,
        prompt: str,
        current_draft_json: dict,
        schema_json: dict,
        tenant_id: str,
        user_id: str,
        db: AsyncSession,
        locale: str = "en",
        model_override: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Refines an existing draft.
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

        model = self.ai_service.get_model(model_override=model_override)
        history = session.to_langchain_messages()

        chain = REFINEMENT_PROMPT | model

        full_content = ""
        async for chunk in chain.astream(
            {
                "locale": locale,
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

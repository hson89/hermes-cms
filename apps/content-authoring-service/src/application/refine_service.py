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
from src.domain.content_drafting.cost_calculator import calculate_cost
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
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Refines an existing draft based on user feedback.
        """
        repo = SQLSessionRepository(db)
        
        if session_id:
            try:
                session = await repo.get_by_id(UUID(session_id))
                if not session or str(session.tenant_id) != tenant_id:
                    session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
            except (ValueError, AttributeError):
                session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
        else:
            session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
            
        session.add_message("user", f"Refine draft: {prompt}")
        await repo.save(session)

        # Use style modifier instructions
        style_modifier_instructions = style_modifier_prompt or ""
        resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
        model = self.ai_service.get_model(model_override=resolved_model)
        chain = REFINEMENT_PROMPT | model
        
        # Initialize Langfuse handler
        langfuse_handler = self.ai_service._get_langfuse_handler(trace_id=langfuse_trace_id)
        config = {}
        if langfuse_handler:
            config = {
                "callbacks": [langfuse_handler],
                "metadata": {
                    "langfuse_user_id": user_id,
                    "langfuse_session_id": str(session.id),
                    "langfuse_tags": ["content-refinement", f"tenant:{tenant_id}"],
                }
            }

        history = session.to_langchain_messages()

        full_content = ""
        total_input_tokens = 0
        total_output_tokens = 0
        
        async for chunk in chain.astream(
            {
                "locale": locale,
                "style_modifier_instructions": style_modifier_instructions,
                "current_draft_json": json.dumps(current_draft_json, indent=2),
                "refinement_input": prompt,
                "schema_json": json.dumps(schema_json, indent=2),
                "history": history,
            },
            config=config
        ):
            if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                total_input_tokens += chunk.usage_metadata.get('input_tokens', 0)
                total_output_tokens += chunk.usage_metadata.get('output_tokens', 0)

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
            
            # Calculate cost
            cost = calculate_cost(
                model_identifier=resolved_model,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens
            )
            
            yield {
                "event": "REFINE_COMPLETE", 
                "data": {
                    "draft": refined_data, 
                    "sessionId": str(session.id),
                    "usage_metadata": {
                        "input_tokens": total_input_tokens,
                        "output_tokens": total_output_tokens,
                        "total_tokens": total_input_tokens + total_output_tokens,
                        "cost_microdollars": cost
                    }
                }
            }
        except Exception as e:
            try:
                # Healing block: attempt to recover plain text output into structured JSON schema format
                healing_prompt = f"""You are an expert JSON formatter.
You must convert the refined draft text below into a valid JSON object matching the requested schema.
Strictly adhere to the keys, field names, and structures defined in the schema.

Refined Text:
{full_content}

Schema:
{json.dumps(schema_json, indent=2)}

Return ONLY the raw JSON object matching the schema. Do not include any other conversational text, reasoning, or explanations. Do not include markdown formatting or blocks."""

                healing_model = self.ai_service.get_model(model_override=resolved_model)
                healing_res = await healing_model.ainvoke([HumanMessage(content=healing_prompt)])
                healing_content = healing_res.content.strip()
                
                match_healed = re.search(r"```(?:json)?\s*(.*?)\s*```", healing_content, re.DOTALL)
                clean_healed = match_healed.group(1).strip() if match_healed else healing_content.strip()
                
                start_idx_healed = clean_healed.find('{')
                end_idx_healed = clean_healed.rfind('}')
                if start_idx_healed != -1 and end_idx_healed != -1 and start_idx_healed < end_idx_healed:
                    json_str_healed = clean_healed[start_idx_healed:end_idx_healed + 1]
                else:
                    json_str_healed = clean_healed
                
                refined_healed = json.loads(json_str_healed)
                
                cost = calculate_cost(
                    model_identifier=resolved_model,
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens
                )
                
                yield {
                    "event": "REFINE_COMPLETE", 
                    "data": {
                        "draft": refined_healed, 
                        "sessionId": str(session.id),
                        "usage_metadata": {
                            "input_tokens": total_input_tokens,
                            "output_tokens": total_output_tokens,
                            "total_tokens": total_input_tokens + total_output_tokens,
                            "cost_microdollars": cost
                        }
                    }
                }
            except Exception as healing_err:
                yield {"event": "ERROR", "data": {"detail": f"Failed to parse AI output as JSON: {e}. Healing also failed: {healing_err}. Raw content: {full_content[:2000]}"}}


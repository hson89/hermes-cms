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

from src.domain.content_drafting.prompts import get_refinement_prompt, get_healing_prompt
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
        config = {
            "configurable": {
                "thread_id": resolved_session_id,
                "ai_service": self.ai_service,
                "langfuse_client": self.ai_service.langfuse_client,
                "model_override": model_override,
            },
            "callbacks": [langfuse_handler] if langfuse_handler else [],
            "metadata": {
                "langfuse_user_id": user_id,
                "langfuse_session_id": resolved_session_id,
                "langfuse_tags": ["content-refinement", f"tenant:{tenant_id}"],
            }
        }

        state_container = await drafting_graph.aget_state(config)

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
            # Subsequent turn: Append user turn
            await drafting_graph.aupdate_state(
                config,
                {"messages": [HumanMessage(content=prompt)], "current_draft_json": current_draft_json},
                as_node="execute_tools"
            )
            event_inputs = {
                "user_input": prompt,
                "is_refinement": True,
                "current_draft_json": current_draft_json,
            }

        resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
        full_content = ""
        total_input_tokens = 0
        total_output_tokens = 0

        async for event in drafting_graph.astream_events(event_inputs, config=config, version="v2"):
            kind = event["event"]
            node_name = event.get("metadata", {}).get("langgraph_node")
            
            if kind == "on_chat_model_stream" and node_name == "call_drafting_llm":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                    total_input_tokens += chunk.usage_metadata.get('input_tokens', 0)
                    total_output_tokens += chunk.usage_metadata.get('output_tokens', 0)

                content = chunk.content
                if isinstance(content, list):
                    content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
                
                if content:
                    full_content += content
                    yield {"event": "TEXT_DELTA", "data": content}

            elif kind == "on_tool_start" and node_name == "call_drafting_llm":
                tool_name = event["name"]
                yield {"event": "TEXT_DELTA", "data": f"\n[Executing {tool_name}...]\n"}

        try:
            start_idx = full_content.find('{')
            end_idx = full_content.rfind('}')
            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                json_str = full_content[start_idx:end_idx + 1]
            else:
                json_str = full_content
            refined_data = json.loads(json_str)
            cost = calculate_cost(
                model_identifier=resolved_model,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens
            )
            
            await drafting_graph.aupdate_state(
                config,
                {"current_draft_json": refined_data},
                as_node="call_drafting_llm"
            )

            yield {
                "event": "REFINE_COMPLETE", 
                "data": {
                    "draft": refined_data, 
                    "sessionId": resolved_session_id,
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
                healing_template = get_healing_prompt(self.ai_service.langfuse_client if self.ai_service else None)
                healing_prompt = healing_template.messages[0].prompt.format(
                    full_content=full_content,
                    schema_json=json.dumps(schema_json, indent=2)
                )

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
                
                await drafting_graph.aupdate_state(
                    config,
                    {"current_draft_json": refined_healed},
                    as_node="call_drafting_llm"
                )

                yield {
                    "event": "REFINE_COMPLETE", 
                    "data": {
                        "draft": refined_healed, 
                        "sessionId": resolved_session_id,
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


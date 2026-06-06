import json
import re
import asyncio
from typing import Any, AsyncGenerator, Optional, List, Dict
from uuid import UUID

import httpx
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.content_drafting.prompts import get_drafting_prompt, get_healing_prompt
from src.application.ai_service import AIService
from src.infrastructure.tools.schema_resolver import schema_resolver
from src.infrastructure.tools.image_generator import image_generator
from src.application.stream_utils import handle_graph_stream
from src.application.refine_service import RefineService
from src.domain.ai_agent_session.models import AIAgentSession
from src.domain.content_drafting.cost_calculator import calculate_cost, get_model_metadata
from src.infrastructure.config import settings


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s-]+', '-', s)
    return s.strip('-')



class DraftingService:
    """
    Orchestrates the AI drafting workflow, including streaming and tool calling.
    """

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        self.refine_service = RefineService(ai_service)

    async def generate_draft_stream(
        self,
        prompt: str,
        content_type_slug: Optional[str],
        schema_json: Optional[dict],
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
        Generates a content draft using a streaming LLM.
        Yields events for explanation tokens, field-level updates, and the final JSON draft.
        """
        if not content_type_slug or not schema_json:
            # Bootstrap flow: check if there's an existing matching content type first
            cms_url = settings.CMS_ENGINE_URL
            headers = {
                "X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET,
                "Content-Type": "application/json",
            }
            
            existing_types = []
            try:
                async with httpx.AsyncClient() as client:
                    find_url = f"{cms_url}/api/content-types?where[or][0][tenant][equals]={tenant_id}&where[or][1][isGlobal][equals]=true&limit=100"
                    response = await client.get(find_url, headers=headers)
                    if response.status_code == 200:
                        existing_types = response.json().get("docs", [])
            except Exception as e:
                yield {"event": "TEXT_DELTA", "data": f"[Warning: Failed to fetch existing content types: {e}]\n\n"}
            
            matched_ct = None
            if existing_types:
                # Prepare existing types info for matching
                types_info = []
                for ct in existing_types:
                    desc = ct.get("description", "")
                    fields_list = [f.get("name") for f in ct.get("schema", {}).get("fields", [])]
                    types_info.append({
                        "id": ct.get("id"),
                        "name": ct.get("name"),
                        "slug": ct.get("slug"),
                        "description": desc,
                        "fields": fields_list
                    })
                
                # Fetch default model for matching
                resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
                model_for_match = self.ai_service.get_model(model_override=resolved_model)
                
                matching_prompt = f"""You are an assistant that decides if a user's request for content can be satisfied by any of the existing content types.
Here is the user's request: "{prompt}"

Here are the existing content types (JSON array):
{json.dumps(types_info, indent=2)}

Determine if one of the existing content types matches or is a good fit for the user's request (e.g. if they want to write an article, post, etc., and there is a matching Article or Editorial Article type).
If a good fit exists, reply with the slug of the matched content type.
If none of them matches or fits, reply with "NONE".
Return ONLY the slug or "NONE". Do not include any other text or markdown block."""

                try:
                    matching_res = await model_for_match.ainvoke([HumanMessage(content=matching_prompt)])
                    matching_ans = matching_res.content.strip().strip("`").strip()
                    if matching_ans != "NONE":
                        for ct in existing_types:
                            if ct.get("slug") == matching_ans:
                                matched_ct = ct
                                break
                except Exception as e:
                    pass
            
            content_type_id = None
            if matched_ct:
                schema_json = matched_ct.get("schema", {})
                content_type_slug = matched_ct.get("slug")
                content_type_name = matched_ct.get("name")
                content_type_id = matched_ct.get("id")
                
                # Fetch alternatives from existing types
                alternatives = []
                for ct in existing_types:
                    if ct.get("id") != content_type_id:
                        schema_alt = ct.get("schema", {})
                        alternatives.append({
                            "id": ct.get("id"),
                            "name": ct.get("name"),
                            "slug": ct.get("slug"),
                            "description": ct.get("description") or "Standard content schema",
                            "fields": schema_alt.get("fields", []),
                            "schema": schema_alt,
                        })
                
                yield {"event": "TEXT_DELTA", "data": f"Reusing existing content type: **{content_type_name}**\n\n"}
                
                yield {
                    "event": "SCHEMA_UPDATED",
                    "data": {
                        "contentType": {
                            "id": content_type_id,
                            "name": content_type_name,
                            "slug": content_type_slug,
                            "fields": schema_json.get("fields", []),
                            "schema": schema_json,
                        },
                        "prompt": prompt,
                        "alternatives": alternatives,
                    }
                }
            else:
                yield {"event": "TEXT_DELTA", "data": "I couldn't find a matching content type for your request among the existing ones.\n\n"}
                
                if existing_types:
                    types_list = ", ".join([f"**{ct.get('name')}**" for ct in existing_types[:5]])
                    yield {"event": "TEXT_DELTA", "data": f"Would you like to use one of these: {types_list}? Or please be more specific about the type of content you want to create."}
                else:
                    yield {"event": "TEXT_DELTA", "data": "No content types are currently defined for this tenant. Please create a content type in the CMS first."}
                
                return

        import uuid
        from datetime import datetime, timezone

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
                "langfuse_tags": ["content-drafting", f"tenant:{tenant_id}"],
            }
        }

        # Check if the checkpoint state already exists
        state_container = await drafting_graph.aget_state(config)
        is_refinement = False

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
                "current_draft_json": None,
                "validation_payloads": [],
                "content_type_slug": content_type_slug,
                "locale": locale,
                "style_modifier_prompt": style_modifier_instructions,
                "original_user_request": prompt,
                "user_input": prompt,
                "is_refinement": False,
            }
            event_inputs = inputs
        else:
            # Subsequent turn: Append user prompt to messages and update schema context
            await drafting_graph.aupdate_state(
                config,
                {
                    "messages": [HumanMessage(content=prompt)],
                    "schema_json": schema_json,
                    "content_type_slug": content_type_slug,
                },
                as_node="execute_tools"
            )
            event_inputs = {
                "user_input": prompt,
                "is_refinement": False,
                "schema_json": schema_json,
                "content_type_slug": content_type_slug,
            }

        resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
        
        async for event in handle_graph_stream(
            graph=drafting_graph,
            event_inputs=event_inputs,
            config=config,
            schema_json=schema_json,
            resolved_model=resolved_model,
            ai_service=self.ai_service,
            event_type="DRAFT_COMPLETE"
        ):
            yield event


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
        drafting_graph: Any = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Refines an existing draft by delegating to RefineService.
        """
        async for event in self.refine_service.refine_draft_stream(
            prompt=prompt,
            current_draft_json=current_draft_json,
            schema_json=schema_json,
            tenant_id=tenant_id,
            user_id=user_id,
            db=db,
            locale=locale,
            style_modifier_id=style_modifier_id,
            style_modifier_prompt=style_modifier_prompt,
            model_override=model_override,
            session_id=session_id,
            langfuse_trace_id=langfuse_trace_id,
            drafting_graph=drafting_graph,
        ):
            yield event


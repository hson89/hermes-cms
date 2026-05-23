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
from src.infrastructure.repositories.session_repository import SQLSessionRepository
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
                    find_url = f"{cms_url}/api/content-types?where[tenant][equals]={tenant_id}&limit=100"
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

        repo = SQLSessionRepository(db)
        
        if session_id:
            try:
                session = await repo.get_by_id(UUID(session_id))
                if not session or str(session.tenant_id) != tenant_id:
                    session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
                else:
                    # Preserve context history so multi-turn schema/plan confirmation works
                    pass
            except (ValueError, AttributeError):
                session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
        else:
            session = AIAgentSession(tenant_id=tenant_id, user_id=user_id)
            
        session.add_message("user", prompt)
        await repo.save(session)
        
        style_modifier_instructions = style_modifier_prompt or ""
        resolved_model = model_override or f"{settings.LANGCHAIN_MODEL_PROVIDER}/{settings.LANGCHAIN_MODEL}"
        model = self.ai_service.get_model(model_override=resolved_model)
        
        # Define tools and bind them
        tools = [schema_resolver, image_generator]
        model_with_tools = model.bind_tools(tools)

        # Initialize Langfuse handler
        langfuse_handler = self.ai_service._get_langfuse_handler(
            trace_id=langfuse_trace_id,
            session_id=str(session.id)
        )
        config = {}
        if langfuse_handler:
            config = {
                "callbacks": [langfuse_handler],
                "metadata": {
                    "langfuse_user_id": user_id,
                    "langfuse_session_id": str(session.id),
                    "langfuse_tags": ["content-drafting", f"tenant:{tenant_id}"],
                }
            }

        history = session.to_langchain_messages()
        
        # Prepare initial messages for the chain
        messages: List[BaseMessage] = history
        # History already contains the last user message added above
        
        # Format the base messages with the prompt template (system prompt, history, user prompt)
        # This ensures the model receives its system instructions, schema, and guidelines in all iterations
        drafting_prompt = get_drafting_prompt(self.ai_service.langfuse_client)
        
        # Extract the original user request from history (the very first user message in the session)
        original_user_request = prompt
        if messages:
            first_msg = messages[0]
            if isinstance(first_msg, dict):
                original_user_request = first_msg.get("content", prompt)
            else:
                original_user_request = getattr(first_msg, "content", prompt)
        
        prompt_values = {
            "locale": locale,
            "style_modifier_instructions": style_modifier_instructions,
            "content_type_slug": content_type_slug,
            "original_user_request": original_user_request,
            "user_input": prompt,
            "schema_json": json.dumps(schema_json, indent=2),
            "history": messages[:-1] # All except the last user message which is replaced by user_input
        }
        base_messages = drafting_prompt.format_messages(**prompt_values)
        tool_messages_this_turn = []
        
        # We'll use a loop to handle potential tool calls
        max_iterations = 3
        current_iteration = 0
        
        total_input_tokens = 0
        total_output_tokens = 0
        
        while current_iteration < max_iterations:
            current_iteration += 1
            
            full_content = ""
            tool_calls = []
            
            # Simple field detector state
            current_field = None
            emitted_fields = set()
            
            # Use the base messages formatted with the prompt template, and append any tools executed during this turn
            if current_iteration == 1:
                input_data = base_messages
            else:
                input_data = base_messages + tool_messages_this_turn

            async for chunk in model_with_tools.astream(input_data, config=config):
                # Handle usage metadata if available
                if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                    total_input_tokens += chunk.usage_metadata.get('input_tokens', 0)
                    total_output_tokens += chunk.usage_metadata.get('output_tokens', 0)

                # Handle tool calls
                if hasattr(chunk, 'tool_call_chunks') and chunk.tool_call_chunks:
                    for tc_chunk in chunk.tool_call_chunks:
                        # Find existing tool call to append to or create new
                        idx = tc_chunk.get('index')
                        if idx is not None:
                            while len(tool_calls) <= idx:
                                tool_calls.append({"name": "", "args": "", "id": None})
                            
                            if tc_chunk.get('name'):
                                tool_calls[idx]['name'] += tc_chunk['name']
                            if tc_chunk.get('args'):
                                tool_calls[idx]['args'] += tc_chunk['args']
                            if tc_chunk.get('id'):
                                tool_calls[idx]['id'] = tc_chunk['id']

                # Handle content
                if hasattr(chunk, 'content') and chunk.content:
                    content = chunk.content
                    if isinstance(content, list):
                        # Multi-modal or complex content
                        content = "".join([c.get('text', '') if isinstance(c, dict) else str(c) for c in content])
                    
                    full_content += content
                    
                    # Yield TEXT_DELTA
                    yield {"event": "TEXT_DELTA", "data": content}
                    
                    # Heuristic field detection for FIELD_START/FIELD_COMPLETE
                    # Look for patterns like: "field_name": "
                    potential_fields = re.findall(r'"([^"]+)":\s*"', full_content[max(0, len(full_content)-100):])
                    for field in potential_fields:
                        if field not in emitted_fields and field in [f.get('name') for f in schema_json.get('fields', [])]:
                            if current_field:
                                yield {"event": "FIELD_COMPLETE", "data": {"field": current_field}}
                            current_field = field
                            emitted_fields.add(field)
                            yield {"event": "FIELD_START", "data": {"field": field}}

            # If tool calls were requested, execute them
            if tool_calls:
                # Convert string args to dict
                for tc in tool_calls:
                    if isinstance(tc['args'], str):
                        try:
                            tc['args'] = json.loads(tc['args'])
                        except:
                            pass
                
                # Add the AI message with tool calls to history
                ai_msg = AIMessage(content=full_content, tool_calls=[
                    {"name": tc['name'], "args": tc['args'], "id": tc['id'], "type": "tool_call"} 
                    for tc in tool_calls if tc['name']
                ])
                messages.append(ai_msg)
                tool_messages_this_turn.append(ai_msg)
                
                # Execute tools
                tool_map = {t.name: t for t in tools}
                for tc in tool_calls:
                    if not tc['name']: continue
                    
                    yield {"event": "TEXT_DELTA", "data": f"\n[Executing {tc['name']}...]\n"}
                    
                    tool = tool_map.get(tc['name'])
                    if tool:
                        try:
                            # Tool execution might need tenant_id/user_id etc which are often in context or args
                            # The tools should be defined to handle their own dependencies or we pass them
                            tool_args = dict(tc['args']) if isinstance(tc['args'], dict) else {}
                            if tc['name'] == 'schema_resolver':
                                if 'tenant_id' not in tool_args:
                                    tool_args['tenant_id'] = tenant_id
                                if ('content_type_slug' not in tool_args or not tool_args['content_type_slug']) and content_type_slug:
                                    tool_args['content_type_slug'] = content_type_slug
                            result = await tool.ainvoke(tool_args)
                            tool_msg = ToolMessage(content=json.dumps(result), tool_call_id=tc['id'])
                            messages.append(tool_msg)
                            tool_messages_this_turn.append(tool_msg)
                        except Exception as e:
                            err_msg = ToolMessage(content=f"Error: {str(e)}", tool_call_id=tc['id'])
                            messages.append(err_msg)
                            tool_messages_this_turn.append(err_msg)
                    else:
                        err_msg = ToolMessage(content=f"Error: Tool {tc['name']} not found", tool_call_id=tc['id'])
                        messages.append(err_msg)
                        tool_messages_this_turn.append(err_msg)
                
                # Continue loop to get next AI response
                continue
            else:
                # No tool calls, we are done
                if current_field:
                    yield {"event": "FIELD_COMPLETE", "data": {"field": current_field}}
                
                # Save final AI response to history
                session.add_message("assistant", full_content)
                await repo.save(session)
                break

        # 5. Extract and yield the final JSON and metadata
        try:
            # Check if the AI output looks like a conversational turn (asking clarification)
            # instead of a structured draft completion.
            has_json_block = "```" in full_content
            has_raw_json = full_content.strip().startswith("{") and full_content.strip().endswith("}")
            
            if not has_json_block and not has_raw_json:
                # Conversational turn: save to history and end stream without DRAFT_COMPLETE
                session.add_message("assistant", full_content)
                await repo.save(session)
                return

            match = re.search(r"```(?:json)?\s*(.*?)\s*```", full_content, re.DOTALL)
            clean_content = match.group(1).strip() if match else full_content.strip()
            
            start_idx = clean_content.find('{')
            end_idx = clean_content.rfind('}')
            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                json_str = clean_content[start_idx:end_idx + 1]
            else:
                json_str = clean_content
            
            draft_data = json.loads(json_str)
            
            # Calculate cost
            cost = calculate_cost(
                model_identifier=resolved_model,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens
            )
            
            yield {
                "event": "DRAFT_COMPLETE", 
                "data": {
                    "draft": draft_data, 
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
            # If the output *contained* a JSON block but failed to parse, attempt healing.
            # Otherwise, if it was already caught as conversational above, we've returned.
            try:
                # Healing block: attempt to recover plain text output into structured JSON schema format
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
                
                draft_healed = json.loads(json_str_healed)
                
                cost = calculate_cost(
                    model_identifier=resolved_model,
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens
                )
                
                yield {
                    "event": "DRAFT_COMPLETE", 
                    "data": {
                        "draft": draft_healed, 
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
        ):
            yield event

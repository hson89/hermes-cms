import json
import re
import asyncio
from typing import Any, AsyncGenerator, Optional, List, Dict
from uuid import UUID

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.content_drafting.prompts import DRAFTING_PROMPT, REFINEMENT_PROMPT
from src.application.ai_service import AIService
from src.infrastructure.tools.schema_resolver import schema_resolver
from src.infrastructure.tools.image_generator import image_generator
from src.infrastructure.repositories.session_repository import SQLSessionRepository
from src.application.refine_service import RefineService
from src.domain.ai_agent_session.models import AIAgentSession
from src.domain.content_drafting.cost_calculator import calculate_cost, get_model_metadata


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
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Generates a content draft using a streaming LLM.
        Yields events for explanation tokens, field-level updates, and the final JSON draft.
        """
        if not content_type_slug or not schema_json:
            # Bootstrap flow: generate schema first
            schema_result = await self.ai_service.generate_schema(
                prompt=prompt,
                tenant_id=tenant_id,
                user_id=user_id,
                current_schema=schema_json,
                db=db,
            )
            
            schema_json = schema_result["schema"]
            content_type_slug = schema_json.get("slug", schema_json.get("name", "Generated Type"))
            session_id = schema_result["sessionId"]
            
            if schema_result.get("message"):
                yield {"event": "TEXT_DELTA", "data": schema_result["message"] + "\n\n"}
                
            yield {"event": "SCHEMA_UPDATED", "data": {"contentType": schema_json, "prompt": prompt}}

            # Construct empty/default draft structure based on schema fields
            default_draft = {}
            for field in schema_json.get("fields", []):
                fname = field.get("name")
                ftype = field.get("type")
                if not fname:
                    continue
                if ftype == "boolean":
                    default_draft[fname] = False
                elif ftype == "number":
                    default_draft[fname] = None
                elif ftype in ("text", "select"):
                    default_draft[fname] = ""
                else:
                    default_draft[fname] = None

            if "title" not in default_draft:
                default_draft["title"] = ""
            if "slug" not in default_draft:
                default_draft["slug"] = ""

            yield {"event": "DRAFT_COMPLETE", "data": {"draft": default_draft, "sessionId": session_id}}
            return

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
            
        session.add_message("user", prompt)
        await repo.save(session)
        
        style_modifier_instructions = style_modifier_prompt or ""
        resolved_model = model_override or "openai/gpt-4o"
        model = self.ai_service.get_model(model_override=resolved_model)
        
        # Define tools and bind them
        tools = [schema_resolver, image_generator]
        model_with_tools = model.bind_tools(tools)

        history = session.to_langchain_messages()
        
        # Prepare initial messages for the chain
        messages: List[BaseMessage] = history
        # History already contains the last user message added above
        
        # We'll use a loop to handle potential tool calls
        max_iterations = 3
        current_iteration = 0
        
        total_input_tokens = 0
        total_output_tokens = 0
        
        while current_iteration < max_iterations:
            current_iteration += 1
            
            # Use the drafting prompt to wrap messages if it's the first call in this session
            # Actually, LangChain's ChatPromptTemplate handles this.
            # But we need to pass the required variables.
            prompt_values = {
                "locale": locale,
                "style_modifier_instructions": style_modifier_instructions,
                "content_type_slug": content_type_slug,
                "user_input": prompt,
                "schema_json": json.dumps(schema_json, indent=2),
                "history": messages[:-1] # All except the last user message which is replaced by user_input
            }
            
            full_content = ""
            tool_calls = []
            
            # Simple field detector state
            current_field = None
            emitted_fields = set()
            
            # Use the prompt template for the first iteration, then just raw messages if continuing
            if current_iteration == 1:
                input_data = DRAFTING_PROMPT.format_messages(**prompt_values)
            else:
                input_data = messages

            async for chunk in model_with_tools.astream(input_data):
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
                            result = await tool.ainvoke(tc['args'])
                            messages.append(ToolMessage(content=json.dumps(result), tool_call_id=tc['id']))
                        except Exception as e:
                            messages.append(ToolMessage(content=f"Error: {str(e)}", tool_call_id=tc['id']))
                    else:
                        messages.append(ToolMessage(content=f"Error: Tool {tc['name']} not found", tool_call_id=tc['id']))
                
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
            yield {"event": "ERROR", "data": {"detail": f"Failed to parse AI output as JSON: {e}. Raw content: {full_content[:2000]}"}}

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
        ):
            yield event

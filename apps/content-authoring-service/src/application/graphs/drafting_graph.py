"""
StateGraph for AI Content Drafting workflow using LangGraph.
"""

from typing import Annotated, Any, Dict, List, Literal, Optional, TypedDict
import json

from langchain_core.messages import BaseMessage, ToolMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from src.application.ai_service import AIService
from src.application.marketplace_service import MarketplaceService
from src.domain.content_drafting.prompts import get_drafting_prompt, get_refinement_prompt
from src.infrastructure.tools.image_generator import image_generator
from src.infrastructure.tools.schema_resolver import schema_resolver

# Initialize Marketplace Service
marketplace_service = MarketplaceService()


class DraftingState(TypedDict):
    """
    State tracking across the structured drafting graph.
    """
    messages: Annotated[List[BaseMessage], add_messages]
    tenant_id: str
    user_id: str
    schema_json: Optional[Dict[str, Any]]
    current_draft_json: Optional[Dict[str, Any]]
    validation_payloads: List[Dict[str, Any]]
    
    # State parameters for dynamic formatting
    content_type_slug: Optional[str]
    locale: str
    style_modifier_prompt: Optional[str]
    original_user_request: str
    user_input: str
    
    # Tracks if this is a refinement turn (True) or fresh draft turn (False)
    is_refinement: bool


async def call_drafting_llm(state: DraftingState, config: RunnableConfig) -> Dict[str, Any]:
    """
    Invokes the LLM bound with DALL-E and Schema resolver tools.
    """
    ai_service = config["configurable"].get("ai_service")
    langfuse_client = config["configurable"].get("langfuse_client")
    model_override = config["configurable"].get("model_override")

    if ai_service is None:
        ai_service = AIService()

    model = ai_service.get_model(model_override=model_override)
    
    # Story 4: Dynamic Tool Registration
    # In production, we'd fetch active marketplace apps for the current tenant.
    tools = [schema_resolver, image_generator]
    
    model_with_tools = model.bind_tools(tools)

    # 1. Resolve prompt template based on task type (refinement vs fresh drafting)
    is_refinement = state.get("is_refinement", False)
    
    if is_refinement:
        refinement_prompt = get_refinement_prompt(langfuse_client)
        
        # Build variables
        style_instructions = state.get("style_modifier_prompt") or ""
        history = list(state.get("messages", []))
        
        # Prepare inputs
        prompt_values = {
            "locale": state.get("locale", "en"),
            "style_modifier_instructions": style_instructions,
            "current_draft_json": json.dumps(state.get("current_draft_json") or {}, indent=2),
            "refinement_input": state.get("user_input", ""),
            "schema_json": json.dumps(state.get("schema_json") or {}, indent=2),
            "history": history[:-1] if len(history) > 1 else []  # Exclude last user turn
        }
        formatted_messages = refinement_prompt.format_messages(**prompt_values)
    else:
        drafting_prompt = get_drafting_prompt(langfuse_client)
        
        # Prepare inputs
        style_instructions = state.get("style_modifier_prompt") or ""
        history = list(state.get("messages", []))
        
        prompt_values = {
            "locale": state.get("locale", "en"),
            "style_modifier_instructions": style_instructions,
            "content_type_slug": state.get("content_type_slug", ""),
            "original_user_request": state.get("original_user_request", ""),
            "user_input": state.get("user_input", ""),
            "schema_json": json.dumps(state.get("schema_json") or {}, indent=2),
            "history": history[:-1] if len(history) > 1 else []  # Exclude last user turn
        }
        formatted_messages = drafting_prompt.format_messages(**prompt_values)

    # 2. Invoke LLM and get response
    callbacks = config.get("callbacks", [])
    
    # Use astream to ensure tokens are emitted for astream_events(graph)
    full_response = None
    async for chunk in model_with_tools.astream(formatted_messages, config={"callbacks": callbacks}):
        if full_response is None:
            full_response = chunk
        else:
            full_response += chunk

    return {
        "messages": [full_response]
    }


async def execute_drafting_tools(state: DraftingState, config: RunnableConfig) -> Dict[str, Any]:
    """
    Custom executor node to securely run tools and catch execution errors.
    """
    last_message = state["messages"][-1]
    tool_messages = []
    
    tenant_id = state.get("tenant_id")
    if not tenant_id or not isinstance(tenant_id, str):
        raise ValueError("Security violation: tenant_id must be a valid string to prevent cross-tenant leak.")

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = dict(tool_call["args"])
        tool_id = tool_call["id"]
        
        # Enforce logical boundary verification for internal secrets/API
        if tool_name == "schema_resolver":
            tool_args["tenant_id"] = tenant_id

        try:
            if tool_name == "schema_resolver":
                res = await schema_resolver.ainvoke(tool_args, config=config)
            elif tool_name == "image_generator":
                res = await image_generator.ainvoke(tool_args, config=config)
            elif tool_name.startswith("app_"):
                # Story 4: Execute dynamic marketplace tool
                app_id = tool_name.replace("app_", "")
                # Resolve app URL from context or registry (mocked here)
                app_url = "https://mock-app-service.hermes.ai" 
                tool = marketplace_service.get_tool_for_app(app_id, app_url, tenant_id)
                res = await tool.ainvoke(tool_args["query"] if "query" in tool_args else str(tool_args))
            else:
                res = f"Error: Tool '{tool_name}' not found."

            tool_messages.append(ToolMessage(
                content=json.dumps(res) if not isinstance(res, str) else res,
                tool_call_id=tool_id
            ))
        except Exception as e:
            # Capture tool errors gracefully to feed back to the LLM node for self-correction
            error_feedback = f"Error executing tool '{tool_name}': {str(e)}. Please correct tool parameters and retry."
            tool_messages.append(ToolMessage(
                content=error_feedback,
                status="error",
                tool_call_id=tool_id
            ))

    return {"messages": tool_messages}


def should_continue_drafting(state: DraftingState) -> Literal["execute_tools", "__end__"]:
    """
    Conditional routing edge checking for pending tool calls.
    """
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "execute_tools"
    return END


# Build and compile StateGraph
builder = StateGraph(DraftingState)

builder.add_node("call_drafting_llm", call_drafting_llm)
builder.add_node("execute_tools", execute_drafting_tools)

builder.add_edge(START, "call_drafting_llm")

# Wire tools conditional looping
builder.add_conditional_edges(
    "call_drafting_llm",
    should_continue_drafting,
    {
        "execute_tools": "execute_tools",
        "__end__": END
    }
)
builder.add_edge("execute_tools", "call_drafting_llm")

from langgraph.checkpoint.memory import MemorySaver

drafting_graph = builder.compile(checkpointer=MemorySaver())

"""
StateGraph for autonomous and self-correcting page template generation.
"""

from typing import Annotated, Any, Dict, List, Literal, Optional, TypedDict
import operator

from langchain_core.messages import BaseMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from src.application.nodes.template_builder_nodes import (
    analyze_design_node,
    register_with_cms_node,
)


class TemplateBuilderState(TypedDict):
    """
    State tracking across the template builder graph workflow.
    """
    messages: Annotated[List[BaseMessage], add_messages]
    design_html: str
    tenant_id: str
    user_id: str
    templates: List[Dict[str, Any]]
    explanation: Optional[str]
    errors: List[str]
    retry_count: int
    cms_results: List[Dict[str, Any]]


def should_continue_builder(state: TemplateBuilderState) -> Literal["analyze_design_node", "__end__"]:
    """
    Decides whether to retry design analysis or exit.
    """
    errors = state.get("errors", [])
    retry_count = state.get("retry_count", 0)
    
    if errors and retry_count < 2:
        return "analyze_design_node"
    return END


# Create and wire the StateGraph
builder = StateGraph(TemplateBuilderState)

builder.add_node("analyze_design_node", analyze_design_node)
builder.add_node("register_with_cms_node", register_with_cms_node)

builder.add_edge(START, "analyze_design_node")
builder.add_edge("analyze_design_node", "register_with_cms_node")

# Route conditionally based on errors (self-healing)
builder.add_conditional_edges(
    "register_with_cms_node",
    should_continue_builder,
    {
        "analyze_design_node": "analyze_design_node",
        "__end__": END
    }
)

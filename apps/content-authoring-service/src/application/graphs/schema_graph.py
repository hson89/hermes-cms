"""
StateGraph for autonomous and self-correcting content schema generation.
"""

from typing import Annotated, Any, Dict, List, Literal, Optional, TypedDict
import operator

from langchain_core.messages import BaseMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from src.application.nodes.schema_nodes import call_schema_llm, validate_schema_node


class SchemaState(TypedDict):
    """
    State tracking across the schema generation graph workflow.
    """
    messages: Annotated[List[BaseMessage], add_messages]
    prompt: str
    tenant_id: str
    user_id: str
    current_schema: Optional[Dict[str, Any]]
    generated_schema: Optional[Dict[str, Any]]
    explanation: Optional[str]
    errors: List[str]
    retry_count: int
    validation_payloads: Annotated[List[Dict[str, Any]], operator.add]


def should_continue_schema(state: SchemaState) -> Literal["call_schema_llm", "__end__"]:
    """
    Decides whether to retry schema generation or exit.
    """
    errors = state.get("errors", [])
    retry_count = state.get("retry_count", 0)
    
    if errors and retry_count < 3:
        return "call_schema_llm"
    return END


# Create and wire the StateGraph
builder = StateGraph(SchemaState)

builder.add_node("call_schema_llm", call_schema_llm)
builder.add_node("validate_schema_node", validate_schema_node)

builder.add_edge(START, "call_schema_llm")
builder.add_edge("call_schema_llm", "validate_schema_node")

# Route conditionally based on validation results
builder.add_conditional_edges(
    "validate_schema_node",
    should_continue_schema,
    {
        "call_schema_llm": "call_schema_llm",
        "__end__": END
    }
)

from langgraph.checkpoint.memory import MemorySaver

schema_graph = builder.compile(checkpointer=MemorySaver())

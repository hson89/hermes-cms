"""
Domain State Definitions for LangGraph agent workflows.
"""

from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentExecutionState(TypedDict):
    """
    State tracking across content schema generation and drafting workflows.
    """
    messages: Annotated[List[BaseMessage], add_messages]
    tenant_id: str
    user_id: str
    schema_json: Optional[Dict[str, Any]]
    current_draft_json: Optional[Dict[str, Any]]
    validation_payloads: List[Dict[str, Any]]

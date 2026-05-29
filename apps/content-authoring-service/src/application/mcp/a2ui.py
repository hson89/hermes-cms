from __future__ import annotations
from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel, Field

ALEXANDRIA_COLOR_MAP = {
    "primary": "#094cb2",
    "gold": "#6d5e00",
    "success": "success",
    "danger": "danger",
    "neutral": "neutral"
}

def map_alexandria_style(theme_token: str) -> str:
    """Maps theme tokens to exact Alexandria design tokens where applicable."""
    return ALEXANDRIA_COLOR_MAP.get(theme_token, theme_token)

class A2UIBase(BaseModel):
    """Base class for all Alexandria-aligned UI components."""
    type: str
    theme: Literal["primary", "success", "danger", "gold", "neutral"] = "neutral"
    typography: Literal["serif", "sans"] = "sans"
    elevation: Literal["flat", "raised", "glass"] = "flat"

class A2UITableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]

class A2UITable(A2UIBase):
    type: Literal["table"] = "table"
    data: A2UITableData

class A2UIChartDataset(BaseModel):
    label: str
    data: List[float]

class A2UIChart(A2UIBase):
    type: Literal["chart"] = "chart"
    chart_type: Literal["line", "bar", "pie"]
    labels: List[str]
    datasets: List[A2UIChartDataset]

class A2UIFormField(BaseModel):
    name: str
    label: str
    type: Literal["text", "number", "select"] = "text"
    options: Optional[List[str]] = None

class A2UIFormAction(BaseModel):
    label: str
    action: str
    payload: Optional[Dict[str, Any]] = None

class A2UIForm(A2UIBase):
    type: Literal["form"] = "form"
    fields: List[A2UIFormField]
    actions: List[A2UIFormAction]

class A2UICard(A2UIBase):
    type: Literal["card"] = "card"
    title: str
    description: Optional[str] = None
    children: List[Union[A2UICard, A2UITable, A2UIChart, A2UIForm]] = Field(default_factory=list)

import mcp.types as types

def create_a2ui_response(text: str, visual_card: A2UICard) -> types.CallToolResult:
    """Creates a CallToolResult containing both markdown text and an Alexandria-aligned visual A2UI payload."""
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=text)],
        structuredContent={"visual": visual_card.model_dump(exclude_none=True)}
    )

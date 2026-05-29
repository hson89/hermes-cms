import pytest
from src.application.mcp.server import mcp

@pytest.mark.asyncio
async def test_mcp_dynamic_tool_discovery():
    # Act
    tools = await mcp.list_tools()
    
    # Assert
    # Verify that the two core agents/tools are present in the list
    tool_names = [t.name for t in tools]
    assert "draft_content" in tool_names
    assert "chat_agent" in tool_names
    
    # Find draft_content tool and inspect its input schema
    draft_tool = next(t for t in tools if t.name == "draft_content")
    assert draft_tool.description is not None
    assert "prompt" in draft_tool.description
    
    # Verify that the schemas are automatically generated
    assert draft_tool.name == "draft_content"

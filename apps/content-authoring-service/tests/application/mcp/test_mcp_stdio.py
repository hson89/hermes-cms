import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.application.mcp.server import mcp

@pytest.mark.asyncio
async def test_mcp_server_lists_tools():
    # Act
    tools = await mcp.list_tools()
    
    # Assert
    tool_names = [t.name for t in tools]
    assert "chat_agent" in tool_names
    assert "draft_content" in tool_names

@pytest.mark.asyncio
@pytest.mark.asyncio
@patch("src.application.mcp.tools.CMSClient", new_callable=MagicMock)
@patch("src.application.mcp.server.DraftingService", new_callable=MagicMock)
@patch("src.application.mcp.server.AIService", new_callable=MagicMock)
async def test_mcp_draft_content_tool_success(mock_ai_class, mock_draft_class, mock_cms_class):
    # Arrange
    # Mock AIService
    mock_ai = mock_ai_class.return_value
    
    # Mock DraftingService and its generate_draft_stream
    mock_draft = mock_draft_class.return_value
    
    async def mock_generator(*args, **kwargs):
        yield {"event": "TEXT_DELTA", "data": "Drafting content"}
        yield {"event": "DRAFT_COMPLETE", "data": {"title": "Test Title"}}
        
    mock_draft.generate_draft_stream.side_effect = mock_generator

    # Act
    # Calling the mcp server's tool directly to test logic mapping
    # Wait, we need to bypass token/API key authentication or simulate it.
    # In stdio transport for local desktop, we authenticate using a local API key
    # set in env (FR-003: HERMES_API_KEY environment variable) or headers.
    with patch.dict("os.environ", {"HERMES_API_KEY": "local-developer-api-key", "INTERNAL_SERVICE_SECRET": "internal-secret"}):
        # Mock CMSClient validation response
        mock_cms = mock_cms_class.return_value
        mock_cms.validate_api_key = AsyncMock(return_value={
            "id": "key_123",
            "label": "Claude Key",
            "email": "editor@tenant.com",
            "tenant": "tenant_123"
        })
        
        res = await mcp.call_tool("draft_content", {
            "prompt": "Create blog post about Alexandria design system",
            "content_type_slug": "posts"
        })
        
        # Handle CallToolResult or 2-tuple response robustly
        if isinstance(res, tuple):
            contents = res[0]
        elif hasattr(res, "content"):
            contents = res.content
        else:
            contents = res
        
        # Assert
        assert len(contents) > 0
        assert any("Test Title" in content.text for content in contents)
        
        # Verify CMSClient was called with our env key
        mock_cms.validate_api_key.assert_called_once_with("local-developer-api-key")

@pytest.mark.asyncio
@patch("src.application.mcp.tools.CMSClient", new_callable=MagicMock)
@patch("src.application.mcp.server.AIService", new_callable=MagicMock)
async def test_mcp_chat_agent_tool_success(mock_ai_class, mock_cms_class):
    # Arrange
    mock_ai = mock_ai_class.return_value
    
    async def mock_schema_generator(*args, **kwargs):
        yield {"event": "TEXT_DELTA", "data": "Generating schema"}
        yield {"event": "STATE_DELTA", "data": {"fields": []}}
        
    mock_ai.continue_generation_session_stream.side_effect = mock_schema_generator

    # Act
    with patch.dict("os.environ", {"HERMES_API_KEY": "local-developer-api-key", "INTERNAL_SERVICE_SECRET": "internal-secret"}):
        mock_cms = mock_cms_class.return_value
        mock_cms.validate_api_key = AsyncMock(return_value={
            "id": "key_123",
            "label": "Claude Key",
            "email": "editor@tenant.com",
            "tenant": "tenant_123"
        })
        
        res = await mcp.call_tool("chat_agent", {
            "prompt": "Create a new content type for recipes",
            "session_id": "session-123"
        })
        
        # Handle CallToolResult or 2-tuple response robustly
        if isinstance(res, tuple):
            contents = res[0]
        elif hasattr(res, "content"):
            contents = res.content
        else:
            contents = res
        
        # Assert
        assert len(contents) > 0
        assert any("Generating schema" in content.text for content in contents)

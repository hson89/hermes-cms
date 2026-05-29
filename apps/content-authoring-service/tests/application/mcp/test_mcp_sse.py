import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from src.main import app
from src.application.mcp.tools import active_tenant_var

@pytest.mark.asyncio
@patch("src.application.mcp.sse_transport.CMSClient", new_callable=MagicMock)
async def test_sse_connection_unauthorized(mock_cms_class):
    # Arrange
    mock_cms = mock_cms_class.return_value
    mock_cms.validate_api_key = AsyncMock(return_value=None)
    
    # Act
    with TestClient(app) as client:
        response = client.get("/api/v1/mcp/sse", headers={"X-API-Key": "invalid-key"})
        
        # Assert
        assert response.status_code == 403
        assert "Invalid or expired API Key" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.application.mcp.sse_transport.CMSClient", new_callable=MagicMock)
async def test_sse_connection_missing_key(mock_cms_class):
    # Act
    with TestClient(app) as client:
        response = client.get("/api/v1/mcp/sse")
        
        # Assert
        assert response.status_code == 401
        assert "API key missing in headers" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.application.mcp.sse_transport.CMSClient", new_callable=MagicMock)
async def test_sse_post_message_unauthorized(mock_cms_class):
    # Arrange
    mock_cms = mock_cms_class.return_value
    mock_cms.validate_api_key = AsyncMock(return_value=None)
    
    # Act
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/mcp/message?session_id=sse-session-123",
            headers={"X-API-Key": "invalid-key"},
            json={"jsonrpc": "2.0", "method": "tools/list", "id": 1}
        )
        
        # Assert
        assert response.status_code == 403
        assert "Invalid or expired API Key" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.application.mcp.sse_transport.CMSClient", new_callable=MagicMock)
async def test_sse_post_message_missing_session(mock_cms_class):
    # Arrange
    mock_cms = mock_cms_class.return_value
    mock_cms.validate_api_key = AsyncMock(return_value={
        "id": "key_123",
        "label": "Claude Key",
        "email": "editor@tenant.com",
        "tenant": "tenant_123"
    })
    
    # Act
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/mcp/message",
            headers={"X-API-Key": "valid-key"},
            json={"jsonrpc": "2.0", "method": "tools/list", "id": 1}
        )
        
        # Assert
        assert response.status_code == 400
        assert "session_id is required" in response.text



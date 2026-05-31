import pytest
from unittest.mock import AsyncMock, patch
import httpx
from src.infrastructure.clients.cms_client import CMSClient

@pytest.mark.asyncio
async def test_cms_client_validation_success():
    # Arrange
    cms_url = "http://localhost:3000"
    internal_secret = "hermes-internal-secret"
    api_key = "valid-test-api-key"
    
    mock_response_data = {
        "valid": True,
        "apiKey": {
            "id": "key_1",
            "label": "Test Key",
            "email": "test@tenant.com",
            "tenant": "tenant_1"
        }
    }
    
    from unittest.mock import AsyncMock, patch, MagicMock
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data
    
    client = CMSClient(cms_url=cms_url, internal_secret=internal_secret)
    
    # Mock httpx.AsyncClient.post
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Act
        result = await client.validate_api_key(api_key)
        
        # Assert
        assert result is not None
        assert result["id"] == "key_1"
        assert result["tenant"] == "tenant_1"
        assert result["email"] == "test@tenant.com"
        
        # Verify post arguments
        mock_post.assert_called_once_with(
            f"{cms_url}/api/api-keys/validate",
            headers={
                "X-Internal-Secret": internal_secret,
                "Content-Type": "application/json"
            },
            json={"apiKey": api_key}
        )

@pytest.mark.asyncio
async def test_cms_client_validation_unauthorized():
    # Arrange
    cms_url = "http://localhost:3000"
    internal_secret = "hermes-internal-secret"
    api_key = "invalid-test-api-key"
    
    from unittest.mock import MagicMock
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"valid": False, "error": "Invalid API Key or expired."}
    
    client = CMSClient(cms_url=cms_url, internal_secret=internal_secret)
    
    # Mock httpx.AsyncClient.post
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Act
        result = await client.validate_api_key(api_key)
        
        # Assert
        assert result is None

@pytest.mark.asyncio
async def test_cms_client_validation_http_error():
    # Arrange
    cms_url = "http://localhost:3000"
    internal_secret = "hermes-internal-secret"
    api_key = "error-test-api-key"
    
    client = CMSClient(cms_url=cms_url, internal_secret=internal_secret)
    
    # Mock httpx.AsyncClient.post to raise request exception
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.RequestError("Connection failed")
        
        # Act
        result = await client.validate_api_key(api_key)
        
        # Assert
        assert result is None

@pytest.mark.asyncio
async def test_cms_client_validation_uses_shared_client():
    # Arrange
    cms_url = "http://localhost:3000"
    internal_secret = "hermes-internal-secret"
    api_key = "valid-test-api-key"
    
    mock_response_data = {
        "valid": True,
        "apiKey": {
            "id": "key_1",
            "label": "Test Key",
            "email": "test@tenant.com",
            "tenant": "tenant_1"
        }
    }
    
    from unittest.mock import MagicMock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data
    
    # Mock httpx.AsyncClient instance
    mock_shared_client = MagicMock(spec=httpx.AsyncClient)
    mock_shared_client.post = AsyncMock(return_value=mock_response)
    mock_shared_client.aclose = AsyncMock()
    
    client = CMSClient(cms_url=cms_url, internal_secret=internal_secret, client=mock_shared_client)
    
    # Act
    result = await client.validate_api_key(api_key)
    
    # Assert
    assert result is not None
    assert result["id"] == "key_1"
    
    # Verify post arguments on shared client
    mock_shared_client.post.assert_called_once_with(
        f"{cms_url}/api/api-keys/validate",
        headers={
            "X-Internal-Secret": internal_secret,
            "Content-Type": "application/json"
        },
        json={"apiKey": api_key}
    )
    
    # Verify the shared client was NOT closed
    mock_shared_client.aclose.assert_not_called()

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.infrastructure.tools.schema_resolver import schema_resolver

@pytest.mark.asyncio
async def test_schema_resolver_calls_cms_endpoint():
    # Mocking the entire AsyncClient
    with patch("httpx.AsyncClient", autospec=True) as mock_client_class:
        mock_client = mock_client_class.return_value.__aenter__.return_value
        
        # Mock GET response (find content type)
        mock_get_res = MagicMock()
        mock_get_res.status_code = 200
        mock_get_res.json.return_value = {"docs": [{"id": "ct-1", "slug": "blog-posts"}]}
        mock_client.get = AsyncMock(return_value=mock_get_res)
        
        # Mock PATCH response (update content type)
        mock_patch_res = MagicMock()
        mock_patch_res.status_code = 200
        mock_patch_res.json.return_value = {"id": "ct-1", "slug": "blog-posts"}
        mock_client.patch = AsyncMock(return_value=mock_patch_res)
        
        result = await schema_resolver.ainvoke({
            "content_type_slug": "blog-posts",
            "updates": {"fields": [{"name": "new_field", "type": "text"}]},
            "tenant_id": "tenant-1"
        })
        
        assert "Successfully updated" in result
        assert mock_client.get.called
        assert mock_client.patch.called
        
        # Verify it uses the internal secret header in get
        args, kwargs = mock_client.get.call_args
        assert kwargs["headers"]["X-Internal-Secret"] is not None

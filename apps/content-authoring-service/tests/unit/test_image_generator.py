import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.infrastructure.tools.image_generator import image_generator

@pytest.mark.asyncio
async def test_image_generator_returns_url():
    # Mocking the entire AsyncOpenAI client from the library directly
    with patch("openai.AsyncOpenAI") as mock_openai_class:
        with patch("src.infrastructure.tools.image_generator.settings") as mock_settings:
            mock_settings.BYPASS_IMAGE_GENERATION = False
            mock_settings.OPENAI_API_KEY = "nvapi-mock-key"
            mock_settings.IMAGE_MODEL_PROVIDER = "openai"
            mock_settings.IMAGE_MODEL = "dall-e-3"
            mock_settings.IMAGE_ENDPOINT_URL = None
            
            mock_client = mock_openai_class.return_value
            mock_res = MagicMock()
            mock_res.data = [MagicMock(url="http://example.com/image.png")]
            mock_client.images.generate = AsyncMock(return_value=mock_res)
            
            result = await image_generator.ainvoke({
                "prompt": "A beautiful sunset",
                "aspect_ratio": "16:9"
            })
            
            assert "http://example.com/image.png" in result
            assert mock_client.images.generate.called


@pytest.mark.asyncio
async def test_image_generator_bypass():
    with patch("src.infrastructure.tools.image_generator.settings") as mock_settings:
        mock_settings.BYPASS_IMAGE_GENERATION = True
        mock_settings.FALLBACK_IMAGE_URL = "http://example.com/placeholder.png"
        
        result = await image_generator.ainvoke({
            "prompt": "A beautiful sunset",
            "aspect_ratio": "16:9"
        })
        
        assert "http://example.com/placeholder.png" in result




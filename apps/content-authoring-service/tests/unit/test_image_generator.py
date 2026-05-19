import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.infrastructure.tools.image_generator import image_generator

@pytest.mark.asyncio
async def test_image_generator_returns_url():
    # Mocking the entire AsyncOpenAI client from the library directly
    with patch("openai.AsyncOpenAI") as mock_openai_class:
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

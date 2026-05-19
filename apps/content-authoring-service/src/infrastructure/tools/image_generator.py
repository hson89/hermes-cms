"""
LangChain tool for generating images using AI.

T038 - Implement image_generator tool
"""

import os
from typing import Optional
from langchain_core.tools import tool
from src.infrastructure.config import settings

@tool
async def image_generator(
    prompt: str,
    aspect_ratio: str = "1:1",
) -> str:
    """
    Generates an image based on a prompt.
    Returns the URL of the generated image.
    Uses the provider and model configured in environment variables.
    """
    provider = settings.IMAGE_MODEL_PROVIDER.lower()
    model = settings.IMAGE_MODEL
    
    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY"),
            base_url=settings.IMAGE_ENDPOINT_URL
        )
        
        # Map aspect ratios to DALL-E sizes
        size = "1024x1024"
        if aspect_ratio == "16:9":
            size = "1792x1024"
        elif aspect_ratio == "9:16":
            size = "1024x1792"
            
        try:
            response = await client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            return f"Generated Image URL: {image_url}"
        except Exception as e:
            return f"Error generating image with OpenAI: {e}"

    # Placeholder for other providers (e.g. Stability, Midjourney API, etc.)
    elif provider == "placeholder":
        return f"Generated Image URL: https://via.placeholder.com/1024?text={prompt.replace(' ', '+')}"

    else:
        return f"Error: Unsupported image provider '{provider}'"

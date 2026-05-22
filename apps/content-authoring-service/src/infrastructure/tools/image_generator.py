"""
LangChain tool for generating images using AI.

T038 - Implement image_generator tool
"""

import os
import sys
from typing import Optional
from langchain_core.tools import tool
from src.infrastructure.config import settings

@tool
async def image_generator(
    prompt: str,
    aspect_ratio: str = "1:1",
) -> str:
    """
    Generates a professional image based on a prompt. 
    You MUST call this tool for every image, coverArt, or media field in the schema.
    Returns the URL of the generated image (or a high-quality placeholder URL if real generation is disabled).
    After receiving the URL, you MUST continue and complete the JSON draft.
    """
    # Check if we are running unit tests
    is_testing = "pytest" in sys.modules or "unittest" in sys.modules
    
    # Check if we should bypass real image generation (enabled by default for local development)
    # Also bypass if the API key is the default placeholder string
    api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
    is_placeholder_key = not api_key or api_key.startswith("your-") or "nvapi-" not in api_key and api_key == "sk-..."
    
    bypass = settings.BYPASS_IMAGE_GENERATION or is_placeholder_key
    
    if bypass and not is_testing:
        # Return a premium Alexandria-themed abstract gradient placeholder
        placeholder_url = settings.FALLBACK_IMAGE_URL
        return f"Generated Image URL: {placeholder_url}"

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
            # Fallback to the premium placeholder instead of returning an error string that breaks drafting
            placeholder_url = settings.FALLBACK_IMAGE_URL
            print(f"[Warning] Failed to generate image with OpenAI ({e}). Falling back to placeholder.")
            return f"Generated Image URL: {placeholder_url}"

    # Placeholder for other providers (e.g. Stability, Midjourney API, etc.)
    elif provider == "placeholder":
        # Use premium Alexandria placeholder
        placeholder_url = settings.FALLBACK_IMAGE_URL
        return f"Generated Image URL: {placeholder_url}"

    else:
        # Fallback to placeholder instead of hard failing in case provider is misconfigured
        placeholder_url = settings.FALLBACK_IMAGE_URL
        return f"Generated Image URL: {placeholder_url}"

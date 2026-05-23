from typing import Dict, Optional

# Rates per 1,000,000 tokens in USD
# For images, rate is per single generation
MODEL_RATES = {
    "openai/gpt-4o": {"input": 5.00, "output": 15.00},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "anthropic/claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
    "anthropic/claude-3-haiku": {"input": 0.25, "output": 1.25},
    "google/gemini-1.5-pro": {"input": 3.50, "output": 10.50},
    "google/gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "openai/dall-e-3": {"image": 0.040},
}

DEFAULT_RATES = {"input": 10.00, "output": 30.00}


def calculate_cost(
    model_identifier: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    images: int = 0,
) -> int:
    """
    Calculates the cost of an AI operation in USD microdollars.
    $1.00 = 1,000,000 microdollars.
    """
    rates = MODEL_RATES.get(model_identifier, DEFAULT_RATES)
    
    total_usd = 0.0
    
    if "image" in rates and images > 0:
        total_usd += rates["image"] * images
    else:
        total_usd += (input_tokens / 1_000_000) * rates.get("input", 0)
        total_usd += (output_tokens / 1_000_000) * rates.get("output", 0)
        
    # Convert to microdollars (integer)
    return int(total_usd * 1_000_000)


def get_model_metadata(model_identifier: str) -> Dict[str, str]:
    """
    Returns provider and model name from a model identifier.
    Example: 'openai/gpt-4o' -> {'provider': 'openai', 'model': 'gpt-4o'}
    """
    if "/" in model_identifier:
        provider, model = model_identifier.split("/", 1)
        return {"provider": provider, "model": model}
    return {"provider": "unknown", "model": model_identifier}

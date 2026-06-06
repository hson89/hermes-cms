import os
import sys

# Ensure the root directory is on the path so imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from src.infrastructure.config import settings
from src.domain.content_drafting.prompts import (
    DRAFTING_SYSTEM_PROMPT,
    DRAFTING_USER_PROMPT,
    REFINEMENT_SYSTEM_PROMPT,
    REFINEMENT_USER_PROMPT,
    SCHEMA_GENERATION_SYSTEM_PROMPT,
    COPILOT_SYSTEM_PROMPT,
    HEALING_SYSTEM_PROMPT,
)


def convert_to_langfuse_syntax(prompt_text: str) -> str:
    replacements = {
        "{locale}": "{{locale}}",
        "{style_modifier_instructions}": "{{style_modifier_instructions}}",
        "{content_type_slug}": "{{content_type_slug}}",
        "{original_user_request}": "{{original_user_request}}",
        "{user_input}": "{{user_input}}",
        "{schema_json}": "{{schema_json}}",
        "{current_draft_json}": "{{current_draft_json}}",
        "{refinement_input}": "{{refinement_input}}",
        "{full_content}": "{{full_content}}",
    }
    for old, new in replacements.items():
        prompt_text = prompt_text.replace(old, new)
    return prompt_text


def populate():
    langfuse_host = settings.LANGFUSE_BASE_URL or settings.LANGFUSE_HOST
    print(f"Connecting to Langfuse at: {langfuse_host}")
    print(f"Public Key: {settings.LANGFUSE_PUBLIC_KEY}")
    
    if not settings.LANGFUSE_PUBLIC_KEY or not settings.LANGFUSE_SECRET_KEY:
        print("Error: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set in settings.")
        sys.exit(1)
        
    from langfuse import Langfuse
    lf = Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=langfuse_host,
        timeout=10,
    )

    prompts_to_create = {
        "content-drafting-system": DRAFTING_SYSTEM_PROMPT,
        "content-drafting-user": DRAFTING_USER_PROMPT,
        "content-refinement-system": REFINEMENT_SYSTEM_PROMPT,
        "content-refinement-user": REFINEMENT_USER_PROMPT,
        "schema-generation-system": SCHEMA_GENERATION_SYSTEM_PROMPT,
        "copilot-system": COPILOT_SYSTEM_PROMPT,
        "content-healing-system": HEALING_SYSTEM_PROMPT,
    }

    for name, content in prompts_to_create.items():
        lf_content = convert_to_langfuse_syntax(content)
        print(f"Creating/updating prompt '{name}' in Langfuse...")
        try:
            prompt = lf.create_prompt(
                name=name,
                prompt=lf_content,
                type="text",
                labels=["production"]
            )
            print(f"Successfully created prompt '{name}' (Version {prompt.version}) with 'production' label.")
        except Exception as e:
            print(f"Failed to create prompt '{name}': {e}")


if __name__ == "__main__":
    populate()

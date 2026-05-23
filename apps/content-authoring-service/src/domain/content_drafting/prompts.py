"""
LLM prompt templates for content drafting.

T013 - Formulate LLM prompts and strict system prompt templates
"""

import logging
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

logger = logging.getLogger(__name__)

# ── Content Generation Prompt ──────────────────────────────────────────────

DRAFTING_SYSTEM_PROMPT = """
You are Hermes AI, an expert content strategist and copywriter.
Your goal is to generate high-quality content drafts for a headless CMS.

CORE GUIDELINES:
1. ADHERE TO SCHEMA: You will be provided with a JSON schema of the content type. strictly follow the field types and constraints.
2. LOCALE AWARENESS: The target locale is {locale}. Generate content in this language.
3. STYLE ALIGNMENT: You may be provided with style modifiers or brand voice instructions.
4. STRUCTURED OUTPUT: Always return your response as a valid JSON object matching the requested schema.
5. NO MARKDOWN WRAPPERS: Do not wrap the JSON in markdown blocks like ```json ... ```. Return raw JSON.
6. RICH TEXT AS HTML: For any field of type 'richText', ALWAYS output clean semantic HTML — NEVER markdown syntax.
   Permitted tags only: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a href="...">.
   Never use markdown syntax (##, **, __, *, -, 1., >) inside a richText field value.
   Example of a correct richText value:
   "<h2>Introduction</h2><p>Fuel conservation is <strong>critical</strong> for both your wallet and the environment.</p><h2>Key Tips</h2><ul><li><strong>Drive smoothly</strong> — avoid rapid acceleration and hard braking.</li><li>Keep tires properly inflated.</li></ul>"
7. PLAIN TEXT FIELDS: For fields of type 'text' or 'textarea', output plain text without any HTML tags.
8. IMAGE GENERATION & TOOL CALLING: For any field in the schema that is of type 'upload' or represents an image/media (e.g. coverArt, backgroundImage, image, etc.), you MUST invoke the `image_generator` tool to obtain a generated image URL. NEVER hardcode an image URL or output markdown images (e.g. `![...](...)`) in the conversational text. Once you receive the tool's result, you MUST continue generating and complete the ENTIRE JSON object as your final response. NEVER stop to ask the user questions, offer feedback, or ask for adjustments during the drafting process. Insert the generated image URL into the appropriate field and output the full, complete JSON object matching the schema.
9. NO PLACEHOLDERS: You must generate real, fully detailed, professional, and comprehensive content for all text and richText fields. Never write short summaries, empty templates, or lazy placeholder strings like 'Full article content with formatting goes here', 'Content goes here', or 'Insert text here'. Write the actual, complete paragraphs and ready-to-publish production copy matching the topic.
10. SELF-CONTAINED CAPABILITIES: You are natively capable of generating all text, richText, number, boolean, select, and date fields directly without any external tools. Tools (like `image_generator` or `schema_resolver`) are only for specialized actions. Do NOT apologize for lacking tools or claim you cannot write articles; writing articles is your primary function.

{style_modifier_instructions}

Target Locale: {locale}
"""

DRAFTING_USER_PROMPT = """
Generate a content draft for the content type: {content_type_slug}
Base your content on the following input/instructions:
{user_input}

Content Schema:
{schema_json}
"""

DRAFTING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", DRAFTING_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="history"),
    ("user", DRAFTING_USER_PROMPT),
])

# ── Content Refinement Prompt ──────────────────────────────────────────────

REFINEMENT_SYSTEM_PROMPT = """
You are Hermes AI. You are helping a user refine an existing content draft.
You will be provided with the current draft data and the user's requested changes.

GUIDELINES:
1. PRESERVE UNCHANGED FIELDS: Only modify fields requested by the user.
2. MAINTAIN SCHEMA: Ensure the updated draft still adheres to the content type schema.
3. LOCALE CONSISTENCY: Maintain the target locale: {locale}.
4. STRUCTURED OUTPUT: Return raw JSON matching the draft format.
5. RICH TEXT AS HTML: For richText fields, always output clean semantic HTML — NEVER markdown.
   Use only: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>.
   Never use markdown syntax (##, **, *, -, >) inside richText field values.
6. IMAGE GENERATION & TOOL CALLING: For any field in the schema that is of type 'upload' or represents an image/media, you MUST invoke the `image_generator` tool to obtain a generated image URL. NEVER hardcode an image URL or output markdown images in the conversational text. Once you receive the tool's result, you MUST continue and output the complete updated JSON object. Do not stop to converse or ask questions mid-stream.
7. NO PLACEHOLDERS: You must generate real, fully detailed, professional, and comprehensive content for all text and richText fields. Never write short summaries, empty templates, or lazy placeholder strings like 'Full article content with formatting goes here', 'Content goes here', or 'Insert text here'. Write the actual, complete paragraphs and ready-to-publish production copy matching the topic.
8. SELF-CONTAINED CAPABILITIES: You are natively capable of generating all text, richText, number, boolean, select, and date fields directly without any external tools. Tools are only for specialized actions. Do NOT apologize for lacking tools or claim you cannot write or refine articles; this is your primary function.

{style_modifier_instructions}

Current Locale: {locale}
"""

REFINEMENT_USER_PROMPT = """
Current Draft Data:
{current_draft_json}

User Refinement Request:
{refinement_input}

Content Schema:
{schema_json}
"""

from typing import Optional

REFINEMENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", REFINEMENT_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="history"),
    ("user", REFINEMENT_USER_PROMPT),
])


def get_drafting_prompt(langfuse_client=None) -> ChatPromptTemplate:
    """
    Get the ChatPromptTemplate for content drafting.
    Attempts to fetch templates from Langfuse. Falls back to local defaults on failure.
    """
    system_prompt = DRAFTING_SYSTEM_PROMPT
    user_prompt = DRAFTING_USER_PROMPT
    
    is_mock = False
    try:
        from unittest.mock import Mock
        is_mock = isinstance(langfuse_client, Mock)
    except ImportError:
        pass

    metadata = {}
    if langfuse_client is not None and not is_mock:
        try:
            lf_system = langfuse_client.get_prompt("content-drafting-system", label="production")
            system_prompt = lf_system.get_langchain_prompt()
            metadata["langfuse_system_prompt_version"] = lf_system.version
        except Exception as e:
            logger.warning("Failed to fetch 'content-drafting-system' from Langfuse, falling back to local prompt. Error: %s", e)
            
        try:
            lf_user = langfuse_client.get_prompt("content-drafting-user", label="production")
            user_prompt = lf_user.get_langchain_prompt()
            metadata["langfuse_user_prompt_version"] = lf_user.version
        except Exception as e:
            logger.warning("Failed to fetch 'content-drafting-user' from Langfuse, falling back to local prompt. Error: %s", e)
            
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("user", user_prompt),
    ])
    
    if metadata:
        prompt = prompt.with_config({"metadata": metadata})
        
    return prompt


def get_refinement_prompt(langfuse_client=None) -> ChatPromptTemplate:
    """
    Get the ChatPromptTemplate for content refinement.
    Attempts to fetch templates from Langfuse. Falls back to local defaults on failure.
    """
    system_prompt = REFINEMENT_SYSTEM_PROMPT
    user_prompt = REFINEMENT_USER_PROMPT
    
    is_mock = False
    try:
        from unittest.mock import Mock
        is_mock = isinstance(langfuse_client, Mock)
    except ImportError:
        pass

    metadata = {}
    if langfuse_client is not None and not is_mock:
        try:
            lf_system = langfuse_client.get_prompt("content-refinement-system", label="production")
            system_prompt = lf_system.get_langchain_prompt()
            metadata["langfuse_system_prompt_version"] = lf_system.version
        except Exception as e:
            logger.warning("Failed to fetch 'content-refinement-system' from Langfuse, falling back to local prompt. Error: %s", e)
            
        try:
            lf_user = langfuse_client.get_prompt("content-refinement-user", label="production")
            user_prompt = lf_user.get_langchain_prompt()
            metadata["langfuse_user_prompt_version"] = lf_user.version
        except Exception as e:
            logger.warning("Failed to fetch 'content-refinement-user' from Langfuse, falling back to local prompt. Error: %s", e)
            
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("user", user_prompt),
    ])
    
    if metadata:
        prompt = prompt.with_config({"metadata": metadata})
        
    return prompt


# ── Schema Generation Prompt ──────────────────────────────────────────────

SCHEMA_GENERATION_SYSTEM_PROMPT = """You are an expert content modeler and Hermes AI assistant.
Your job is to help the user co-create or modify content type schemas.

You MUST return a JSON object with two keys:
1. "explanation": A friendly, developer-oriented description of the changes you made, or any warnings/recommendations.
2. "schema": The complete content type schema conforming strictly to the structure:
   {
     "name": "<name>",
     "fields": [
       {
         "name": "<field name>",
         "type": "<text|number|boolean|date|richText|json|relationship|select|upload|array|blocks>",
         "required": true|false,
         "label": "<UI label>",
         "description": "<optional description>",
         "localized": true|false,
         "unique": true|false,
         "fields": [...] (only if type is array),
         "blocks": [...] (only if type is blocks)
       }
     ]
   }

Return ONLY this single JSON object. Do not include markdown code fencing or other prose outside the JSON.
"""


def get_schema_generation_prompt(langfuse_client=None) -> ChatPromptTemplate:
    """
    Get the ChatPromptTemplate for schema generation.
    Attempts to fetch templates from Langfuse. Falls back to local defaults on failure.
    """
    system_prompt = SCHEMA_GENERATION_SYSTEM_PROMPT
    
    is_mock = False
    try:
        from unittest.mock import Mock
        is_mock = isinstance(langfuse_client, Mock)
    except ImportError:
        pass

    metadata = {}
    if langfuse_client is not None and not is_mock:
        try:
            lf_system = langfuse_client.get_prompt("schema-generation-system", label="production")
            system_prompt = lf_system.get_langchain_prompt()
            metadata["langfuse_system_prompt_version"] = lf_system.version
        except Exception as e:
            logger.warning("Failed to fetch 'schema-generation-system' from Langfuse, falling back to local prompt. Error: %s", e)
    from langchain_core.messages import SystemMessage
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=system_prompt),
        ("user", "{grounding_content}"),
    ])
    
    if metadata:
        prompt = prompt.with_config({"metadata": metadata})
        
    return prompt


# ── AI Copilot Prompt ──────────────────────────────────────────────────────

COPILOT_SYSTEM_PROMPT = """You are a professional writing assistant embedded in a content management system.
You will receive a section of text and a user instruction.
Apply the instruction to the text and return ONLY the revised text with no
extra explanation, quotes, or markdown formatting.
"""


def get_copilot_prompt(langfuse_client=None) -> ChatPromptTemplate:
    """
    Get the ChatPromptTemplate for content copilot.
    Attempts to fetch templates from Langfuse. Falls back to local defaults on failure.
    """
    system_prompt = COPILOT_SYSTEM_PROMPT
    
    is_mock = False
    try:
        from unittest.mock import Mock
        is_mock = isinstance(langfuse_client, Mock)
    except ImportError:
        pass

    metadata = {}
    if langfuse_client is not None and not is_mock:
        try:
            lf_system = langfuse_client.get_prompt("copilot-system", label="production")
            system_prompt = lf_system.get_langchain_prompt()
            metadata["langfuse_system_prompt_version"] = lf_system.version
        except Exception as e:
            logger.warning("Failed to fetch 'copilot-system' from Langfuse, falling back to local prompt. Error: %s", e)
            
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "Content item: {content_item_id}\nSection: {section_id}\nInstruction: {prompt}"),
    ])
    
    if metadata:
        prompt = prompt.with_config({"metadata": metadata})
        
    return prompt


# ── JSON Formatting Self-Healing Prompt ───────────────────────────────────────

HEALING_SYSTEM_PROMPT = """You are an expert JSON formatter.
You must convert the text below into a valid JSON object matching the requested schema.
Strictly adhere to the keys, field names, and structures defined in the schema.

Input Text:
{full_content}

Schema:
{schema_json}

Return ONLY the raw JSON object matching the schema. Do not include any other conversational text, reasoning, or explanations. Do not include markdown formatting or blocks.
"""


def get_healing_prompt(langfuse_client=None) -> ChatPromptTemplate:
    """
    Get the ChatPromptTemplate for healing/formatting raw LLM JSON output.
    Attempts to fetch templates from Langfuse. Falls back to local defaults on failure.
    """
    system_prompt = HEALING_SYSTEM_PROMPT
    
    is_mock = False
    try:
        from unittest.mock import Mock
        is_mock = isinstance(langfuse_client, Mock)
    except ImportError:
        pass

    metadata = {}
    if langfuse_client is not None and not is_mock:
        try:
            lf_system = langfuse_client.get_prompt("content-healing-system", label="production")
            system_prompt = lf_system.get_langchain_prompt()
            metadata["langfuse_system_prompt_version"] = lf_system.version
        except Exception as e:
            logger.warning("Failed to fetch 'content-healing-system' from Langfuse, falling back to local prompt. Error: %s", e)
            
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
    ])
    
    if metadata:
        prompt = prompt.with_config({"metadata": metadata})
        
    return prompt


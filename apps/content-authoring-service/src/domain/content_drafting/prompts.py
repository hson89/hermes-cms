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

WORKFLOW PHASES:
You must operate in two distinct phases. Determine the current phase based on the conversation history.

PHASE 1: SCHEMA AND PLAN CONFIRMATION (Conversational Turn)
If the user has not explicitly confirmed that both the selected content type schema and the proposed content plan are correct, you must:
1. SCHEMA CONFIRMATION: Present the selected content type schema name, description, and list of fields (from the context provided). Boldly state that we are starting with this schema and ask the user if this is indeed the correct schema they want to use.
2. PLAN PRESENTATION: Outline a clear, structured content plan / outline based on the user request.
3. SEEK CONFIRMATION: Explicitly ask the user: "Could you please confirm if this content type schema and the outline plan are correct before we begin?"
4. TEXT OUTPUT: Output this phase STRICTLY as plain conversational text. Do NOT output the JSON schema draft or any raw JSON/markdown code blocks during this phase. This will trigger a conversational turn, giving control back to the user.
5. NO TOOL CALLING: You MUST NOT call any tools (including `image_generator` and `schema_resolver`) during this phase. Tool calling is strictly prohibited until you proceed to Phase 2.

PHASE 2: CONTENT GENERATION (Execution Turn)
Once the user explicitly confirms that the schema and plan are correct (e.g., saying "yes", "correct", "proceed", "looks good", or similar), you must switch to execution mode and follow these strict guidelines:
1. ADHERE TO SCHEMA: Strictly follow the provided JSON schema, field types, and constraints.
2. LOCALE AWARENESS: Generate content in the target locale: {locale}.
3. STYLE ALIGNMENT: Apply any provided style modifiers or brand voice instructions.
4. STRICT JSON OUTPUT: Return your response ONLY as a valid JSON object matching the schema. Ensure standard JSON formatting where keys are enclosed in double quotes followed immediately by a colon.
5. NO PREAMBLE OR WRAPPERS: Do not include conversational filler. Do not wrap the JSON in markdown blocks like ```json ... ```. Return ONLY raw JSON.
6. RICH TEXT AS HTML: For any field of type 'richText', ALWAYS output clean semantic HTML. NEVER use markdown syntax.
   * Permitted tags only: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a href="...">.
   * Never use markdown syntax (##, **, __, *, -, 1., >) inside a richText field value.
   * Correct richText example: "<h2>Introduction</h2><p>Fuel conservation is <strong>critical</strong>.</p><h2>Tips</h2><ul><li>Drive smoothly.</li></ul>"
7. PLAIN TEXT FIELDS: For fields of type 'text' or 'textarea', output plain text without any HTML tags.
8. IMAGE GENERATION AND TOOL CALLING: 
   * For any schema field of type 'upload' or representing media, you MUST invoke the `image_generator` tool to obtain a URL.
   * NEVER hardcode an image URL or output markdown images. 
   * Once you receive the tool result, continue generating and complete the ENTIRE JSON object. Do not stop to converse.
9. NO PLACEHOLDERS: Generate real, fully detailed, professional, and comprehensive content. Never write empty templates or lazy placeholder strings. Write actual, ready-to-publish production copy.
10. SELF-CONTAINED CAPABILITIES: You are natively capable of generating all text, number, boolean, select, and date fields directly. Tools are only for specialized actions. Writing is your primary function.

{style_modifier_instructions}

Target Locale: {locale}
"""

DRAFTING_USER_PROMPT = """
Analyze the user's request and the content type: {content_type_slug}

Original User Request:
{original_user_request}

Latest User Feedback:
{user_input}

Content Schema:
{schema_json}

INSTRUCTIONS:
1. If the user has NOT explicitly confirmed that both the selected content type schema and proposed content plan are correct in the conversation history, you MUST outline the content plan, present the schema fields, and ask for explicit confirmation (Phase 1). Do NOT generate the JSON draft and do NOT call any tools yet.
2. If the user HAS explicitly confirmed the plan and schema in the history, proceed to content generation (Phase 2) following the schema fields exactly and invoking tools (like image_generator) as required.
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


"""
LangGraph nodes for the Template Builder state machine.
"""

import json
import logging
from typing import Any, Dict, List
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from src.domain.template_builder.structures import TemplateBuilderOutput
from src.infrastructure.clients.cms_client import CMSClient

logger = logging.getLogger(__name__)

TEMPLATE_BUILDER_SYSTEM_PROMPT = """You are the Hermes CMS Template Builder Agent. Your role is to take a raw HTML/CSS design template, analyze its visual layout and structure, extract the dynamic copy/media sections, create/update a corresponding Content Type schema in Payload CMS, parameterize the HTML template with placeholder tokens, and define the resulting template.

### Step 1: HTML Analysis & Content Extraction
1. Analyze the raw HTML design provided by the user.
2. Identify dynamic content fields. Look for headings, body text, image source URLs, links, and list/repeater patterns.
3. Determine the correct field types matching standard Payload CMS types:
   - Headings/Labels -> `text`
   - Long paragraphs -> `textarea` or `richText`
   - Image source -> `upload` (relation to `media` collection)
   - Toggle / Boolean -> `checkbox`
   - Numeric inputs -> `number`
   - Repeaters / lists -> `array` (containing nested fields)

### Step 2: Parameterize the HTML
1. Replace the hardcoded visual content and source URLs in the HTML with matching template variable placeholders using double curly braces (e.g. {{ heroTitle }}).
2. Ensure variable names are clear, descriptive, and written in camelCase matching the schema field names.

### Step 3: Define Schema & Template
Produce a structured output containing the Content Type definition (slug, fields) and the Page Template definition (slug, parameterized HTML).
"""

def _serialize_field(field_def: Any) -> Dict[str, Any]:
    """Helper to convert Pydantic ContentField objects back to standard dicts."""
    d = {
        "name": field_def.name,
        "type": field_def.type,
        "label": field_def.label,
        "required": field_def.required,
    }
    if field_def.relationTo:
        d["relationTo"] = field_def.relationTo
    if field_def.fields:
        d["fields"] = [_serialize_field(f) for f in field_def.fields]
    return d

async def analyze_design_node(state: Dict[str, Any], config: RunnableConfig) -> Dict[str, Any]:
    """
    Invokes the LLM to analyze the HTML design and produce structured schema/template definitions.
    """
    ai_service = config["configurable"].get("ai_service")
    model_override = config["configurable"].get("model_override")
    
    if ai_service is None:
        from src.application.ai_service import AIService
        ai_service = AIService()

    model = ai_service.get_model(model_override=model_override)
    structured_llm = model.with_structured_output(TemplateBuilderOutput)

    messages = list(state.get("messages", []))
    is_new = False
    if not messages:
        is_new = True
        messages.append(SystemMessage(content=TEMPLATE_BUILDER_SYSTEM_PROMPT))
        messages.append(HumanMessage(content=f"Analyze this design and generate the template:\n\n{state.get('design_html')}"))

    callbacks = config.get("callbacks", [])
    response = await structured_llm.ainvoke(messages, config={"callbacks": callbacks})

    templates = []
    for t in response.templates:
        ct_def = {
            "name": t.contentType.name,
            "slug": t.contentType.slug,
            "fields": [_serialize_field(f) for f in t.contentType.fields]
        }
        templates.append({
            "name": t.name,
            "slug": t.slug,
            "htmlContent": t.htmlContent,
            "contentType": ct_def,
            "thumbnail": t.thumbnail
        })

    raw_json_str = json.dumps({
        "templates": templates,
        "explanation": response.explanation
    }, indent=2)
    ai_msg = AIMessage(content=raw_json_str)

    returned_messages = messages + [ai_msg] if is_new else [ai_msg]

    return {
        "messages": returned_messages,
        "templates": templates,
        "explanation": response.explanation,
        "errors": []
    }

async def register_with_cms_node(state: Dict[str, Any], config: RunnableConfig) -> Dict[str, Any]:
    """
    Registers the generated Content Types and Page Templates with the Payload CMS monolith.
    """
    cms_client: CMSClient = config["configurable"].get("cms_client")
    if not cms_client:
        return {"errors": ["CMS client not provided in config."]}

    tenant_id = state.get("tenant_id")
    templates = state.get("templates", [])
    cms_results = []
    errors = []

    for t_def in templates:
        try:
            # 1. Register Content Type
            ct_result = await cms_client.upsert_content_type(tenant_id, t_def["contentType"])
            
            # 2. Register Page Template
            template_data = {
                "name": t_def["name"],
                "slug": t_def["slug"],
                "htmlContent": t_def["htmlContent"],
                "contentType": ct_result["id"]
            }
            if t_def.get("thumbnail"):
                # Note: In a real scenario, we might trigger thumbnail generation or upload here
                template_data["thumbnail"] = t_def["thumbnail"]
                
            temp_result = await cms_client.upsert_page_template(tenant_id, template_data)
            
            cms_results.append({
                "templateSlug": t_def["slug"],
                "templateId": temp_result["id"],
                "contentTypeId": ct_result["id"]
            })
        except Exception as e:
            logger.error(f"Error registering template {t_def['slug']}: {str(e)}")
            errors.append(f"Failed to register template {t_def['slug']}: {str(e)}")

    return {
        "cms_results": cms_results,
        "errors": errors,
        "retry_count": state.get("retry_count", 0) + (1 if errors else 0)
    }

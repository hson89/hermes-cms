"""
LangGraph nodes for the Schema Generation state machine.
"""

from typing import Any, Dict
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from src.domain.content_drafting.prompts import get_schema_generation_prompt
from src.domain.content_drafting.structures import ContentSchemaOutput
from src.domain.schema_validator import InvalidSchemaError, validate_content_schema


def _serialize_field(field_def: Any) -> Dict[str, Any]:
    """Helper to convert Pydantic FieldDefinition objects back to standard dicts."""
    d = {
        "name": field_def.name,
        "type": field_def.type,
        "required": field_def.required,
        "label": field_def.label,
    }
    if field_def.description is not None:
        d["description"] = field_def.description
    if field_def.localized is not None:
        d["localized"] = field_def.localized
    if field_def.unique is not None:
        d["unique"] = field_def.unique
    if field_def.fields is not None:
        d["fields"] = [_serialize_field(f) for f in field_def.fields]
    if field_def.blocks is not None:
        d["blocks"] = field_def.blocks
    return d


async def call_schema_llm(state: Dict[str, Any], config: RunnableConfig) -> Dict[str, Any]:
    """
    Invokes the LLM configured for structured schema output.
    """
    # 1. Retrieve the LLM model instance
    ai_service = config["configurable"].get("ai_service")
    langfuse_client = config["configurable"].get("langfuse_client")
    model_override = config["configurable"].get("model_override")

    if ai_service is None:
        # Fallback inline initialization
        from src.application.ai_service import AIService
        ai_service = AIService()

    model = ai_service.get_model(model_override=model_override)
    structured_llm = model.with_structured_output(ContentSchemaOutput)

    # 2. Get system prompt from Langfuse or fallback
    schema_prompt_template = get_schema_generation_prompt(langfuse_client)
    system_prompt = schema_prompt_template.messages[0].content

    # 3. Build messages context.
    # If messages list is empty, bootstrap the thread.
    messages = list(state.get("messages", []))
    is_new = False
    if not messages:
        is_new = True
        messages.append(SystemMessage(content=system_prompt))
        
        # Build prompt grounding content
        grounding = ""
        current_schema = state.get("current_schema")
        if current_schema:
            import json
            grounding += f"[Current Schema State]\n{json.dumps(current_schema, indent=2)}\n\n"
        grounding += f"[User Request]\n{state.get('prompt', '')}"
        
        messages.append(HumanMessage(content=grounding))

    # 4. Invoke LLM structured call
    callbacks = config.get("callbacks", [])
    response = await structured_llm.ainvoke(messages, config={"callbacks": callbacks})

    # Convert Pydantic fields to raw dictionaries
    serialized_fields = [_serialize_field(f) for f in response.fields]
    generated_schema = {
        "name": response.name,
        "fields": serialized_fields,
    }

    # Format structured response for message tracking
    import json
    raw_json_str = json.dumps({
        "name": response.name,
        "fields": serialized_fields,
        "explanation": response.explanation
    }, indent=2)
    ai_msg = AIMessage(content=raw_json_str)

    returned_messages = messages + [ai_msg] if is_new else [ai_msg]

    return {
        "messages": returned_messages,
        "generated_schema": generated_schema,
        "explanation": response.explanation,
    }


async def validate_schema_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates the generated schema and captures validation errors for self-correction.
    """
    generated_schema = state.get("generated_schema")
    
    if not generated_schema:
        return {"errors": ["No schema was generated."]}

    try:
        # Run strict domain validation
        validate_content_schema(generated_schema)
        
        # Validation passed
        return {
            "errors": [],
            "validation_payloads": []
        }
    except (InvalidSchemaError, ValueError) as exc:
        # Validation failed
        error_msg = str(exc)
        
        # Build feedback message to inject back into the conversation thread
        feedback_message = (
            f"The schema you generated is invalid. Please correct the following errors and "
            f"return the complete, corrected content schema as valid JSON conforming strictly to the original schema structures:\n\n"
            f"{error_msg}\n\n"
            f"Conform strictly to the required types. Output raw JSON fields matching the FieldDefinition structure."
        )
        
        correction_turn = HumanMessage(content=feedback_message)
        retry_count = state.get("retry_count", 0) + 1
        if retry_count >= 3:
            error_msg = "Failed to generate a valid schema after 3 retries"
        
        return {
            "messages": [correction_turn],
            "errors": [error_msg],
            "retry_count": retry_count,
            "validation_payloads": [{"error": error_msg, "retry": retry_count}]
        }

import json
import re
from typing import Any, AsyncGenerator, Optional, List, Set, Dict
from langchain_core.messages import HumanMessage, BaseMessage
from src.domain.content_drafting.cost_calculator import calculate_cost, get_model_metadata
from src.domain.content_drafting.prompts import get_healing_prompt

def extract_json_from_text(text: str) -> Optional[dict]:
    """
    Extracts and parses JSON from a text block, handling markdown blocks and raw strings.
    """
    try:
        has_json_block = "```" in text
        has_raw_json = text.strip().startswith("{") and text.strip().endswith("}")
        
        if not has_json_block and not has_raw_json:
            return None

        match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
        clean_content = match.group(1).strip() if match else text.strip()
        
        start_idx = clean_content.find('{')
        end_idx = clean_content.rfind('}')
        if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
            json_str = clean_content[start_idx:end_idx + 1]
        else:
            json_str = clean_content
        
        return json.loads(json_str)
    except Exception:
        return None

async def handle_graph_stream(
    graph: Any,
    event_inputs: dict,
    config: dict,
    schema_json: Optional[dict],
    resolved_model: str,
    ai_service: Any,
    event_type: str = "DRAFT_COMPLETE"
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Unified handler for LangGraph astream_events, processing chunks, field detection, and tool status.
    """
    full_content = ""
    emitted_fields = set()
    current_field = None
    schema_fields = [f.get("name") for f in schema_json.get("fields", [])] if schema_json else []

    total_input_tokens = 0
    total_output_tokens = 0

    async for event in graph.astream_events(event_inputs, config=config, version="v2"):
        kind = event["event"]
        node_name = event.get("metadata", {}).get("langgraph_node")
        
        if kind == "on_chat_model_stream" and node_name == "call_drafting_llm":
            chunk = event["data"]["chunk"]
            if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                total_input_tokens += chunk.usage_metadata.get('input_tokens', 0)
                total_output_tokens += chunk.usage_metadata.get('output_tokens', 0)

            content = chunk.content
            if isinstance(content, list):
                content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
            
            if content:
                full_content += content
                yield {"event": "TEXT_DELTA", "data": content}
                
                # Heuristic field detection for FIELD_START/FIELD_COMPLETE
                potential_fields = re.findall(r'"([^"]+)":\s*"', full_content[max(0, len(full_content)-100):])
                for field in potential_fields:
                    if field not in emitted_fields and field in schema_fields:
                        if current_field:
                            yield {"event": "FIELD_COMPLETE", "data": {"field": current_field}}
                        current_field = field
                        emitted_fields.add(field)
                        yield {"event": "FIELD_START", "data": {"field": field}}

        elif kind == "on_tool_start": # node_name could be execute_tools or call_drafting_llm depending on setup
            tool_name = event["name"]
            yield {"event": "TEXT_DELTA", "data": f"\n[Executing {tool_name}...]\n"}

    if current_field:
        yield {"event": "FIELD_COMPLETE", "data": {"field": current_field}}

    draft_data = extract_json_from_text(full_content)
    
    if draft_data is None:
        # Try self-healing
        try:
            healing_template = get_healing_prompt(ai_service.langfuse_client if ai_service else None)
            healing_prompt = healing_template.messages[0].prompt.format(
                full_content=full_content,
                schema_json=json.dumps(schema_json, indent=2)
            )

            healing_model = ai_service.get_model(model_override=resolved_model)
            healing_res = await healing_model.ainvoke([HumanMessage(content=healing_prompt)])
            draft_data = extract_json_from_text(healing_res.content)
        except Exception as e:
            yield {"event": "ERROR", "data": {"detail": f"Failed to parse AI output as JSON and healing failed: {e}. Raw content: {full_content[:1000]}"}}
            return

    if draft_data:
        cost = calculate_cost(
            model_identifier=resolved_model,
            input_tokens=total_input_tokens,
            output_tokens=total_output_tokens
        )
        
        # Update graph state with final JSON
        await graph.aupdate_state(
            config,
            {"current_draft_json": draft_data},
            as_node="call_drafting_llm"
        )

        yield {
            "event": event_type, 
            "data": {
                "draft": draft_data, 
                "sessionId": config["configurable"].get("thread_id"),
                "usage_metadata": {
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                    "total_tokens": total_input_tokens + total_output_tokens,
                    "cost_microdollars": cost
                }
            }
        }

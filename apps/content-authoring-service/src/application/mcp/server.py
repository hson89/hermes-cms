import os
import uuid
import logging
import json
from typing import Optional
from mcp.server.fastmcp import FastMCP

from src.infrastructure.clients.cms_client import CMSClient
from src.infrastructure.config import settings
from src.infrastructure.database import SessionLocal
from src.application.ai_service import AIService
from src.application.drafting_service import DraftingService
from src.application.mcp.tools import get_active_tenant, fetch_schema_for_slug

logger = logging.getLogger(__name__)

# Initialize FastMCP Server named "Hermes AI"
mcp = FastMCP("Hermes AI")

@mcp.tool()
async def draft_content(
    prompt: str,
    content_type_slug: Optional[str] = None,
    session_id: Optional[str] = None
) -> str:
    """
    Drafts and structures high-quality content matching the scoped tenant's content schemas.
    
    Args:
        prompt: Natural language instructions describing what content to draft.
        content_type_slug: Optional content type identifier slug (e.g. 'posts', 'articles').
        session_id: Optional unique identifier to continue an existing drafting conversation session.
    """
    try:
        # 1. Authenticate and retrieve tenant context
        key_info = await get_active_tenant()
        tenant_id = key_info["tenant"]
        user_email = key_info.get("email", "mcp-client@hermes.ai")
        user_id = key_info.get("id", "mcp-user")

        # 2. Fetch schema if slug provided
        schema_json = None
        if content_type_slug:
            schema_json = await fetch_schema_for_slug(content_type_slug, tenant_id)

        # 3. Initialize Services and DB session
        ai_service = AIService()
        drafting_service = DraftingService(ai_service=ai_service)
        
        resolved_session_id = session_id or str(uuid.uuid4())
        
        # Integrate Langfuse trace grouping
        langfuse_trace_id = None
        if ai_service.langfuse_client:
            try:
                trace = ai_service.langfuse_client.trace(
                    name="mcp-tool-draft_content",
                    session_id=resolved_session_id,
                    user_id=user_id,
                    tags=["mcp", "stdio", f"tenant:{tenant_id}"],
                    metadata={
                        "client": "Claude Desktop",
                        "prompt": prompt,
                        "content_type_slug": content_type_slug
                    }
                )
                langfuse_trace_id = trace.id
            except Exception as lf_err:
                logger.warning(f"Failed to initialize Langfuse trace: {lf_err}")

        aggregated_explanation = []
        final_draft_content = None
        
        async with SessionLocal() as db:
            async for event in drafting_service.generate_draft_stream(
                prompt=prompt,
                content_type_slug=content_type_slug,
                schema_json=schema_json,
                tenant_id=tenant_id,
                user_id=user_id,
                db=db,
                session_id=resolved_session_id,
                langfuse_trace_id=langfuse_trace_id
            ):
                event_type = event.get("event")
                event_data = event.get("data")
                
                if event_type == "TEXT_DELTA" and isinstance(event_data, str):
                    aggregated_explanation.append(event_data)
                elif event_type == "DRAFT_COMPLETE":
                    final_draft_content = event_data

        # 4. Format consolidated response
        explanation_markdown = "".join(aggregated_explanation)
        
        response_markdown = []
        if explanation_markdown:
            response_markdown.append(explanation_markdown)
            
        if final_draft_content:
            response_markdown.append("\n\n### Generated Content Draft:\n")
            response_markdown.append(f"```json\n{json.dumps(final_draft_content, indent=2)}\n```")
            
        response_markdown.append(f"\n\n*Session ID: {resolved_session_id}*")
        
        # Close Langfuse trace if active
        if ai_service.langfuse_client:
            try:
                ai_service.langfuse_client.flush()
            except Exception:
                pass
                
        return "".join(response_markdown)

    except ValueError as val_err:
        return f"Authentication Error: {str(val_err)}"
    except Exception as e:
        logger.error(f"Error in draft_content tool: {str(e)}", exc_info=True)
        return f"An error occurred while drafting content: {str(e)}"

@mcp.tool()
async def chat_agent(
    prompt: str,
    session_id: Optional[str] = None
) -> str:
    """
    Interacts with the Hermes AI co-creation agent to design content types or configure schemas.
    
    Args:
        prompt: Natural language schema generation/refinement prompt.
        session_id: Optional unique identifier to continue a co-creation conversation thread.
    """
    try:
        # 1. Authenticate and retrieve tenant context
        key_info = await get_active_tenant()
        tenant_id = key_info["tenant"]
        user_id = key_info.get("id", "mcp-user")

        # 2. Initialize AIService
        ai_service = AIService()
        resolved_session_id = session_id or str(uuid.uuid4())
        
        # Integrate Langfuse trace grouping
        langfuse_trace_id = None
        if ai_service.langfuse_client:
            try:
                trace = ai_service.langfuse_client.trace(
                    name="mcp-tool-chat_agent",
                    session_id=resolved_session_id,
                    user_id=user_id,
                    tags=["mcp", "stdio", f"tenant:{tenant_id}"],
                    metadata={
                        "client": "Claude Desktop",
                        "prompt": prompt
                    }
                )
                langfuse_trace_id = trace.id
            except Exception as lf_err:
                logger.warning(f"Failed to initialize Langfuse trace: {lf_err}")

        aggregated_explanation = []
        final_schema_state = None
        
        # If this is a new session, run generate_schema first to initialize it
        if not session_id:
            res = await ai_service.generate_schema(
                prompt=prompt,
                tenant_id=tenant_id,
                user_id=user_id,
                langfuse_trace_id=langfuse_trace_id
            )
            resolved_session_id = res.get("sessionId", resolved_session_id)
            aggregated_explanation.append(res.get("message", ""))
            final_schema_state = res.get("schema")
        else:
            # Continue co-creation session stream
            async for event in ai_service.continue_generation_session_stream(
                session_id=resolved_session_id,
                prompt=prompt,
                langfuse_trace_id=langfuse_trace_id
            ):
                event_type = event.get("event")
                event_data = event.get("data")
                
                if event_type == "TEXT_DELTA" and isinstance(event_data, str):
                    aggregated_explanation.append(event_data)
                elif event_type == "STATE_DELTA":
                    final_schema_state = event_data
                elif event_type == "ERROR":
                    return f"Agent Error: {event_data}"

        # 3. Format consolidated response
        explanation_markdown = "".join(aggregated_explanation)
        
        response_markdown = []
        if explanation_markdown:
            response_markdown.append(explanation_markdown)
            
        if final_schema_state:
            response_markdown.append("\n\n### Active Schema State:\n")
            response_markdown.append(f"```json\n{json.dumps(final_schema_state, indent=2)}\n```")
            
        response_markdown.append(f"\n\n*Session ID: {resolved_session_id}*")
        
        # Close Langfuse trace if active
        if ai_service.langfuse_client:
            try:
                ai_service.langfuse_client.flush()
            except Exception:
                pass
                
        return "".join(response_markdown)

    except ValueError as val_err:
        return f"Authentication Error: {str(val_err)}"
    except Exception as e:
        logger.error(f"Error in chat_agent tool: {str(e)}", exc_info=True)
        return f"An error occurred during co-creation session: {str(e)}"

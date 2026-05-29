import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import Response, JSONResponse
from mcp.server.sse import SseServerTransport

from src.application.mcp.server import mcp
from src.application.mcp.tools import active_tenant_var
from src.infrastructure.clients.cms_client import CMSClient
from src.infrastructure.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mcp", tags=["MCP"])

# SSE transport configuration with relative path matching the post message endpoint
sse_transport = SseServerTransport(endpoint="/api/v1/mcp/message")

async def validate_mcp_api_key(request: Request) -> Dict[str, Any]:
    """Helper to validate API key from request headers."""
    api_key = request.headers.get("x-api-key")
    if not api_key:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            api_key = auth_header[7:]
            
    if not api_key:
        logger.error("Authentication failed: API key missing in headers.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: API key missing in headers."
        )

    cms_client = CMSClient(
        cms_url=settings.CMS_ENGINE_URL,
        internal_secret=settings.INTERNAL_SERVICE_SECRET
    )
    key_info = await cms_client.validate_api_key(api_key)
    if not key_info:
        logger.error("Authentication failed: Invalid or expired API Key.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication failed: Invalid or expired API Key."
        )
        
    return key_info

@router.get("/sse")
async def handle_sse(request: Request):
    """Establishes the SSE stream connection for cloud-based MCP clients."""
    key_info = await validate_mcp_api_key(request)
    
    # Store tenant context in contextvar for execution within the session
    token = active_tenant_var.set(key_info)
    
    try:
        async def sse_app_wrapper(scope, receive, send):
            async with sse_transport.connect_sse(scope, receive, send) as streams:
                await mcp._mcp_server.run(
                    streams[0],
                    streams[1],
                    mcp._mcp_server.create_initialization_options()
                )
                
        return await sse_app_wrapper(request.scope, request.receive, request._send)
    finally:
        active_tenant_var.reset(token)

@router.post("/message")
async def handle_message(request: Request):
    """Receives JSON-RPC request messages from client."""
    key_info = await validate_mcp_api_key(request)
    
    token = active_tenant_var.set(key_info)
    
    try:
        session_id_param = request.query_params.get("session_id")
        if session_id_param is None:
            logger.warning("Received request without session_id")
            return JSONResponse(status_code=400, content={"detail": "session_id is required"})
            
        return await sse_transport.handle_post_message(request.scope, request.receive, request._send)
    finally:
        active_tenant_var.reset(token)

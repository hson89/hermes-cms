"""
LangChain tool for resolving and updating content type schemas in the CMS.

T016 - Build schema_resolver LangChain tool
"""

import httpx
from typing import Any
from langchain_core.tools import tool
from src.infrastructure.config import settings

@tool
async def schema_resolver(
    content_type_slug: str,
    updates: dict[str, Any],
    tenant_id: str,
) -> str:
    """
    Updates a content type schema in the CMS. 
    Use this tool when the user wants to add, remove, or modify fields in a content type.
    'updates' should be a dictionary of changes (e.g., {'fields': [...]}).
    """
    cms_url = settings.CMS_ENGINE_URL
    
    # Using internal secret for auth
    headers = {
        "X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET,
        "Content-Type": "application/json",
    }
    
    # We need to find the content type ID first or use slug if CMS supports it
    # For now, assuming POST /api/content-types takes a slug and updates
    
    try:
        async with httpx.AsyncClient() as client:
            # First, find the content type by slug to get its ID
            # Payload REST API uses slugs for collection access, but ContentTypes is a collection itself.
            # So it's /api/content-types?where[slug][equals]=...
            
            find_url = f"{cms_url}/api/content-types?where[slug][equals]={content_type_slug}"
            response = await client.get(find_url, headers=headers)
            response.raise_for_status()
            docs = response.json().get("docs", [])
            
            if not docs:
                return f"Error: Content type '{content_type_slug}' not found."
            
            ct_id = docs[0]["id"]
            
            # Now update it
            update_url = f"{cms_url}/api/content-types/{ct_id}"
            response = await client.patch(update_url, json=updates, headers=headers)
            response.raise_for_status()
            
            return f"Successfully updated content type '{content_type_slug}'."
            
    except Exception as e:
        return f"Error updating content type: {e}"

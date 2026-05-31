import os
import logging
import httpx
from typing import Optional, Dict, Any, List
from src.infrastructure.clients.cms_client import CMSClient
from src.infrastructure.config import settings
from src.infrastructure.database import SessionLocal
from src.application.ai_service import AIService
from src.application.drafting_service import DraftingService

logger = logging.getLogger(__name__)

import contextvars

# ContextVar to store active tenant metadata during an HTTP request
active_tenant_var: contextvars.ContextVar[Dict[str, Any]] = contextvars.ContextVar("active_tenant_var")

async def get_active_tenant(session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates the API key from the environment or context and returns the key validation metadata.
    Raises ValueError if validation fails.
    """
    try:
        # Check context variable first (set during HTTP requests)
        return active_tenant_var.get()
    except LookupError:
        pass

    # 1. Obtain HERMES_API_KEY from environment (standard for stdio local transport)
    api_key = os.environ.get("HERMES_API_KEY")
    if not api_key:
        logger.error("Authentication failed: HERMES_API_KEY is not set in environment.")
        raise ValueError("Authentication failed: HERMES_API_KEY environment variable is not configured.")

    # 2. Initialize CMSClient and validate key
    cms_client = CMSClient(
        cms_url=settings.CMS_ENGINE_URL,
        internal_secret=settings.INTERNAL_SERVICE_SECRET
    )
    
    key_info = await cms_client.validate_api_key(api_key)
    if not key_info:
        logger.error("Authentication failed: API key validation returned invalid or expired.")
        raise ValueError("Authentication failed: Invalid or expired Hermes API Key.")

    return key_info

async def fetch_schema_for_slug(content_type_slug: str, tenant_id: str) -> Optional[dict]:
    """Helper to fetch a content type schema from CMS engine by its slug and tenant ID."""
    cms_url = settings.CMS_ENGINE_URL
    headers = {
        "X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET,
        "Content-Type": "application/json",
    }
    params = {
        "where[slug][equals]": content_type_slug,
        "where[tenant][equals]": tenant_id
    }
    try:
        # Prevent Socket leaks & enforce standard 5-second timeouts
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"{cms_url}/api/content-types"
            # Prevent injection by passing dictionary parameters safely
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                docs = response.json().get("docs", [])
                if docs:
                    return docs[0].get("schema")
    except Exception as e:
        logger.error(f"Failed to fetch content type schema for slug '{content_type_slug}': {e}")
    return None

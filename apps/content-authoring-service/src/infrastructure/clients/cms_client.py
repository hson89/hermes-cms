import logging
from typing import Dict, Any, Optional
import httpx
from src.infrastructure.config import settings

logger = logging.getLogger(__name__)

class CMSClient:
    """
    Client for communicating with the Next.js Content Management Engine.
    """
    def __init__(self, cms_url: str, internal_secret: str, client: Optional[httpx.AsyncClient] = None):
        self.cms_url = cms_url.rstrip('/')
        self.internal_secret = internal_secret
        self._client = client

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Validates the provided API key with the Payload CMS monolith.
        
        Returns the API key metadata dictionary if valid, or None if invalid.
        """
        url = f"{self.cms_url}/api/api-keys/validate"
        headers = {
            "X-Internal-Secret": self.internal_secret,
            "Content-Type": "application/json"
        }
        json_data = {"apiKey": api_key}
        
        # Use shared connection pool client if supplied
        client = self._client
        is_transient = False
        if client is None:
            client = httpx.AsyncClient(timeout=settings.CMS_FETCH_TIMEOUT)
            is_transient = True
            
        try:
            response = await client.post(url, headers=headers, json=json_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid") and "apiKey" in data:
                    return data["apiKey"]
            else:
                logger.warning(
                    f"API Key validation failed with status {response.status_code}: {response.text}"
                )
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
        finally:
            if is_transient:
                await client.aclose()
            
        return None

    async def get_content_type_by_slug(self, tenant_id: str, slug: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a Content Type by slug for a specific tenant.
        """
        url = f"{self.cms_url}/api/content-types"
        params = {
            "where[slug][equals]": slug,
            "where[tenant][equals]": tenant_id,
            "limit": 1
        }
        headers = {"X-Internal-Secret": self.internal_secret}
        
        client = self._client or httpx.AsyncClient(timeout=settings.CMS_FETCH_TIMEOUT)
        try:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("docs"):
                    return data["docs"][0]
        finally:
            if self._client is None:
                await client.aclose()
        return None

    async def upsert_content_type(self, tenant_id: str, definition: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a Content Type definition.
        """
        slug = definition.get("slug")
        existing = await self.get_content_type_by_slug(tenant_id, slug)
        
        headers = {
            "X-Internal-Secret": self.internal_secret,
            "Content-Type": "application/json"
        }
        data = {**definition, "tenant": tenant_id}
        
        client = self._client or httpx.AsyncClient(timeout=settings.CMS_FETCH_TIMEOUT)
        try:
            if existing:
                url = f"{self.cms_url}/api/content-types/{existing['id']}"
                response = await client.patch(url, headers=headers, json=data)
            else:
                url = f"{self.cms_url}/api/content-types"
                response = await client.post(url, headers=headers, json=data)
            
            response.raise_for_status()
            return response.json().get("doc") or response.json()
        finally:
            if self._client is None:
                await client.aclose()

    async def get_page_template_by_slug(self, tenant_id: str, slug: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a Page Template by slug for a specific tenant.
        """
        url = f"{self.cms_url}/api/page-templates"
        params = {
            "where[slug][equals]": slug,
            "where[tenant][equals]": tenant_id,
            "limit": 1
        }
        headers = {"X-Internal-Secret": self.internal_secret}
        
        client = self._client or httpx.AsyncClient(timeout=settings.CMS_FETCH_TIMEOUT)
        try:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("docs"):
                    return data["docs"][0]
        finally:
            if self._client is None:
                await client.aclose()
        return None

    async def upsert_page_template(self, tenant_id: str, template: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a Page Template.
        """
        slug = template.get("slug")
        existing = await self.get_page_template_by_slug(tenant_id, slug)
        
        headers = {
            "X-Internal-Secret": self.internal_secret,
            "Content-Type": "application/json"
        }
        data = {**template, "tenant": tenant_id}
        
        client = self._client or httpx.AsyncClient(timeout=settings.CMS_FETCH_TIMEOUT)
        try:
            if existing:
                url = f"{self.cms_url}/api/page-templates/{existing['id']}"
                response = await client.patch(url, headers=headers, json=data)
            else:
                url = f"{self.cms_url}/api/page-templates"
                response = await client.post(url, headers=headers, json=data)
            
            response.raise_for_status()
            return response.json().get("doc") or response.json()
        finally:
            if self._client is None:
                await client.aclose()

CMS_CLIENT_SINGLETON = CMSClient(
    cms_url=settings.CMS_ENGINE_URL,
    internal_secret=settings.INTERNAL_SERVICE_SECRET
)

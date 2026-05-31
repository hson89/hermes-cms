import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

# Keep a module-level global AsyncClient to leverage HTTP connection pooling
_client: Optional[httpx.AsyncClient] = None

def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client

class CMSClient:
    """
    Client for communicating with the Next.js Content Management Engine.
    """
    def __init__(self, cms_url: str, internal_secret: str):
        self.cms_url = cms_url.rstrip('/')
        self.internal_secret = internal_secret

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
        
        try:
            client = _get_client()
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
            
        return None

import logging
from typing import Dict, Any, Optional
import httpx

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
            client = httpx.AsyncClient(timeout=5.0)
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

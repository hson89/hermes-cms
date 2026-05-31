"""
Internal signature and secret verification for service-to-service communication.
"""

from __future__ import annotations

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, Any
from src.infrastructure.config import settings

INTERNAL_SECRET = settings.INTERNAL_SERVICE_SECRET
MARKETPLACE_SECRET = settings.MARKETPLACE_JWT_SECRET
api_key_header = APIKeyHeader(name="X-Internal-Secret", auto_error=False)
security = HTTPBearer()


import logging
logger = logging.getLogger(__name__)

def require_internal_secret(key: str | None = Security(api_key_header)) -> None:
    """Validate the internal service-to-service secret header."""
    if not INTERNAL_SECRET:
        logger.error("Security Fail-Closed: INTERNAL_SERVICE_SECRET is unset or empty in the environment settings.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: Internal service secret is not configured.",
        )
    if key != INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service secret.",
        )


async def verify_marketplace_token(
    auth: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    """
    Verifies the HS256 Marketplace JWT.
    Returns the decoded claims (tenant_id, app_id, scopes).
    """
    try:
        payload = jwt.decode(
            auth.credentials, MARKETPLACE_SECRET, algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

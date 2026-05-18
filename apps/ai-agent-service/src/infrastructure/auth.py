"""
Internal signature and secret verification for service-to-service communication.
"""

from __future__ import annotations

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from src.infrastructure.config import settings

INTERNAL_SECRET = settings.INTERNAL_SERVICE_SECRET
api_key_header = APIKeyHeader(name="X-Internal-Secret", auto_error=False)


def require_internal_secret(key: str | None = Security(api_key_header)) -> None:
    """Validate the internal service-to-service secret header."""
    if not INTERNAL_SECRET:
        # If no secret is configured, allow all (development mode)
        return
    if key != INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service secret.",
        )

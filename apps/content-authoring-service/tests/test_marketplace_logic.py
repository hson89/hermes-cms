import pytest
import jwt
import time
from fastapi.testclient import TestClient
from src.main import app
from src.infrastructure.config import settings
from src.application.marketplace_service import MarketplaceService

client = TestClient(app)

def test_jwt_verification_success():
    secret = settings.MARKETPLACE_JWT_SECRET
    payload = {
        "sub": "user-123",
        "tenant_id": "tenant-abc",
        "app_id": "app-xyz",
        "scopes": ["read"],
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    
    # Assuming we have an endpoint that uses verify_marketplace_token
    # For now, we can test the function directly
    from src.infrastructure.auth import verify_marketplace_token
    from fastapi.security import HTTPAuthorizationCredentials
    
    class MockAuth:
        credentials = token
        
    import asyncio
    decoded = asyncio.run(verify_marketplace_token(MockAuth()))
    assert decoded["tenant_id"] == "tenant-abc"

def test_circuit_breaker_trips():
    service = MarketplaceService()
    # Mocking a failing URL
    tool = service.get_tool_for_app("test_app", "http://invalid-url-12345.com", "tenant-1")
    
    # 1. First failure
    result = tool._run("test")
    assert "ERROR" in result
    assert tool.breaker.current_state == "closed"
    
    # 2. Second failure
    tool._run("test")
    assert tool.breaker.current_state == "closed"
    
    # 3. Third failure -> OPEN
    tool._run("test")
    assert tool.breaker.current_state == "open"
    
    # 4. Subsequent calls should return the "unavailable" message immediately
    result = tool._run("test")
    assert "unavailable (Circuit Breaker OPEN)" in result

import pytest
from src.application.mcp.session import MCPSessionContext, MCPSessionRegistry

def test_mcp_session_context_creation():
    tenant_id = "tenant_123"
    client_metadata = {"client": "Claude Desktop"}
    
    session = MCPSessionContext(tenant_id=tenant_id, client_metadata=client_metadata)
    
    assert session.session_id is not None
    assert session.tenant_id == tenant_id
    assert session.client_metadata == client_metadata
    assert session.created_at is not None
    assert session.last_active is not None

def test_mcp_session_registry_lifecycle():
    registry = MCPSessionRegistry()
    tenant_id = "tenant_xyz"
    client_metadata = {"client": "ChatGPT"}
    
    # 1. Create session
    session = registry.create_session(tenant_id=tenant_id, client_metadata=client_metadata)
    assert session.session_id in registry._sessions
    
    # 2. Get session
    retrieved = registry.get_session(session.session_id)
    assert retrieved is not None
    assert retrieved.tenant_id == tenant_id
    assert retrieved.client_metadata == client_metadata
    
    # 3. Touch updates last active
    original_last_active = retrieved.last_active
    retrieved.touch()
    assert retrieved.last_active >= original_last_active
    
    # 4. Remove session
    removed = registry.remove_session(session.session_id)
    assert removed is not None
    assert removed.session_id == session.session_id
    
    # 5. Get after remove returns None
    assert registry.get_session(session.session_id) is None

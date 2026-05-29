from datetime import datetime, timezone
from typing import Dict, Any, Optional
import uuid

class MCPSessionContext:
    """
    Tracks session state and tenant isolation context for connected MCP clients.
    """
    def __init__(
        self, 
        tenant_id: str, 
        client_metadata: Optional[Dict[str, Any]] = None, 
        session_id: Optional[str] = None
    ):
        self.session_id = session_id or str(uuid.uuid4())
        self.tenant_id = tenant_id
        self.client_metadata = client_metadata or {}
        self.created_at = datetime.now(timezone.utc)
        self.last_active = datetime.now(timezone.utc)

    def touch(self):
        """Update last active timestamp to keep the session alive."""
        self.last_active = datetime.now(timezone.utc)

class MCPSessionRegistry:
    """
    In-memory registry to store and manage active MCP client sessions.
    """
    def __init__(self):
        self._sessions: Dict[str, MCPSessionContext] = {}

    def create_session(self, tenant_id: str, client_metadata: Optional[Dict[str, Any]] = None) -> MCPSessionContext:
        """Create a new session context and register it."""
        session = MCPSessionContext(tenant_id=tenant_id, client_metadata=client_metadata)
        self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[MCPSessionContext]:
        """Retrieve a session by ID and update its active timestamp."""
        session = self._sessions.get(session_id)
        if session:
            session.touch()
        return session

    def remove_session(self, session_id: str) -> Optional[MCPSessionContext]:
        """Revoke/remove a session from the registry."""
        return self._sessions.pop(session_id, None)

    def clear(self):
        """Flush all registered sessions."""
        self._sessions.clear()

# Global in-memory registry instance
session_registry = MCPSessionRegistry()

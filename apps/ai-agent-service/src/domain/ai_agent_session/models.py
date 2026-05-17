"""
AIAgentSession domain model and aggregate root.

T014 - Create AIAgentSession model
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class SessionStatus(str, Enum):
    """Lifecycle states for an AI Agent conversation session."""

    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class ConversationMessage(BaseModel):
    """A single message in the conversation history."""

    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIAgentSession(BaseModel):
    """
    Aggregate root for the AI Agent context.

    Tracks a single user's conversation with the AI Agent within the scope
    of a specific tenant.  Cross-service references to the CMS (userId /
    tenantId) are stored as plain UUIDs; no hard foreign key constraint
    is enforced in the AI Microservice.

    Data-model reference:
      - id: UUID
      - userId: UUID (Reference to Payload User)
      - tenantId: UUID (Reference to Payload Tenant)
      - context: JSON (Conversation history)
      - status: Enum (Active, Completed, Failed)
      - createdAt: DateTime
      - updatedAt: DateTime
    """

    id: UUID = Field(default_factory=uuid4)
    user_id: str
    tenant_id: str
    context: list[ConversationMessage] = Field(default_factory=list)
    status: SessionStatus = SessionStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", "tenant_id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: Any) -> str:
        if isinstance(v, UUID):
            return str(v)
        if isinstance(v, int):
            return str(v)
        return str(v)

    # ── Domain methods ────────────────────────────────────────────────────────

    def add_message(self, role: str, content: str) -> None:
        """Append a message to the conversation history and touch updated_at."""
        self.context.append(ConversationMessage(role=role, content=content))
        self.updated_at = datetime.now(timezone.utc)

    def complete(self) -> None:
        """Mark the session as completed."""
        self.status = SessionStatus.COMPLETED
        self.updated_at = datetime.now(timezone.utc)

    def fail(self) -> None:
        """Mark the session as failed."""
        self.status = SessionStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)

    def to_langchain_messages(self) -> list[dict[str, Any]]:
        """
        Convert the conversation history to LangChain message format
        (list of dicts with 'role' and 'content' keys).
        """
        return [{"role": msg.role, "content": msg.content} for msg in self.context]

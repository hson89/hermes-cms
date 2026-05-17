"""
SQLAlchemy database models for AI Agent Service.
Satisfies T004.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID

from src.domain.ai_agent_session.models import SessionStatus
from src.infrastructure.database import Base


class AIAgentSessionModel(Base):
    """SQLAlchemy model representing the ai_agent_sessions table."""

    __tablename__ = "ai_agent_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    context = Column(JSON, nullable=False, default=list)
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.ACTIVE)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

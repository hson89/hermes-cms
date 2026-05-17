"""
SQLAlchemy-backed implementation of the AISessionRepository interface.
Satisfies T005b.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete as sql_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.ai_agent_session.models import AIAgentSession, ConversationMessage
from src.domain.repositories.session_repository import AISessionRepository
from src.infrastructure.models import AIAgentSessionModel


def to_domain_model(db_model: AIAgentSessionModel) -> AIAgentSession:
    """Map a SQLAlchemy model to a domain AIAgentSession aggregate."""
    context = []
    for msg in db_model.context:
        # Convert JSON structure to Pydantic models
        context.append(
            ConversationMessage(
                role=msg.get("role", "user"),
                content=msg.get("content", ""),
                timestamp=msg.get("timestamp"),
            )
        )

    return AIAgentSession(
        id=db_model.id,
        user_id=db_model.user_id,
        tenant_id=db_model.tenant_id,
        context=context,
        status=db_model.status,
        created_at=db_model.created_at,
        updated_at=db_model.updated_at,
    )


class SQLSessionRepository(AISessionRepository):
    """
    SQLAlchemy-backed session repository for storage and CRUD operations.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def save(self, session: AIAgentSession) -> None:
        """Create or update an AIAgentSession aggregate."""
        query = select(AIAgentSessionModel).where(AIAgentSessionModel.id == session.id)
        result = await self.db.execute(query)
        db_model = result.scalar_one_or_none()

        # Serialize messages to dictionary representations
        context_data = []
        for msg in session.context:
            context_data.append(
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                }
            )

        if db_model:
            db_model.context = context_data
            db_model.status = session.status
            db_model.updated_at = session.updated_at
        else:
            db_model = AIAgentSessionModel(
                id=session.id,
                user_id=session.user_id,
                tenant_id=session.tenant_id,
                context=context_data,
                status=session.status,
                created_at=session.created_at,
                updated_at=session.updated_at,
            )
            self.db.add(db_model)

        await self.db.flush()

    async def get_by_id(self, session_id: UUID) -> AIAgentSession | None:
        """Retrieve a session by its unique ID."""
        query = select(AIAgentSessionModel).where(AIAgentSessionModel.id == session_id)
        result = await self.db.execute(query)
        db_model = result.scalar_one_or_none()
        if not db_model:
            return None
        return to_domain_model(db_model)

    async def delete(self, session_id: UUID) -> None:
        """Delete a session by its unique ID."""
        query = sql_delete(AIAgentSessionModel).where(
            AIAgentSessionModel.id == session_id
        )
        await self.db.execute(query)
        await self.db.flush()

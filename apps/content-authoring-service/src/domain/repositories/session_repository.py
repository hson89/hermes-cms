"""
Abstract Session Repository domain interface.
Satisfies T005.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.ai_agent_session.models import AIAgentSession


class AISessionRepository(ABC):
    """
    Abstract interface for managing persistence of AIAgentSession aggregates.
    Strict DDD boundary: operates purely on Domain Models.
    """

    @abstractmethod
    async def save(self, session: AIAgentSession) -> None:
        """
        Persist or update the AIAgentSession aggregate in the data store.
        """
        pass

    @abstractmethod
    async def get_by_id(self, session_id: UUID) -> AIAgentSession | None:
        """
        Retrieve a session aggregate by its unique identifier.
        """
        pass

    @abstractmethod
    async def delete(self, session_id: UUID) -> None:
        """
        Delete a session aggregate by its unique identifier.
        """
        pass

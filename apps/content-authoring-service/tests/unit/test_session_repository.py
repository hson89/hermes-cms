"""
Unit tests for the SQLSessionRepository.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.domain.ai_agent_session.models import AIAgentSession, SessionStatus
from src.infrastructure.config import settings
from src.infrastructure.database import Base
from src.infrastructure.repositories.session_repository import SQLSessionRepository

import asyncio

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure tables exist before running tests."""
    async def create_tables():
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()
    asyncio.run(create_tables())
    yield
    # We do not drop tables as this runs on local development postgres instance


@pytest.fixture()
async def db_session() -> AsyncSession:
    """Fixture providing a transactional db session that rolls back after each test."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session
        await session.rollback()
    await engine.dispose()



@pytest.mark.asyncio
async def test_repository_save_and_retrieve(db_session: AsyncSession) -> None:
    """Test that a session can be saved and retrieved via the SQL repository."""
    repo = SQLSessionRepository(db_session)
    tenant_id = uuid4()
    user_id = uuid4()

    # 1. Create a new domain session aggregate
    session = AIAgentSession(user_id=user_id, tenant_id=tenant_id)
    session.add_message("user", "Hello assistant!")
    session.add_message("assistant", "How can I help you today?")

    # 2. Save using repository
    await repo.save(session)

    # 3. Retrieve and verify
    retrieved = await repo.get_by_id(session.id)
    assert retrieved is not None
    assert retrieved.id == session.id
    assert retrieved.tenant_id == str(tenant_id)
    assert retrieved.user_id == str(user_id)
    assert len(retrieved.context) == 2
    assert retrieved.context[0].role == "user"
    assert retrieved.context[0].content == "Hello assistant!"
    assert retrieved.context[1].role == "assistant"
    assert retrieved.context[1].content == "How can I help you today?" # Note: we just check content matching
    assert retrieved.status == SessionStatus.ACTIVE


@pytest.mark.asyncio
async def test_repository_update(db_session: AsyncSession) -> None:
    """Test that updating an existing session changes it in the DB."""
    repo = SQLSessionRepository(db_session)
    session = AIAgentSession(user_id=uuid4(), tenant_id=uuid4())
    await repo.save(session)

    # Modify state
    session.add_message("user", "Revised prompt")
    session.complete()
    await repo.save(session)

    # Retrieve and verify
    retrieved = await repo.get_by_id(session.id)
    assert retrieved is not None
    assert retrieved.status == SessionStatus.COMPLETED
    assert len(retrieved.context) == 1
    assert retrieved.context[0].content == "Revised prompt"


@pytest.mark.asyncio
async def test_repository_delete(db_session: AsyncSession) -> None:
    """Test that a session can be deleted successfully."""
    repo = SQLSessionRepository(db_session)
    session = AIAgentSession(user_id=uuid4(), tenant_id=uuid4())
    await repo.save(session)

    # Retrieve to confirm save
    assert await repo.get_by_id(session.id) is not None

    # Delete
    await repo.delete(session.id)

    # Retrieve to verify deletion
    assert await repo.get_by_id(session.id) is None

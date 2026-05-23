"""
SQLAlchemy database setup and session helpers.
Satisfies T004 / T005b.
"""

from __future__ import annotations

from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base


from src.infrastructure.config import settings

# Create async engine and sessionmaker
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to obtain a new database session."""
    async with SessionLocal() as session:
        yield session
        await session.commit()


@asynccontextmanager
async def get_db_checkpointer():
    """Asynchronous context manager returning the AsyncPostgresSaver checkpointer connection."""
    from src.infrastructure.config import settings
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

    conn_string = settings.DATABASE_URL.replace("+asyncpg", "")
    async with AsyncPostgresSaver.from_conn_string(conn_string) as saver:
        yield saver


"""
Database Configuration
======================
Async SQLAlchemy engine and session factory.
Reads DATABASE_URL from environment (Railway sets this automatically).
Falls back to SQLite for local development.
"""

import os
import logging
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("database.config")

# Railway provides DATABASE_URL in postgres:// format
# SQLAlchemy async requires postgresql+asyncpg://
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif not DATABASE_URL:
    # Local dev fallback — async sqlite
    DATABASE_URL = "sqlite+aiosqlite:///./biogas_local.db"
    logger.info("No DATABASE_URL found. Using local SQLite: biogas_local.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables if they don't exist."""
    from .models import Base as ModelBase  # noqa: F811
    async with engine.begin() as conn:
        await conn.run_sync(ModelBase.metadata.create_all)
    logger.info("✓ Database tables initialized")


async def close_db():
    """Dispose the engine connection pool."""
    await engine.dispose()
    logger.info("Database connection closed")


async def get_db():
    """Dependency for FastAPI — yields an async session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

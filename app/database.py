from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.orm import sessionmaker
from sqlmodel import Field, SQLModel

import os
from uuid import UUID, uuid4

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise ValueError("Missing required environment variable: DATABASE_URL")

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("FTCVANGUARD_DEVELOPMENT", "0") == "1",
    future=True,
    connect_args={
        "ssl": "require",
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
    },
)

SessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def Session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


class RootIdentity(SQLModel, table=True):
    __tablename__ = "root_identity"

    # NOTE: team number should ALWAYS be referred to as number, because "id" is semantically ambiguous on multiple levels
    number: int = Field(
        primary_key=True, sa_column_kwargs={"autoincrement": False}
    )
    email: str  # NOTE: does not need index and should not be unique!
    password_argon2: str


# NOTE: not sure how google/github/apple sso will work out but oh well
class PersonalIdentity(SQLModel, table=True):
    __tablename__ = "personal_identity"

    uuid: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_argon2: str
    name: str

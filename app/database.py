from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from enum import IntEnum
import os
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.orm import sessionmaker
from sqlmodel import CheckConstraint, Field, Relationship, SQLModel

DEVELOPMENT = os.getenv("FTCVANGUARD_DEVELOPMENT", "0") == "1"

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise ValueError("Missing required environment variable: DATABASE_URL")

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=DEVELOPMENT,
    future=True,
    pool_pre_ping=DEVELOPMENT,  # NOTE: present due to scale to zero development db, should not happen in prod
    pool_recycle=240 if DEVELOPMENT else -1,  # NOTE: ^^^ see above ^^^
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


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PermissionLevel(IntEnum):
    NONE = 0
    READ = 1
    WRITE = 2
    MANAGE = 3
    ADMIN = 4


class RootIdentity(SQLModel, table=True):
    __tablename__ = "root_identity"

    # NOTE: team number should ALWAYS be referred to as number, because "id" is semantically ambiguous on multiple levels
    number: int = Field(
        primary_key=True, sa_column_kwargs={"autoincrement": False}
    )
    email: str  # NOTE: does not need index and should not be unique!
    password_argon2: str

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    last_login_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    members: list["TeamAccess"] = Relationship(back_populates="team")


# NOTE: not sure how google/github/apple sso will work out but oh well
class PersonalIdentity(SQLModel, table=True):
    __tablename__ = "personal_identity"

    uuid: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_argon2: str
    name: str

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    last_login_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    team_access: list["TeamAccess"] = Relationship(back_populates="user")


class TeamAccess(SQLModel, table=True):
    __tablename__ = "team_access"

    user_uuid: UUID = Field(
        foreign_key="personal_identity.uuid",
        primary_key=True,
    )
    team_number: int = Field(
        foreign_key="root_identity.number",
        primary_key=True,
    )
    permission_level: int = Field(
        default=PermissionLevel.NONE,
        nullable=False,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    user: PersonalIdentity = Relationship(back_populates="team_access")
    team: RootIdentity = Relationship(back_populates="members")

    __table_args__ = (
        CheckConstraint(
            "permission_level >= 0 AND permission_level <= 4",
            name="check_permission_level",
        ),
    )

class CachedFTCEventData(SQLModel, table=True):
    __tablename__ = "cached_ftc_event_data"

    event_code: str = Field(primary_key=True)
    field_count: int = Field(nullable=False)
    type: str = Field(nullable=False)
    region_code: str = Field(nullable=False)
    league_code: str = Field(nullable=False)
    timezone: str = Field(nullable=False)
    date_start: str = Field(nullable=False)
    date_end: str = Field(nullable=False)

    last_updated: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
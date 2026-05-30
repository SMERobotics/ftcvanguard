from argon2.exceptions import InvalidHashError, VerificationError
from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from uuid import UUID

from app.auth import ph, sign_jwt
from app.database import Session, PersonalIdentity, RootIdentity

auth = APIRouter(prefix="/auth")


class RootCredential(BaseModel):
    number: int = Field(ge=1, le=99999)
    password: str = Field(min_length=1, max_length=1024, pattern=r"\S")


class PersonalCredential(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024, pattern=r"\S")


class RootAccount(BaseModel):
    number: int = Field(ge=1, le=99999)
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024, pattern=r"\S")


class PersonalAccount(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024, pattern=r"\S")
    name: str = Field(min_length=1, max_length=32, pattern=r"\S")


class Token(BaseModel):
    token: str


class RootAccountCreated(BaseModel):
    number: int
    email: str


class PersonalAccountCreated(BaseModel):
    uuid: UUID
    email: str
    name: str


async def _query_personal_identity(
    session: AsyncSession, email: str
) -> PersonalIdentity | None:
    result = await session.execute(
        select(PersonalIdentity).where(PersonalIdentity.email == email)
    )
    return result.scalars().first()


def _invalid_credentials() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


def _root_token(root: RootIdentity) -> Token:
    return Token(
        token=sign_jwt(
            {
                "sub": f"root:{root.number}",
                "account_type": "root",
                "number": root.number,
            }
        )
    )


def _personal_token(personal: PersonalIdentity) -> Token:
    return Token(
        token=sign_jwt(
            {
                "sub": f"personal:{personal.uuid}",
                "account_type": "personal",
                "uuid": str(personal.uuid),
            }
        )
    )


@auth.post("/root/login")
async def _root_login(
    body: RootCredential, session: AsyncSession = Depends(Session)
) -> Token:
    root = await session.get(RootIdentity, body.number)
    if root is None:
        _invalid_credentials()

    try:
        await to_thread.run_sync(ph.verify, root.password_argon2, body.password)
    except InvalidHashError, VerificationError:
        _invalid_credentials()

    return _root_token(root)


@auth.post("/personal/login")
async def _personal_login(
    body: PersonalCredential, session: AsyncSession = Depends(Session)
) -> Token:
    personal = await _query_personal_identity(session, str(body.email))
    if personal is None:
        _invalid_credentials()

    try:
        await to_thread.run_sync(
            ph.verify, personal.password_argon2, body.password
        )
    except InvalidHashError, VerificationError:
        _invalid_credentials()

    return _personal_token(personal)


@auth.post("/root/register", status_code=status.HTTP_201_CREATED)
async def _root_register(
    body: RootAccount, session: AsyncSession = Depends(Session)
) -> RootAccountCreated:
    if await session.get(RootIdentity, body.number) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Root account already exists",
        )

    root = RootIdentity(
        number=body.number,
        email=str(body.email),
        password_argon2=await to_thread.run_sync(ph.hash, body.password),
    )
    session.add(root)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Root account already exists",
        )

    return RootAccountCreated(number=root.number, email=root.email)


@auth.post("/personal/register", status_code=status.HTTP_201_CREATED)
async def _personal_register(
    body: PersonalAccount, session: AsyncSession = Depends(Session)
) -> PersonalAccountCreated:
    if await _query_personal_identity(session, str(body.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Personal account already exists",
        )

    personal = PersonalIdentity(
        email=str(body.email),
        password_argon2=await to_thread.run_sync(ph.hash, body.password),
        name=body.name,
    )
    session.add(personal)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Personal account already exists",
        )

    return PersonalAccountCreated(
        uuid=personal.uuid, email=personal.email, name=personal.name
    )


# TODO: email verification, password reset, etc.

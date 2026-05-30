from argon2.exceptions import InvalidHashError, VerificationError
from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from typing import Literal
from uuid import UUID

from app.auth import argon2_hash, argon2_verify, sign_jwt, verify_jwt
from app.database import Session, PersonalIdentity, RootIdentity, utc_now

auth = APIRouter(prefix="/auth")
bearer = HTTPBearer(auto_error=False)


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


class RootAccountMe(BaseModel):
    type: Literal["root"]
    number: int
    email: str


class PersonalAccountMe(BaseModel):
    type: Literal["personal"]
    email: str
    name: str


async def _query_personal_identity(
    session: AsyncSession, email: str
) -> PersonalIdentity | None:
    result = await session.execute(
        select(PersonalIdentity).where(PersonalIdentity.email == email)
    )
    return result.scalars().first()


# source definitions


def raise_invalid_credentials() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


def raise_invalid_bearer_token() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def BearerAuth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if credentials is None:
        raise_invalid_bearer_token()

    try:
        return verify_jwt(credentials.credentials)
    except InvalidTokenError:
        raise_invalid_bearer_token()


# token generators


def _root_token(root: RootIdentity) -> Token:
    return Token(
        token=sign_jwt(
            {
                "sub": f"root:{root.number}",
                "type": "root",
                "number": root.number,
            }
        )
    )


def _personal_token(personal: PersonalIdentity) -> Token:
    return Token(
        token=sign_jwt(
            {
                "sub": f"personal:{personal.uuid}",
                "type": "personal",
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
        raise_invalid_credentials()

    try:
        await to_thread.run_sync(
            argon2_verify, root.password_argon2, body.password
        )
    except InvalidHashError, VerificationError:
        raise_invalid_credentials()

    root.last_login_at = utc_now()
    await session.commit()

    return _root_token(root)


@auth.post("/personal/login")
async def _personal_login(
    body: PersonalCredential, session: AsyncSession = Depends(Session)
) -> Token:
    personal = await _query_personal_identity(session, str(body.email))
    if personal is None:
        raise_invalid_credentials()

    try:
        await to_thread.run_sync(
            argon2_verify, personal.password_argon2, body.password
        )
    except InvalidHashError, VerificationError:
        raise_invalid_credentials()

    personal.last_login_at = utc_now()
    await session.commit()

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
        password_argon2=await to_thread.run_sync(argon2_hash, body.password),
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
        password_argon2=await to_thread.run_sync(argon2_hash, body.password),
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


@auth.get("/me")
async def _me(
    payload: dict = Depends(BearerAuth),
    session: AsyncSession = Depends(Session),
) -> RootAccountMe | PersonalAccountMe:
    match payload.get("type"):
        case "root":
            number = payload.get("number")
            if not isinstance(number, int):
                raise_invalid_bearer_token()

            root = await session.get(RootIdentity, number)
            if root is None:
                raise_invalid_bearer_token()

            return RootAccountMe(
                type="root", number=root.number, email=root.email
            )

        case "personal":
            try:
                uuid = UUID(str(payload.get("uuid")))
            except TypeError, ValueError:
                raise_invalid_bearer_token()

            personal = await session.get(PersonalIdentity, uuid)
            if personal is None:
                raise_invalid_bearer_token()

            return PersonalAccountMe(
                type="personal", email=personal.email, name=personal.name
            )

    raise_invalid_bearer_token()

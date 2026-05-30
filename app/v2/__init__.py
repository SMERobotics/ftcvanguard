from fastapi import APIRouter

from .auth import auth

V2 = APIRouter(prefix="/v2")
V2.include_router(auth)

from fastapi import APIRouter

from .auth import auth
from .schedule import schedule

V2 = APIRouter(prefix="/v2")
V2.include_router(auth)
V2.include_router(schedule)
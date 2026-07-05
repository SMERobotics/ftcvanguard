from fastapi import APIRouter

from .auth import auth
from .events import events
from .schedule import schedule

V2 = APIRouter(prefix="/v2")
V2.include_router(auth)
V2.include_router(events)
V2.include_router(schedule)
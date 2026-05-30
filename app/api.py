from fastapi import APIRouter

from app.v1 import V1
from app.v2 import V2

api = APIRouter(prefix="/api")

api.include_router(V1)
api.include_router(V2)

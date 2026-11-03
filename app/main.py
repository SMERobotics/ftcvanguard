from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from redis.asyncio import Redis

from app.config import get_settings
from app.ftc import FTCClient
from app.services.schedule import Schedule, get_schedule


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with (
        FTCClient() as client,
        Redis.from_url(
            get_settings().redis_url,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=3,
        ) as redis,
    ):
        await redis.ping()
        app.state.ftc = client
        app.state.redis = redis
        yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/v2/schedule", response_model=Schedule)
async def schedule(event: str, request: Request) -> Schedule:
    return await get_schedule(event, request.app.state.ftc)


@app.get("/")
def root():
    return {"detail": "Hello world!"}

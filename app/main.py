from contextlib import asynccontextmanager

from fastapi import FastAPI
from redis.asyncio import Redis

from app.config import get_settings
from app.ftc import FTCClient


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


@app.get("/")
def root():
    return {"detail": "Hello world!"}

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.ftc import FTCClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with FTCClient() as client:
        app.state.ftc = client
        yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
def root():
    return {"detail": "Hello world!"}

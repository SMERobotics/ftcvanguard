from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.api import api
from app.database import init_db
from app.paths import (
    ASSETS_DIR,
    FAVICON_FILE,
    INDEX_FILE,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_db()
    yield


app = FastAPI(
    title="ftcvanguard",
    description="Real-time everything solution for FTC teams. Schedule, scout, and scheme, all from your mobile/desktop device.",
    lifespan=lifespan,
)


app.include_router(api)

app.mount("/assets", StaticFiles(directory=ASSETS_DIR))


@app.get("/favicon.ico", include_in_schema=False)
async def _favicon():
    if FAVICON_FILE.exists():
        return FileResponse(FAVICON_FILE)
    return Response(status_code=204)


@app.get("/", include_in_schema=False)
@app.get("/{path:path}", include_in_schema=False)
async def _root(path: str = ""):
    return FileResponse(INDEX_FILE)

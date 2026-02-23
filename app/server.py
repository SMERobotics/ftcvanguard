from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import api

app = FastAPI(title="ftcvanguard")

app.include_router(api, prefix="/api")

app.mount("/_app", StaticFiles(directory="build/_app"))

@app.get("/")
async def _root():
    return FileResponse("build/landing.html")

@app.get("/app")
async def _app():
    return FileResponse("build/index.html")
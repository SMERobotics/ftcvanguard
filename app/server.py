from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import api

app = FastAPI(title="ftcvanguard")

app.include_router(api, prefix="/api")

app.mount("/_app", StaticFiles(directory="build/_app"))
app.mount("/assets", StaticFiles(directory="build/assets"))

@app.get("/")
async def _root():
    return FileResponse("build/landing.html")

@app.get("/app")
async def _app():
    return FileResponse("build/index.html")

@app.get("/favicon.ico")
async def _favicon():
    return FileResponse("build/assets/favicon.ico")
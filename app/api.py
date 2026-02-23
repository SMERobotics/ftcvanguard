from fastapi import APIRouter

api = APIRouter()

V1 = APIRouter(prefix="/v1") # empty legacy for now
V2 = APIRouter(prefix="/v2")

@V2.get("/hello")
async def hello():
    return {"message": "hello world"}

api.include_router(V1)
api.include_router(V2)
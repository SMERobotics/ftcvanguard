from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..ftc import FTCClient

from .auth import BearerAuth

events = APIRouter(prefix="/events")

class EventsResponse(BaseModel):
    events: list[dict]

@events.get("/get")
async def _get(number: int, _payload: dict = Depends(BearerAuth)) -> EventsResponse:
    async with FTCClient() as client:
        r = await client.get(f"/events?teamNumber={number}")

        if 500 <= r.status_code < 600:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

    return EventsResponse(events=r.json().get("events", []))

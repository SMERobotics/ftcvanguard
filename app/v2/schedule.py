import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..ftc import FTCClient

from .auth import BearerAuth

schedule = APIRouter(prefix="/schedule")

class ScheduleResponse(BaseModel):
    schedule: list[dict]

@schedule.get("/get")
async def _hello(event: str, _payload: dict = Depends(BearerAuth)) -> ScheduleResponse:
    async with FTCClient() as client:
        urls = [
            f"/schedule/{event}?tournamentLevel=qual",
            f"/schedule/{event}?tournamentLevel=playoff"
        ]

        # performance reasons
        async def _get_schedule(url: str) -> list[dict]:
            response = await client.get(url)
            if response.status_code != 200: return []
            return response.json().get("schedule", [])

        responses = await asyncio.gather(*(_get_schedule(url) for url in urls))

    return ScheduleResponse(schedule=responses[0]+responses[1])

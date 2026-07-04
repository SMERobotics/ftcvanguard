import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..ftc import FTCClient

from .auth import BearerAuth

schedule = APIRouter(prefix="/schedule")

class ScheduleResponse(BaseModel):
    schedule: list[dict]

@schedule.get("/get")
async def _get(event: str, _payload: dict = Depends(BearerAuth)) -> ScheduleResponse:
    async with FTCClient() as client:
        # i'm actually so mad
        # these ftc api chuds can't document their fucking api properly
        urls = [
            f"/schedule/{event}/qual/hybrid",
            f"/schedule/{event}?tournamentLevel=qual", # NOTE: reason why we query this endpoint is because the `field` field that tells us which field the match is played on IS NOT PRESENT IN THE HYBRID ENDPOINT. this data probably could be cacheable, but that might introduce problems if something goes really wrong at an event. wait yeah it's probably better just to leave it like this and cache the whole response
            f"/schedule/{event}/playoff/hybrid",
            f"/schedule/{event}?tournamentLevel=playoff" # NOTE: same as above, see above comment!!!
        ]

        # performance reasons
        async def _get_schedule(url: str) -> list[dict]:
            response = await client.get(url)
            if response.status_code != 200: return []
            return response.json().get("schedule", [])

        responses = await asyncio.gather(*(_get_schedule(url) for url in urls))

        qual_hybrid = {i.get("matchNumber", 0): i for i in responses[0]}
        qual_field = {i.get("matchNumber", 0): i for i in responses[1]}
        playoff_hybrid = {i.get("matchNumber", 0): i for i in responses[2]}
        playoff_field = {i.get("matchNumber", 0): i for i in responses[3]}

        for i in qual_hybrid.keys():
            if i in qual_field:
                qual_hybrid[i]["field"] = qual_field[i].get("field", 1)
        
        for i in playoff_hybrid.keys():
            if i in playoff_field:
                playoff_hybrid[i]["field"] = playoff_field[i].get("field", 1)
    
    return ScheduleResponse(schedule=list(qual_hybrid.values()) + list(playoff_hybrid.values()))

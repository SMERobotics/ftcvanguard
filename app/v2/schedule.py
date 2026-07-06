import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..ftc import FTCClient
from ..utils import _raise

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
            f"/matches/{event}",
            # NOTE: reason why we query [these 3 endpoints, 07/06] is because the `field` field that tells us which field the match is played on IS NOT PRESENT IN THE HYBRID ENDPOINT. this data probably could be cacheable, but that might introduce problems if something goes really wrong at an event. wait yeah it's probably better just to leave it like this and cache the whole response
            f"/schedule/{event}?tournamentLevel=practice",
            f"/schedule/{event}?tournamentLevel=qual",
            f"/schedule/{event}?tournamentLevel=playoff"
        ]

        # performance reasons
        async def _get_schedule(url: str) -> list[dict]:
            r = await client.get(url)
            _raise(r)
            return r.json()

        responses = await asyncio.gather(*(_get_schedule(url) for url in urls))

        schedule = responses[1].get("schedule", []) + responses[2].get("schedule", []) + responses[3].get("schedule", [])
        matches = {i.get("description", ""): i for i in responses[0].get("matches", [])}

        response = []

        for match in schedule:
            name = match.get("description", "Untitled Match")
            match_teams = {i.get("teamNumber", []): i for i in matches.get(name, {}).get("teams", [])}

            response.append({
                "name": name,
                "type": {"PRACTICE": "practice", "QUALIFICATION": "qual", "PLAYOFF": "playoff"}.get(match.get("tournamentLevel", ""), "qual"),
                "number": {
                    "id": match.get("series", 0) * 6767 + match.get("matchNumber", 0), # heheheha
                    "series": match.get("series", 0),
                    "match": match.get("matchNumber", 0)
                },
                "field": match.get("field", ""),
                "times": {
                    "scheduled": match.get("startTime", None),
                    "queuing": None, # TODO
                    "actual": matches.get(name, {}).get("actualStartTime", None),
                    "results": matches.get(name, {}).get("postResultTime", None)
                },
                "teams": [
                    {
                        "number": team.get("teamNumber", 0),
                        "name": team.get("teamName", "Untitled Team"),
                        "station": team.get("station", "Red1"),
                        "attributes": {
                            "surrogate": team.get("surrogate", False),
                            "noShow": team.get("noShow", False),
                            "dq": match_teams.get(team.get("teamNumber", 0), {}).get("disqualified", False),
                            "onField": match_teams.get(team.get("teamNumber", 0), {}).get("onField", True)
                        }
                    } for team in match.get("teams", [])
                ],
                "results": {
                    "scoreRedFinal": (scoreRedFinal := matches.get(name, {}).get("scoreRedFinal", 0)),
                    "scoreBlueFinal": (scoreBlueFinal := matches.get(name, {}).get("scoreBlueFinal", 0)),
                    "redWins": scoreRedFinal > scoreBlueFinal,
                    "blueWins": scoreBlueFinal > scoreRedFinal
                } if name in matches else None
            })

    return ScheduleResponse(schedule=response)

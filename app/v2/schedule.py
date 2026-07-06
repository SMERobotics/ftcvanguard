import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..ftc import FTCClient

from .auth import BearerAuth
from .events import get_event

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
            r.raise_for_status()
            return r.json()

        responses = await asyncio.gather(*(_get_schedule(url) for url in urls))

        # TODO: utilize with dynamic time calculation, future me problem
        # event_data = await get_event(event)

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
                    "series": match.get("series", 0),
                    "match": match.get("matchNumber", 0)
                },
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

        # qual_hybrid = {i.get("matchNumber", 0): i for i in responses[0]}
        # qual_field = {i.get("matchNumber", 0): i for i in responses[1]}
        # # NOTE: description is used as key bc playoff matches apparently all have matchNumber=1 wtaf
        # playoff_hybrid = {i.get("description", 0): i for i in responses[2]}
        # playoff_field = {i.get("description", 0): i for i in responses[3]}

        # for i in qual_hybrid.keys():
        #     if i in qual_field:
        #         qual_hybrid[i]["field"] = qual_field[i].get("field", 1)
        
        # for i in playoff_hybrid.keys():
        #     if i in playoff_field:
        #         playoff_hybrid[i]["field"] = playoff_field[i].get("field", 1)

    return ScheduleResponse(schedule=response)

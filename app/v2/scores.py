import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..ftc import FTCClient
from ..utils import _raise

from .auth import BearerAuth

scores = APIRouter(prefix="/scores")

class ScoreResponse(BaseModel):
    scores: list[dict]

@scores.get("/get")
async def _get(event: str, _payload: dict = Depends(BearerAuth)) -> ScoreResponse:
    async with FTCClient() as client:
        urls = [
            f"/scores/{event}/qual",
            f"/scores/{event}/playoff"
        ]

        async def _get_scores(url: str) -> list[dict]:
            r = await client.get(url)
            _raise(r)
            return r.json().get("matchScores", [])

        responses = await asyncio.gather(*(_get_scores(url) for url in urls))
    
    response = []

    for match in [score for response in responses for score in response]:
        response.append({
            "type": {"PRACTICE": "practice", "QUALIFICATION": "qual", "PLAYOFF": "playoff"}.get(match.get("tournamentLevel", ""), "qual"),
            "number": {
                "id": match.get("matchSeries", 0) * 6767 + match.get("matchNumber", 0), # heheheha
                "series": match.get("matchNumber", 0),
                "match": match.get("matchNumber", 0)
            },
            "attributes": {
                "randomization": match.get("randomization", 0),
            },
            "alliances": [
                {
                    "alliance": alliance.get("alliance", "Red"),
                    "team": alliance.get("team", 0), # wtf does this even mean???
                    "autoClassifiedArtifacts": alliance.get("autoClassifiedArtifacts", 0),
                    "autoOverflowArtifacts": alliance.get("autoOverflowArtifacts", 0),
                    "autoClassifierState": alliance.get("autoClassifierState", ["NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"]),
                    "robot1Auto": alliance.get("robot1Auto", False),
                    "robot2Auto": alliance.get("robot2Auto", False),
                    "autoLeavePoints": alliance.get("autoLeavePoints", 0),
                    "autoArtifactPoints": alliance.get("autoArtifactPoints", 0),
                    "autoPatternPoints": alliance.get("autoPatternPoints", 0),
                    "teleopClassifiedArtifacts": alliance.get("teleopClassifiedArtifacts", 0),
                    "teleopOverflowArtifacts": alliance.get("teleopOverflowArtifacts", 0),
                    "teleopDepotArtifacts": alliance.get("teleopDepotArtifacts", 0),
                    "teleopClassifierState": alliance.get("teleopClassifierState", ["NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"]),
                    "robot1Teleop": alliance.get("robot1Teleop", "NONE"),
                    "robot2Teleop": alliance.get("robot2Teleop", "NONE"),
                    "teleopArtifactPoints": alliance.get("teleopArtifactPoints", 0),
                    "teleopDepotPoints": alliance.get("teleopDepotPoints", 0),
                    "teleopPatternPoints": alliance.get("teleopPatternPoints", 0),
                    "teleopBasePoints": alliance.get("teleopBasePoints", 0),
                    "autoPoints": alliance.get("autoPoints", 0),
                    "teleopPoints": alliance.get("teleopPoints", 0),
                    "foulPointsCommitted": alliance.get("foulPointsCommitted", 0),
                    "preFoulTotal": alliance.get("preFoulTotal", 0),
                    "movementRP": alliance.get("movementRP", False),
                    "goalRP": alliance.get("goalRP", False),
                    "patternRP": alliance.get("patternRP", False),
                    "totalPoints": alliance.get("totalPoints", 0),
                    "majorFouls": alliance.get("majorFouls", 0),
                    "minorFouls": alliance.get("minorFouls", 0),
                } for alliance in match.get("alliances", [])
            ]
        })

    return ScoreResponse(scores=response)

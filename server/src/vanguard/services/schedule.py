import asyncio
from datetime import UTC, datetime, timedelta, tzinfo
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field

from vanguard.ftc import FTCClient

LEVELS = ("PRACTICE", "QUALIFICATION", "PLAYOFF")


class Tournament(BaseModel):
    level: Literal["PRACTICE", "QUALIFICATION", "PLAYOFF"]
    series: int = Field(ge=0)
    match: int = Field(ge=0)


class Timestamps(BaseModel):
    """Timestamps in milliseconds since the Unix epoch."""

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

    scheduled: int
    estimated: int | None
    actual: int | None
    reported_at: int | None = Field(alias="reportedAt")
    updated_at: int | None = Field(alias="updatedAt")


class Attributes(BaseModel):
    surrogate: bool
    absent: bool
    disqualified: bool | None
    participating: bool | None


class Team(BaseModel):
    number: int = Field(ge=0, le=99999)
    name: str
    attributes: Attributes


class Teams(BaseModel):
    red: list[Team]
    blue: list[Team]


class Result(BaseModel):
    score: int | None = Field(ge=0)
    win: bool | None


class Results(BaseModel):
    red: Result
    blue: Result


class Match(BaseModel):
    name: str
    field: str
    tournament: Tournament
    timestamps: Timestamps
    teams: Teams
    results: Results


class Schedule(BaseModel):
    schedule: list[Match]


def _timestamp(value: str | None, zone: tzinfo) -> int | None:
    if value is None:
        return None
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=zone)
    return (parsed.astimezone(UTC) - datetime(1970, 1, 1, tzinfo=UTC)) // timedelta(
        milliseconds=1
    )


async def get_schedule(event: str, ftc: FTCClient) -> Schedule:
    # TODO: error handling
    # TODO: when ftc api returns 404 not found, server should forward 404 not found along to the client, not 500 internal server error

    # TODO: remember, we need to tell the clients the timezone bc the api thinks its funny to return in local time instead of epoch idfk
    
    """Fetch all match levels for an event in the client's configured season."""
    event = event.upper()
    responses = await asyncio.gather(
        ftc.get("events", params={"eventCode": event}),
        *(
            ftc.get(f"schedule/{event}", params={"tournamentLevel": level})
            for level in LEVELS
        ),
        *(ftc.get(f"schedule/{event}/{level}/hybrid") for level in LEVELS[1:]),
    )
    for response in responses:
        response.raise_for_status()
    events = responses[0].json()["events"]
    if not events:
        raise ValueError(f"Event not found: {event}")
    zone = ZoneInfo(events[0]["timezone"])
    results = {
        (row["tournamentLevel"], row["series"], row["matchNumber"]): row
        for response in responses[4:]
        for row in response.json()["schedule"] or []
    }

    matches = []
    for response in responses[1:4]:
        for row in response.json()["schedule"] or []:
            key = (row["tournamentLevel"], row["series"], row["matchNumber"])
            result = results.get(key, {})
            overlays = {
                (team["station"], team["teamNumber"]): team
                for team in result.get("teams") or []
            }
            teams = {"red": [], "blue": []}
            for team in row["teams"] or []:
                team = team | overlays.get((team["station"], team["teamNumber"]), {})
                color = "red" if team["station"].startswith("Red") else "blue"
                teams[color].append(
                    Team(
                        number=team["teamNumber"],
                        name=team["teamName"],
                        attributes=Attributes(
                            surrogate=team["surrogate"],
                            absent=team["noShow"],
                            disqualified=team.get("dq"),
                            participating=team.get("onField"),
                        ),
                    )
                )
            matches.append(
                Match(
                    name=row["description"],
                    field=row["field"],
                    tournament=Tournament(level=key[0], series=key[1], match=key[2]),
                    timestamps=Timestamps(
                        scheduled=_timestamp(row["startTime"], zone),
                        estimated=None,
                        actual=_timestamp(result.get("actualStartTime"), zone),
                        reported_at=_timestamp(result.get("postResultTime"), zone),
                        # FIRST's naive modifiedOn values match UTC Last-Modified headers.
                        updated_at=_timestamp(row.get("modifiedOn"), UTC),
                    ),
                    teams=Teams(**teams),
                    results=Results(
                        **{
                            color: Result(
                                score=result.get(f"score{color.title()}Final"),
                                win=result.get(f"{color}Wins"),
                            )
                            for color in ("red", "blue")
                        }
                    ),
                )
            )
    return Schedule(schedule=matches)

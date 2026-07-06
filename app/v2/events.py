from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPStatusError
from pydantic import BaseModel

from app.database import Session, CachedFTCEventData, utc_now

from ..ftc import FTCClient

from .auth import BearerAuth

EVENT_CACHE_TTL = timedelta(hours=6)

events = APIRouter(prefix="/events")

class EventsResponse(BaseModel):
    events: list[dict]


def _raise_for_status(response) -> None:
    try:
        response.raise_for_status()
    except HTTPStatusError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        ) from None


def _convert_dict(event: CachedFTCEventData) -> dict:
    return {
        "event_code": event.event_code,
        "field_count": event.field_count,
        "type": event.type,
        "region_code": event.region_code,
        "league_code": event.league_code,
        "timezone": event.timezone,
        "date_start": event.date_start,
        "date_end": event.date_end,
    }


@events.get("/get")
async def _get(number: int, _payload: dict = Depends(BearerAuth)) -> EventsResponse:
    async with FTCClient() as client:
        r = await client.get(f"/events?teamNumber={number}")
        _raise_for_status(r)

    return EventsResponse(events=r.json().get("events", []))


async def get_event(event_code: str) -> dict | None:
    async for session in Session():
        cached = await session.get(CachedFTCEventData, event_code)
        if cached and utc_now() - cached.last_updated < EVENT_CACHE_TTL:
            return _convert_dict(cached)

        async with FTCClient() as client:
            r = await client.get(f"/events?eventCode={event_code}")
            _raise_for_status(r)

        events = r.json().get("events", [])
        if not events:
            return None

        event = events[0]
        event_data = {
            "event_code": event_code,
            "field_count": event.get("fieldCount") or 0,
            "type": event.get("type") or "",
            "region_code": event.get("regionCode") or "",
            "league_code": event.get("leagueCode") or "",
            "timezone": event.get("timezone") or "",
            "date_start": event.get("dateStart") or "",
            "date_end": event.get("dateEnd") or "",
        }

        if cached is None:
            cached = CachedFTCEventData(**event_data, last_updated=utc_now())
            session.add(cached)
        else:
            for key, value in event_data.items():
                setattr(cached, key, value)
            cached.last_updated = utc_now()

        await session.commit()
        return _convert_dict(cached)

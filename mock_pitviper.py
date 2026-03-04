import json
from datetime import datetime, timedelta

MOCK_CONFIG = {"current_match_offset": 2, "stream_url": ""}


class MockResponse:
    def __init__(self, json_data, status_code=200):
        self.json_data = json_data
        self.status_code = status_code
        self.ok = status_code == 200

    def json(self):
        return self.json_data


def generate_mock_data():
    now = datetime.now()

    schedule = []
    matches = []

    for i in range(1, 21):
        m_time = now + timedelta(minutes=(i - MOCK_CONFIG["current_match_offset"]) * 10)
        schedule.append(
            {
                "matchNumber": i,
                "description": f"Match {i}",
                "startTime": m_time.isoformat() + "Z",
                "teams": [
                    {"teamNumber": 1234, "station": "Red1"},
                    {"teamNumber": 5678, "station": "Red2"},
                    {"teamNumber": 9012, "station": "Blue1"},
                    {"teamNumber": 3456, "station": "Blue2"},
                ],
            }
        )
        matches.append(
            {
                "matchNumber": i,
                "description": f"Match {i}",
                "actualStartTime": m_time.isoformat() + "Z",
                "postResultTime": (m_time + timedelta(minutes=5)).isoformat() + "Z",
                "scoreRedFinal": 150 + i * 5,
                "scoreBlueFinal": 140 + i * 3,
                "redWins": True,
                "blueWins": False,
                "teams": schedule[-1]["teams"],
            }
        )

    rankings = [
        {
            "rank": 1,
            "teamNumber": 1234,
            "rankingScore": 2.0,
            "opr": 150.5,
            "wins": 5,
            "losses": 0,
            "ties": 0,
        },
        {
            "rank": 2,
            "teamNumber": 5678,
            "rankingScore": 1.5,
            "opr": 140.2,
            "wins": 4,
            "losses": 1,
            "ties": 0,
        },
        {
            "rank": 3,
            "teamNumber": 9012,
            "rankingScore": 1.0,
            "opr": 130.0,
            "wins": 3,
            "losses": 2,
            "ties": 0,
        },
        {
            "rank": 4,
            "teamNumber": 3456,
            "rankingScore": 0.5,
            "opr": 120.0,
            "wins": 2,
            "losses": 3,
            "ties": 0,
        },
    ]

    teams = [
        {
            "teamNumber": 1234,
            "name": "Test Team 1",
            "schoolName": "Test School",
            "city": "Test City",
            "stateProv": "CA",
            "country": "USA",
        },
        {
            "teamNumber": 5678,
            "name": "Test Team 2",
            "schoolName": "Test School",
            "city": "Test City",
            "stateProv": "CA",
            "country": "USA",
        },
        {
            "teamNumber": 9012,
            "name": "Test Team 3",
            "schoolName": "Test School",
            "city": "Test City",
            "stateProv": "CA",
            "country": "USA",
        },
        {
            "teamNumber": 3456,
            "name": "Test Team 4",
            "schoolName": "Test School",
            "city": "Test City",
            "stateProv": "CA",
            "country": "USA",
        },
    ]

    return {
        "schedule": schedule,
        "matches": matches,
        "rankings": rankings,
        "teams": teams,
    }


MOCK_DATA = generate_mock_data()
MOCK_EVENT = {
    "eventCode": "TESTPITVIPER",
    "name": "PitViper Simulator Event",
    "dateStart": (datetime.now() - timedelta(days=1)).isoformat(),
    "dateEnd": (datetime.now() + timedelta(days=1)).isoformat(),
    "venue": "Test Arena",
    "city": "Test City",
    "stateProv": "CA",
    "country": "USA",
    "webcasts": [{"type": "twitch", "channel": MOCK_CONFIG["stream_url"]}]
    if MOCK_CONFIG["stream_url"]
    else [],
}


def handle_mock_get(url):
    if "events?teamNumber=" in url:
        return None
    if "events?eventCode=TESTPITVIPER" in url:
        return MockResponse({"events": [MOCK_EVENT]})
    if "schedule/TESTPITVIPER" in url:
        global MOCK_DATA
        MOCK_DATA = generate_mock_data()
        return MockResponse({"schedule": MOCK_DATA["schedule"]})
    if "matches/TESTPITVIPER" in url:
        return MockResponse({"matches": MOCK_DATA["matches"]})
    if "rankings/TESTPITVIPER" in url:
        return MockResponse({"rankings": MOCK_DATA["rankings"]})
    if "teams?eventCode=TESTPITVIPER" in url:
        return MockResponse({"teams": MOCK_DATA["teams"]})

    return None

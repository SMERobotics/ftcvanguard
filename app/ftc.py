import httpx
import os
from datetime import date

FTC_API_USERNAME = os.getenv("FTC_API_USERNAME", "")
if not FTC_API_USERNAME:
    raise ValueError("Missing required environment variable: FTC_API_USERNAME")

FTC_API_TOKEN = os.getenv("FTC_API_TOKEN", "")
if not FTC_API_TOKEN:
    raise ValueError("Missing required environment variable: FTC_API_TOKEN")

today = date.today()
SEASON = today.year if today.month >= 9 else today.year - 1 # defaults to the current season instead of manual change
# NOTE: potentially means breaking API changes fucks us over / also means all instances need to be restarted at new season start
# not sure why i did this but oh well

class FTCClient(httpx.AsyncClient):
    def __init__(self, **kwargs):
        super().__init__(
            base_url=f"https://ftc-api.firstinspires.org/v2.0/{SEASON}",
            auth=(FTC_API_USERNAME, FTC_API_TOKEN),
            headers={"Accept": "application/json"},
            **kwargs,
        )

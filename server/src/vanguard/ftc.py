import httpx

from vanguard.config import get_settings


class FTCClient(httpx.AsyncClient):
    def __init__(self) -> None:
        settings = get_settings()
        self.season = settings.ftc_api_season
        super().__init__(
            base_url=f"https://ftc-api.firstinspires.org/v2.0/{self.season}/",
            auth=httpx.BasicAuth(
                settings.ftc_api_username, settings.ftc_api_token.get_secret_value()
            ),
            headers={"Accept": "application/json"},
        )

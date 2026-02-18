# ftcvanguard
unified ftc management infra. provide streamlined, real-time data, enabling rapid strategic insights. peak instant situational awareness, precise decisions, and ultratactical asymmetry.

## features
*   **real-time intel:** Never miss a match again. Get instant, push-notification alerts for queueing times and schedule changes directly to your device.
*   **collaborative scouting db:** Dominate the competition with a collaborative scouting database. Record and share detailed notes on every team's autonomous and teleop performance.
*   **visual performance analytics:** Visualize victory with the Insights engine. Track team performance trends over time with beautiful, interactive charts to predict match outcomes.
*   **live command and ctrl center:** Your pocket-sized mission control. Automatically detects your active event and provides instant access to up-to-the-second rankings, scores, and schedules.
*   **mobile push notifs:** Built for the pits and the stands. A lightning-fast, app-like interface designed for rapid data access on any device.
*   **secure team collab:** Unified team access with secure authentication ensures your strategic data stays private and accessible only to your alliance.

## gallery

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/ebd263c9-4a35-4783-af09-49b00bf96da6" />
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/18934e8c-0413-448e-9c28-e5cf33ccfadc" width="756" /></td>
    <td><img src="https://github.com/user-attachments/assets/6a948849-22bd-404e-984e-35ec0fdc5a89" width="1920" /></td>
  </tr>
</table>
<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/1d84212a-6ebf-4d69-91b4-b7af4d145255" />
<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/8a74ac29-2b67-4778-a063-950109a543d0" />

## setting up:
To set up Vanguard, you'll need a linux server operating system, `Docker`, and `Docker Compose`.
```yaml
services:
  ftcvanguard:
    image: milesmuehlbach/ftcvanguard:v1.0.0 # :master if you want beta
    container_name: ftcvanguard
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      PYTHONUNBUFFERED: "1"
    volumes:
      - ./data:/app/data
```
Before starting, run `mkdir data` and copy this example settings file into that directory as `settings.toml`, making sure to fill out the relevant info.
```toml
[ftc_api]
username = "GraciousProfessionalist"
token = "67676767-6767-6767-6767-676767676767"

[notifications]
ntfy_server_url = "https://ntfy.sh"
ntfy_topic = "FTC-{}"
ntfy_teams = [26855, 6547]

[server]
vanguard_url = "https://ftcvanguard.org"

[admin]
admin_teams = [26855, 6547]
# TOTP Secret for accessing the admin panel as one of the specified teams
admin_secret = "67676767676767676767676767676767"
registration_notification_url = "https://ntfy.sh/..."
```
After that, run `sudo docker compose up`, and you're good to go! Vanguard will be running on port `8000`, so feel free to expose that as you like. As vanguard does not have inbuilt ui based registration, you can register your specified admin user using `docker exec -it ftcvanguard python3 tests/register.py`

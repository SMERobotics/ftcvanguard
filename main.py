import argon2
from argon2 import PasswordHasher
from datetime import datetime, timedelta
from flask import Flask, request, send_from_directory
import jwt
import os
import pyotp
import requests
import sqlite3
import threading
import time
import tomllib

FTC_API_URL = "https://ftc-api.firstinspires.org/v2.0"
BLOCK_REGISTRATION = True
RSA_PUBLIC_KEY = ""
RSA_PRIVATE_KEY = ""

with open("./data/settings.toml", "rb") as f:
    settings = tomllib.load(f)

FTC_API_USERNAME = settings["ftc_api"]["username"]
FTC_API_TOKEN = settings["ftc_api"]["token"]
NTFY_SERVER_URL = settings["notifications"]["ntfy_server_url"]
NTFY_TOPIC = settings["notifications"]["ntfy_topic"]
NTFY_TEAMS = settings["notifications"]["ntfy_teams"]
VANGUARD_URL = settings["server"]["vanguard_url"]
ADMIN_TEAMS = settings["admin"]["admin_teams"]
ADMIN_SECRET = settings["admin"]["admin_secret"]

get_db = lambda: sqlite3.connect("data/default.db", check_same_thread=True)
get_totp = lambda: pyotp.TOTP(ADMIN_SECRET)


def get_active_event(team_id: int) -> str | None:
    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/events?teamNumber={team_id}")
    if r.status_code != 200:
        return None

    events = r.json().get("events", [])
    for event in events:
        start_date = datetime.fromisoformat(event.get("dateStart"))
        end_date = start_date + timedelta(days=4)
        if start_date <= now <= end_date:
            return event.get("code")
    return None


def get_next_match(
    schedule: list[dict], team_id: int, now: datetime
) -> tuple[str, str, datetime] | None:
    next_match: tuple[str, str, datetime] | None = None

    for i, match in enumerate(schedule):
        if not match.get("teams"):
            continue
        if not any(
            team.get("teamNumber") == team_id for team in match.get("teams", [])
        ):
            continue

        queue_time: datetime | None = None

        if match.get("matchNumber") == 1:
            queue_time = datetime.fromisoformat(match.get("startTime")) - timedelta(
                minutes=10
            )
        else:
            prev_match = None
            for prev in schedule[:i]:
                if prev.get("field") == match.get("field") and prev.get("teams"):
                    prev_match = prev
            if prev_match:
                queue_time = datetime.fromisoformat(prev_match.get("startTime"))
            else:
                queue_time = datetime.fromisoformat(match.get("startTime")) - timedelta(
                    minutes=10
                )

        if queue_time <= now:
            continue

        if next_match is None or queue_time < next_match[2]:
            next_match = (match.get("description"), match.get("field"), queue_time)

    return next_match


def send_notification(
    team_id: int, title: str, message: str, priority: int = 3, click: str = ""
):
    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        "SELECT id FROM notifications WHERE team_id = ? AND title = ? AND message = ?",
        (team_id, title, message),
    )
    if cursor.fetchone() is not None:
        cursor.close()
        db.close()
        return True

    print(f"Sending notification to team {team_id}: {title} - {message}")
    topic = NTFY_TOPIC.format(team_id)
    url = f"{NTFY_SERVER_URL}/{topic}"
    headers = {
        "Title": title,
        "Priority": str(priority),
    }
    if click:
        headers["Click"] = click

    try:
        r = requests.post(url, data=message.encode("utf-8"), headers=headers)
        if r.status_code == 200:
            sent_at = int(datetime.now().timestamp())
            cursor.execute(
                "INSERT OR IGNORE INTO notifications (team_id, title, message, sent_at) VALUES (?, ?, ?, ?)",
                (team_id, title, message, sent_at),
            )
            db.commit()
        cursor.close()
        db.close()
        return r.status_code == 200
    except Exception as e:
        print(f"Error sending notification to team {team_id}: {e}")
        cursor.close()
        db.close()
        return False


def notification_callback():
    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    for team_id in NTFY_TEAMS:
        event = get_active_event(team_id)
        if not event:
            continue

        r = s.get(f"{FTC_API_URL}/{year}/schedule/{event}?tournamentLevel=qual")
        if r.status_code != 200:
            continue
        if not r.json().get("schedule"):
            continue

        schedule_url = f"{VANGUARD_URL}/?view=schedule&event={event}"
        send_notification(
            team_id,
            "Schedule Available",
            f"Match schedule for {event} is available!",
            priority=5,
            click=schedule_url,
        )

        schedule = r.json().get("schedule", [])
        match_info = get_next_match(schedule, team_id, now)
        if not match_info:
            continue

        name, field, queue_time = match_info
        until_queue = (queue_time - now).total_seconds()

        # Extract match number from match info if possible
        match_number = None
        for match in schedule:
            if match.get("description") == name and match.get("field") == field:
                match_number = match.get("matchNumber")
                break

        match_url = f"{VANGUARD_URL}/?view=schedule&event={event}"
        if match_number:
            match_url += f"&match={match_number}"

        if 240 < until_queue <= 360:
            send_notification(
                team_id,
                "Upcoming Match",
                f"{name} on field {field} in 5 minutes. Get ready!",
                priority=3,
                click=match_url,
            )
        elif -60 <= until_queue <= 60:
            send_notification(
                team_id,
                "Match Queueing",
                f"{name} on field {field} is queueing now. Good luck!",
                priority=5,
                click=match_url,
            )


def notification_loop():
    while True:
        try:
            notification_callback()
        except Exception as e:
            print(f"Notification loop error: {e}")
        time.sleep(30)


app = Flask(__name__)

ph = PasswordHasher()
s = requests.Session()

s.auth = (FTC_API_USERNAME, FTC_API_TOKEN)

ssh_dir = os.path.expanduser("~/.ssh")
with open(os.path.join(ssh_dir, "id_rsa.pub"), "r") as f:
    RSA_PUBLIC_KEY = f.read()
with open(os.path.join(ssh_dir, "id_rsa.pem"), "r") as f:
    RSA_PRIVATE_KEY = f.read()

db = get_db()
cursor = db.cursor()
cursor.execute("PRAGMA journal_mode=WAL;")
cursor.execute(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, password TEXT)"
)

cursor.execute("""CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    subject_team_id INTEGER NOT NULL,
    auto_performance TEXT,
    teleop_performance TEXT,
    general_notes TEXT,
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, subject_team_id)
)""")
cursor.execute("""CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    UNIQUE(team_id, title, message)
)""")
cursor.execute("""CREATE TABLE IF NOT EXISTS strategy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    event_code TEXT NOT NULL,
    match_number INTEGER NOT NULL,
    match_description TEXT NOT NULL,
    phase TEXT NOT NULL,
    drawing_data TEXT,
    robots_data TEXT,
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, event_code, match_description, phase)
)""")

# Migration: add match_description column if it doesn't exist
cursor.execute("PRAGMA table_info(strategy)")
columns = [col[1] for col in cursor.fetchall()]
if "match_description" not in columns:
    print("Migrating strategy table: adding match_description column")
    cursor.execute("ALTER TABLE strategy ADD COLUMN match_description TEXT DEFAULT ''")
    # For existing rows, set match_description to "Match {match_number}" as fallback
    cursor.execute(
        "UPDATE strategy SET match_description = 'Match ' || match_number WHERE match_description = ''"
    )
    db.commit()
db.commit()
db.close()

if len(NTFY_TEAMS) > 0:
    thread = threading.Thread(target=notification_loop, daemon=True)
    thread.start()


@app.route("/", methods=["GET"])
def _root():
    return send_from_directory("static", "index.html")


@app.route("/assets/<path:path>", methods=["GET"])
def _assets(path):
    return send_from_directory("static/assets", path)


@app.route("/api/v1/register", methods=["POST"])
def _api_v1_register():
    if BLOCK_REGISTRATION:
        return {"status": "fuck", "error": "nrn try again ltr"}, 403

    data = request.json
    id = data.get("id")

    try:
        team_id = int(id)
    except ValueError:
        return {"status": "fuck", "error": "id must be int"}, 400

    password = data.get("password")
    hash = ph.hash(password)

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (team_id,))
        if cursor.fetchone() is not None:
            return {"status": "fuck", "error": "no hallucinations"}, 409

        cursor.execute(
            "INSERT INTO users (id, password) VALUES (?, ?)", (team_id, hash)
        )
        db.commit()
        cursor.close()
        db.close()
        return {"status": "success!"}, 201
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/login", methods=["POST"])
def _api_v1_login():
    data = request.json
    id = data.get("id")

    try:
        team_id = int(id)
    except ValueError:
        return {"status": "fuck", "error": "id must be int"}, 400

    password = data.get("password")

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT password FROM users WHERE id = ?", (team_id,))
        row = cursor.fetchone()

        if row is None:
            return {"status": "fuck", "error": "skibidi creds"}, 401

        stored_hash = row[0]
        ph.verify(stored_hash, password)

        token = jwt.encode(
            {
                "id": team_id,
                "scope": ["user"],
                "exp": int((datetime.now() + timedelta(hours=24)).timestamp()),
            },
            RSA_PRIVATE_KEY,
            algorithm="RS256",
        )
        cursor.close()
        db.close()
        return {"status": "success!", "token": token}, 200
    except argon2.exceptions.VerifyMismatchError:
        return {"status": "fuck", "error": "skibidi creds"}, 401
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/verify", methods=["GET"])
def _api_v1_verify():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        return {
            "status": "success!",
            "scope": payload.get("scope"),
            "id": payload.get("id"),
        }, 200
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401


@app.route("/api/v1/events", methods=["GET"])
def _api_v1_events():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401

    # fetch events from FTC API

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/events?teamNumber={team_id}")
    return r.json(), r.status_code


@app.route("/api/v1/event", methods=["GET"])
def _api_v1_event():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401

    # fetch event from FTC API

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/events?eventCode={event}")
    return r.json(), r.status_code


@app.route("/api/v1/schedule", methods=["GET"])
def _api_v1_schedule():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401

    # fetch schedule from FTC API

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    # Fetch both qual and playoff schedules and merge them
    qual_url = f"{FTC_API_URL}/{year}/schedule/{event}?tournamentLevel=qual"
    playoff_url = f"{FTC_API_URL}/{year}/schedule/{event}?tournamentLevel=playoff"

    qual_res = s.get(qual_url)
    playoff_res = s.get(playoff_url)

    qual_schedule = []
    playoff_schedule = []

    if qual_res.status_code == 200:
        qual_data = qual_res.json()
        qual_schedule = qual_data.get("schedule", [])

    if playoff_res.status_code == 200:
        playoff_data = playoff_res.json()
        playoff_schedule = playoff_data.get("schedule", [])

    merged_schedule = qual_schedule + playoff_schedule

    return {"schedule": merged_schedule}, 200


@app.route("/api/v1/matches", methods=["GET"])
def _api_v1_matches():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    if not event:
        return {"status": "fuck", "error": "missing event"}, 400

    level = request.args.get("level")
    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    url = f"{FTC_API_URL}/{year}/matches/{event}"
    params = []
    if level:
        params.append(f"tournamentLevel={level}")
    if params:
        url = f"{url}?{'&'.join(params)}"

    r = s.get(url)
    return r.json(), r.status_code


@app.route("/api/v1/scores/<event>/<level>", methods=["GET"])
def _api_v1_scores(event, level):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/scores/{event}/{level}")
    return r.json(), r.status_code


@app.route("/api/v1/team/<int:team_number>/events", methods=["GET"])
def _api_v1_team_events(team_number):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/events?teamNumber={team_number}")
    return r.json(), r.status_code


@app.route("/api/v1/rankings", methods=["GET"])
def _api_v1_rankings():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401

    # fetch rankings from FTC API using event rankings

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    if not event:
        return {"status": "fuck", "error": "missing event"}, 400

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/rankings/{event}")
    return r.json(), r.status_code


@app.route("/api/v1/teams", methods=["GET"])
def _api_v1_teams():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/teams?eventCode={event}")
    return r.json(), r.status_code


@app.route("/api/v1/team/<int:team_number>", methods=["GET"])
def _api_v1_team_info(team_number):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    now = datetime.now() - timedelta(weeks=34)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/teams?teamNumber={team_number}")
    return r.json(), r.status_code


@app.route("/api/v1/notes", methods=["GET"])
def _api_v1_notes_get():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    subject_team_id = request.args.get("team")
    if not subject_team_id:
        return {"status": "fuck", "error": "missing team parameter"}, 400

    try:
        subject_team_id = int(subject_team_id)
    except ValueError:
        return {"status": "fuck", "error": "team must be integer"}, 400

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """SELECT auto_performance, teleop_performance, general_notes, updated_at 
               FROM notes WHERE team_id = ? AND subject_team_id = ?""",
            (team_id, subject_team_id),
        )
        row = cursor.fetchone()
        cursor.close()
        db.close()

        if row is None:
            return {
                "status": "success",
                "notes": {
                    "autoPerformance": "",
                    "teleopPerformance": "",
                    "generalNotes": "",
                    "updatedAt": None,
                },
            }, 200

        return {
            "status": "success",
            "notes": {
                "autoPerformance": row[0] or "",
                "teleopPerformance": row[1] or "",
                "generalNotes": row[2] or "",
                "updatedAt": row[3],
            },
        }, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/notes", methods=["POST"])
def _api_v1_notes_post():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    data = request.json
    if not data:
        return {"status": "fuck", "error": "missing request body"}, 400

    try:
        subject_team_id = int(data.get("subjectTeamId"))
        auto_performance = data.get("autoPerformance", "")
        teleop_performance = data.get("teleopPerformance", "")
        general_notes = data.get("generalNotes", "")
    except (ValueError, TypeError) as e:
        print(f"Invalid request data: {e}")
        return {"status": "fuck", "error": "invalid request data"}, 400

    try:
        db = get_db()
        cursor = db.cursor()
        updated_at = int(datetime.now().timestamp())

        cursor.execute(
            """INSERT INTO notes (team_id, subject_team_id, auto_performance, teleop_performance, general_notes, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(team_id, subject_team_id) 
               DO UPDATE SET auto_performance=?, teleop_performance=?, general_notes=?, updated_at=?""",
            (
                team_id,
                subject_team_id,
                auto_performance,
                teleop_performance,
                general_notes,
                updated_at,
                auto_performance,
                teleop_performance,
                general_notes,
                updated_at,
            ),
        )
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success", "updatedAt": updated_at}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/notes/list", methods=["GET"])
def _api_v1_notes_list():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """SELECT subject_team_id, updated_at FROM notes 
               WHERE team_id = ?""",
            (team_id,),
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        notes_status = {}
        for row in rows:
            notes_status[row[0]] = row[1]

        return {"status": "success", "notesStatus": notes_status}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/strategy", methods=["GET"])
def _api_v1_strategy_get():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    event_code = request.args.get("event")
    match_number = request.args.get("match")
    match_description = request.args.get("description")
    phase = request.args.get("phase")

    if not event_code or not match_number or not match_description or not phase:
        return {"status": "fuck", "error": "missing params"}, 400

    try:
        match_number = int(match_number)
    except ValueError:
        return {"status": "fuck", "error": "match must be int"}, 400

    if phase not in ("auto", "teleop", "endgame"):
        return {"status": "fuck", "error": "invalid phase"}, 400

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """SELECT drawing_data, robots_data, updated_at
               FROM strategy WHERE team_id = ? AND event_code = ? AND match_description = ? AND phase = ?""",
            (team_id, event_code, match_description, phase),
        )
        row = cursor.fetchone()
        cursor.close()
        db.close()

        if row is None:
            return {
                "status": "success",
                "strategy": {
                    "drawingData": None,
                    "robotsData": None,
                    "updatedAt": None,
                },
            }, 200

        return {
            "status": "success",
            "strategy": {
                "drawingData": row[0],
                "robotsData": row[1],
                "updatedAt": row[2],
            },
        }, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/strategy", methods=["POST"])
def _api_v1_strategy_post():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    data = request.json
    if not data:
        return {"status": "fuck", "error": "missing request body"}, 400

    try:
        event_code = data.get("eventCode")
        match_number = int(data.get("matchNumber"))
        match_description = data.get("matchDescription")
        phase = data.get("phase")
        drawing_data = data.get("drawingData")
        robots_data = data.get("robotsData")
    except (ValueError, TypeError) as e:
        print(f"Invalid strategy data: {e}")
        return {"status": "fuck", "error": "invalid request data"}, 400

    if not event_code or not match_description or not phase:
        return {"status": "fuck", "error": "missing required fields"}, 400

    if phase not in ("auto", "teleop", "endgame"):
        return {"status": "fuck", "error": "invalid phase"}, 400

    try:
        db = get_db()
        cursor = db.cursor()
        updated_at = int(datetime.now().timestamp())

        cursor.execute(
            """INSERT INTO strategy (team_id, event_code, match_number, match_description, phase, drawing_data, robots_data, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(team_id, event_code, match_description, phase)
               DO UPDATE SET drawing_data=?, robots_data=?, updated_at=?""",
            (
                team_id,
                event_code,
                match_number,
                match_description,
                phase,
                drawing_data,
                robots_data,
                updated_at,
                drawing_data,
                robots_data,
                updated_at,
            ),
        )
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success", "updatedAt": updated_at}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/self", methods=["GET"])
def _api_v1_admin_teams():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    if team_id in ADMIN_TEAMS:
        return {"status": "success", "message": "you're chill"}, 200

    return {"status": "fuck", "error": "unauthorized"}, 403


@app.route("/api/v1/admin/login", methods=["GET"])
def _api_v1_admin_login():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    if team_id not in ADMIN_TEAMS:
        return {"status": "fuck", "error": "unauthorized"}, 403

    try:
        otp = int(request.args.get("otp"))

        if otp < 0 or otp > 999999:
            raise ValueError("OTP must be a 6-digit number")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    totp = get_totp()
    if not totp.verify(otp, valid_window=1):
        return {"status": "fuck", "error": "unauthorized"}, 403

    token = jwt.encode(
        {
            "id": team_id,
            "scope": ["user", "admin"],
            "exp": int((datetime.now() + timedelta(hours=24)).timestamp()),
        },
        RSA_PRIVATE_KEY,
        algorithm="RS256",
    )
    return {"status": "success!", "token": token}, 200


@app.route("/api/v1/admin/stats", methods=["GET"])
def _api_v1_admin_stats():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM notes")
        total_notes = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM notifications")
        total_notifications = cursor.fetchone()[0]

        cursor.execute(
            "SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()"
        )
        db_size = cursor.fetchone()[0]

        cursor.close()
        db.close()

        return {
            "status": "success",
            "stats": {
                "totalUsers": total_users,
                "totalNotes": total_notes,
                "totalNotifications": total_notifications,
                "databaseSize": db_size,
            },
        }, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/users", methods=["GET"])
def _api_v1_admin_users():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users ORDER BY id ASC")
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        users = [{"id": row[0]} for row in rows]
        return {"status": "success", "users": users}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/users", methods=["POST"])
def _api_v1_admin_create_user():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    data = request.json
    team_id = data.get("id")
    password = data.get("password")

    if not team_id or not password:
        return {"status": "fuck", "error": "missing id or password"}, 400

    try:
        team_id = int(team_id)
    except ValueError:
        return {"status": "fuck", "error": "id must be int"}, 400

    try:
        hash = ph.hash(password)
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT id FROM users WHERE id = ?", (team_id,))
        if cursor.fetchone() is not None:
            return {"status": "fuck", "error": "user already exists"}, 409

        cursor.execute(
            "INSERT INTO users (id, password) VALUES (?, ?)", (team_id, hash)
        )
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 201
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/users/<int:user_id>", methods=["DELETE"])
def _api_v1_admin_delete_user(user_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/users/<int:user_id>/password", methods=["PUT"])
def _api_v1_admin_reset_password(user_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    data = request.json
    password = data.get("password")

    if not password:
        return {"status": "fuck", "error": "missing password"}, 400

    try:
        hash = ph.hash(password)
        db = get_db()
        cursor = db.cursor()
        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hash, user_id))
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/notes", methods=["GET"])
def _api_v1_admin_notes():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT id, team_id, subject_team_id, auto_performance, teleop_performance, general_notes, updated_at 
            FROM notes 
            ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        notes = [
            {
                "id": row[0],
                "teamId": row[1],
                "subjectTeamId": row[2],
                "autoPerformance": row[3] or "",
                "teleopPerformance": row[4] or "",
                "generalNotes": row[5] or "",
                "updatedAt": row[6],
            }
            for row in rows
        ]

        return {"status": "success", "notes": notes}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/notes/<int:note_id>", methods=["DELETE"])
def _api_v1_admin_delete_note(note_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/notifications", methods=["GET"])
def _api_v1_admin_notifications():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT id, team_id, title, message, sent_at 
            FROM notifications 
            ORDER BY sent_at DESC
            LIMIT 100
        """)
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        notifications = [
            {
                "id": row[0],
                "teamId": row[1],
                "title": row[2],
                "message": row[3],
                "sentAt": row[4],
            }
            for row in rows
        ]

        return {"status": "success", "notifications": notifications}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/notifications", methods=["POST"])
def _api_v1_admin_send_notification():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    data = request.json
    team_id = data.get("teamId")
    title = data.get("title")
    message = data.get("message")
    priority = data.get("priority", 3)

    if not team_id or not title or not message:
        return {"status": "fuck", "error": "missing required fields"}, 400

    try:
        team_id = int(team_id)
        priority = int(priority)
    except ValueError:
        return {"status": "fuck", "error": "invalid data"}, 400

    success = send_notification(team_id, title, message, priority)

    if success:
        return {"status": "success"}, 200
    else:
        return {"status": "fuck", "error": "failed to send"}, 500


@app.route("/api/v1/admin/notifications/clear", methods=["DELETE"])
def _api_v1_admin_clear_notifications():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM notifications")
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


@app.route("/api/v1/admin/database/vacuum", methods=["POST"])
def _api_v1_admin_vacuum():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": "fuck", "error": "no auth"}, 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        if "admin" not in payload.get("scope", []):
            return {"status": "fuck", "error": "unauthorized"}, 403
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("VACUUM")
        db.commit()
        cursor.close()
        db.close()

        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

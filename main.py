import argon2
from argon2 import PasswordHasher
from datetime import datetime, timedelta
from flask import Flask, request, send_from_directory
import jwt
import os
import requests
import sqlite3
import threading
import time
import tomllib

FTC_API_URL = "https://ftc-api.firstinspires.org/v2.0"
BLOCK_REGISTRATION = True
RSA_PUBLIC_KEY = ""
RSA_PRIVATE_KEY = ""

with open("settings.toml", "rb") as f:
    settings = tomllib.load(f)

FTC_API_USERNAME = settings["ftc_api"]["username"]
FTC_API_TOKEN = settings["ftc_api"]["token"]
NTFY_SERVER_URL = settings["notifications"]["ntfy_server_url"]
NTFY_TOPIC = settings["notifications"]["ntfy_topic"]
NTFY_TEAMS = settings["notifications"]["ntfy_teams"]
VANGUARD_URL = settings["server"]["vanguard_url"]
ADMIN_PASSWORD = settings["admin"]["password"]
MAX_FAILED_ATTEMPTS = settings["admin"]["max_failed_attempts"]
LOCKOUT_DURATION_MINUTES = settings["admin"]["lockout_duration_minutes"]

# Admin session storage (in production, use Redis or database)
admin_sessions = {}
failed_attempts = {}  # ip -> (count, lockout_until)

get_db = lambda: sqlite3.connect("default.db", check_same_thread=True)

def get_active_event(team_id: int) -> str | None:
    now = datetime.now() - timedelta(weeks=26)
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

def get_next_match(schedule: list[dict], team_id: int, now: datetime) -> tuple[str, str, datetime] | None:
    next_match: tuple[str, str, datetime] | None = None

    for i, match in enumerate(schedule):
        if not match.get("teams"):
            continue
        if not any(team.get("teamNumber") == team_id for team in match.get("teams", [])):
            continue

        queue_time: datetime | None = None

        if match.get("matchNumber") == 1:
            queue_time = datetime.fromisoformat(match.get("startTime")) - timedelta(minutes=10)
        else:
            prev_match = None
            for prev in schedule[:i]:
                if prev.get("field") == match.get("field") and prev.get("teams"):
                    prev_match = prev
            if prev_match:
                queue_time = datetime.fromisoformat(prev_match.get("startTime"))
            else:
                queue_time = datetime.fromisoformat(match.get("startTime")) - timedelta(minutes=10)

        if queue_time <= now:
            continue

        if next_match is None or queue_time < next_match[2]:
            next_match = (match.get("description"), match.get("field"), queue_time)

    return next_match

def send_notification(team_id: int, title: str, message: str, priority: int=3, click: str=""):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute(
        "SELECT id FROM notifications WHERE team_id = ? AND title = ? AND message = ?",
        (team_id, title, message)
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
                (team_id, title, message, sent_at)
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
    now = datetime.now() - timedelta(weeks=26)
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
        send_notification(team_id, "Schedule Available", f"Match schedule for {event} is available!", priority=5, click=schedule_url)

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
            click=match_url
            )
        elif -60 <= until_queue <= 60:
            send_notification(
            team_id,
            "Match Queueing",
            f"{name} on field {field} is queueing now. Good luck!",
            priority=5,
            click=match_url
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
cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, password TEXT)")

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
cursor.execute("""CREATE TABLE IF NOT EXISTS admin_login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    login_time INTEGER NOT NULL,
    success INTEGER NOT NULL
)""")
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
        
        cursor.execute("INSERT INTO users (id, password) VALUES (?, ?)", (team_id, hash))
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

        token = jwt.encode({"id": team_id, "exp": int((datetime.now() + timedelta(hours=24)).timestamp())}, RSA_PRIVATE_KEY, algorithm="RS256")
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
        return {"status": "success!", "id": payload.get("id")}, 200
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

    now = datetime.now() - timedelta(weeks=26)
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

    now = datetime.now() - timedelta(weeks=26)
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

    level = request.args.get("level") or "qual"

    now = datetime.now() - timedelta(weeks=26)
    year = now.year
    
    params = []
    if level:
        params.append(f"tournamentLevel={level}")

    url = f"{FTC_API_URL}/{year}/schedule/{event}"
    if params:
        url = f"{url}?{'&'.join(params)}"

    r = s.get(url)
    return r.json(), r.status_code

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
    now = datetime.now() - timedelta(weeks=26)
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

    now = datetime.now() - timedelta(weeks=26)
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

    now = datetime.now() - timedelta(weeks=26)
    year = now.year
    
    r = s.get(f"{FTC_API_URL}/{year}/events?teamNumber={team_number}")
    return r.json(), r.status_code

@app.route("/api/v1/team/<int:team_number>/info", methods=["GET"])
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

    now = datetime.now() - timedelta(weeks=26)
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/teams?teamNumber={team_number}")
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
    
    # fetch rankings from FTC API

    try:
        region = request.args.get("region")
        league = request.args.get("league")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    now = datetime.now() - timedelta(weeks=26)
    year = now.year
    
    r = s.get(f"{FTC_API_URL}/{year}/leagues/rankings/{region}/{league}")
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
    
    now = datetime.now() - timedelta(weeks=26)
    year = now.year
    
    r = s.get(f"{FTC_API_URL}/{year}/teams?eventCode={event}")
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
            (team_id, subject_team_id)
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
                    "updatedAt": None
                }
            }, 200
        
        return {
            "status": "success",
            "notes": {
                "autoPerformance": row[0] or "",
                "teleopPerformance": row[1] or "",
                "generalNotes": row[2] or "",
                "updatedAt": row[3]
            }
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
            (team_id, subject_team_id, auto_performance, teleop_performance, general_notes, updated_at,
             auto_performance, teleop_performance, general_notes, updated_at)
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
            (team_id,)
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

# Admin Authentication Functions
def get_client_ip():
    """Get the real client IP address"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def log_admin_login(ip_address, success):
    """Log admin login attempts to database"""
    try:
        db = get_db()
        cursor = db.cursor()
        user_agent = request.headers.get('User-Agent', 'Unknown')
        timestamp = int(time.time())
        cursor.execute(
            "INSERT INTO admin_login_logs (ip_address, user_agent, login_time, success) VALUES (?, ?, ?, ?)",
            (ip_address, user_agent, timestamp, 1 if success else 0)
        )
        db.commit()
        cursor.close()
        db.close()
    except Exception as e:
        print(f"Failed to log admin login: {e}")

def is_ip_locked_out(ip_address):
    """Check if IP is currently locked out"""
    if ip_address in failed_attempts:
        count, lockout_until = failed_attempts[ip_address]
        if lockout_until and time.time() < lockout_until:
            return True, lockout_until
        # Lockout expired, clear it
        if lockout_until and time.time() >= lockout_until:
            failed_attempts[ip_address] = (0, None)
    return False, None

def record_failed_attempt(ip_address):
    """Record a failed login attempt and potentially lock out the IP"""
    if ip_address not in failed_attempts:
        failed_attempts[ip_address] = (1, None)
    else:
        count, _ = failed_attempts[ip_address]
        count += 1
        if count >= MAX_FAILED_ATTEMPTS:
            lockout_until = time.time() + (LOCKOUT_DURATION_MINUTES * 60)
            failed_attempts[ip_address] = (count, lockout_until)
        else:
            failed_attempts[ip_address] = (count, None)

def clear_failed_attempts(ip_address):
    """Clear failed attempts for an IP on successful login"""
    if ip_address in failed_attempts:
        failed_attempts[ip_address] = (0, None)

def verify_admin_session():
    """Verify admin session token"""
    token = request.headers.get('X-Admin-Token') or request.cookies.get('admin_token')
    if not token or token not in admin_sessions:
        return False
    # Check if session is still valid (24 hour expiry)
    session_data = admin_sessions[token]
    if time.time() > session_data['expires']:
        del admin_sessions[token]
        return False
    return True

def require_admin_auth(f):
    """Decorator to require admin authentication"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not verify_admin_session():
            return {"status": "fuck", "error": "unauthorized"}, 401
        return f(*args, **kwargs)
    return decorated_function

@app.route("/admin", methods=["GET"])
def _admin():
    return send_from_directory("static", "admin.html")

# Admin Authentication Endpoints
@app.route("/api/v1/admin/auth/login", methods=["POST"])
def _api_v1_admin_login():
    ip_address = get_client_ip()

    # Check if IP is locked out
    locked, lockout_until = is_ip_locked_out(ip_address)
    if locked:
        remaining = int((lockout_until - time.time()) / 60)
        log_admin_login(ip_address, False)
        return {
            "status": "fuck",
            "error": f"Too many failed attempts. Locked out for {remaining} more minutes."
        }, 429

    data = request.json
    password = data.get("password")

    if not password:
        return {"status": "fuck", "error": "password required"}, 400

    if password == ADMIN_PASSWORD:
        # Generate session token
        import secrets
        token = secrets.token_urlsafe(32)
        admin_sessions[token] = {
            'ip': ip_address,
            'created': time.time(),
            'expires': time.time() + (24 * 60 * 60)  # 24 hours
        }

        # Clear failed attempts and log success
        clear_failed_attempts(ip_address)
        log_admin_login(ip_address, True)

        return {
            "status": "success",
            "token": token
        }, 200
    else:
        # Record failed attempt and log
        record_failed_attempt(ip_address)
        log_admin_login(ip_address, False)

        # Check if this failed attempt triggered a lockout
        locked, lockout_until = is_ip_locked_out(ip_address)
        if locked:
            remaining = int((lockout_until - time.time()) / 60)
            return {
                "status": "fuck",
                "error": f"Too many failed attempts. Locked out for {remaining} minutes."
            }, 429

        # Show how many attempts remain
        count, _ = failed_attempts.get(ip_address, (0, None))
        remaining_attempts = MAX_FAILED_ATTEMPTS - count
        return {
            "status": "fuck",
            "error": f"Invalid password. {remaining_attempts} attempts remaining."
        }, 401

@app.route("/api/v1/admin/auth/logout", methods=["POST"])
def _api_v1_admin_logout():
    token = request.headers.get('X-Admin-Token') or request.cookies.get('admin_token')
    if token and token in admin_sessions:
        del admin_sessions[token]
    return {"status": "success"}, 200

@app.route("/api/v1/admin/auth/verify", methods=["GET"])
def _api_v1_admin_verify():
    if verify_admin_session():
        return {"status": "success", "authenticated": True}, 200
    return {"status": "success", "authenticated": False}, 200

@app.route("/api/v1/admin/auth/logs", methods=["GET"])
@require_admin_auth
def _api_v1_admin_auth_logs():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """SELECT ip_address, user_agent, login_time, success
               FROM admin_login_logs
               ORDER BY login_time DESC
               LIMIT 100"""
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        logs = [{
            "ip_address": row[0],
            "user_agent": row[1],
            "login_time": row[2],
            "success": bool(row[3])
        } for row in rows]

        return {"status": "success", "logs": logs}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

# Admin API endpoints (all require authentication)
@app.route("/api/v1/admin/stats", methods=["GET"])
@require_admin_auth
def _api_v1_admin_stats():
    try:
        db = get_db()
        cursor = db.cursor()

        # Count users
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        # Count notes
        cursor.execute("SELECT COUNT(*) FROM notes")
        total_notes = cursor.fetchone()[0]

        # Count notifications
        cursor.execute("SELECT COUNT(*) FROM notifications")
        total_notifications = cursor.fetchone()[0]

        # Get database size
        cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
        db_size_bytes = cursor.fetchone()[0]
        db_size = f"{db_size_bytes / 1024 / 1024:.2f} MB"

        cursor.close()
        db.close()

        return {
            "status": "success",
            "stats": {
                "totalUsers": total_users,
                "totalNotes": total_notes,
                "totalNotifications": total_notifications,
                "dbSize": db_size
            }
        }, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/users", methods=["GET"])
@require_admin_auth
def _api_v1_admin_users_list():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users ORDER BY id")
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        users = [{"id": row[0]} for row in rows]
        return {"status": "success", "users": users}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/teams", methods=["GET"])
@require_admin_auth
def _api_v1_admin_teams():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users ORDER BY id")
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        if not rows:
            return {"status": "success", "teams": []}, 200

        # Fetch team details from FTC API
        now = datetime.now() - timedelta(weeks=26)
        year = now.year
        teams = []

        for row in rows:
            team_id = row[0]
            try:
                r = s.get(f"{FTC_API_URL}/{year}/teams?teamNumber={team_id}")
                if r.status_code == 200:
                    data = r.json()
                    if data.get("teams") and len(data["teams"]) > 0:
                        team_info = data["teams"][0]
                        teams.append({
                            "teamNumber": team_info.get("teamNumber"),
                            "nameShort": team_info.get("nameShort"),
                            "nameFull": team_info.get("nameFull"),
                            "schoolName": team_info.get("schoolName"),
                            "city": team_info.get("city"),
                            "stateProv": team_info.get("stateProv"),
                            "country": team_info.get("country")
                        })
                    else:
                        teams.append({
                            "teamNumber": team_id,
                            "nameShort": "Unknown",
                            "nameFull": "Unknown",
                            "schoolName": "Unknown",
                            "city": "Unknown",
                            "stateProv": "Unknown",
                            "country": "Unknown"
                        })
            except Exception as e:
                print(f"Error fetching team {team_id}: {e}")
                teams.append({
                    "teamNumber": team_id,
                    "nameShort": "Error",
                    "nameFull": "Error",
                    "schoolName": "Error",
                    "city": "Error",
                    "stateProv": "Error",
                    "country": "Error"
                })

        return {"status": "success", "teams": teams}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/users", methods=["POST"])
@require_admin_auth
def _api_v1_admin_users_create():
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
            cursor.close()
            db.close()
            return {"status": "fuck", "error": "user already exists"}, 409

        cursor.execute("INSERT INTO users (id, password) VALUES (?, ?)", (team_id, hash))
        db.commit()
        cursor.close()
        db.close()
        return {"status": "success"}, 201
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/users/<int:user_id>", methods=["DELETE"])
@require_admin_auth
def _api_v1_admin_users_delete(user_id):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

        # Also delete all notes created by this user
        cursor.execute("DELETE FROM notes WHERE team_id = ?", (user_id,))
        db.commit()

        cursor.close()
        db.close()
        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/users/<int:user_id>/password", methods=["PUT"])
@require_admin_auth
def _api_v1_admin_users_password(user_id):
    data = request.json
    password = data.get("password")

    if not password:
        return {"status": "fuck", "error": "password required"}, 400

    hash = ph.hash(password)

    try:
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

@app.route("/api/v1/admin/notes/<int:team_id>", methods=["GET"])
@require_admin_auth
def _api_v1_admin_notes_get(team_id):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """SELECT subject_team_id, auto_performance, teleop_performance, general_notes, updated_at
               FROM notes WHERE team_id = ? ORDER BY subject_team_id""",
            (team_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        notes = [{
            "subject_team_id": row[0],
            "auto_performance": row[1],
            "teleop_performance": row[2],
            "general_notes": row[3],
            "updated_at": row[4]
        } for row in rows]

        return {"status": "success", "notes": notes}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/notes/<int:team_id>", methods=["DELETE"])
@require_admin_auth
def _api_v1_admin_notes_delete(team_id):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM notes WHERE team_id = ?", (team_id,))
        db.commit()
        cursor.close()
        db.close()
        return {"status": "success"}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/notifications", methods=["GET"])
@require_admin_auth
def _api_v1_admin_notifications_get():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT team_id, title, message, sent_at FROM notifications ORDER BY sent_at DESC LIMIT 100"
        )
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        notifications = [{
            "team_id": row[0],
            "title": row[1],
            "message": row[2],
            "sent_at": row[3]
        } for row in rows]

        return {"status": "success", "notifications": notifications}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/notifications", methods=["POST"])
@require_admin_auth
def _api_v1_admin_notifications_send():
    data = request.json
    team_id = data.get("teamId")
    title = data.get("title")
    message = data.get("message")

    if not title or not message:
        return {"status": "fuck", "error": "title and message required"}, 400

    try:
        if team_id:
            # Send to specific team
            success = send_notification(team_id, title, message, priority=4, click=VANGUARD_URL)
            if success:
                return {"status": "success"}, 200
            else:
                return {"status": "fuck", "error": "failed to send"}, 500
        else:
            # Send to all monitored teams
            sent_count = 0
            for tid in NTFY_TEAMS:
                if send_notification(tid, title, message, priority=4, click=VANGUARD_URL):
                    sent_count += 1
            return {"status": "success", "sent": sent_count}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": "idk"}, 500

@app.route("/api/v1/admin/notifications", methods=["DELETE"])
@require_admin_auth
def _api_v1_admin_notifications_clear():
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

@app.route("/api/v1/admin/database/backup", methods=["POST"])
@require_admin_auth
def _api_v1_admin_database_backup():
    try:
        import shutil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"default_backup_{timestamp}.db"
        shutil.copy2("default.db", filename)
        return {"status": "success", "filename": filename}, 200
    except Exception as e:
        print(e)
        return {"status": "fuck", "error": str(e)}, 500

@app.route("/api/v1/admin/database/vacuum", methods=["POST"])
@require_admin_auth
def _api_v1_admin_database_vacuum():
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
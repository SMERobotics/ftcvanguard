import argon2
from argon2 import PasswordHasher
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, request, send_from_directory
import jwt
import os
import requests
import sqlite3

FTC_API_URL = "https://ftc-api.firstinspires.org/v2.0"
BLOCK_REGISTRATION = True
RSA_PUBLIC_KEY = ""
RSA_PRIVATE_KEY = ""

app = Flask(__name__)

load_dotenv()
FTC_API_USERNAME = os.getenv("FTC_API_USERNAME")
FTC_API_TOKEN = os.getenv("FTC_API_TOKEN")

ph = PasswordHasher()
s = requests.Session()

s.auth = (FTC_API_USERNAME, FTC_API_TOKEN)

def get_db():
    """Get a thread-local database connection"""
    db = sqlite3.connect("default.db", check_same_thread=True)
    return db

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

    now = datetime.now()
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

    now = datetime.now()
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
        payload = jwt.decode(token, RSA_PUBLIC_KEY, algorithms=["RS256"])
        team_id = payload.get("id")
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except:
        return {"status": "fuck", "error": "invalid token"}, 401
    
    # fetch schedule from FTC API

    try:
        event = request.args.get("event")
    except:
        return {"status": "fuck", "error": "bad request"}, 400

    now = datetime.now()
    year = now.year
    
    r = s.get(f"{FTC_API_URL}/{year}/schedule/{event}?teamNumber={team_id}")
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

    now = datetime.now()
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
    
    now = datetime.now()
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

if __name__ == "__main__":
    ssh_dir = os.path.expanduser("~/.ssh")
    with open(os.path.join(ssh_dir, "id_rsa.pub"), "r") as f:
        RSA_PUBLIC_KEY = f.read()
    with open(os.path.join(ssh_dir, "id_rsa.pem"), "r") as f:
        RSA_PRIVATE_KEY = f.read()
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, password TEXT)")
    
    # Create new notes table with updated schema (no event_code)
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
    db.commit()
    db.close()

    app.run(host="0.0.0.0", port=8080)
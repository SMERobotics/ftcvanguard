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
db = sqlite3.connect("default.db", check_same_thread=False)

s.auth = (FTC_API_USERNAME, FTC_API_TOKEN)

@app.route("/", methods=["GET"])
def _root():
    return send_from_directory("static", "index.html")

@app.route("/assets/<path:path>", methods=["GET"])
def _assets(path):
    return send_from_directory("static/assets", path)

@app.route("/login", methods=["GET"])
def _login():
    return send_from_directory("static", "login.html")

@app.route("/form", methods=["GET"])
def _form():
    return send_from_directory("static", "form.html")

@app.route("/schedule", methods=["GET"])
def _schedule():
    return send_from_directory("static", "schedule.html")

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
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (team_id,))
        if cursor.fetchone() is not None:
            return {"status": "fuck", "error": "no hallucinations"}, 409
        
        cursor.execute("INSERT INTO users (id, password) VALUES (?, ?)", (team_id, hash))
        db.commit()
        cursor.close()
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
        cursor = db.cursor()
        cursor.execute("SELECT password FROM users WHERE id = ?", (team_id,))
        row = cursor.fetchone()

        if row is None:
            return {"status": "fuck", "error": "skibidi creds"}, 401

        stored_hash = row[0]
        ph.verify(stored_hash, password)

        token = jwt.encode({"id": team_id, "exp": int((datetime.now() + timedelta(hours=24)).timestamp())}, RSA_PRIVATE_KEY, algorithm="RS256")
        cursor.close()
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
        return {"status": "success!"}, 200
    except jwt.ExpiredSignatureError:
        return {"status": "fuck", "error": "token expired"}, 401
    except jwt.InvalidTokenError:
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
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401
    
    # fetch events from FTC API

    now = datetime.now()
    year = now.year

    r = s.get(f"{FTC_API_URL}/{year}/events?teamNumber={team_id}")
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
    except jwt.InvalidTokenError:
        return {"status": "fuck", "error": "invalid token"}, 401
    
    # fetch schedule from FTC API

    now = datetime.now()
    year = now.year
    event = request.args.get("event")
    
    r = s.get(f"{FTC_API_URL}/{year}/schedule/{event}?teamNumber={team_id}")
    return r.json(), r.status_code

if __name__ == "__main__":
    ssh_dir = os.path.expanduser("~/.ssh")
    with open(os.path.join(ssh_dir, "id_rsa.pub"), "r") as f:
        RSA_PUBLIC_KEY = f.read()
    with open(os.path.join(ssh_dir, "id_rsa.pem"), "r") as f:
        RSA_PRIVATE_KEY = f.read()
    
    cursor = db.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, password TEXT)")
    db.commit()

    app.run(host="0.0.0.0", port=8080)
    db.close()
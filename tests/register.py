#!/usr/bin/env python3
"""
Quick helper to insert a new user directly into the SQLite DB used by the app.
This does NOT call the API — it opens `default.db` and inserts a row into `users`.

Usage: python tests/register_user.py

It prompts for a numeric team id and a password, hashes the password with argon2,
and inserts into `users (id, password)`.
"""

import sqlite3
import getpass
import sys

try:
    from argon2 import PasswordHasher
except Exception as e:
    print("Missing dependency 'argon2-cffi'. Install with: pip install argon2-cffi")
    raise

DB_PATH = "default.db"


def main():
    print("Register a new user directly in the database (no API call).")

    try:
        team_id_raw = input("Team ID (integer): ").strip()
        team_id = int(team_id_raw)
    except ValueError:
        print("Invalid team id. Must be an integer.")
        sys.exit(1)

    password = getpass.getpass("Password: ")
    password_confirm = getpass.getpass("Confirm Password: ")
    if password != password_confirm:
        print("Passwords do not match.")
        sys.exit(1)

    ph = PasswordHasher()
    try:
        pw_hash = ph.hash(password)
    except Exception as e:
        print("Failed to hash password:", e)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Ensure users table exists (same schema as main.py)
        cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, password TEXT)")
        conn.commit()

        # Check for existing user
        cursor.execute("SELECT id FROM users WHERE id = ?", (team_id,))
        if cursor.fetchone() is not None:
            print(f"A user with id {team_id} already exists. Aborting.")
            sys.exit(1)

        cursor.execute("INSERT INTO users (id, password) VALUES (?, ?)", (team_id, pw_hash))
        conn.commit()
        print(f"User {team_id} inserted successfully into {DB_PATH}.")
    except Exception as e:
        print("Database error:", e)
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()

import sqlite3

FTC_SEASON = 2026


def migrate_season(db: sqlite3.Connection):
    with db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        row = db.execute("SELECT value FROM app_metadata WHERE key = 'season'").fetchone()
        previous_season = int(row[0]) if row else 2025
        if previous_season == FTC_SEASON:
            return
        if previous_season > FTC_SEASON:
            raise ValueError("Cannot open data from a newer season")
        for table in ("notes", "strategy", "schedule_offsets", "notifications"):
            exists = db.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)).fetchone()
            if exists:
                db.execute(f"ALTER TABLE {table} RENAME TO {table}_{previous_season}")
        db.execute("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('season', ?)", (str(FTC_SEASON),))

import sqlite3
import unittest

from season import migrate_season


class SeasonMigrationTests(unittest.TestCase):
    def test_archive_preserves_data_and_accounts(self):
        db = sqlite3.connect(":memory:")
        for table in ("users", "notes", "strategy", "schedule_offsets", "notifications"):
            db.execute(f"CREATE TABLE {table} (value TEXT)")
            db.execute(f"INSERT INTO {table} VALUES (?)", (table,))
        db.commit()
        migrate_season(db)
        self.assertEqual(db.execute("SELECT value FROM users").fetchone()[0], "users")
        for table in ("notes", "strategy", "schedule_offsets", "notifications"):
            self.assertEqual(db.execute(f"SELECT value FROM {table}_2025").fetchone()[0], table)
            db.execute(f"CREATE TABLE {table} (value TEXT)")
        db.commit()
        migrate_season(db)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM notes").fetchone()[0], 0)

    def test_fresh_database_and_repeat(self):
        db = sqlite3.connect(":memory:")
        migrate_season(db)
        migrate_season(db)
        self.assertEqual(db.execute("SELECT value FROM app_metadata").fetchone()[0], "2026")

    def test_failed_archive_rolls_back(self):
        db = sqlite3.connect(":memory:")
        db.execute("CREATE TABLE notes (id INTEGER)")
        db.execute("CREATE TABLE notes_2025 (id INTEGER)")
        db.commit()
        with self.assertRaises(sqlite3.OperationalError):
            migrate_season(db)
        self.assertIsNotNone(db.execute("SELECT name FROM sqlite_master WHERE name = 'notes'").fetchone())


if __name__ == "__main__":
    unittest.main()

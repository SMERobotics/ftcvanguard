import sqlite3

db = sqlite3.connect("default.db")
cursor = db.cursor()

if __name__ == "__main__":
    while True:
        try:
            cmd = input("sqlite> ")
            if cmd.lower() in ("exit", "quit"):
                break
            cursor.execute(cmd)
            results = cursor.fetchall()
            for row in results:
                print(row)
            db.commit()
        except Exception as e:
            print(f"Error: {e}")
    db.close()
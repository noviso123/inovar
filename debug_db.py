import sqlite3
import os

db_path = r'c:\Users\12001036\inovar\server\internal\infra\database\inovar.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Recent Requests ---")
cursor.execute("SELECT id, numero, status, observation, updated_at FROM solicitacoes ORDER BY updated_at DESC LIMIT 10")
for row in cursor.fetchall():
    print(row)

print("\n--- Status Counts ---")
cursor.execute("SELECT status, count(*) FROM solicitacoes GROUP BY status")
for row in cursor.fetchall():
    print(row)

conn.close()

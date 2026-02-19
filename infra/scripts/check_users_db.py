import psycopg2
import os

DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check_users():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        print("Connected to Supabase DB.")

        cur.execute("SELECT id, name, email, role, active FROM users WHERE deleted_at IS NULL")
        rows = cur.fetchall()

        print(f"Found {len(rows)} users:")
        for row in rows:
            print(f" - {row[1]} ({row[2]}) | Role: {row[3]} | Active: {row[4]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()

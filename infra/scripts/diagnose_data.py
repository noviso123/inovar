import psycopg2
import os
import sys

# Load .env
# Load .env
def load_env():
    # Try multiple paths
    paths = ["server/.env", ".env", "../server/.env"]
    env_path = None
    for p in paths:
        if os.path.exists(p):
            env_path = p
            break

    if env_path:
        print(f"📖 Loading .env from: {env_path}")
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value
    else:
        print("⚠️ .env file not found in standard locations")

load_env()

from urllib.parse import urlparse, parse_qs

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌ DATABASE_URL not found in server/.env")
    sys.exit(1)

# Clean DSN for psycopg2
try:
    # Remove pgbouncer param if present as it breaks psycopg2
    if "?" in DB_URL:
        base, query = DB_URL.split("?", 1)
        params = parse_qs(query)
        # Reconstruct without pgbouncer
        new_query_parts = []
        for k, v in params.items():
            if k != 'pgbouncer':
                new_query_parts.append(f"{k}={v[0]}")

        if new_query_parts:
            DB_URL = f"{base}?{'&'.join(new_query_parts)}"
        else:
            DB_URL = base

    print(f"🔌 Connecting to: {DB_URL.split('@')[1] if '@' in DB_URL else '...'}")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # 1. Check Table Counts
    tables = ["users", "clientes", "solicitacoes", "prestadores"]
    print("\n📊 Table Counts:")
    for table in tables:
        try:
            cur.execute(f"SELECT count(*) FROM {table}")
            total = cur.fetchone()[0]

            # Check soft deletes if column exists
            try:
                cur.execute(f"SELECT count(*) FROM {table} WHERE deleted_at IS NOT NULL")
                deleted = cur.fetchone()[0]
            except:
                deleted = "N/A"

            print(f"  - {table}: {total} (Soft Deleted: {deleted})")
        except Exception as e:
            print(f"  - {table}: Error ({e})")
        conn.rollback() # Reset transaction

    # 2. Check Recent Users and Companies
    print("\n👥 Recent Users (Limit 5):")
    cur.execute("SELECT id, name, email, role, company_id, active FROM users ORDER BY created_at DESC LIMIT 5")
    for row in cur.fetchall():
        print(f"  - {row[1]} ({row[2]}) | Role: {row[3]} | CompanyID: {row[4]} | Active: {row[5]}")

    # 3. Check Table Schema for Solicitacoes
    print("\n📋 Columns in 'solicitacoes':")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'solicitacoes'")
    for col in cur.fetchall():
        print(f"  - {col[0]} ({col[1]})")

    # 4. Check Recent Requests
    print("\n📝 Recent Requests (Limit 5):")
    # Removing company_id as it doesn't exist
    cur.execute("SELECT id, description, status, client_id, created_at FROM solicitacoes ORDER BY created_at DESC LIMIT 5")
    rows = cur.fetchall()
    if not rows:
        print("  (No requests found)")
    for row in rows:
        print(f"  - {row[0][:8]}... | Status: {row[2]} | ClientID: {row[3]} | Created: {row[4]}")

    cur.close()
    conn.close()
    print("\n✅ Diagnosis Complete")

except Exception as e:
    print(f"\n❌ Connection Error: {e}")

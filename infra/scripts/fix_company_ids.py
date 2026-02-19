import psycopg2
import os
import sys

# Load .env
def load_env():
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

load_env()
from urllib.parse import urlparse, parse_qs

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌ DATABASE_URL not found")
    sys.exit(1)

# Clean DSN
try:
    if "?" in DB_URL:
        base, query = DB_URL.split("?", 1)
        params = parse_qs(query)
        new_query_parts = []
        for k, v in params.items():
            if k != 'pgbouncer':
                new_query_parts.append(f"{k}={v[0]}")
        if new_query_parts:
            DB_URL = f"{base}?{'&'.join(new_query_parts)}"
        else:
            DB_URL = base

    print("🔌 Connecting to Database...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # 1. Add Column if not exists
    print("🛠️ Checking for 'company_id' column in 'solicitacoes'...")
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'solicitacoes' AND column_name = 'company_id'")
    if not cur.fetchone():
        print("➕ Adding 'company_id' column...")
        cur.execute("ALTER TABLE solicitacoes ADD COLUMN company_id VARCHAR(36)")
        cur.execute("CREATE INDEX idx_solicitacoes_company_id ON solicitacoes(company_id)")
        conn.commit()
        print("✅ Column added.")
    else:
        print("ℹ️ Column already exists.")

    # 2. Backfill Data
    print("🔄 Backfilling company_id from customers...")
    # Postgres UPDATE FROM syntax
    query = """
    UPDATE solicitacoes s
    SET company_id = c.company_id
    FROM clientes c
    WHERE s.client_id = c.id
    AND (s.company_id IS NULL OR s.company_id = '')
    """
    cur.execute(query)
    updated_rows = cur.rowcount
    conn.commit()
    print(f"✅ Updated {updated_rows} requests with company_id.")

    # 3. Verify
    print("\n📝 Sample Updated Requests:")
    cur.execute("SELECT id, description, client_id, company_id FROM solicitacoes LIMIT 5")
    for row in cur.fetchall():
        print(f"  - {row[0][:8]}... | Client: {row[2][:8]}... | Company: {row[3]}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")

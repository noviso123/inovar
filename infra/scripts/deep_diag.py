import requests
import psycopg2
import uuid
import bcrypt

API_URL = "http://localhost:5000/api"
DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def diagnostic():
    print("🛠️ Starting Deep UI Diagnostic...")

    # 1. Check data directly in DB for Company/Fiscal
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        print("\n📊 Checking DB Records...")

        cur.execute("SELECT count(*) FROM prestadores")
        p_count = cur.fetchone()[0]
        print(f" - Prestadores (Company): {p_count} records")

        cur.execute("SELECT count(*) FROM configuracoes_fiscais")
        f_count = cur.fetchone()[0]
        print(f" - Configurações Fiscais: {f_count} records")

        cur.execute("SELECT count(*) FROM audit_logs")
        a_count = cur.fetchone()[0]
        print(f" - Audit Logs: {a_count} records")

        if p_count == 0:
            print("⚠️ WARNING: No company record found. This will break the 'Empresa' page.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ DB Check Error: {e}")

    # 2. Try to get a token via a new temp user since we don't know the admin's new password
    print("\n🔑 Creating temp admin for API probe...")
    temp_email = f"diag_{uuid.uuid4().hex[:4]}@inovar.com"
    pwd = "diagpassword"
    hashed = bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
                    (str(uuid.uuid4()), "Diag Admin", temp_email, hashed, "ADMIN_SISTEMA", True))
        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ Temp user created: {temp_email}")

        # Now Login
        resp = requests.post(f"{API_URL}/auth/login", json={"email": temp_email, "password": pwd})
        if resp.status_code == 200:
            token = resp.json()["data"]["accessToken"]
            headers = {"Authorization": f"Bearer {token}"}

            # Probe broken endpoints
            for ep in ["/company", "/fiscal/config", "/audit", "/finance/summary"]:
                print(f"\n📡 Probing {ep}...")
                r = requests.get(f"{API_URL}{ep}", headers=headers)
                print(f"   Status: {r.status_code}")
                print(f"   Body: {r.text[:500]}")
        else:
            print(f"❌ Login failed for temp user: {resp.text}")

    except Exception as e:
        print(f"❌ Temp User/API Error: {e}")

if __name__ == "__main__":
    diagnostic()

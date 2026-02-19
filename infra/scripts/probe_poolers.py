import psycopg2
import os

# Configuration
REGION = "sa-east-1"
REF = "bavgqsnsubrzazhgpywg"
PASS = "Inovargestao2026"
DBNAME = "postgres"
CERT = "prod-ca-2021.crt"

def test_host(host, port, user):
    print(f"\n--- Testing {host}:{port} (User: {user}) ---")
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=DBNAME,
            user=user,
            password=PASS,
            sslmode='require',
            sslrootcert=CERT if os.path.exists(CERT) else None,
            connect_timeout=5
        )
        print(f"✅ SUCCESS on {host}!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def main():
    # Potential pooler hosts
    hosts = [
        f"aws-0-{REGION}.pooler.supabase.com",
        f"aws-1-{REGION}.pooler.supabase.com",
        f"{REGION}.pooler.supabase.com",
    ]

    users = [f"postgres.{REF}", "postgres"]
    ports = [6543, 5432]

    for h in hosts:
        for p in ports:
            for u in users:
                if test_host(h, p, u):
                    return

if __name__ == "__main__":
    main()

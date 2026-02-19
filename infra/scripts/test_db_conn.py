import psycopg2
import os

# Configuration
HOST = "aws-0-sa-east-1.pooler.supabase.com"
DBNAME = "postgres"
USER = "postgres.bavgqsnsubrzazhgpywg"
PASS = "Inovargestao2026"
CERT = "prod-ca-2021.crt"

def test_conn(port, user, host, sslmode='verify-full'):
    print(f"\n--- Testing Host {host}:{port} (User: {user}, SSL: {sslmode}) ---")
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=DBNAME,
            user=user,
            password=PASS,
            sslmode=sslmode,
            sslrootcert=CERT if sslmode == 'verify-full' and os.path.exists(CERT) else None
        )
        print(f"✅ SUCCESS!")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def main():
    # 1. Pooler Tests
    users = [USER, "postgres"]
    ports = [6543, 5432]
    ssl_modes = ['verify-full', 'require']

    for p in ports:
        for u in users:
            for s in ssl_modes:
                test_conn(p, u, HOST, s)

    # 2. Direct Connection Test
    DIRECT_HOST = "db.bavgqsnsubrzazhgpywg.supabase.co"
    test_conn(5432, "postgres", DIRECT_HOST, 'require')

if __name__ == "__main__":
    main()

import psycopg2
import os

# Configuration
HOST = "aws-0-sa-east-1.pooler.supabase.com"
DBNAME = "postgres"
REF = "bavgqsnsubrzazhgpywg"
PASS = "Inovargestao2026"
CERT = "prod-ca-2021.crt"

def test_conn(port, user, sslmode='require'):
    print(f"\n--- Testing Port {port} (User: {user}, SSL: {sslmode}) ---")
    try:
        conn = psycopg2.connect(
            host=HOST,
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
    # Variations of usernames for Pooler
    variations = [
        f"postgres.{REF}", # Standard Supavisor/PgBouncer with ref
        REF,               # Sometimes just the ref works
        "postgres",        # Direct-like (unlikely to work on pooler without prefix)
    ]

    ports = [6543, 5432]

    for p in ports:
        for v in variations:
            test_conn(p, v, 'require')

if __name__ == "__main__":
    main()

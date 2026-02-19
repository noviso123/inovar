import psycopg2
import os

# Configuration
IPV6_HOST = "2600:1f1e:75b:4b0d:6300:ec16:8c23:17ea" # For db.bavgqsnsubrzazhgpywg.supabase.co
DBNAME = "postgres"
USER = "postgres"
PASS = "Inovargestao2026"
CERT = "prod-ca-2021.crt"

def test_conn():
    print(f"🚀 Testing Direct IPv6 Connection [{IPV6_HOST}]...")
    try:
        # Note: IPv6 addresses in URIs or connect calls might need escaping or square brackets
        # but in psycopg2 'host' argument it usually works as is if the system supports it.
        conn = psycopg2.connect(
            host=IPV6_HOST,
            port=5432,
            dbname=DBNAME,
            user=USER,
            password=PASS,
            sslmode='require' # Direct connections usually require SSL
        )
        print(f"✅ SUCCESS on Direct IPv6!")
        conn.close()
    except Exception as e:
        print(f"❌ FAILED on Direct IPv6: {e}")

if __name__ == "__main__":
    test_conn()

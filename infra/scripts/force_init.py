import psycopg2
import uuid

DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def force_init():
    print("🧨 Starting Forced Initialization...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # Check current state
        cur.execute("SELECT count(*) FROM prestadores")
        count = cur.fetchone()[0]
        print(f"Current Prestadores count: {count}")

        if count == 0:
            print("Creating Prestador...")
            p_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO prestadores (id, razao_social, nome_fantasia, email, cnpj, active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (p_id, "Inovar Gestão", "Inovar Gestão", "contato@inovar.com", "00.000.000/0001-00", True))

            print("Creating Fiscal Config...")
            cur.execute("""
                INSERT INTO configuracoes_fiscais (id, prestador_id, ambiente, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), p_id, "homologacao"))

            conn.commit()
            print("✅ Records committed.")
        else:
            print("ℹ️ Found existing records.")

        # Final Verification
        cur.execute("SELECT id FROM prestadores LIMIT 1")
        final_id = cur.fetchone()
        print(f"Final Prestador ID check: {final_id}")

        cur.close()
        conn.close()
        print("Done.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    force_init()

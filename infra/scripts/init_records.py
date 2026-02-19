import psycopg2
import uuid

DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def initialize_records():
    print("🚀 Initializing Global Records...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # 1. Create Prestador (Company) record if none exists
        cur.execute("SELECT count(*) FROM prestadores")
        if cur.fetchone()[0] == 0:
            p_id = str(uuid.uuid4())
            print(f"Creating default Prestador: {p_id}")
            cur.execute("""
                INSERT INTO prestadores (id, razao_social, nome_fantasia, email, cnpj, active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (p_id, "Inovar Gestão", "Inovar Gestão", "contato@inovar.com", "00.000.000/0001-00", True))

            # 2. Create Configuracao Fiscal for this prestador
            print("Creating default Configuracao Fiscal...")
            cur.execute("""
                INSERT INTO configuracoes_fiscais (id, prestador_id, ambiente, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), p_id, "homologacao"))

            conn.commit()
            print("✅ Records initialized successfully.")
        else:
            print("ℹ️ Prestador record already exists.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Initialization Error: {e}")

if __name__ == "__main__":
    initialize_records()

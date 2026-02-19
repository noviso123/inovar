import psycopg2
import uuid

DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def final_init():
    print("🚀 Final Initialization with Correct Schema...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # 1. Get Admin User ID
        print("Finding admin user...")
        cur.execute("SELECT id FROM users WHERE email = %s", ("admin@inovar.com",))
        row = cur.fetchone()
        if not row:
            print("❌ Admin user not found! Seeding failed?")
            return
        admin_id = row[0]
        print(f"Admin ID: {admin_id}")

        # 2. Check and Insert Prestador (Company)
        cur.execute("SELECT id FROM prestadores LIMIT 1")
        p_row = cur.fetchone()
        if not p_row:
            p_id = str(uuid.uuid4())
            print(f"Inserting Prestador linked to Admin: {p_id}")
            # Note: Removed 'active' column as it doesn't exist in domain/DB
            cur.execute("""
                INSERT INTO prestadores (id, user_id, razao_social, nome_fantasia, email, cnpj, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (p_id, admin_id, "Inovar Gestão", "Inovar Gestão", "contato@inovar.com", "00.000.000/0001-00"))
        else:
            p_id = p_row[0]
            print(f"Prestador already exists with ID: {p_id}")

        # 3. Check and Insert Fiscal Config
        cur.execute("SELECT id FROM configuracoes_fiscais WHERE prestador_id = %s", (p_id,))
        f_row = cur.fetchone()
        if not f_row:
            print("Inserting Fiscal Config...")
            cur.execute("""
                INSERT INTO configuracoes_fiscais (id, prestador_id, ambiente, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), p_id, "homologacao"))
        else:
            print("Fiscal Config already exists.")

        conn.commit()
        print("✅ Initialization verified and committed.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    final_init()


import psycopg2
import bcrypt

DB_URL = "postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

def reset_password():
    print("🔒 Resetting Admin Password...")
    try:
        # Generate hash
        password = "inovar123"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # Update admin
        cur.execute("UPDATE users SET password_hash = %s, active = true WHERE email = %s", (hashed, "admin@inovar.com"))
        affected = cur.rowcount

        conn.commit()
        if affected > 0:
            print("✅ Admin password reset to 'inovar123' successfully.")
        else:
            print("❌ Admin user not found.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reset_password()

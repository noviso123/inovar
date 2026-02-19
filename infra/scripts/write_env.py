import os
import shutil

# Copy certificate to server directory
if os.path.exists("prod-ca-2021.crt"):
    shutil.copy("prod-ca-2021.crt", "server/prod-ca-2021.crt")
    print("✅ Certificate copied to server/ directory.")

lines = [
    "PORT=5000",
    "# Connection String (Validated Pooler - Transaction Mode with SSL)",
    "DATABASE_URL=postgres://postgres.bavgqsnsubrzazhgpywg:Inovargestao2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
    "SUPABASE_URL=https://bavgqsnsubrzazhgpywg.supabase.co",
    "# Anon Key",
    "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmdxc25zdWJyemF6aGdweXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDQzNDgsImV4cCI6MjA4NzA4MDM0OH0.uiScxhWZGlFnDbcakOsZ8dfHgQXmi0gay_DtFqBGtwo",
    "# Service Role Key",
    "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmdxc25zdWJyemF6aGdweXdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUwNDM0OCwiZXhwIjoyMDg3MDgwMzQ4fQ.SM-pdidrOCkRp4ljr_34Gcz_pGN08Y_5HLy5mYuwS70",
    "",
    "# S3 Configuration",
    "AWS_ACCESS_KEY_ID=59fba5707ce99514f6996c002d15f617",
    "AWS_SECRET_ACCESS_KEY=32a0b124a8f6c2613dffe199d2dfcc2ca5e1bb6bc77dd911ae82e77ec95d0d86",
    # Force us-east-1 if sa-east-1 has issues, but user provided sa-east-1 in S3 keys context earlier?
    # Actually, standard Supabase S3 is region agnostic for the SDK usually, but let's stick to what we saw in the dashboard screenshot "sa-east-1".
    "AWS_REGION=sa-east-1",
    "AWS_ENDPOINT=https://bavgqsnsubrzazhgpywg.supabase.co/storage/v1/s3",
    "AWS_BUCKET=uploads",
    "",
    "JWT_SECRET=inovar_secret_dev_key_123456",
    "CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173",
    "UPLOAD_DIR=../infra/data/uploads",
    "",
    "# Email Configuration (Gmail)",
    "SMTP_HOST=smtp.gmail.com",
    "SMTP_PORT=587",
    "SMTP_USER=notificacoes.inovar@gmail.com",
    "# IMPORTANTE: Use uma 'Senha de App' do Google (16 caracteres), nao a senha normal!",
    "SMTP_PASSWORD=cgehpbppnempioit",
    "SMTP_FROM=notificacoes.inovar@gmail.com"
]

with open("server/.env", "w") as f:
    for line in lines:
        f.write(line + "\n")

print("✅ server/.env written successfully (SSL Configured).")

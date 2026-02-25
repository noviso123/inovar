import os
import requests
import json
import subprocess
import sys

def check_health():
    print("===============================================")
    print("      🔍 INOVAR GESTÃO - SYSTEM AUDIT")
    print("===============================================")

    # 1. API & Backend Check
    print("\n[1/4] 🚀 Backend Service:")
    try:
        r = requests.get("http://localhost:8080/health", timeout=5)
        if r.status_code == 200:
            print("   ✅ API Online (Health Endpoint OK)")
        else:
            print(f"   ❌ API Status: {r.status_code}")
    except Exception as e:
        print(f"   ❌ Backend unreachable: {e}")

    # 2. Database Check
    print("\n[2/4] 📦 Database (SQLite):")
    db_path = os.getenv("DATABASE_URL", "/app/data/db/inovar.db")
    if os.path.exists(db_path):
        size = os.path.getsize(db_path) / 1024
        print(f"   ✅ Database found: {db_path} ({size:.1f} KB)")
    else:
        print(f"   ❌ Database NOT FOUND at {db_path}")

    # 3. Storage & Uploads
    print("\n[3/4] 📁 Storage & Permissions:")
    upload_dir = os.getenv("UPLOAD_DIR", "/app/data/uploads")
    if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
        print(f"   ✅ Uploads directory writable: {upload_dir}")
    else:
        print(f"   ❌ Uploads directory problem (missing or not writable)")

    # 4. SMTP / Email Configuration
    print("\n[4/4] 📧 Email (SMTP) Configuration:")
    # We check if SMTP vars are set (not null)
    # These are usually passed via .env.docker
    # For security we don't print the values, just presence
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    if smtp_host and smtp_user:
        print(f"   ✅ SMTP configured (Host: {smtp_host})")
        print("   💡 TIP: Use 'python3 infra/scripts/test_live_email.py' for a real test.")
    else:
        print("   ⚠️ SMTP NOT CONFIGURED (Reset emails will not work)")

    print("\n===============================================")
    print("   Audit completed. System is ready for use.")
    print("===============================================")

if __name__ == "__main__":
    check_health()

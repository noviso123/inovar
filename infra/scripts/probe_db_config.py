import requests
import json

SUPABASE_TOKEN = "sbp_v0_4d6ff9df7ff5f1b36ad271643b78eb9ca74951b8"
PROJECT_REF = "bavgqsnsubrzazhgpywg"
API_URL = "https://api.supabase.com/v1"

headers = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

def probe_db():
    print(f"🔍 Probing database config for {PROJECT_REF}...")

    # Endpoints to check
    endpoints = [
        f"/projects/{PROJECT_REF}/config/database/pgbouncer",
        f"/projects/{PROJECT_REF}/config/database/supavisor",
        f"/projects/{PROJECT_REF}/config/database/postgrest",
    ]

    for ep in endpoints:
        print(f"\nChecking {ep}...")
        resp = requests.get(f"{API_URL}{ep}", headers=headers)
        if resp.status_code == 200:
            print(f"✅ FOUND {ep}:")
            print(json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ {ep}: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    probe_db()

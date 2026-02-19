import requests
import json

SUPABASE_TOKEN = "sbp_v0_4d6ff9df7ff5f1b36ad271643b78eb9ca74951b8"
PROJECT_REF = "bavgqsnsubrzazhgpywg"
API_URL = "https://api.supabase.com/v1"

headers = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

def probe():
    print(f"🔍 Probing project {PROJECT_REF} for S3 config/keys...")

    # 1. Try to get project settings/config
    endpoints = [
        f"/projects/{PROJECT_REF}/config/storage",
        f"/projects/{PROJECT_REF}/storage/config",
        f"/projects/{PROJECT_REF}/api-keys", # We know this works for Anon/Service
        f"/projects/{PROJECT_REF}/secrets",
    ]

    for ep in endpoints:
        print(f"Checking {ep}...")
        resp = requests.get(f"{API_URL}{ep}", headers=headers)
        if resp.status_code == 200:
            print(f"✅ FOUND {ep}:")
            print(json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ {ep}: {resp.status_code}")

    # 2. Try to create a key (Hypothetical endpoint)
    # Docs don't explicit expose this in Management API v1, but we check.

if __name__ == "__main__":
    probe()

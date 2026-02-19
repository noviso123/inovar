import requests
import json

SUPABASE_TOKEN = "sbp_v0_4d6ff9df7ff5f1b36ad271643b78eb9ca74951b8"
PROJECT_REF = "bavgqsnsubrzazhgpywg"
API_URL = "https://api.supabase.com/v1"

headers = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

def create_keys():
    print(f"🛠️ Attempting to create S3 Keys for {PROJECT_REF}...")

    # Guessing endpoints based on typical patterns or undocumented API
    # POST /projects/{ref}/storage/config/s3/keys

    endpoints = [
        f"/projects/{PROJECT_REF}/storage/s3/keys", # Likely
        f"/projects/{PROJECT_REF}/config/storage/s3/keys",
    ]

    payload = {"description": "Antigravity Generated Key"}

    for ep in endpoints:
        print(f"Trying POST {ep}...")
        resp = requests.post(f"{API_URL}{ep}", headers=headers, json=payload)

        if resp.status_code in [200, 201]:
            print(f"✅ SUCCESS! Created Key:")
            print(json.dumps(resp.json(), indent=2))
            return resp.json()
        else:
            print(f"❌ Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    create_keys()

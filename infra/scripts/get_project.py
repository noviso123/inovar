import requests
import json

SUPABASE_TOKEN = "sbp_v0_4d6ff9df7ff5f1b36ad271643b78eb9ca74951b8"
PROJECT_REF = "bavgqsnsubrzazhgpywg"
API_URL = "https://api.supabase.com/v1"

headers = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

def get_project():
    print(f"🔍 Fetching details for project {PROJECT_REF}...")
    resp = requests.get(f"{API_URL}/projects/{PROJECT_REF}", headers=headers)
    if resp.status_code == 200:
        print("✅ Success:")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"❌ Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    get_project()

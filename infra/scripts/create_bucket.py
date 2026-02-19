import requests
import json

SUPABASE_URL = "https://bavgqsnsubrzazhgpywg.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmdxc25zdWJyemF6aGdweXdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUwNDM0OCwiZXhwIjoyMDg3MDgwMzQ4fQ.SM-pdidrOCkRp4ljr_34Gcz_pGN08Y_5HLy5mYuwS70"

def create_bucket():
    url = f"{SUPABASE_URL}/storage/v1/bucket"
    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "id": "uploads",
        "name": "uploads",
        "public": True,
        "file_size_limit": 52428800, # 50MB
        "allowed_mime_types": ["image/*", "application/pdf"]
    }

    print(f"DTO creating bucket 'uploads'...")
    resp = requests.post(url, headers=headers, json=payload)

    if resp.status_code == 200:
        print("✅ Bucket 'uploads' created successfully!")
    elif resp.status_code == 400 and "already exists" in resp.text:
         print("ℹ️ Bucket 'uploads' already exists.")
    else:
        print(f"❌ Failed to create bucket: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    create_bucket()

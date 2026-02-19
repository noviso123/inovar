import requests
import json

URL = "http://localhost:5000/api/auth/login"
PAYLOAD = {
    "email": "admin@inovar.com",
    "password": "123456"
}

try:
    resp = requests.post(URL, json=PAYLOAD)
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("data", {}).get("accessToken")
        print(f"✅ Login Successful! Token: {token[:10]}...")
        # Save token to file for next steps if needed? No need for now.
    else:
        print(f"❌ Login Failed: {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"❌ Connection Error: {e}")

import requests

API_URL = "http://localhost:5000/api"

def probe_broken_pages():
    print("🔍 Starting In-Depth API Probe...")

    # 1. Login
    login_data = {"email": "admin@inovar.com", "password": "inovar123"}
    resp = requests.post(f"{API_URL}/auth/login", json=login_data)
    if resp.status_code != 200 or not resp.json().get("success"):
        login_data["password"] = "123456"
        resp = requests.post(f"{API_URL}/auth/login", json=login_data)

    if resp.status_code == 200 and resp.json().get("success"):
        token = resp.json()["data"]["accessToken"]
        print("✅ Authenticated.")
    else:
        print(f"❌ Auth failure: {resp.status_code} - {resp.text}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        "/company",
        "/finance/summary",
        "/finance/transactions",
        "/fiscal/config",
        "/audit",
        "/settings",
        "/requests"
    ]

    for ep in endpoints:
        print(f"\n📡 Probing {ep}...")
        try:
            r = requests.get(f"{API_URL}{ep}", headers=headers)
            print(f"   Status: {r.status_code}")
            if r.status_code != 200:
                print(f"   Error: {r.text}")
            else:
                data = r.json()
                print(f"   Success: {data.get('success')}")
                # Check for empty data if success is true
                if data.get('success'):
                    content = data.get('data')
                    if content is None or len(str(content)) < 5:
                        print("   ⚠️ WARNING: Endpoint returned success but data is empty or suspiciously small.")
        except Exception as e:
            print(f"   🔥 Connection Exception: {e}")

if __name__ == "__main__":
    probe_broken_pages()

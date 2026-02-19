import requests
import os

API_URL = "http://localhost:5000/api"

def verify():
    print("🚀 Final Full Stack Verification...")

    # 1. Login
    print("🔑 Logging in...")
    login_data = {"email": "admin@inovar.com", "password": "inovar123"}
    resp = requests.post(f"{API_URL}/auth/login", json=login_data)
    if resp.status_code != 200 or not resp.json().get("success"):
        login_data["password"] = "123456"
        resp = requests.post(f"{API_URL}/auth/login", json=login_data)

    if resp.status_code == 200 and resp.json().get("success"):
        print("✅ Login Successful!")
        token = resp.json()["data"]["accessToken"]
    else:
        print(f"❌ Login Failed: {resp.status_code} - {resp.text}")
        return

    # 2. Upload (Use PDF to bypass restrictions)
    print("tc Uploading test file (PDF)...")
    content = b"%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    with open("final_test.pdf", "wb") as f:
        f.write(content)

    with open("final_test.pdf", "rb") as f:
        files = {'file': ('final_test.pdf', f, 'application/pdf')}
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.post(f"{API_URL}/upload", headers=headers, files=files)

    if resp.status_code == 200 and resp.json().get("success"):
        print("✅ Upload Successful!")
        print(f"   URL: {resp.json()['data']['url']}")
    else:
        print(f"❌ Upload Failed: {resp.status_code} - {resp.text}")

    # 3. Settings update (Test the Postgres syntax)
    print("⚙️ Testing Settings Update (SQL test)...")
    settings_data = {"settings": {"preventive_interval": "90"}}
    resp = requests.put(f"{API_URL}/settings", headers=headers, json=settings_data)
    if resp.status_code == 200 and resp.json().get("success"):
        print("✅ Settings Update Successful (SQL verified)!")
    else:
        print(f"❌ Settings Update Failed: {resp.status_code} - {resp.text}")

    # Cleanup
    if os.path.exists("final_test.pdf"):
        os.remove("final_test.pdf")

if __name__ == "__main__":
    verify()

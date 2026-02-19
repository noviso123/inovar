import requests
import os

BASE_URL = "http://localhost:5000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
UPLOAD_URL = f"{BASE_URL}/api/upload"

EMAIL = "admin@inovar.com"
PASSWORD = "123456"

def verify():
    print("🚀 Starting Full Stack Verification...")

    # 1. Login
    print(f"🔑 logging in as {EMAIL}...")
    try:
        resp = requests.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})
    except requests.exceptions.ConnectionError:
        print("❌ Backend unreachable (Connection Refused). Is it running?")
        return

    if resp.status_code != 200:
        print(f"❌ Login Failed: {resp.status_code} - {resp.text}")
        return

    token = resp.json().get("data", {}).get("accessToken")
    if not token:
        print("❌ Login succeeded but no token found in response.")
        return

    print("✅ Login Successful! DB Connection confirmed.")

    # 2. Upload
    print("tc Uploading test file (PDF)...")
    headers = {"Authorization": f"Bearer {token}"}

    with open("verify_test.pdf", "w") as f:
        f.write("%PDF-1.4 dummy content")

    try:
        with open("verify_test.pdf", "rb") as f:
            files = {'file': ('verify_test.pdf', f, 'application/pdf')}
            resp = requests.post(UPLOAD_URL, headers=headers, files=files)

        if resp.status_code == 200:
            data = resp.json()
            url = data.get("data", {}).get("url") # Check handler response structure
            # Handler returns Success(c, fiber.Map{"url": url, ...}) which wraps in "data"
            # Wait, handler.go Success wraps in "data".
            # UploadFile returns Success(c, fiber.Map{ "url": url }) -> { "success": true, "data": { "url": ... } }

            # Let's check exact response structure from previous attempts or code
            # UploadFile: return Success(c, fiber.Map{"url": url...})
            # Success: return c.JSON(fiber.Map{"success": true, "data": data})
            # So: data.url is correct via resp.json().get("data").get("url")

            print(f"✅ Upload Successful! S3 Connection confirmed.")
            print(f"   URL: {url}")
        else:
             print(f"❌ Upload Failed: {resp.status_code} - {resp.text}")

    except Exception as e:
        print(f"❌ Upload Exception: {e}")
    finally:
        if os.path.exists("verify_test.pdf"):
            os.remove("verify_test.pdf")

if __name__ == "__main__":
    verify()

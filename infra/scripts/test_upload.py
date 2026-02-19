import requests
import json
import os

# Login first to get token
LOGIN_URL = "http://localhost:5000/api/auth/login"
UPLOAD_URL = "http://localhost:5000/api/me/upload" # Correct endpoint?
# Handler: protected.Post("/upload", h.UploadFile) -> /api/upload ?
# In main.go: protected := api.Group("", middleware.AuthRequired...)
# protected.Post("/upload", h.UploadFile)
# So it is /api/upload

UPLOAD_ENDPOINT = "http://localhost:5000/api/upload"

PAYLOAD = {
    "email": "admin@inovar.com",
    "password": "123456"
}

def main():
    # 1. Login
    print("Logging in...")
    resp = requests.post(LOGIN_URL, json=PAYLOAD)
    if resp.status_code != 200:
        print(f"❌ Login Failed: {resp.text}")
        return

    token = resp.json().get("data", {}).get("accessToken")
    if not token:
        print("❌ No token found")
        return

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # 2. Create dummy file
    with open("test.pdf", "w") as f:
        f.write("%PDF-1.dummy")

    # 3. Upload
    print("Uploading file...")
    with open('test.pdf', 'rb') as f:
        files = {'file': ('test.pdf', f, 'application/pdf')}
        resp = requests.post(UPLOAD_ENDPOINT, headers=headers, files=files)

    if resp.status_code == 200:
        # Handler returns: return c.JSON(fiber.Map{"url": url})
        url = resp.json().get("url")
        print(f"✅ Upload Successful! URL: {url}")
    else:
        print(f"❌ Upload Failed: {resp.status_code} - {resp.text}")

    # Cleanup
    try:
        os.remove("test.pdf")
    except:
        pass

if __name__ == "__main__":
    main()

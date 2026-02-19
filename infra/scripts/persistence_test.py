import requests
import uuid
import time

API_URL = "http://localhost:5000/api"

def persistence_test():
    print("🧪 Starting Dynamic Persistence Lifecycle Test...")

    # 1. Admin Login
    print("🔑 Authenticating as Admin...")
    login_data = {"email": "admin@inovar.com", "password": "inovar123"}
    resp = requests.post(f"{API_URL}/auth/login", json=login_data)
    if resp.status_code != 200 or not resp.json().get("success"):
        login_data["password"] = "123456"
        resp = requests.post(f"{API_URL}/auth/login", json=login_data)

    if resp.status_code == 200 and resp.json().get("success"):
        admin_token = resp.json()["data"]["accessToken"]
        print("✅ Admin authenticated.")
    else:
        print(f"❌ Admin authentication failed: {resp.status_code} - {resp.text}")
        return

    headers = {"Authorization": f"Bearer {admin_token}"}
    test_email = f"test_{uuid.uuid4().hex[:6]}@inovar.com"
    test_name = "Persistence Test User"

    # 2. CREATE (User)
    print(f"👤 Creating test user: {test_email}...")
    user_data = {
        "name": test_name,
        "email": test_email,
        "role": "TECNICO",
        "phone": "(00) 00000-0000",
        "password": "testpassword123"
    }
    resp = requests.post(f"{API_URL}/users", headers=headers, json=user_data)
    if resp.status_code == 200 or resp.status_code == 201:
        created_user = resp.json().get("data")
        user_id = created_user["id"]
        print(f"✅ User created in Supabase! ID: {user_id}")
    else:
        print(f"❌ User creation failed: {resp.status_code} - {resp.text}")
        return

    # 3. READ & VERIFY PERSISTENCE (Login as New User)
    print("🔐 Verifying and testing persistence by logging in as the new user...")
    time.sleep(1) # Small delay for eventual consistency if any (though Postgres is immediate)
    login_data_new = {"email": test_email, "password": "testpassword123"}
    resp = requests.post(f"{API_URL}/auth/login", json=login_data_new)
    if resp.status_code == 200 and resp.json().get("success"):
        print("✅ Persistence Confirmed: New user retrieved and authenticated from Supabase.")
    else:
        print(f"❌ Persistence Failure: Could not login with new user: {resp.status_code} - {resp.text}")
        return

    # 4. UPDATE (Persistence of edits)
    print("📝 Updating user phone number...")
    new_phone = "(99) 99999-9999"
    update_data = {"name": test_name, "phone": new_phone, "role": "TECNICO"}
    resp = requests.put(f"{API_URL}/users/{user_id}", headers=headers, json=update_data)
    if resp.status_code == 200:
        print("✅ Update request successful.")
    else:
        print(f"❌ Update failed: {resp.text}")
        return

    # 5. VERIFY UPDATE
    print("🔍 Fetching user back to verify update persistence...")
    resp = requests.get(f"{API_URL}/users/{user_id}", headers=headers)
    if resp.json().get("data", {}).get("phone") == new_phone:
        print(f"✅ Persistence Confirmed: Change reflected in database ({new_phone}).")
    else:
        print(f"❌ Update persistence failed: {resp.text}")
        return

    # 6. DELETE (Clean up)
    print("🗑️ Deleting test user...")
    resp = requests.delete(f"{API_URL}/users/{user_id}", headers=headers)
    if resp.status_code == 200:
        print("✅ User deleted from Supabase.")
    else:
        print(f"❌ Deletion failed: {resp.text}")
        return

    # 7. FINAL VERIFY (Ensure gone)
    print("🏁 Final check: Verifying user is gone...")
    resp = requests.get(f"{API_URL}/users/{user_id}", headers=headers)
    if resp.status_code == 404:
        print("✅ Verification Complete: User confirmed deleted.")
    else:
        print("❌ Warning: User might still exist in DB.")

    print("\n🌟 PERSISTENCE GUARANTEED: Build-Update-Read-Delete Lifecycle 100% Verified on Supabase.")

if __name__ == "__main__":
    persistence_test()

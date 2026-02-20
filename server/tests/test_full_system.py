#!/usr/bin/env python3
"""
INOVAR - Full System Validation Test Suite
============================================
Tests ALL CRUD operations, authentication, data persistence, and uploads.
Run: python tests/test_full_system.py
"""

import requests
import json
import sys
import time
import os

BASE_URL = os.getenv("API_URL", "http://localhost:5000/api")
ADMIN_EMAIL = "admin@inovar.com"
ADMIN_PASSWORD = "123456"

# Track created resources for cleanup
created_ids = {
    "users": [],
    "clients": [],
    "equipments": [],
    "requests": [],
}

results = {"passed": 0, "failed": 0, "errors": []}

def log_pass(test_name):
    results["passed"] += 1
    print(f"  ✅ PASS: {test_name}")

def log_fail(test_name, detail=""):
    results["failed"] += 1
    results["errors"].append(f"{test_name}: {detail}")
    print(f"  ❌ FAIL: {test_name} — {detail}")

def log_section(title):
    print(f"\n{'='*60}")
    print(f"  🔬 {title}")
    print(f"{'='*60}")

# ============================================================
# 1. AUTHENTICATION
# ============================================================
def test_auth():
    log_section("AUTHENTICATION")

    # Test Login
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    data = r.json()

    if data.get("success") and data.get("data", {}).get("accessToken"):
        token = data["data"]["accessToken"]
        refresh = data["data"]["refreshToken"]
        user = data["data"]["user"]
        log_pass(f"Login as Admin ({user.get('role', 'N/A')})")

        # Check user data is complete
        if user.get("id") and user.get("email") and user.get("role"):
            log_pass("User data returned correctly")
        else:
            log_fail("User data incomplete", str(user))

        # Test refresh token
        r2 = requests.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": refresh})
        d2 = r2.json()
        if d2.get("success") and d2.get("accessToken"):
            token = d2["accessToken"]  # Use the new token
            log_pass("Token refresh works")
        else:
            log_fail("Token refresh", str(d2))

        return token
    else:
        log_fail("Login", str(data))
        return None

    # Test wrong password
    r3 = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": "wrong_password"
    })
    d3 = r3.json()
    if not d3.get("success"):
        log_pass("Wrong password rejected")
    else:
        log_fail("Wrong password should be rejected")

def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ============================================================
# 2. COMPANY PROFILE
# ============================================================
def test_company(token):
    log_section("COMPANY PROFILE")
    h = headers(token)

    # First we need a Prestador. Admin doesn't have one.
    r = requests.get(f"{BASE_URL}/company", headers=h)
    data = r.json()
    if r.status_code == 200:
        log_pass("GET /company — accessible")
    else:
        log_fail("GET /company", f"Status {r.status_code}")

# ============================================================
# 3. USERS (CRUD)
# ============================================================
def test_users(token):
    log_section("USERS — CRUD")
    h = headers(token)

    # CREATE a Prestador user first (needed for company isolation)
    prestador_data = {
        "name": "Test Prestador",
        "email": f"prestador_test_{int(time.time())}@test.com",
        "password": "123456",
        "role": "PRESTADOR",
        "phone": "(11) 99999-0001",
    }
    r = requests.post(f"{BASE_URL}/users", headers=h, json=prestador_data)
    data = r.json()
    if r.status_code == 201 and data.get("data", {}).get("id"):
        prestador_id = data["data"]["id"]
        created_ids["users"].append(prestador_id)
        log_pass(f"CREATE Prestador user (ID: {prestador_id[:8]}...)")
    else:
        log_fail("CREATE Prestador", str(data))
        prestador_id = None

    # CREATE a Tecnico user
    tecnico_data = {
        "name": "Test Tecnico",
        "email": f"tecnico_test_{int(time.time())}@test.com",
        "password": "123456",
        "role": "TECNICO",
        "phone": "(11) 99999-0002",
        "specialties": "Ar condicionado Split"
    }
    r = requests.post(f"{BASE_URL}/users", headers=h, json=tecnico_data)
    data = r.json()
    if r.status_code == 201 and data.get("data", {}).get("id"):
        tecnico_id = data["data"]["id"]
        created_ids["users"].append(tecnico_id)
        log_pass(f"CREATE Tecnico user (ID: {tecnico_id[:8]}...)")
    else:
        log_fail("CREATE Tecnico", str(data))
        tecnico_id = None

    # LIST users
    r = requests.get(f"{BASE_URL}/users", headers=h)
    data = r.json()
    if r.status_code == 200 and isinstance(data.get("data"), list) and len(data["data"]) >= 2:
        log_pass(f"LIST users — {len(data['data'])} users found")
    else:
        log_fail("LIST users", f"Status {r.status_code}, data: {str(data)[:200]}")

    # GET specific user
    if tecnico_id:
        r = requests.get(f"{BASE_URL}/users/{tecnico_id}", headers=h)
        data = r.json()
        if r.status_code == 200 and data.get("data", {}).get("id") == tecnico_id:
            log_pass("GET user by ID")
        else:
            log_fail("GET user by ID", str(data)[:200])

    # UPDATE user
    if tecnico_id:
        r = requests.put(f"{BASE_URL}/users/{tecnico_id}", headers=h, json={
            "name": "Test Tecnico Updated",
            "phone": "(11) 88888-0002",
        })
        data = r.json()
        if r.status_code == 200:
            log_pass("UPDATE user")
        else:
            log_fail("UPDATE user", str(data)[:200])

    # BLOCK/UNBLOCK user
    if tecnico_id:
        r = requests.patch(f"{BASE_URL}/users/{tecnico_id}/block", headers=h)
        if r.status_code == 200:
            log_pass("BLOCK user")
        else:
            log_fail("BLOCK user", str(r.json())[:200])

        r = requests.patch(f"{BASE_URL}/users/{tecnico_id}/block", headers=h)
        if r.status_code == 200:
            log_pass("UNBLOCK user")
        else:
            log_fail("UNBLOCK user", str(r.json())[:200])

    # RESET PASSWORD
    if tecnico_id:
        r = requests.post(f"{BASE_URL}/users/{tecnico_id}/reset-password", headers=h)
        if r.status_code == 200:
            log_pass("RESET password")
        else:
            log_fail("RESET password", str(r.json())[:200])

    return prestador_id, tecnico_id

# ============================================================
# 4. CLIENTS (CRUD)
# ============================================================
def test_clients(token):
    log_section("CLIENTS — CRUD")
    h = headers(token)

    # CREATE client
    client_data = {
        "name": "Test Cliente Empresa",
        "email": f"cliente_test_{int(time.time())}@test.com",
        "password": "123456",
        "phone": "(11) 99999-0003",
        "document": "12.345.678/0001-90",
        "endereco": {
            "street": "Rua Teste",
            "number": "123",
            "complement": "Sala 1",
            "district": "Centro",
            "city": "São Paulo",
            "state": "SP",
            "zipCode": "01000-000"
        }
    }
    r = requests.post(f"{BASE_URL}/clients", headers=h, json=client_data)
    data = r.json()
    if r.status_code == 201 and data.get("data", {}).get("id"):
        client_id = data["data"]["id"]
        created_ids["clients"].append(client_id)
        log_pass(f"CREATE client (ID: {client_id[:8]}...)")
    else:
        log_fail("CREATE client", str(data)[:300])
        client_id = None

    # LIST clients
    r = requests.get(f"{BASE_URL}/clients", headers=h)
    data = r.json()
    if r.status_code == 200 and isinstance(data.get("data"), list) and len(data["data"]) >= 1:
        log_pass(f"LIST clients — {len(data['data'])} clients found")
    else:
        log_fail("LIST clients", f"Status {r.status_code}, data: {str(data)[:200]}")

    # GET specific client
    if client_id:
        r = requests.get(f"{BASE_URL}/clients/{client_id}", headers=h)
        data = r.json()
        if r.status_code == 200 and data.get("data", {}).get("id") == client_id:
            log_pass("GET client by ID")
            # Verify address was saved
            endereco = data.get("data", {}).get("endereco")
            if endereco and endereco.get("street") == "Rua Teste":
                log_pass("Client ADDRESS saved correctly")
            else:
                log_fail("Client address", f"endereco: {endereco}")
        else:
            log_fail("GET client by ID", str(data)[:200])

    # UPDATE client
    if client_id:
        r = requests.put(f"{BASE_URL}/clients/{client_id}", headers=h, json={
            "name": "Test Cliente Atualizado",
            "phone": "(11) 88888-0003",
            "document": "12.345.678/0001-90",
            "endereco": {
                "street": "Rua Atualizada",
                "number": "456",
                "complement": "Andar 2",
                "district": "Vila Nova",
                "city": "São Paulo",
                "state": "SP",
                "zipCode": "02000-000"
            }
        })
        data = r.json()
        if r.status_code == 200:
            log_pass("UPDATE client")
        else:
            log_fail("UPDATE client", str(data)[:200])

    return client_id

# ============================================================
# 5. EQUIPMENTS (CRUD)
# ============================================================
def test_equipments(token, client_id):
    log_section("EQUIPMENTS — CRUD")
    h = headers(token)

    if not client_id:
        log_fail("SKIP equipments", "No client ID available")
        return None

    # CREATE equipment
    equip_data = {
        "clientId": client_id,
        "brand": "LG",
        "model": "Split Inverter 12000",
        "btu": 12000,
        "serialNumber": f"SN-TEST-{int(time.time())}",
        "location": "Sala de Reuniões",
        "preventiveInterval": 90,
    }
    r = requests.post(f"{BASE_URL}/equipments", headers=h, json=equip_data)
    data = r.json()
    if r.status_code == 201 and data.get("data", {}).get("id"):
        equip_id = data["data"]["id"]
        created_ids["equipments"].append(equip_id)
        log_pass(f"CREATE equipment (ID: {equip_id[:8]}...)")

        # Check CompanyID was set
        company_id = data["data"].get("companyId")
        if company_id:
            log_pass(f"Equipment CompanyID auto-set: {company_id[:8]}...")
        else:
            log_fail("Equipment CompanyID NOT set", str(data["data"])[:200])
    else:
        log_fail("CREATE equipment", str(data)[:300])
        equip_id = None

    # CREATE second equipment
    equip_data2 = {
        "clientId": client_id,
        "brand": "Samsung",
        "model": "WindFree 18000",
        "btu": 18000,
        "serialNumber": f"SN-TEST2-{int(time.time())}",
        "location": "Escritório Principal",
        "preventiveInterval": 60,
    }
    r = requests.post(f"{BASE_URL}/equipments", headers=h, json=equip_data2)
    data = r.json()
    if r.status_code == 201:
        equip_id2 = data["data"]["id"]
        created_ids["equipments"].append(equip_id2)
        log_pass(f"CREATE second equipment (ID: {equip_id2[:8]}...)")
    else:
        equip_id2 = None
        log_fail("CREATE second equipment", str(data)[:200])

    # LIST equipments
    r = requests.get(f"{BASE_URL}/equipments", headers=h)
    data = r.json()
    if r.status_code == 200 and isinstance(data.get("data"), list):
        log_pass(f"LIST equipments — {len(data['data'])} found")
    else:
        log_fail("LIST equipments", str(data)[:200])

    # LIST equipments filtered by client
    r = requests.get(f"{BASE_URL}/equipments?clientId={client_id}", headers=h)
    data = r.json()
    if r.status_code == 200 and isinstance(data.get("data"), list) and len(data["data"]) >= 2:
        log_pass(f"LIST equipments filtered by client — {len(data['data'])} found")
    else:
        log_fail("LIST equipments by client", str(data)[:200])

    # GET specific equipment
    if equip_id:
        r = requests.get(f"{BASE_URL}/equipments/{equip_id}", headers=h)
        data = r.json()
        if r.status_code == 200 and data.get("data", {}).get("id") == equip_id:
            log_pass("GET equipment by ID")
        else:
            log_fail("GET equipment by ID", str(data)[:200])

    # UPDATE equipment
    if equip_id:
        r = requests.put(f"{BASE_URL}/equipments/{equip_id}", headers=h, json={
            "brand": "LG Updated",
            "model": "Split Inverter 12000 V2",
            "btu": 12000,
            "serialNumber": f"SN-TEST-UPD-{int(time.time())}",
            "location": "Sala de Reuniões (Atualizado)",
            "preventiveInterval": 120,
        })
        if r.status_code == 200:
            log_pass("UPDATE equipment")
        else:
            log_fail("UPDATE equipment", str(r.json())[:200])

    # DEACTIVATE equipment
    if equip_id2:
        r = requests.patch(f"{BASE_URL}/equipments/{equip_id2}/deactivate", headers=h)
        if r.status_code == 200:
            log_pass("DEACTIVATE equipment")
        else:
            log_fail("DEACTIVATE equipment", str(r.json())[:200])

        # REACTIVATE equipment
        r = requests.patch(f"{BASE_URL}/equipments/{equip_id2}/reactivate", headers=h)
        if r.status_code == 200:
            log_pass("REACTIVATE equipment")
        else:
            log_fail("REACTIVATE equipment", str(r.json())[:200])

    return equip_id, equip_id2

# ============================================================
# 6. SERVICE REQUESTS / CHAMADOS (CRUD)
# ============================================================
def test_requests(token, client_id, equip_ids):
    log_section("SERVICE REQUESTS (CHAMADOS) — CRUD")
    h = headers(token)

    if not client_id or not equip_ids or not equip_ids[0]:
        log_fail("SKIP requests", "No client or equipment ID available")
        return None

    # CREATE request
    req_data = {
        "clientId": client_id,
        "equipmentIds": [equip_ids[0]],
        "priority": "ALTA",
        "serviceType": "CORRETIVA",
        "description": "Teste automatizado - Ar condicionado não liga",
    }
    r = requests.post(f"{BASE_URL}/requests", headers=h, json=req_data)
    data = r.json()
    if r.status_code == 201 and data.get("data", {}).get("id"):
        req_id = data["data"]["id"]
        req_numero = data["data"].get("numero")
        created_ids["requests"].append(req_id)
        log_pass(f"CREATE request #{req_numero} (ID: {req_id[:8]}...)")
    else:
        log_fail("CREATE request", str(data)[:300])
        req_id = None

    # CREATE second request with different priority
    if equip_ids[1]:
        req_data2 = {
            "clientId": client_id,
            "equipmentIds": [equip_ids[1]],
            "priority": "MEDIA",
            "serviceType": "PREVENTIVA",
            "description": "Teste automatizado - Manutenção preventiva semestral",
        }
        r = requests.post(f"{BASE_URL}/requests", headers=h, json=req_data2)
        data = r.json()
        if r.status_code == 201:
            req_id2 = data["data"]["id"]
            created_ids["requests"].append(req_id2)
            log_pass(f"CREATE second request #{data['data'].get('numero')}")
        else:
            req_id2 = None
            log_fail("CREATE second request", str(data)[:200])
    else:
        req_id2 = None

    # LIST ALL requests (CRITICAL TEST — no limit!)
    r = requests.get(f"{BASE_URL}/requests", headers=h)
    data = r.json()
    if r.status_code == 200 and isinstance(data.get("data"), list):
        count = len(data["data"])
        log_pass(f"LIST ALL requests — {count} found (NO LIMIT applied)")
        if count >= 2:
            log_pass("Multiple requests visible ✓")
        else:
            log_fail("Expected >= 2 requests", f"Got {count}")
    else:
        log_fail("LIST requests", str(data)[:200])

    # GET specific request
    if req_id:
        r = requests.get(f"{BASE_URL}/requests/{req_id}", headers=h)
        data = r.json()
        if r.status_code == 200 and data.get("data", {}).get("id") == req_id:
            log_pass("GET request by ID")
            # Verify related data
            req_data_returned = data.get("data", {})
            if req_data_returned.get("clientName"):
                log_pass("Request has clientName")
            if req_data_returned.get("equipments") and len(req_data_returned["equipments"]) > 0:
                log_pass("Request has equipment associations")
        else:
            log_fail("GET request by ID", str(data)[:200])

    # GET request history
    if req_id:
        r = requests.get(f"{BASE_URL}/requests/{req_id}/history", headers=h)
        data = r.json()
        if r.status_code == 200 and isinstance(data.get("data"), list) and len(data["data"]) >= 1:
            log_pass(f"GET request history — {len(data['data'])} entries")
        else:
            log_fail("GET request history", str(data)[:200])

    # UPDATE request status
    if req_id:
        r = requests.patch(f"{BASE_URL}/requests/{req_id}/status", headers=h, json={
            "status": "EM_ANDAMENTO",
        })
        if r.status_code == 200:
            log_pass("UPDATE request status to EM_ANDAMENTO")
        else:
            log_fail("UPDATE request status", str(r.json())[:200])

    # VERIFY PERSISTENCE — Re-fetch ALL and confirm nothing disappeared
    log_section("DATA PERSISTENCE VERIFICATION")
    r = requests.get(f"{BASE_URL}/requests", headers=h)
    data = r.json()
    all_request_ids = [req.get("id") for req in data.get("data", [])]

    for rid in created_ids["requests"]:
        if rid in all_request_ids:
            log_pass(f"Request {rid[:8]}... still visible after operations")
        else:
            log_fail(f"Request {rid[:8]}... DISAPPEARED!", "Data persistence failure")

    r = requests.get(f"{BASE_URL}/clients", headers=h)
    data = r.json()
    all_client_ids = [c.get("id") for c in data.get("data", [])]
    for cid in created_ids["clients"]:
        if cid in all_client_ids:
            log_pass(f"Client {cid[:8]}... still visible")
        else:
            log_fail(f"Client {cid[:8]}... DISAPPEARED!")

    r = requests.get(f"{BASE_URL}/equipments?activeOnly=false", headers=h)
    data = r.json()
    all_equip_ids = [e.get("id") for e in data.get("data", [])]
    for eid in created_ids["equipments"]:
        if eid in all_equip_ids:
            log_pass(f"Equipment {eid[:8]}... still visible")
        else:
            log_fail(f"Equipment {eid[:8]}... DISAPPEARED!")

    return req_id

# ============================================================
# 7. UPLOAD TEST
# ============================================================
def test_upload(token):
    log_section("FILE UPLOAD")
    h = {"Authorization": f"Bearer {token}"}

    # Create a temporary test file
    test_file_content = b"Test file content for INOVAR upload validation"

    r = requests.post(
        f"{BASE_URL}/upload",
        headers=h,
        files={"file": ("test_upload.txt", test_file_content, "text/plain")},
    )
    data = r.json()
    if r.status_code == 200 and data.get("data", {}).get("url"):
        log_pass(f"UPLOAD file — URL: {data['data']['url']}")
    else:
        log_fail("UPLOAD file", str(data)[:300])

# ============================================================
# 8. SETTINGS
# ============================================================
def test_settings(token):
    log_section("SETTINGS")
    h = headers(token)

    r = requests.get(f"{BASE_URL}/settings", headers=h)
    data = r.json()
    if r.status_code == 200:
        log_pass("GET settings")
    else:
        log_fail("GET settings", str(data)[:200])

# ============================================================
# 9. NOTIFICATIONS
# ============================================================
def test_notifications(token):
    log_section("NOTIFICATIONS")
    h = headers(token)

    r = requests.get(f"{BASE_URL}/notifications", headers=h)
    data = r.json()
    if r.status_code == 200:
        notif_count = len(data.get("data", []))
        log_pass(f"GET notifications — {notif_count} found")
    else:
        log_fail("GET notifications", str(data)[:200])

# ============================================================
# MAIN
# ============================================================
def main():
    print("\n" + "=" * 60)
    print("  🚀 INOVAR — FULL SYSTEM VALIDATION TEST SUITE")
    print(f"  🌐 Target: {BASE_URL}")
    print(f"  ⏰ {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 1. Auth
    token = test_auth()
    if not token:
        print("\n❌ CRITICAL: Cannot proceed without authentication!")
        sys.exit(1)

    # 2. Company
    test_company(token)

    # 3. Users
    prestador_id, tecnico_id = test_users(token)

    # 4. Clients
    client_id = test_clients(token)

    # 5. Equipments
    equip_result = test_equipments(token, client_id)
    equip_ids = equip_result if equip_result else (None, None)

    # 6. Requests (Chamados)
    test_requests(token, client_id, equip_ids)

    # 7. Upload
    test_upload(token)

    # 8. Settings
    test_settings(token)

    # 9. Notifications
    test_notifications(token)

    # Final Report
    print("\n" + "=" * 60)
    print("  📊 FINAL RESULTS")
    print("=" * 60)
    print(f"  ✅ Passed: {results['passed']}")
    print(f"  ❌ Failed: {results['failed']}")
    total = results['passed'] + results['failed']
    if total > 0:
        rate = (results['passed'] / total) * 100
        print(f"  📈 Success Rate: {rate:.1f}%")

    if results['errors']:
        print(f"\n  🔴 Failed Tests:")
        for err in results['errors']:
            print(f"     • {err}")

    print("=" * 60)

    sys.exit(0 if results['failed'] == 0 else 1)

if __name__ == "__main__":
    main()

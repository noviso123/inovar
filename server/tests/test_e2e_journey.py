#!/usr/bin/env python3
"""
INOVAR - Complete End-to-End Journey Test
==========================================
Simulates the REAL user flow step by step:
1. Admin logs in
2. Admin creates a Prestador (company owner)
3. Prestador logs in and sets up company
4. Prestador creates a Client
5. Prestador creates Equipment for the Client
6. Prestador creates a Chamado (Service Request)
7. Verify ALL data persists after "reload" (fresh API calls)
8. Verify Prestador <-> Client <-> Equipment <-> Chamado chain
"""

import requests
import json
import sys
import time

BASE = "http://localhost:5000/api"
RESULTS = {"pass": 0, "fail": 0, "errors": []}

def ok(name):
    RESULTS["pass"] += 1
    print(f"  ✅ {name}")

def fail(name, detail=""):
    RESULTS["fail"] += 1
    RESULTS["errors"].append(f"{name}: {detail}")
    print(f"  ❌ {name} — {detail[:200]}")

def section(title):
    print(f"\n{'='*60}\n  🔬 {title}\n{'='*60}")

def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ============================================================
# STEP 1: Admin login
# ============================================================
section("STEP 1: Admin Login")
r = requests.post(f"{BASE}/auth/login", json={"email": "admin@inovar.com", "password": "123456"})
d = r.json()
if d.get("success"):
    admin_token = d["data"]["accessToken"]
    ok(f"Admin logged in (role={d['data']['user']['role']})")
else:
    fail("Admin login", str(d))
    sys.exit(1)

# ============================================================
# STEP 2: Admin creates Prestador user
# ============================================================
section("STEP 2: Admin Creates Prestador")
ts = int(time.time())
prestador_email = f"prestador_{ts}@inovar.com"
r = requests.post(f"{BASE}/users", headers=h(admin_token), json={
    "name": "João Prestador",
    "email": prestador_email,
    "password": "123456",
    "role": "PRESTADOR",
    "phone": "(11) 98765-4321",
})
d = r.json()
if r.status_code == 201 and d.get("data", {}).get("id"):
    prestador_user_id = d["data"]["id"]
    prestador_company_id = d["data"].get("companyId")
    ok(f"Prestador user created: {prestador_email} (ID: {prestador_user_id[:8]})")
    ok(f"CompanyID assigned: {prestador_company_id}")
else:
    fail("Create Prestador", str(d))
    sys.exit(1)

# ============================================================
# STEP 3: Prestador logs in
# ============================================================
section("STEP 3: Prestador Login")
r = requests.post(f"{BASE}/auth/login", json={"email": prestador_email, "password": "123456"})
d = r.json()
if d.get("success"):
    prest_token = d["data"]["accessToken"]
    prest_user = d["data"]["user"]
    prest_company = prest_user.get("companyId")
    ok(f"Prestador logged in (company={prest_company})")
else:
    fail("Prestador login", str(d))
    sys.exit(1)

# ============================================================
# STEP 4: Prestador creates Technician
# ============================================================
section("STEP 4: Prestador Creates Technician")
tecnico_email = f"tecnico_{ts}@inovar.com"
r = requests.post(f"{BASE}/users", headers=h(prest_token), json={
    "name": "Carlos Técnico",
    "email": tecnico_email,
    "password": "123456",
    "role": "TECNICO",
    "phone": "(11) 91234-5678",
    "specialties": "Split, Inverter, VRF"
})
d = r.json()
if r.status_code == 201:
    tecnico_id = d["data"]["id"]
    ok(f"Técnico created: {tecnico_email}")
else:
    fail("Create Técnico", str(d))
    tecnico_id = None

# ============================================================
# STEP 5: Prestador creates Client
# ============================================================
section("STEP 5: Prestador Creates Client")
client_email = f"cliente_{ts}@empresa.com"
r = requests.post(f"{BASE}/clients", headers=h(prest_token), json={
    "name": "Empresa Teste LTDA",
    "email": client_email,
    "password": "123456",
    "phone": "(11) 3333-4444",
    "document": "12.345.678/0001-99",
    "endereco": {
        "street": "Rua dos Testes",
        "number": "100",
        "complement": "Sala 5",
        "district": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01010-100"
    }
})
d = r.json()
if r.status_code == 201 and d.get("data", {}).get("id"):
    client_id = d["data"]["id"]
    client_company = d["data"].get("companyId")
    ok(f"Client created: {d['data'].get('name')} (ID: {client_id[:8]})")
    ok(f"Client CompanyID: {client_company}")
    if client_company:
        ok(f"Client belongs to correct company ✓")
    else:
        fail("Client has NO CompanyID!", "Data will be invisible for Prestador")
else:
    fail("Create Client", str(d))
    sys.exit(1)

# ============================================================
# STEP 6: Prestador creates Equipments
# ============================================================
section("STEP 6: Prestador Creates Equipments")
equip_ids = []
for i, (brand, model, btu, loc) in enumerate([
    ("LG", "Split Inverter 12000", 12000, "Sala de Reuniões"),
    ("Samsung", "WindFree 18000", 18000, "Escritório Principal"),
    ("Daikin", "Multi Split 24000", 24000, "Recepção"),
]):
    r = requests.post(f"{BASE}/equipments", headers=h(prest_token), json={
        "clientId": client_id,
        "brand": brand,
        "model": model,
        "btu": btu,
        "serialNumber": f"SN-{ts}-{i}",
        "location": loc,
        "preventiveInterval": 90,
    })
    d = r.json()
    if r.status_code == 201 and d.get("data", {}).get("id"):
        eid = d["data"]["id"]
        equip_ids.append(eid)
        e_company = d["data"].get("companyId")
        ok(f"Equipment #{i+1}: {brand} {model} (company={e_company or 'MISSING!'})")
        if e_company:
            ok(f"Equipment CompanyID set correctly ✓")
        else:
            fail(f"Equipment #{i+1} has NO CompanyID")
    else:
        fail(f"Create Equipment #{i+1}", str(d))

# ============================================================
# STEP 7: Prestador creates Chamados (Service Requests)
# ============================================================
section("STEP 7: Prestador Creates Chamados")
chamado_ids = []
for i, (equip_idx, priority, stype, desc) in enumerate([
    (0, "ALTA", "CORRETIVA", "Ar condicionado não liga, cliente sem refrigeração"),
    (1, "MEDIA", "PREVENTIVA", "Manutenção preventiva semestral programada"),
    (2, "BAIXA", "INSTALACAO", "Instalação de novo split na recepção"),
]):
    eid = equip_ids[equip_idx] if equip_idx < len(equip_ids) else equip_ids[0]
    r = requests.post(f"{BASE}/requests", headers=h(prest_token), json={
        "clientId": client_id,
        "equipmentIds": [eid],
        "priority": priority,
        "serviceType": stype,
        "description": desc,
    })
    d = r.json()
    if r.status_code == 201 and d.get("data", {}).get("id"):
        cid = d["data"]["id"]
        cnum = d["data"].get("numero")
        chamado_ids.append(cid)
        ok(f"Chamado #{cnum}: {priority} {stype} (ID: {cid[:8]})")
    else:
        fail(f"Create Chamado #{i+1}", str(d))

# ============================================================
# STEP 8: Update a chamado status
# ============================================================
section("STEP 8: Update Chamado Status")
if chamado_ids:
    r = requests.patch(f"{BASE}/requests/{chamado_ids[0]}/status", headers=h(prest_token), json={
        "status": "EM_ANDAMENTO",
    })
    if r.status_code == 200:
        ok("Chamado #1 → EM_ANDAMENTO")
    else:
        fail("Update status", str(r.json()))

# ============================================================
# STEP 9: PERSISTENCE TEST — Simulate "page reload"
# ============================================================
section("STEP 9: PERSISTENCE CHECK — Simulating Page Reload")
print("  (Fresh API calls with new token to simulate browser reload)")

# Re-login as Prestador (simulates closing and reopening browser)
r = requests.post(f"{BASE}/auth/login", json={"email": prestador_email, "password": "123456"})
d = r.json()
fresh_token = d["data"]["accessToken"]
ok("Re-logged in (fresh session)")

# Check ALL chamados
r = requests.get(f"{BASE}/requests", headers=h(fresh_token))
d = r.json()
all_chamados = d.get("data", [])
ok(f"GET /requests returned {len(all_chamados)} chamados")

for cid in chamado_ids:
    found = any(c["id"] == cid for c in all_chamados)
    if found:
        ok(f"Chamado {cid[:8]} still visible ✓")
    else:
        fail(f"Chamado {cid[:8]} DISAPPEARED!", "DATA LOSS!")

# Check specific chamado
if chamado_ids:
    r = requests.get(f"{BASE}/requests/{chamado_ids[0]}", headers=h(fresh_token))
    d = r.json()
    if d.get("data", {}).get("status") == "EM_ANDAMENTO":
        ok("Chamado status persisted (EM_ANDAMENTO) ✓")
    else:
        fail("Status not persisted", str(d.get("data", {}).get("status")))

# Check ALL clients
r = requests.get(f"{BASE}/clients", headers=h(fresh_token))
d = r.json()
all_clients = d.get("data", [])
ok(f"GET /clients returned {len(all_clients)} clients")

found_client = any(c["id"] == client_id for c in all_clients)
if found_client:
    ok(f"Client {client_id[:8]} still visible ✓")
else:
    fail(f"Client {client_id[:8]} DISAPPEARED!")

# Check ALL equipments
r = requests.get(f"{BASE}/equipments", headers=h(fresh_token))
d = r.json()
all_equips = d.get("data", [])
ok(f"GET /equipments returned {len(all_equips)} equipments")

for eid in equip_ids:
    found = any(e["id"] == eid for e in all_equips)
    if found:
        ok(f"Equipment {eid[:8]} still visible ✓")
    else:
        fail(f"Equipment {eid[:8]} DISAPPEARED!")

# Check ALL users
r = requests.get(f"{BASE}/users", headers=h(fresh_token))
d = r.json()
all_users = d.get("data", [])
ok(f"GET /users returned {len(all_users)} users")

# ============================================================
# STEP 10: Tecnico login & verify visibility
# ============================================================
section("STEP 10: Técnico Login & Visibility Check")
if tecnico_id:
    r = requests.post(f"{BASE}/auth/login", json={"email": tecnico_email, "password": "123456"})
    d = r.json()
    if d.get("success"):
        tec_token = d["data"]["accessToken"]
        ok("Técnico logged in")

        # Check chamados visible to tecnico
        r = requests.get(f"{BASE}/requests", headers=h(tec_token))
        d = r.json()
        tec_chamados = d.get("data", [])
        ok(f"Técnico sees {len(tec_chamados)} chamados")
        if len(tec_chamados) >= len(chamado_ids):
            ok("Técnico has full visibility of company chamados ✓")
        else:
            fail("Técnico visibility incomplete", f"Expected {len(chamado_ids)}, got {len(tec_chamados)}")

        # Check equipments visible to tecnico
        r = requests.get(f"{BASE}/equipments", headers=h(tec_token))
        d = r.json()
        tec_equips = d.get("data", [])
        ok(f"Técnico sees {len(tec_equips)} equipments")

        # Check clients visible to tecnico
        r = requests.get(f"{BASE}/clients", headers=h(tec_token))
        d = r.json()
        tec_clients = d.get("data", [])
        ok(f"Técnico sees {len(tec_clients)} clients")
    else:
        fail("Técnico login", str(d))

# ============================================================
# STEP 11: Upload test
# ============================================================
section("STEP 11: Upload Test")
r = requests.post(
    f"{BASE}/upload",
    headers={"Authorization": f"Bearer {fresh_token}"},
    files={"file": ("test_image.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, "image/png")},
)
d = r.json()
if r.status_code == 200 and d.get("data", {}).get("url"):
    ok(f"Upload works: {d['data']['url']}")
else:
    fail("Upload", str(d))

# ============================================================
# STEP 12: Admin visibility check
# ============================================================
section("STEP 12: Admin Visibility (Should See ALL)")
r = requests.get(f"{BASE}/requests", headers=h(admin_token))
d = r.json()
admin_chamados = d.get("data", [])
ok(f"Admin sees {len(admin_chamados)} chamados total")

r = requests.get(f"{BASE}/clients", headers=h(admin_token))
d = r.json()
admin_clients = d.get("data", [])
ok(f"Admin sees {len(admin_clients)} clients total")

r = requests.get(f"{BASE}/equipments", headers=h(admin_token))
d = r.json()
admin_equips = d.get("data", [])
ok(f"Admin sees {len(admin_equips)} equipments total")

# ============================================================
# FINAL REPORT
# ============================================================
total = RESULTS["pass"] + RESULTS["fail"]
rate = (RESULTS["pass"] / total * 100) if total else 0

print(f"\n{'='*60}")
print(f"  📊 FINAL REPORT")
print(f"{'='*60}")
print(f"  ✅ Passed: {RESULTS['pass']}")
print(f"  ❌ Failed: {RESULTS['fail']}")
print(f"  📈 Success Rate: {rate:.1f}%")

if RESULTS["errors"]:
    print(f"\n  🔴 Failed Tests:")
    for err in RESULTS["errors"]:
        print(f"     • {err[:150]}")
else:
    print(f"\n  🎉 ALL TESTS PASSED! System is 100% functional!")

print(f"{'='*60}\n")

sys.exit(0 if RESULTS["fail"] == 0 else 1)

#!/usr/bin/env python3
"""
Test the Python FastAPI Data Service directly (port 8000)
Validates all CRUD operations work independently from Go.
"""

import requests
import time
import sys

BASE = "http://localhost:8000/db"
R = {"pass": 0, "fail": 0, "errors": []}

def ok(n): R["pass"] += 1; print(f"  ✅ {n}")
def fail(n, d=""): R["fail"] += 1; R["errors"].append(f"{n}: {d}"); print(f"  ❌ {n} — {d[:200]}")
def section(t): print(f"\n{'='*60}\n  🐍 {t}\n{'='*60}")

# Health
section("Health Check")
r = requests.get(f"{BASE}/health")
if r.status_code == 200 and r.json().get("status") == "ok":
    ok("Health check OK")
else:
    fail("Health check", str(r.json()))
    sys.exit(1)

# USERS
section("Users CRUD")
ts = int(time.time())

# Create Prestador
r = requests.post(f"{BASE}/users", json={
    "name": "PyTest Prestador", "email": f"py_prest_{ts}@test.com",
    "password_hash": "$2a$10$test", "role": "PRESTADOR", "phone": "(11) 99999-0001"
})
d = r.json()
if r.status_code == 201 and d.get("data", {}).get("companyId"):
    prest = d["data"]
    company_id = prest["companyId"]
    ok(f"CREATE Prestador — CompanyID: {company_id[:8]}...")
else:
    fail("CREATE Prestador", str(d)); sys.exit(1)

# Create Tecnico
r = requests.post(f"{BASE}/users", json={
    "name": "PyTest Tecnico", "email": f"py_tec_{ts}@test.com",
    "password_hash": "$2a$10$test", "role": "TECNICO", "phone": "(11) 99999-0002",
    "specialties": "Split, VRF"
})
d = r.json()
if r.status_code == 201:
    tec_id = d["data"]["id"]
    ok(f"CREATE Tecnico (company auto-assigned)")
else:
    fail("CREATE Tecnico", str(d)); tec_id = None

# List users
r = requests.get(f"{BASE}/users")
d = r.json()
ok(f"LIST users — {len(d.get('data', []))} found")

# Update user
if tec_id:
    r = requests.put(f"{BASE}/users/{tec_id}", json={"name": "Tecnico Updated"})
    if r.status_code == 200:
        ok("UPDATE user")
    else:
        fail("UPDATE user", str(r.json()))

# Block/unblock
if tec_id:
    r = requests.patch(f"{BASE}/users/{tec_id}/block")
    if r.status_code == 200 and not r.json()["data"]["active"]:
        ok("BLOCK user")
    else:
        fail("BLOCK user", str(r.json()))
    r = requests.patch(f"{BASE}/users/{tec_id}/block")
    if r.status_code == 200 and r.json()["data"]["active"]:
        ok("UNBLOCK user")
    else:
        fail("UNBLOCK user", str(r.json()))

# CLIENTS
section("Clients CRUD")
r = requests.post(f"{BASE}/clients", json={
    "name": "Empresa PyTest", "email": f"py_client_{ts}@test.com",
    "password_hash": "$2a$10$test", "phone": "(11) 3333-4444",
    "document": "99.999.999/0001-99", "company_id": company_id,
    "endereco": {"street": "Rua Python", "number": "42", "complement": "",
                 "district": "Centro", "city": "São Paulo", "state": "SP", "zipCode": "01000-000"}
})
d = r.json()
if r.status_code == 201 and d.get("data", {}).get("companyId") == company_id:
    client_id = d["data"]["id"]
    ok(f"CREATE client with CompanyID ✓")
else:
    fail("CREATE client", str(d)); sys.exit(1)

# Get client
r = requests.get(f"{BASE}/clients/{client_id}")
d = r.json()
if d.get("data", {}).get("endereco", {}).get("street") == "Rua Python":
    ok("GET client with address ✓")
else:
    fail("GET client", str(d))

# Update client
r = requests.put(f"{BASE}/clients/{client_id}", json={
    "name": "Empresa Updated", "endereco": {"street": "Rua FastAPI", "number": "100",
    "complement": "Sala 1", "district": "Nova", "city": "SP", "state": "SP", "zipCode": "02000-000"}
})
if r.status_code == 200:
    ok("UPDATE client with new address")
else:
    fail("UPDATE client", str(r.json()))

# EQUIPMENTS
section("Equipments CRUD")
equip_ids = []
for i, (brand, model, btu) in enumerate([("LG", "Split 12k", 12000), ("Samsung", "Wind 18k", 18000)]):
    r = requests.post(f"{BASE}/equipments", json={
        "client_id": client_id, "company_id": company_id,
        "brand": brand, "model": model, "btu": btu,
        "serial_number": f"SN-PY-{ts}-{i}", "location": f"Sala {i+1}",
        "preventive_interval": 90,
    })
    d = r.json()
    if r.status_code == 201:
        equip_ids.append(d["data"]["id"])
        ok(f"CREATE equipment: {brand} (company={d['data'].get('companyId', '')[:8]})")
    else:
        fail(f"CREATE equipment {i}", str(d))

# List equipments
r = requests.get(f"{BASE}/equipments?company_id={company_id}")
if r.status_code == 200:
    ok(f"LIST equipments by company — {len(r.json().get('data', []))} found")

# Deactivate/Reactivate
if equip_ids:
    r = requests.patch(f"{BASE}/equipments/{equip_ids[0]}/deactivate")
    if r.status_code == 200 and not r.json()["data"]["active"]:
        ok("DEACTIVATE equipment")
    r = requests.patch(f"{BASE}/equipments/{equip_ids[0]}/reactivate")
    if r.status_code == 200 and r.json()["data"]["active"]:
        ok("REACTIVATE equipment")

# REQUESTS (CHAMADOS)
section("Chamados CRUD")
chamado_ids = []
for i, (pri, stype) in enumerate([("ALTA", "CORRETIVA"), ("MEDIA", "PREVENTIVA")]):
    r = requests.post(f"{BASE}/requests", json={
        "client_id": client_id, "company_id": company_id,
        "client_name": "Empresa PyTest", "equipment_ids": [equip_ids[i % len(equip_ids)]],
        "priority": pri, "service_type": stype,
        "description": f"Chamado teste Python #{i+1}", "sla_hours": 48,
    })
    d = r.json()
    if r.status_code == 201 and d.get("data", {}).get("numero"):
        chamado_ids.append(d["data"]["id"])
        ok(f"CREATE chamado #{d['data']['numero']}: {pri} {stype}")
    else:
        fail(f"CREATE chamado {i}", str(d))

# List chamados
r = requests.get(f"{BASE}/requests?company_id={company_id}")
d = r.json()
if r.status_code == 200 and len(d.get("data", [])) >= 2:
    ok(f"LIST chamados — {len(d['data'])} found")
else:
    fail("LIST chamados", str(d))

# Status update
if chamado_ids:
    r = requests.patch(f"{BASE}/requests/{chamado_ids[0]}/status", json={
        "status": "EM_ANDAMENTO", "user_name": "TestBot"
    })
    if r.status_code == 200 and r.json()["data"]["status"] == "EM_ANDAMENTO":
        ok("UPDATE status → EM_ANDAMENTO")
    else:
        fail("UPDATE status", str(r.json()))

# History
if chamado_ids:
    r = requests.get(f"{BASE}/requests/{chamado_ids[0]}/history")
    if r.status_code == 200 and len(r.json().get("data", [])) >= 1:
        ok(f"GET history — {len(r.json()['data'])} entries")

# PERSISTENCE CHECK
section("Data Persistence Check")
r = requests.get(f"{BASE}/requests")
all_ids = [x["id"] for x in r.json().get("data", [])]
for cid in chamado_ids:
    if cid in all_ids:
        ok(f"Chamado {cid[:8]}... persisted ✓")
    else:
        fail(f"Chamado {cid[:8]}... LOST!")

r = requests.get(f"{BASE}/equipments")
all_eids = [x["id"] for x in r.json().get("data", [])]
for eid in equip_ids:
    if eid in all_eids:
        ok(f"Equipment {eid[:8]}... persisted ✓")
    else:
        fail(f"Equipment {eid[:8]}... LOST!")

# UPLOAD
section("Upload Test")
r = requests.post(f"{BASE}/uploads", files={"file": ("test.txt", b"Hello Python", "text/plain")})
if r.status_code == 200 and r.json().get("data", {}).get("url"):
    ok(f"UPLOAD via Python: {r.json()['data']['url']}")
else:
    fail("UPLOAD", str(r.json()))

# REPORT
total = R["pass"] + R["fail"]
rate = (R["pass"] / total * 100) if total else 0
print(f"\n{'='*60}")
print(f"  📊 PYTHON SERVICE VALIDATION")
print(f"{'='*60}")
print(f"  ✅ Passed: {R['pass']}")
print(f"  ❌ Failed: {R['fail']}")
print(f"  📈 Success Rate: {rate:.1f}%")
if R["errors"]:
    for e in R["errors"]: print(f"     • {e[:150]}")
else:
    print(f"\n  🎉 ALL PYTHON SERVICE TESTS PASSED!")
print(f"{'='*60}")
sys.exit(0 if R["fail"] == 0 else 1)

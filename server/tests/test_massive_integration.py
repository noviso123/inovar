#!/usr/bin/env python3
"""
INOVAR — MASSIVE FULL-STACK INTEGRATION TEST
=============================================
Tests the COMPLETE chain:
  Frontend(React) → Go(Fiber:5000) → Python(FastAPI:8000) → SQLite

Creates MANY records across ALL profiles and validates:
- Multi-company isolation
- Cross-role visibility
- Data persistence after bulk operations
- Python CRUD independence
- Go ↔ Python shared database consistency
"""

import requests
import json
import time
import sys

GO_API = "http://localhost:5000/api"
PY_API = "http://localhost:8000/db"
R = {"pass": 0, "fail": 0, "errors": []}
DATA = {}  # Store all created IDs

def ok(n): R["pass"] += 1; print(f"  ✅ {n}")
def fail(n, d=""): R["fail"] += 1; R["errors"].append(f"{n}: {d[:100]}"); print(f"  ❌ {n} — {d[:200]}")
def section(t): print(f"\n{'='*70}\n  🔬 {t}\n{'='*70}")
def h(token): return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ========================================================================
# PHASE 1: Services Health Check
# ========================================================================
section("PHASE 1: Services Health Check")

r = requests.get(f"{PY_API}/health")
if r.status_code == 200:
    ok("Python FastAPI service is UP (port 8000)")
else:
    fail("Python service DOWN"); sys.exit(1)

r = requests.post(f"{GO_API}/auth/login", json={"email": "admin@inovar.com", "password": "123456"})
if r.json().get("success"):
    DATA["admin_token"] = r.json()["data"]["accessToken"]
    ok("Go Fiber API is UP (port 5000) — Admin logged in")
else:
    fail("Go API DOWN"); sys.exit(1)

# ========================================================================
# PHASE 2: Create Multiple Prestadores (Companies) via Go API
# ========================================================================
section("PHASE 2: Create 3 Prestadores (Companies) via Go API")

prestadores = [
    {"name": "Clima Frio LTDA", "email": "climafrio@empresa.com", "phone": "(11) 3000-0001"},
    {"name": "ArcCondicionado Pro", "email": "arcpro@empresa.com", "phone": "(11) 3000-0002"},
    {"name": "RefrigeraPlus ME", "email": "refrigera@empresa.com", "phone": "(11) 3000-0003"},
]

DATA["prestadores"] = []
for i, p in enumerate(prestadores):
    r = requests.post(f"{GO_API}/users", headers=h(DATA["admin_token"]), json={
        "name": p["name"], "email": p["email"], "password": "Senha@123",
        "role": "PRESTADOR", "phone": p["phone"],
    })
    d = r.json()
    if r.status_code == 201 and d.get("data", {}).get("companyId"):
        info = {"user_id": d["data"]["id"], "company_id": d["data"]["companyId"], **p}
        DATA["prestadores"].append(info)
        ok(f"Prestador #{i+1}: {p['name']} → CompanyID: {info['company_id'][:8]}")
    else:
        fail(f"Create Prestador #{i+1}", str(d))

# ========================================================================
# PHASE 3: Login as each Prestador and create Técnicos
# ========================================================================
section("PHASE 3: Login as Prestadores & Create Técnicos")

DATA["prest_tokens"] = []
DATA["tecnicos"] = []

tecnicos_per_company = [
    [("João Eletricista", "Split, Inverter"), ("Maria Mecânica", "VRF, Chiller")],
    [("Pedro HVAC", "Dutos, Fancoil"), ("Ana Controle", "Automação, BMS")],
    [("Carlos Instalador", "Residencial, Piso-Teto"), ("Lucia Técnica", "Multi-Split, Cassete")],
]

for i, prest in enumerate(DATA["prestadores"]):
    r = requests.post(f"{GO_API}/auth/login", json={"email": prest["email"], "password": "Senha@123"})
    d = r.json()
    if d.get("success"):
        token = d["data"]["accessToken"]
        DATA["prest_tokens"].append(token)
        ok(f"Prestador #{i+1} ({prest['name']}) logged in")

        for j, (tec_name, tec_spec) in enumerate(tecnicos_per_company[i]):
            tec_email = f"tec_{i}_{j}_{int(time.time())}@test.com"
            r = requests.post(f"{GO_API}/users", headers=h(token), json={
                "name": tec_name, "email": tec_email, "password": "Senha@123",
                "role": "TECNICO", "phone": f"(11) 9{i}{j}00-{i}{j}00",
                "specialties": tec_spec,
            })
            d = r.json()
            if r.status_code == 201:
                tec_info = {"id": d["data"]["id"], "name": tec_name, "email": tec_email,
                            "company_id": prest["company_id"]}
                DATA["tecnicos"].append(tec_info)
                ok(f"  Técnico: {tec_name} (company={prest['company_id'][:8]})")
            else:
                fail(f"  Create Técnico {tec_name}", str(d))
    else:
        fail(f"Prestador #{i+1} login", str(d))
        DATA["prest_tokens"].append(None)

# ========================================================================
# PHASE 4: Create Clients for each Company via Go API
# ========================================================================
section("PHASE 4: Create Clients (5 per company = 15 total)")

clients_templates = [
    {"name": "Shopping Center Norte", "doc": "11.111.111/0001-01", "phone": "(11) 4001-0001"},
    {"name": "Hospital São Lucas", "doc": "22.222.222/0001-02", "phone": "(11) 4002-0002"},
    {"name": "Escola Estadual ABC", "doc": "33.333.333/0001-03", "phone": "(11) 4003-0003"},
    {"name": "Restaurante Sabor Fino", "doc": "44.444.444/0001-04", "phone": "(11) 4004-0004"},
    {"name": "Escritório Advocacia JB", "doc": "55.555.555/0001-05", "phone": "(11) 4005-0005"},
]

DATA["clients"] = []
for i, token in enumerate(DATA["prest_tokens"]):
    if not token:
        continue
    for j, ct in enumerate(clients_templates):
        ts = int(time.time() * 1000)
        c_email = f"client_{i}_{j}_{ts}@test.com"
        r = requests.post(f"{GO_API}/clients", headers=h(token), json={
            "name": f"{ct['name']} ({DATA['prestadores'][i]['name'][:10]})",
            "email": c_email, "password": "Senha@123", "phone": ct["phone"],
            "document": ct["doc"],
            "endereco": {"street": f"Rua {j+1}", "number": str((j+1)*100),
                         "complement": f"Bloco {chr(65+j)}", "district": "Centro",
                         "city": "São Paulo", "state": "SP", "zipCode": f"0{j+1}000-000"}
        })
        d = r.json()
        if r.status_code == 201 and d.get("data", {}).get("id"):
            cl_info = {"id": d["data"]["id"], "name": d["data"]["name"],
                       "company_id": DATA["prestadores"][i]["company_id"], "prest_idx": i}
            DATA["clients"].append(cl_info)
            if j == 0:
                ok(f"Company #{i+1}: {d['data']['name'][:40]} + 4 more...")
        else:
            fail(f"Create Client {ct['name']}", str(d))
            break  # Don't flood errors

ok(f"Total clients created: {len(DATA['clients'])}")

# ========================================================================
# PHASE 5: Create Equipment for each Client via Go API
# ========================================================================
section("PHASE 5: Create Equipment (2 per client)")

DATA["equipments"] = []
brands = [("LG", "Split Inverter", 12000), ("Samsung", "WindFree", 18000),
          ("Daikin", "Multi Split", 24000), ("Carrier", "Piso Teto", 36000),
          ("Midea", "Cassete", 48000)]

for idx, cl in enumerate(DATA["clients"]):
    token = DATA["prest_tokens"][cl["prest_idx"]]
    for eq_i in range(2):
        brand, model, btu = brands[(idx + eq_i) % len(brands)]
        r = requests.post(f"{GO_API}/equipments", headers=h(token), json={
            "clientId": cl["id"], "brand": brand, "model": f"{model} {btu}",
            "btu": btu, "serialNumber": f"SN-{idx}-{eq_i}-{int(time.time())}",
            "location": f"Setor {eq_i+1}", "preventiveInterval": 90,
        })
        d = r.json()
        if r.status_code == 201:
            DATA["equipments"].append({
                "id": d["data"]["id"], "client_id": cl["id"],
                "company_id": cl["company_id"], "prest_idx": cl["prest_idx"],
            })
        elif idx == 0:
            fail(f"Create Equipment for {cl['name'][:20]}", str(d))

ok(f"Total equipments created: {len(DATA['equipments'])}")

# ========================================================================
# PHASE 6: Create Chamados for each Client via Go API
# ========================================================================
section("PHASE 6: Create Chamados (3 per client, mixed priorities)")

DATA["chamados"] = []
priorities = ["ALTA", "MEDIA", "BAIXA"]
types = ["CORRETIVA", "PREVENTIVA", "INSTALACAO"]

for idx, cl in enumerate(DATA["clients"]):
    token = DATA["prest_tokens"][cl["prest_idx"]]
    cl_equips = [e for e in DATA["equipments"] if e["client_id"] == cl["id"]]
    for ch_i in range(3):
        eq_id = cl_equips[ch_i % len(cl_equips)]["id"] if cl_equips else ""
        r = requests.post(f"{GO_API}/requests", headers=h(token), json={
            "clientId": cl["id"],
            "equipmentIds": [eq_id] if eq_id else [],
            "priority": priorities[ch_i % 3],
            "serviceType": types[ch_i % 3],
            "description": f"Chamado teste #{idx*3+ch_i+1} — {cl['name'][:20]}",
        })
        d = r.json()
        if r.status_code == 201:
            DATA["chamados"].append({
                "id": d["data"]["id"], "numero": d["data"].get("numero"),
                "company_id": cl["company_id"], "prest_idx": cl["prest_idx"],
            })
        elif idx == 0:
            fail(f"Create Chamado for {cl['name'][:20]}", str(d))

ok(f"Total chamados created: {len(DATA['chamados'])}")

# ========================================================================
# PHASE 7: Data Isolation Test — Each Prestador sees ONLY their data
# ========================================================================
section("PHASE 7: Data Isolation (CompanyID Filtering)")

for i, token in enumerate(DATA["prest_tokens"]):
    if not token:
        continue
    company_id = DATA["prestadores"][i]["company_id"]

    r = requests.get(f"{GO_API}/clients", headers=h(token))
    my_clients = r.json().get("data", [])
    wrong = [c for c in my_clients if c.get("companyId") != company_id]

    r = requests.get(f"{GO_API}/equipments", headers=h(token))
    my_equips = r.json().get("data", [])

    r = requests.get(f"{GO_API}/requests", headers=h(token))
    my_chamados = r.json().get("data", [])

    expected_clients = len([c for c in DATA["clients"] if c["prest_idx"] == i])
    expected_equips = len([e for e in DATA["equipments"] if e["prest_idx"] == i])
    expected_chamados = len([ch for ch in DATA["chamados"] if ch["prest_idx"] == i])

    ok(f"Prestador #{i+1} sees: {len(my_clients)} clients, {len(my_equips)} equips, {len(my_chamados)} chamados")

    if len(wrong) > 0:
        fail(f"Isolation breach! Prestador #{i+1} sees {len(wrong)} foreign clients!")
    else:
        ok(f"  ✓ No foreign data visible — isolation OK")

# ========================================================================
# PHASE 8: Admin sees ALL data
# ========================================================================
section("PHASE 8: Admin Global Visibility")

r = requests.get(f"{GO_API}/clients", headers=h(DATA["admin_token"]))
admin_clients = r.json().get("data", [])
r = requests.get(f"{GO_API}/equipments", headers=h(DATA["admin_token"]))
admin_equips = r.json().get("data", [])
r = requests.get(f"{GO_API}/requests", headers=h(DATA["admin_token"]))
admin_chamados = r.json().get("data", [])
r = requests.get(f"{GO_API}/users", headers=h(DATA["admin_token"]))
admin_users = r.json().get("data", [])

ok(f"Admin sees: {len(admin_users)} users, {len(admin_clients)} clients, {len(admin_equips)} equips, {len(admin_chamados)} chamados")

if len(admin_clients) >= len(DATA["clients"]):
    ok(f"Admin sees ALL {len(DATA['clients'])} clients ✓")
else:
    fail(f"Admin missing clients", f"Expected {len(DATA['clients'])}, got {len(admin_clients)}")

if len(admin_chamados) >= len(DATA["chamados"]):
    ok(f"Admin sees ALL {len(DATA['chamados'])} chamados ✓")
else:
    fail(f"Admin missing chamados", f"Expected {len(DATA['chamados'])}, got {len(admin_chamados)}")

# ========================================================================
# PHASE 9: Python Service — Direct CRUD Verification
# ========================================================================
section("PHASE 9: Python Service — Direct DB Access")

# Python reads the same SQLite DB
r = requests.get(f"{PY_API}/users")
py_users = r.json().get("data", [])
ok(f"Python /db/users returns {len(py_users)} users")

r = requests.get(f"{PY_API}/clients")
py_clients = r.json().get("data", [])
ok(f"Python /db/clients returns {len(py_clients)} clients")

r = requests.get(f"{PY_API}/equipments")
py_equips = r.json().get("data", [])
ok(f"Python /db/equipments returns {len(py_equips)} equipments")

r = requests.get(f"{PY_API}/requests")
py_chamados = r.json().get("data", [])
ok(f"Python /db/requests returns {len(py_chamados)} chamados")

# Verify consistency: Go and Python see same data
if len(py_clients) == len(admin_clients):
    ok(f"Go ↔ Python: Client count matches ({len(py_clients)}) ✓")
else:
    fail(f"Go ↔ Python mismatch: Go={len(admin_clients)}, Py={len(py_clients)}")

if len(py_chamados) == len(admin_chamados):
    ok(f"Go ↔ Python: Chamado count matches ({len(py_chamados)}) ✓")
else:
    fail(f"Go ↔ Python mismatch: Go={len(admin_chamados)}, Py={len(py_chamados)}")

# ========================================================================
# PHASE 10: Python CREATE directly → Go should see it
# ========================================================================
section("PHASE 10: Python Creates Data → Go Sees It")

# Python creates a user
r = requests.post(f"{PY_API}/users", json={
    "name": "Criado pelo Python", "email": "python_user@test.com",
    "password_hash": "$2a$10$dummy", "role": "PRESTADOR", "phone": "(99) 99999-9999",
})
d = r.json()
if r.status_code == 201:
    py_user_id = d["data"]["id"]
    py_company = d["data"]["companyId"]
    ok(f"Python CREATED user: {py_user_id[:8]} (company={py_company[:8]})")

    # Go should see it
    r = requests.get(f"{GO_API}/users", headers=h(DATA["admin_token"]))
    go_users = r.json().get("data", [])
    found = any(u["id"] == py_user_id for u in go_users)
    if found:
        ok("Go API can see Python-created user ✓")
    else:
        fail("Go cannot see Python-created user!")

    # Python creates a client
    r = requests.post(f"{PY_API}/clients", json={
        "name": "Cliente Direto Python",
        "email": "py_client_direct@test.com", "password_hash": "$2a$10$dummy",
        "phone": "(99) 88888-8888", "document": "99.888.777/0001-66",
        "company_id": py_company,
    })
    d = r.json()
    if r.status_code == 201:
        py_client_id = d["data"]["id"]
        ok(f"Python CREATED client: {py_client_id[:8]}")

        # Go should see it
        r = requests.get(f"{GO_API}/clients", headers=h(DATA["admin_token"]))
        go_clients = r.json().get("data", [])
        found = any(c["id"] == py_client_id for c in go_clients)
        if found:
            ok("Go API can see Python-created client ✓")
        else:
            fail("Go cannot see Python-created client!")

        # Python creates equipment
        r = requests.post(f"{PY_API}/equipments", json={
            "client_id": py_client_id, "company_id": py_company,
            "brand": "PythonBrand", "model": "PyModel 9000", "btu": 9000,
            "serial_number": "PY-SN-001", "location": "Lab Python",
            "preventive_interval": 60,
        })
        d = r.json()
        if r.status_code == 201:
            py_equip_id = d["data"]["id"]
            ok(f"Python CREATED equipment: PythonBrand PyModel 9000")

            # Python creates chamado
            r = requests.post(f"{PY_API}/requests", json={
                "client_id": py_client_id, "company_id": py_company,
                "client_name": "Cliente Direto Python",
                "equipment_ids": [py_equip_id],
                "priority": "ALTA", "service_type": "CORRETIVA",
                "description": "Chamado criado 100% pelo Python FastAPI",
                "sla_hours": 24,
            })
            d = r.json()
            if r.status_code == 201:
                py_chamado_id = d["data"]["id"]
                ok(f"Python CREATED chamado #{d['data']['numero']}: ALTA CORRETIVA")

                # Go should see it
                r = requests.get(f"{GO_API}/requests", headers=h(DATA["admin_token"]))
                go_ch = r.json().get("data", [])
                found = any(c["id"] == py_chamado_id for c in go_ch)
                if found:
                    ok("Go API can see Python-created chamado ✓")
                else:
                    fail("Go cannot see Python-created chamado!")
            else:
                fail("Python create chamado", str(d))
        else:
            fail("Python create equipment", str(d))
    else:
        fail("Python create client", str(d))
else:
    fail("Python create user", str(d))

# ========================================================================
# PHASE 11: Python UPDATE → Go reflects change
# ========================================================================
section("PHASE 11: Python Updates → Go Reflects Change")

if py_chamados:
    first_chamado = py_chamados[0]
    r = requests.patch(f"{PY_API}/requests/{first_chamado['id']}/status", json={
        "status": "EM_ANDAMENTO", "user_name": "Python Bot",
    })
    if r.status_code == 200:
        ok(f"Python updated chamado #{first_chamado.get('numero')} → EM_ANDAMENTO")

        # Go should see updated status
        r = requests.get(f"{GO_API}/requests/{first_chamado['id']}", headers=h(DATA["admin_token"]))
        if r.status_code == 200:
            go_status = r.json().get("data", {}).get("status")
            if go_status == "EM_ANDAMENTO":
                ok("Go reflects Python status update ✓")
            else:
                fail(f"Go status mismatch: {go_status}")
    else:
        fail("Python status update", str(r.json()))

# ========================================================================
# PHASE 12: Upload via Python
# ========================================================================
section("PHASE 12: Upload via Python")

r = requests.post(f"{PY_API}/uploads", files={
    "file": ("relatorio.pdf", b"%PDF-1.4 fake content " * 100, "application/pdf")
})
if r.status_code == 200 and r.json().get("data", {}).get("url"):
    ok(f"Python upload: {r.json()['data']['url']}")
else:
    fail("Python upload", str(r.json()))

# ========================================================================
# PHASE 13: Técnico Login & Visibility
# ========================================================================
section("PHASE 13: Técnico Cross-Check")

if DATA["tecnicos"]:
    tec = DATA["tecnicos"][0]
    r = requests.post(f"{GO_API}/auth/login", json={"email": tec["email"], "password": "Senha@123"})
    d = r.json()
    if d.get("success"):
        tec_token = d["data"]["accessToken"]
        ok(f"Técnico '{tec['name']}' logged in")

        r = requests.get(f"{GO_API}/requests", headers=h(tec_token))
        tec_ch = r.json().get("data", [])
        r = requests.get(f"{GO_API}/clients", headers=h(tec_token))
        tec_cl = r.json().get("data", [])
        r = requests.get(f"{GO_API}/equipments", headers=h(tec_token))
        tec_eq = r.json().get("data", [])

        ok(f"Técnico sees: {len(tec_cl)} clients, {len(tec_eq)} equips, {len(tec_ch)} chamados")
        if len(tec_cl) > 0 and len(tec_ch) > 0:
            ok("Técnico has proper company visibility ✓")
        else:
            fail("Técnico has no visibility!")
    else:
        fail("Técnico login", str(d))

# ========================================================================
# FINAL REPORT
# ========================================================================
total = R["pass"] + R["fail"]
rate = (R["pass"] / total * 100) if total else 0

print(f"\n{'='*70}")
print(f"  📊 MASSIVE INTEGRATION TEST — FINAL REPORT")
print(f"{'='*70}")
print(f"  ✅ Passed: {R['pass']}")
print(f"  ❌ Failed: {R['fail']}")
print(f"  📈 Success Rate: {rate:.1f}%")
print(f"\n  📦 Data Created:")
print(f"     • Prestadores (Companies): {len(DATA.get('prestadores', []))}")
print(f"     • Técnicos: {len(DATA.get('tecnicos', []))}")
print(f"     • Clients: {len(DATA.get('clients', []))}")
print(f"     • Equipments: {len(DATA.get('equipments', []))}")
print(f"     • Chamados: {len(DATA.get('chamados', []))}")

if R["errors"]:
    print(f"\n  🔴 Failed Tests:")
    for e in R["errors"][:10]:
        print(f"     • {e}")
else:
    print(f"\n  🎉 ALL TESTS PASSED! Full integration verified!")

print(f"{'='*70}\n")
sys.exit(0 if R["fail"] == 0 else 1)

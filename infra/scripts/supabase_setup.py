import requests
import json
import time
import os

SUPABASE_TOKEN = "sbp_v0_4d6ff9df7ff5f1b36ad271643b78eb9ca74951b8"
API_URL = "https://api.supabase.com/v1"
PROJECT_NAME = "inovar-gestao"
ORG_ID = "" # Will be fetched

headers = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json"
}

def log(msg):
    print(f"[SupabaseSetup] {msg}")

def get_organizations():
    resp = requests.get(f"{API_URL}/organizations", headers=headers)
    if resp.status_code != 200:
        log(f"Error fetching organizations: {resp.text}")
        return []
    return resp.json()

def get_projects():
    resp = requests.get(f"{API_URL}/projects", headers=headers)
    if resp.status_code != 200:
        log(f"Error fetching projects: {resp.text}")
        return []
    return resp.json()

def get_project_api_keys(project_ref):
    resp = requests.get(f"{API_URL}/projects/{project_ref}/api-keys", headers=headers)
    if resp.status_code != 200:
        log(f"Error fetching API keys: {resp.text}")
        return []
    return resp.json()

def main():
    log("Checking for existing projects...")
    projects = get_projects()
    target_project = None

    for p in projects:
        if p.get('name') == PROJECT_NAME:
            target_project = p
            break

    if target_project:
        log(f"Found existing project: {target_project['name']} (Ref: {target_project['id']})")
        if target_project['status'] != 'ACTIVE_HEALTHY':
             log(f"Project status is {target_project['status']}. Might not be ready.")
    else:
        log(f"Project '{PROJECT_NAME}' not found.")
        # Attempt to create (requires calling organization first)
        orgs = get_organizations()
        if not orgs:
            log("No organizations found. Cannot create project.")
            return

        org_id = orgs[0]['id']
        log(f"Using Organization: {orgs[0]['name']} ({org_id})")

        # Create
        payload = {
            "name": PROJECT_NAME,
            "organization_id": org_id,
            "region": "sa-east-1", # Sao Paulo
            "plan": "free",
            "db_pass": "Inovar@2026!Secure" # Hardcoded secure password for initial setup
        }
        log("Creating project... (This may take a few minutes)")
        resp = requests.post(f"{API_URL}/projects", headers=headers, json=payload)

        if resp.status_code == 201:
            target_project = resp.json()
            log(f"Project created! Ref: {target_project['id']}")
            log("Waiting for project to be ready...")
            # We won't wait forever effectively here, just inform user
        else:
            log(f"Failed to create project: {resp.text}")
            return

    # If we have a project, get keys
    if target_project:
        ref = target_project['id']
        # The project might not be ready, so getting keys might fail or be partial
        # But commonly keys are generated immediately even if DB is provisioning
        keys = get_project_api_keys(ref)

        anon_key = next((k['api_key'] for k in keys if k['name'] == 'anon'), None)
        service_key = next((k['api_key'] for k in keys if k['name'] == 'service_role'), None)

        db_url = f"postgres://postgres.::{target_project.get('db_pass', 'Inovar@2026!Secure')}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
        # Note: Connection string construction via API is tricky because password isn't returned for existing projects
        # If existing, we don't know the password!

        log("-" * 30)
        log("CONFIGURATION DETAILS")
        log(f"SUPABASE_URL=https://{ref}.supabase.co")
        if anon_key:
            log(f"SUPABASE_KEY={anon_key}")
        if service_key:
            log(f"SUPABASE_SERVICE_ROLE_KEY={service_key}")

        if 'db_pass' not in target_project:
             log("WARNING: For existing projects, I cannot retrieve the DB Password.")
             log("You must provide the connection string manually if you don't know the password.")
        else:
             # We just created it, so we know the password
             log(f"DATABASE_URL=postgres://postgres:{target_project['db_pass']}@db.{ref}.supabase.co:5432/postgres")
        log("-" * 30)

if __name__ == "__main__":
    main()

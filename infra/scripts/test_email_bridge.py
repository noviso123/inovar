import sys
import os
import json
import subprocess

def call_bridge(action, params):
    cmd_input = json.dumps({"action": action, "params": params})
    # Run bridge.py as a subprocess
    result = subprocess.run(
        [sys.executable, "infra/scripts/bridge.py", cmd_input],
        capture_output=True,
        text=True,
        encoding='utf-8'
    )
    if result.returncode != 0:
        return {"success": False, "error": result.stderr}
    try:
        return json.loads(result.stdout)
    except:
        return {"success": False, "error": result.stdout}

def test_email_queueing():
    print("Testing E-mail Queuing (Simulating SMTP failure)...")
    # ... rest of function ...
    params = {
        "to": "test@example.com",
        "subject": "Test Bridge Queue",
        "body": "<h1>Test</h1><p>This should be queued.</p>"
    }

    # Temporarily unset SMTP envs if they exist to force queuing
    old_user = os.environ.get("SMTP_USER")
    if "SMTP_USER" in os.environ: del os.environ["SMTP_USER"]

    resp = call_bridge("send_email", params)
    print(f"Result: {resp}")

    if resp.get("success") and resp.get("queued"):
        print("SUCCESS: Email was correctly queued due to missing credentials.")
        # Check if file exists in infra/emails/queue
        queue_dir = "infra/emails/queue"
        files = os.listdir(queue_dir)
        if len(files) > 0:
            print(f"SUCCESS: Found {len(files)} files in queue folder.")
            # Clean up test file
            for f in files:
                os.remove(os.path.join(queue_dir, f))
        else:
            print("FAILURE: Queue folder is empty!")
    else:
        print(f"FAILURE: Unexpected bridge response: {resp}")

    if old_user: os.environ["SMTP_USER"] = old_user

if __name__ == "__main__":
    test_email_queueing()

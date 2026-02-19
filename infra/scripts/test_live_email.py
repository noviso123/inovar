import sys
import os
import json
import subprocess

def test_live_email():
    params = {
        "to": "jtsatiro@hotmail.com",
        "subject": "Teste Inovar - Debug Live",
        "body": "<h1>Teste Inovar</h1><p>Verificando entrega para jtsatiro@hotmail.com.</p>"
    }
    cmd_input = json.dumps({"action": "send_email", "params": params})

    print(f"Sending to bridge: {cmd_input}")

    # Run bridge.py
    # We use subprocess.run so we can see stderr which now contains our logs
    result = subprocess.run(
        [sys.executable, "infra/scripts/bridge.py", cmd_input],
        capture_output=True,
        text=True,
        encoding='utf-8'
    )

    print("--- STDERR (Logs) ---")
    print(result.stderr)
    print("--- STDOUT (JSON Result) ---")
    print(result.stdout)
    print("-------------------------")

if __name__ == "__main__":
    test_live_email()

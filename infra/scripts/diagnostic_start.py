import subprocess
import os
import sys

def run_diagnostic():
    print("🚀 Starting Diagnostic Backend Run...")

    env = os.environ.copy()
    # Ensure we look at the right .env

    # Run go run ./cmd/api/main.go
    process = subprocess.Popen(
        ["go", "run", "./cmd/api/main.go"],
        cwd="server",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        bufsize=0,
        text=True,
        encoding='utf-8',
        errors='replace'
    )

    try:
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(f"[BACKEND] {line.strip()}")
                if "error" in line.lower() or "fatal" in line.lower() or "panic" in line.lower():
                    print("❌ Error detected!")
    except KeyboardInterrupt:
        process.terminate()

    print(f"Backend exited with code {process.returncode}")

if __name__ == "__main__":
    run_diagnostic()

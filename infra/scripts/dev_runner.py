import subprocess
import threading
import sys
import os
import time
import signal
import platform

# Configuration
BACKEND_PORT = 5000
FRONTEND_PORT = 5173
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
SERVER_DIR = os.path.join(PROJECT_ROOT, "server")
CLIENT_DIR = os.path.join(PROJECT_ROOT, "client")

# Colors for logging
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(tag, message, color=Colors.ENDC):
    print(f"{color}[{tag}] {message}{Colors.ENDC}")

class ServiceManager:
    def __init__(self):
        self.processes = []
        self.running = True

    def stream_output(self, process, tag, color):
        """Reads stdout from a process and prints it with a tag."""
        try:
            for line in iter(process.stdout.readline, b''):
                if not self.running:
                    break
                line_str = line.decode('utf-8', errors='replace').strip()
                if line_str:
                    log(tag, line_str, color)
        except Exception as e:
            log("ERROR", f"Error streaming output for {tag}: {e}", Colors.FAIL)

    def start_service(self, name, command, cwd, color, env=None):
        """Starts a subprocess and spawns a thread to monitor its output."""
        log("SYSTEM", f"Starting {name}...", Colors.HEADER)

        try:
            # shell=True is often needed on Windows for commands like 'npm' or 'go' if not direct executables
            # However, for 'go run', we can use direct list properly if on Linux, but on Windows likely fine.
            # Using shell=False and full paths is safer generally, but 'npm' is a batch file on Windows.
            use_shell = platform.system() == "Windows"

            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, # Merge stderr into stdout
                shell=use_shell,
                env=env or os.environ.copy()
            )

            self.processes.append(process)

            # Start monitoring thread
            thread = threading.Thread(target=self.stream_output, args=(process, name, color))
            thread.daemon = True
            thread.start()

            return process
        except Exception as e:
            log("ERROR", f"Failed to start {name}: {e}", Colors.FAIL)
            return None

    def stop_all(self):
        """Stops all running processes."""
        self.running = False
        log("SYSTEM", "Stopping all services...", Colors.WARNING)
        for p in self.processes:
            try:
                if platform.system() == "Windows":
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)])
                else:
                    os.killpg(os.getpgid(p.pid), signal.SIGTERM)
            except Exception:
                pass
        log("SYSTEM", "All services stopped.", Colors.GREEN)

def main():
    manager = ServiceManager()

    # Handle Ctrl+C
    def signal_handler(sig, frame):
        manager.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    print(f"{Colors.BOLD}🚀 INOVAR DEV RUNNER{Colors.ENDC}")
    print(f"Project Root: {PROJECT_ROOT}")
    print("-" * 50)

    # 1. Start Backend
    # Ensure .env exists or set env vars (optional, main.go handles defaults but better to be safe)
    backend_env = os.environ.copy()
    backend_env["PORT"] = str(BACKEND_PORT)

    manager.start_service(
        "BACKEND",
        ["go", "run", "./cmd/api/main.go"],
        SERVER_DIR,
        Colors.CYAN,
        env=backend_env
    )

    # 2. Start Frontend
    manager.start_service(
        "FRONTEND",
        ["npm", "run", "dev"],
        CLIENT_DIR,
        Colors.GREEN
    )

    # 3. Start Email Processor
    manager.start_service(
        "EMAIL_QUEUE",
        ["python", "infra/scripts/email_processor.py"],
        PROJECT_ROOT,
        Colors.WARNING
    )

    log("SYSTEM", f"Services are running. Press Ctrl+C to stop.", Colors.HEADER)
    log("SYSTEM", f"Backend: http://localhost:{BACKEND_PORT}", Colors.BLUE)
    log("SYSTEM", f"Frontend: http://localhost:{FRONTEND_PORT}", Colors.BLUE)

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
            # Check if processes are still alive (simple check)
            for p in manager.processes:
                if p.poll() is not None:
                    log("SYSTEM", f"A process exited unexpectedly with code {p.returncode}", Colors.FAIL)
                    # manager.stop_all()
                    # sys.exit(1)
                    # Removing dead process from list to avoid multiple logs
                    manager.processes.remove(p)
    except KeyboardInterrupt:
        pass
    finally:
        manager.stop_all()

if __name__ == "__main__":
    main()

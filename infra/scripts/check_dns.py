import socket

HOST = "db.bavgqsnsubrzazhgpywg.supabase.co"

try:
    ip = socket.gethostbyname(HOST)
    print(f"✅ DNS Resolved: {HOST} -> {ip}")
except Exception as e:
    print(f"❌ DNS Resolution Failed for {HOST}: {e}")

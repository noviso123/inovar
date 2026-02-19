import base64
import json

jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmdxc25zdWJyemF6aGdweXdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUwNDM0OCwiZXhwIjoyMDg3MDgwMzQ4fQ.SM-pdidrOCkRp4ljr_34Gcz_pGN08Y_5HLy5mYuwS70"

def decode_jwt(token):
    try:
        _, payload_b64, _ = token.split('.')
        # Fix padding
        missing_padding = len(payload_b64) % 4
        if missing_padding:
            payload_b64 += '=' * (4 - missing_padding)

        payload_json = base64.b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        print(json.dumps(payload, indent=2))
    except Exception as e:
        print(f"Error decoding JWT: {e}")

if __name__ == "__main__":
    decode_jwt(jwt)

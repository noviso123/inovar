import os
import json
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configuration
QUEUE_DIR = "infra/emails/queue"
SENT_DIR = "infra/emails/sent"
LOG_FILE = "infra/emails/processor.log"

# Ensure directories exist
os.makedirs(QUEUE_DIR, exist_ok=True)
os.makedirs(SENT_DIR, exist_ok=True)

# Load .env file
def load_env():
    env_path = "server/.env"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value

load_env()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def send_email_direct(data):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        return False, "SMTP credentials missing"

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = data.get('to')
    msg['Subject'] = data.get('subject')
    msg.attach(MIMEText(data.get('body'), 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)

def process_queue():
    files = [f for f in os.listdir(QUEUE_DIR) if f.endswith('.json')]
    if not files:
        return

    logging.info(f"📬 Found {len(files)} emails in queue. Processing...")

    for filename in files:
        file_path = os.path.join(QUEUE_DIR, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Check for retry count
            retries = data.get('retries', 0)
            if retries > 10:
                logging.error(f"❌ Max retries reached for {filename}. Moving to dead letter (skipped for now).")
                # In a real app, move to a dead-letter folder
                continue

            success, error = send_email_direct(data)

            if success:
                logging.info(f"✅ Successfully sent queued email: {filename}")
                # Move to sent
                with open(os.path.join(SENT_DIR, filename), 'w', encoding='utf-8') as f:
                    data['sent_at'] = time.strftime("%Y-%m-%d %H:%M:%S")
                    json.dump(data, f, indent=4)
                os.remove(file_path)
            else:
                logging.warning(f"⚠️ Failed to send {filename} (Retry {retries+1}): {error}")
                data['retries'] = retries + 1
                data['last_error'] = error
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4)

        except Exception as e:
            logging.error(f"💥 Error processing file {filename}: {e}")

if __name__ == "__main__":
    logging.info("🚀 Email Background Processor Started")
    try:
        while True:
            process_queue()
            time.sleep(30) # Check every 30 seconds
    except KeyboardInterrupt:
        logging.info("🛑 Processor stopped by user")

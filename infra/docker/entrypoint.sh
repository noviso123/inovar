#!/bin/sh
# ==============================================================
# INOVAR - Container Entrypoint
# Runs as root to prepare environment, then starts app
# ==============================================================
set -e

echo "╔══════════════════════════════════════╗"
echo "║       INOVAR - Sistema de Gestão     ║"
echo "║       Iniciando Container...         ║"
echo "╚══════════════════════════════════════╝"

# Ensure data directories exist with correct permissions
mkdir -p /app/data/db /app/data/uploads /app/data/certs
chown -R inovar:inovar /app/data
echo "✅ Data directories verified (permissions fixed)"

# Set default environment variables if not provided
DATABASE_URL=${DATABASE_URL:-/app/data/db/inovar.db}
UPLOAD_DIR=${UPLOAD_DIR:-/app/data/uploads}
FRONTEND_DIST=${FRONTEND_DIST:-/app/client/dist}
PORT=${PORT:-8080}

# Python bridge configuration for Docker context
BRIDGE_SCRIPT_PATH=${BRIDGE_SCRIPT_PATH:-/app/infra/scripts/bridge.py}
PYTHON_CMD=${PYTHON_CMD:-python3}
PYSERVICE_URL=${PYSERVICE_URL:-http://localhost:8000}

export DATABASE_URL UPLOAD_DIR FRONTEND_DIST PORT BRIDGE_SCRIPT_PATH PYTHON_CMD PYSERVICE_URL

echo "📦 DATABASE_URL: ${DATABASE_URL}"
echo "📁 UPLOAD_DIR:   ${UPLOAD_DIR}"
echo "🌐 PORT:         ${PORT}"
echo "🖥️  FRONTEND:     ${FRONTEND_DIST}"
echo "🐍 BRIDGE URL:   ${PYSERVICE_URL}"

# Start Python Data Service in background
cd /app/infra/pyservice
python3 -m uvicorn main:app --port 8000 --host 127.0.0.1 &
echo "🐍 Python Data Service starting in background (port 8000)..."
sleep 2

# Start the binary as the inovar user (drop root privileges)
cd /app
echo "🚀 Starting INOVAR application..."
exec su -s /bin/sh inovar -c "./inovar"

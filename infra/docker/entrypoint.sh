#!/bin/sh
# ==============================================================
# INOVAR - Container Entrypoint
# Runs at container start to prepare the environment
# ==============================================================
set -e

echo "╔══════════════════════════════════════╗"
echo "║       INOVAR - Sistema de Gestão     ║"
echo "║       Iniciando Container...         ║"
echo "╚══════════════════════════════════════╝"

# Ensure data directories exist with correct permissions
mkdir -p /app/data/db /app/data/uploads /app/data/certs
echo "✅ Data directories verified"

# Set default environment variables if not provided
DATABASE_URL=${DATABASE_URL:-/app/data/db/inovar.db}
UPLOAD_DIR=${UPLOAD_DIR:-/app/data/uploads}
FRONTEND_DIST=${FRONTEND_DIST:-/app/frontend/dist}
PORT=${PORT:-8080}

export DATABASE_URL UPLOAD_DIR FRONTEND_DIST PORT

echo "📦 DATABASE_URL: ${DATABASE_URL}"
echo "📁 UPLOAD_DIR:   ${UPLOAD_DIR}"
echo "🌐 PORT:         ${PORT}"
echo "🖥️  FRONTEND:     ${FRONTEND_DIST}"

# Change to app directory and start the binary
cd /app
echo "🚀 Starting INOVAR application..."
exec ./inovar

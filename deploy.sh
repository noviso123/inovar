#!/bin/bash

# Configuration
APP_DIR="/root/inovar"
if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR does not exist. Please clone the repository first."
    exit 1
fi

echo "==========================================="
echo "   INOVAR - VPS DEPLOYMENT SCRIPT"
echo "==========================================="

cd "$APP_DIR" || exit

echo "[1/5] Pulling latest changes..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

echo "[2/5] Stopping and removing old containers..."
docker compose down --remove-orphans

echo "[3/5] Rebuilding and starting containers..."
docker compose up -d --build || { echo "❌ Docker build/start failed"; exit 1; }

echo "[4/5] Pruning unused images..."
docker image prune -f

echo "[5/5] Waiting for health check..."
sleep 10

# Check container health
CONTAINER_STATUS=$(docker inspect --format='{{.State.Health.Status}}' inovar-app 2>/dev/null || echo "unknown")
if [ "$CONTAINER_STATUS" = "healthy" ]; then
    echo ""
    echo "==========================================="
    echo "   ✅ DEPLOYMENT COMPLETE & HEALTHY"
    echo "==========================================="
else
    echo ""
    echo "==========================================="
    echo "   ⚠️  DEPLOYMENT COMPLETE - CHECKING LOGS"
    echo "==========================================="
    echo ""
    echo "Container status: $CONTAINER_STATUS"
    echo "Last 20 logs:"
    docker compose logs --tail=20
fi

echo ""
docker compose ps

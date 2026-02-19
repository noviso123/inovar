#!/bin/bash

# Configuration
APP_DIR="/root/inovar" # Adjust this path to your actual project directory on the VPS
if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR does not exist. Please clone the repository first."
    exit 1
fi

echo "==========================================="
echo "   INOVAR - VPS DEPLOYMENT SCRIPT"
echo "==========================================="

cd "$APP_DIR" || exit

echo "[1/4] Pulling latest changes..."
git pull origin main

echo "[2/4] Stopping containers..."
docker-compose down

echo "[3/4] Rebuilding and starting containers..."
docker-compose up -d --build

echo "[4/4] Pruning unused images..."
docker image prune -f

echo.
echo "==========================================="
echo "   DEPLOYMENT COMPLETE & SERVER RESTARTED"
echo "==========================================="
docker-compose ps

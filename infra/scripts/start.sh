#!/bin/bash
# ==============================================================
# INOVAR - Script de Inicialização (Linux/Mac)
# Uso: bash scripts/start.sh
# ==============================================================
set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       INOVAR - Sistema de Gestão     ║"
echo "  ║       Iniciando em modo Docker...    ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Verify Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    echo "   Por favor inicie o Docker e tente novamente."
    exit 1
fi
echo "✅ Docker detectado"

# Create persistent data directories
mkdir -p data/db data/uploads data/certs
echo "✅ Pastas de dados verificadas"

# Copy .env.docker if it does not exist
if [ ! -f ".env.docker" ]; then
    if [ -f ".env.docker.example" ]; then
        cp ".env.docker.example" ".env.docker"
        echo "⚠️  .env.docker criado a partir do exemplo."
        echo "⚠️  IMPORTANTE: Edite .env.docker e defina o JWT_SECRET!"
        echo ""
    else
        echo "❌ Arquivo .env.docker.example não encontrado!"
        exit 1
    fi
fi
echo "✅ Configurações verificadas"

# Warn if JWT_SECRET is still the default
if grep -q "CHANGE_ME" ".env.docker"; then
    echo ""
    echo "⚠️  JWT_SECRET ainda é o valor padrão!"
    echo "   Para produção, gere um secret com:"
    echo "   openssl rand -hex 32"
    echo ""
fi

# Build and start
echo ""
echo "🔨 Fazendo build e iniciando o sistema..."
docker-compose up -d --build

echo ""
echo "========================================"
echo "  ✅ Sistema iniciado com sucesso!"
echo "  🌐 Acesse: http://localhost:8080"
echo "  👤 Login:  admin@inovar.com / 123456"
echo "========================================"
echo ""
echo "  Ver logs:  docker-compose logs -f"
echo "  Parar:     docker-compose down"
echo ""

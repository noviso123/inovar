#!/bin/bash
# ==============================================================
# INOVAR - Script de Reset
# ATENÇÃO: Apaga todos os dados! Use com cuidado.
# Uso: bash scripts/reset.sh
# ==============================================================

echo "⚠️  ATENÇÃO: Este script vai apagar TODOS os dados do INOVAR!"
echo "   Banco de dados, uploads e certificados serão perdidos."
echo ""
read -p "Tem certeza que quer continuar? (s/N): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo "❌ Operação cancelada."
    exit 0
fi

echo ""
echo "🛑 Parando containers..."
docker-compose down 2>/dev/null || true

echo "🗑️  Removendo dados..."
rm -rf data/

echo "📁 Recriando estrutura de pastas..."
mkdir -p data/db data/uploads data/certs

echo ""
echo "✅ Reset concluído!"
echo "   Execute 'docker-compose up -d --build' para reiniciar o sistema."
echo "   O admin padrão será recriado: admin@inovar.com / 123456"

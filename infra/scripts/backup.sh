#!/bin/bash
# ==============================================================
# INOVAR - Script de Backup
# Uso: bash scripts/backup.sh
# ==============================================================
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/inovar_backup_${TIMESTAMP}.tar.gz"

echo "💾 Iniciando backup do INOVAR..."

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Compress the data directory
tar -czf "${BACKUP_FILE}" data/

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup concluído!"
echo "   Arquivo: ${BACKUP_FILE}"
echo "   Tamanho: ${BACKUP_SIZE}"
echo ""
echo "Para restaurar:"
echo "  tar -xzf ${BACKUP_FILE}"

# ==============================================================
# INOVAR - Makefile
# Comandos facilitados para gerenciar o container Docker
# Uso: make <comando>
# ==============================================================

.PHONY: help up down restart logs build rebuild shell backup reset dev status

# Default target
help:
	@echo ""
	@echo "  ╔══════════════════════════════════════╗"
	@echo "  ║       INOVAR - Comandos Docker       ║"
	@echo "  ╚══════════════════════════════════════╝"
	@echo ""
	@echo "  make up        Iniciar o sistema em background"
	@echo "  make down      Parar o sistema"
	@echo "  make restart   Reiniciar o sistema"
	@echo "  make logs      Ver logs em tempo real"
	@echo "  make build     Fazer build da imagem"
	@echo "  make rebuild   Fazer rebuild sem cache"
	@echo "  make shell     Abrir terminal dentro do container"
	@echo "  make status    Ver status dos containers"
	@echo "  make backup    Fazer backup dos dados"
	@echo "  make reset     Resetar dados (CUIDADO!)"
	@echo "  make dev       Modo desenvolvimento (hot-reload)"
	@echo ""

# Production commands
up:
	@echo "🚀 Iniciando INOVAR..."
	@mkdir -p data/db data/uploads data/certs
	docker-compose up -d
	@echo "✅ Sistema iniciado em http://localhost:8080"

down:
	@echo "⏹️  Parando INOVAR..."
	docker-compose down
	@echo "✅ Sistema parado"

restart:
	@echo "🔄 Reiniciando INOVAR..."
	docker-compose restart
	@echo "✅ Sistema reiniciado"

logs:
	docker-compose logs -f app

build:
	@echo "🔨 Fazendo build..."
	docker-compose build
	@echo "✅ Build concluído"

rebuild:
	@echo "🔨 Fazendo rebuild sem cache..."
	docker-compose build --no-cache
	@echo "✅ Rebuild concluído"

shell:
	docker-compose exec app sh

status:
	docker-compose ps

# Backup
backup:
	@echo "💾 Fazendo backup..."
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S) && \
	  tar -czf backups/inovar_backup_$$TIMESTAMP.tar.gz data/ && \
	  echo "✅ Backup salvo em backups/inovar_backup_$$TIMESTAMP.tar.gz"

# Reset (DANGER)
reset:
	@echo "⚠️  ATENÇÃO: Isso vai apagar todos os dados!"
	@read -p "Tem certeza? (s/N): " confirm && [ "$$confirm" = "s" ] || exit 1
	docker-compose down
	rm -rf data/
	mkdir -p data/db data/uploads data/certs
	@echo "✅ Dados resetados. Sistema pronto para reiniciar."

# Development mode
dev:
	@echo "🔧 Iniciando modo desenvolvimento..."
	@mkdir -p data/db data/uploads data/certs
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

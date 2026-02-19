# INOVAR - Sistema de Gestão

Sistema de gerenciamento de ordens de serviço (OS), clientes, técnicos e faturamento com NFS-e.

---

## 🚀 Início Rápido (Docker)

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e em execução

### Windows
```bat
scripts\start.bat
```

### Linux / Mac
```bash
bash scripts/start.sh
```

Após iniciar, acesse: **http://localhost:8080**

- **Login inicial:** `admin@inovar.com`
- **Senha inicial:** `123456`

> ⚠️ **Troque a senha** no primeiro acesso. O sistema solicitará automaticamente.

---

## ⚙️ Configuração

Edite o arquivo `.env.docker` antes de iniciar em produção:

```env
JWT_SECRET=<gere com: openssl rand -hex 32>
CORS_ORIGINS=https://seudominio.com
SMTP_HOST=smtp.gmail.com
SMTP_USER=seu@email.com
SMTP_PASSWORD=sua_senha_app
```

---

## 📁 Estrutura de Dados

```
data/
├── db/        → Banco de dados SQLite (inovar.db)
├── uploads/   → Arquivos enviados (fotos, documentos)
└── certs/     → Certificados digitais A1 (NFS-e)
```

> 💡 **Portabilidade:** Para mover o sistema para outro servidor, copie a pasta inteira e execute `docker-compose up -d --build`. Seus dados estarão em `data/`.

---

## 🛠️ Comandos Disponíveis

### Makefile (Linux/Mac com `make` instalado)

| Comando | Descrição |
|---|---|
| `make up` | Iniciar sistema |
| `make down` | Parar sistema |
| `make restart` | Reiniciar sistema |
| `make logs` | Ver logs em tempo real |
| `make build` | Build da imagem |
| `make rebuild` | Rebuild sem cache |
| `make shell` | Terminal dentro do container |
| `make backup` | Fazer backup dos dados |
| `make reset` | Resetar dados (cuidado!) |
| `make dev` | Modo desenvolvimento |

### Docker Compose direto

```bash
# Iniciar
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

---

## 🔄 Atualização do Sistema

```bash
# 1. Fazer backup primeiro
bash scripts/backup.sh

# 2. Parar o sistema
docker-compose down

# 3. Aplicar novas mudanças no código

# 4. Rebuild e reiniciar
docker-compose up -d --build
```

---

## 💾 Backup e Restauração

### Backup
```bash
bash scripts/backup.sh
# Gera: backups/inovar_backup_YYYYMMDD_HHMMSS.tar.gz
```

### Restauração
```bash
# Parar o sistema
docker-compose down

# Extrair backup
tar -xzf backups/inovar_backup_YYYYMMDD_HHMMSS.tar.gz

# Reiniciar
docker-compose up -d
```

---

## 🏗️ Arquitetura

```
Backend:  Go + Fiber v2 + GORM + SQLite
Frontend: React + TypeScript + Vite + TailwindCSS
Infra:    Docker (single container) + Volumes persistentes
```

### Módulos
- **Autenticação** — JWT com refresh token, roles (ADMIN, PRESTADOR, TÉCNICO)
- **Clientes & Equipamentos** — Cadastro completo com endereço
- **Ordens de Serviço** — Fluxo completo com histórico e WebSocket
- **Checklists & Anexos** — Listas de verificação e upload de arquivos
- **Orçamento & Assinatura** — Aprovação de orçamento e assinatura digital
- **NFS-e Nacional** — Integração com sistema GOV.BR
- **Agenda** — Agendamento de atendimentos
- **Financeiro** — Resumo e exportação
- **Auditoria** — Log de todas as ações

---

## 🔒 Segurança

- Container roda com usuário não-root
- JWT com expiração configurável
- CORS configurável por domínio
- Health check automático
- Logs com rotação (máx 10MB × 3 arquivos)

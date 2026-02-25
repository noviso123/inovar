# INOVAR GESTÃO - Sistema Integrado 🚀

Sistema completo para gestão de manutenção, ordens de serviço, técnicos e ativos.

---

## 🏗️ Arquitetura do Projeto (Monorepo)

O projeto foi reestruturado para seguir as melhores práticas de desenvolvimento moderno:

```
inovar/
├── server/       # Core Backend (Go + Fiber + GORM + SQLite)
│   ├── cmd/      # Application entrypoints
│   ├── internal/ # Business logic, domain models, and infrastructure
│   └── ...
├── client/       # Frontend (React + Vite + Tailwind + TypeScript)
│   ├── src/
│   │   ├── features/ # Functional modules (Auth, Dashboard, Requests...)
│   │   └── shared/   # Reusable components, hooks, and services
│   └── ...
└── infra/        # Infrastructure & Integrations
    ├── scripts/  # Python Bridge (Email, NFS-e) and automation
    └── docker/   # Dockerfiles and orchestration
```

---

## 🛠️ Stack Tecnológica

- **Backend Principal**: Go (Golang) com Fiber e GORM.
- **Banco de Dados**: SQLite para persistência local e alta performance.
- **Frontend**: React 18 com TypeScript, Vite e Tailwind CSS.
- **Integrações**: Python (Bridge) para serviços especializados (E-mail, NFS-e Gov.BR).

---

## ⚡ Guia de Início Rápido (Desenvolvimento Local)

Se você **NÃO TEM Docker** instalado, use este método.

### Pré-requisitos
- [Go](https://go.dev/dl/) (1.23+)
- [Node.js](https://nodejs.org/) (20+)

### Como Rodar (Windows)
Basta executar o script de inicialização que abrirá o Backend e Frontend automaticamente:

```bat
infra\scripts\start_dev.bat
```

Isso irá:
1. Instalar dependências se necessário.
2. Iniciar o servidor Go na porta **8080**.
3. Iniciar o cliente React na porta **3001** (ou similar).
4. O navegador deve abrir ou ficar disponível em `http://localhost:3001`.

---

## 🐳 Guia de Início Rápido (Docker)

Se você tem o Docker Desktop instalado, esta é a maneira mais limpa de rodar.

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```
O sistema estará disponível em `http://localhost:3000`.

---

## 🛡️ Credenciais Padrão (Ambiente Dev)

- **Admin**: `admin@inovar.com` / `admin123`
- **Técnico**: `tech@inovar.com` / `tech123`
- **Cliente**: `client@inovar.com` / `client123`

---

## 🔧 Comandos Úteis

### Backend
```bash
cd server
go run ./cmd/api/main.go   # Rodar servidor
go test ./...              # Rodar testes
```

### Frontend
```bash
cd client
npm run dev      # Rodar servidor de desenvolvimento
npm run build    # Compilar para produção
npm run preview  # Testar build de produção
```

# INOVAR GESTÃO - Sistema Integrado 🚀

Sistema completo para gestão de manutenção, ordens de serviço, técnicos e ativos.

---

## 🏗️ Arquitetura do Projeto (Monorepo)

O projeto foi reestruturado para seguir as melhores práticas de desenvolvimento moderno:

```
inovar/
├── server/       # Backend (Go + Fiber + GORM + SQLite)
│   ├── cmd/      # Entrypoints da aplicação
│   ├── internal/ # Lógica de negócio, domínios e infra
│   └── ...
├── client/       # Frontend (React + Vite + Tailwind + TypeScript)
│   ├── src/
│   │   ├── features/ # Módulos funcionais (Auth, Dashboard, Requests...)
│   │   └── shared/   # Componentes, hooks e serviços reutilizáveis
│   └── ...
└── infra/        # Configurações de infraestrutura
    ├── docker/   # Dockerfiles e Docker Compose
    └── scripts/  # Utilitários de automação
```

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

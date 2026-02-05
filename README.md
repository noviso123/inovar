# Inovar - Maintenance Management System

## Project Structure

- **frontend/**: React + TypeScript + Vite application.
- **backend/**: Go (Golang) API server.
- **scripts/**: Automation and utility scripts.

## Getting Started

## Quick Start (Unified)

### Development
Starts Frontend + Backend + Database in parallel:
```bash
npm run dev
```

### Audit & Quality
Runs the autonomous agent suite (Security, Lint, Test, Schema):
```bash
npm run audit
```

### Build
Builds the entire stack for production:
```bash
npm run build
```

## Credentials (Password for all: `123456`)

| Role | Email |
|------|-------|
| **Admin** | `admin@inovar.com` |
| **Prestador** | `prestador@inovar.com` |
| **Técnico** | `tecnico@inovar.com` |
| **Cliente** | `cliente@inovar.com` |

## Architecture
- **Root**: Orchestration & Config
- **.agent/**: Autonomous Guardians (Husky + Scripts)
- **frontend/**: React + Vite
- **backend/**: Go + Fiber
- **database/**: Local SQLite Data
- **storage/**: Local Uploads

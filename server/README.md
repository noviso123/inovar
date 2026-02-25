# INOVAR Backend
Sistema Real-Time de Manutenção de Ar-Condicionado

## Stack
- Go 1.21+
- Fiber (HTTP framework)
- GORM (ORM)
- SQLite (Database)
- WebSocket (Real-time)

## Quick Start

```bash
# Install dependencies
go mod tidy

# Run server
go run main.go
```

Server starts at `http://localhost:8080`

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@inovar.com | 123456 | ADMIN_SISTEMA |
| contato@climamaster.com | 123456 | PRESTADOR |
| ricardo@tecnico.com | 123456 | TECNICO |
| solar@cliente.com | 123456 | CLIENTE |

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users (Admin/Prestador)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `PATCH /api/users/:id/block` - Block/unblock
- `DELETE /api/users/:id` - Delete (Admin only)

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Equipment
- `GET /api/equipments` - List equipments
- `POST /api/equipments` - Create equipment
- `PUT /api/equipments/:id` - Update equipment
- `PATCH /api/equipments/:id/deactivate` - Deactivate (soft delete)
- `PATCH /api/equipments/:id/reactivate` - Reactivate
- `DELETE /api/equipments/:id` - Delete (Admin only)

### Requests
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `GET /api/requests/:id` - Get request details
- `PATCH /api/requests/:id/status` - Update status
- `PATCH /api/requests/:id/assign` - Assign technician

### WebSocket
- `ws://localhost:8080/ws?userId=xxx&role=xxx`

## Environment Variables

```env
PORT=8080
DATABASE_URL=./inovar.db
JWT_SECRET=your-secret-key
CORS_ORIGINS=*
```

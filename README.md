# Inovar - Fullstack Application (Vercel Ready)

This repository contains the full source code for the Inovar management system, optimized for Vercel deployment (Serverless Backend + React Frontend).

## Project Structure

- **`backend/`**: Go application (Fiber framework) adapted for Serverless.
  - `api/index.go`: Vercel Function Entrypoint.
  - `vercel.json`: Routing configuration.
  - `internal/`: Core logic (Handers, Services, Models).
  - `cmd/tools/`: Validation scripts (`verify_system`).

- **`inovar-gestao/`**: React Frontend (Vite).
  - Configured to connect to Backend via `VITE_API_URL`.

## Deployment (Vercel)

### 1. Database (Supabase)
Ensure your Supabase project is active and you have the connection string.

### 2. Backend
Deploy the `backend/` directory as a project.
- **Environment Variables**: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`.

### 3. Frontend
Deploy the `inovar-gestao/` directory as a separate project.
- **Environment Variables**: `VITE_API_URL` (URL of the Backend project).

## Local Development

1. **Backend**:
   ```bash
   cd backend
   go mod tidy
   go run main.go
   ```

2. **Frontend**:
   ```bash
   cd inovar-gestao
   npm install
   npm run dev
   ```

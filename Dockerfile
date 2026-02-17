# Build Stage 1: React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build Stage 2: Go Backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final Stage: Run
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates

# Copy static assets from frontend builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy binary from backend builder
COPY --from=backend-builder /app/backend/main ./backend/main

# Configuration
ENV PORT=8080
EXPOSE 8080

# Run the app from the backend directory to ensure relative paths work
WORKDIR /app/backend
CMD ["./main"]

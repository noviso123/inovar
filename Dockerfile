# ==============================================================
# INOVAR - Dockerfile Multi-Stage
# Build: docker build -t inovar .
# Run:   docker-compose up -d
# ==============================================================

# ─────────────────────────────────────────────
# Stage 1: Frontend Build (React + Vite)
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependency files first for layer caching
COPY frontend/package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Backend Build (Go)
# ─────────────────────────────────────────────
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/backend

# Install git for go modules that require it
RUN apk add --no-cache git

# Copy dependency files first for layer caching
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source and build a static binary (no CGO needed for pure-go sqlite)
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o inovar .

# ─────────────────────────────────────────────
# Stage 3: Final Runtime Image (minimal)
# ─────────────────────────────────────────────
FROM alpine:3.19

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata wget

# Create non-root user for security
RUN addgroup -S inovar && adduser -S inovar -G inovar

WORKDIR /app

# Copy build artifacts
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder  /app/backend/inovar ./inovar
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create persistent data directories
RUN mkdir -p ./data/db ./data/uploads ./data/certs

# Set correct ownership
RUN chown -R inovar:inovar /app

# Switch to non-root user
USER inovar

# Expose application port
EXPOSE 8080

# Health check using wget (alpine-compatible)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]

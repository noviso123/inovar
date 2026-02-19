# ==============================================================
# INOVAR - Dockerfile Multi-Stage (Refatorado)
# Build: docker build -t inovar .
# Run:   docker-compose up -d
# ==============================================================

# ─────────────────────────────────────────────
# Stage 1: Frontend Build (React + Vite)
# ─────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Copy dependency files first for layer caching
COPY client/package*.json ./
RUN npm ci --production=false

# Copy source and build (increasing memory limit for low-RAM VPS)
COPY client/ ./
RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build

# ─────────────────────────────────────────────
# Stage 2: Backend Build (Go)
# ─────────────────────────────────────────────
FROM golang:1.23-alpine AS server-builder
WORKDIR /app/server

# Install git for go modules that require it
RUN apk add --no-cache git

# Copy dependency files first for layer caching
COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy source and build a static binary
COPY server/ ./
# Build from the new location (server/main.go)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -ldflags="-w -s" \
  -o inovar ./cmd/api/main.go

# ─────────────────────────────────────────────
# Stage 3: Final Runtime Image (minimal Debian-based for Python compatibility)
# ─────────────────────────────────────────────
FROM python:3.11-slim-bookworm

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  tzdata \
  wget \
  curl \
  bash \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user for security (Debian style)
RUN groupadd -r inovar && useradd -r -g inovar inovar

WORKDIR /app

# Copy Python requirements first
COPY infra/requirements.txt ./infra/requirements.txt
# Install dependencies (Debian has pre-built wheels for numba and rembg dependencies)
RUN pip install --no-cache-dir --break-system-packages -r ./infra/requirements.txt

# Copy build artifacts and runtime scripts
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/inovar ./inovar
COPY infra/ ./infra/
COPY infra/docker/entrypoint.sh ./entrypoint.sh
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

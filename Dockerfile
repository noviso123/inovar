# Stage 1: Build Backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -o ../inovar ./cmd/api/main.go

# Stage 2: Final Image
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m inovar

# Copy built artifacts
COPY --from=backend-builder /app/inovar .
COPY client/dist ./client/dist
COPY infra/ ./infra/

# Create data directories
RUN mkdir -p data/db data/uploads data/certs && \
    chown -R inovar:inovar data

# Environment variables
ENV PORT=8080
ENV FRONTEND_DIST=/app/client/dist
ENV BRIDGE_SCRIPT_PATH=/app/infra/scripts/bridge.py
ENV PYTHON_CMD=python3
ENV DATABASE_URL=/app/data/db/inovar.db
ENV UPLOAD_DIR=/app/data/uploads

# Install Python requirements
RUN pip install --no-cache-dir jinja2 requests

EXPOSE 8080

# Use entrypoint
COPY infra/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

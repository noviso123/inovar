# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies for CGO (SQLite)
RUN apk add --no-cache gcc musl-dev

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
# CGO_ENABLED=1 is required for go-sqlite3/glebarez
RUN CGO_ENABLED=1 GOOS=linux go build -o main .

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies (Certificates, Timezone)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/main .
# Copy necessary assets (e.g. templates, config if any)
COPY --from=builder /app/.env.example .env.example

# Expose port
EXPOSE 8080

# Command to run (Use shell form to allow signal handling)
CMD ["./main"]

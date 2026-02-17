FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM alpine:latest

# Add certificates for HTTPS calls (Supabase)
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/main .

# Copy .env if needed (though environment variables are preferred on Cloud Run)
# COPY --from=builder /app/.env .

# Ensure storage directory exists
RUN mkdir -p storage

# Expose port (Cloud Run uses $PORT)
ENV PORT 8080
EXPOSE 8080

# Run the application
CMD ["./main"]

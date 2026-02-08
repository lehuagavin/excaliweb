# ================================
# Multi-stage Dockerfile for ExcaliWeb
# ================================

# ============ Stage 1: Build Frontend ============
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy client source
COPY client/ ./

# Build frontend
RUN npm run build

# ============ Stage 2: Build Backend ============
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy server source
COPY server/ ./

# Build backend
RUN npm run build

# ============ Stage 3: Nginx + Node.js Production Image ============
FROM node:20-alpine

# Install nginx, supervisor, wget for health check, and su-exec for user switching
RUN apk add --no-cache nginx supervisor wget su-exec

WORKDIR /app

# Install production dependencies only for server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy built backend from builder
COPY --from=server-builder /app/server/dist ./dist

# Copy built frontend from builder to nginx html directory
COPY --from=client-builder /app/client/dist /usr/share/nginx/html

# Copy nginx configuration
RUN mkdir -p /etc/nginx/http.d && \
    rm -f /etc/nginx/http.d/default.conf
COPY docker/nginx.conf /etc/nginx/http.d/excaliweb.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisord.conf

# Create log directory and data directory
RUN mkdir -p /var/log /app/data

# Environment variables for data directory and user mapping
ENV DATA_DIR=/app/data
ENV PUID=1000
ENV PGID=1000

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Declare volume (for documentation)
VOLUME ["/app/data"]

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Use entrypoint for PUID/PGID handling
ENTRYPOINT ["/entrypoint.sh"]

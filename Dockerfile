# ===== Build Stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root dependencies
COPY package*.json ./
COPY server/package*.json ./server/

# Install root dependencies
RUN npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm install --include=dev && npm run build

# Build admin-web
RUN cd admin-web && npm install --include=dev && npm run build

# ===== Production Stage =====
FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/admin-web/dist ./admin-web/dist

# Install production dependencies only
RUN npm install --omit=dev

# Create data directory
RUN mkdir -p server/data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start
CMD ["node", "server/index.js"]

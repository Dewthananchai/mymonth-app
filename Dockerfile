# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY admin-web/package*.json ./admin-web/

# Install dependencies
RUN npm ci
RUN cd client && npm ci
RUN cd admin-web && npm ci

# Copy source code
COPY . .

# Build client and admin-web
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets and server code
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/admin-web/dist ./admin-web/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]

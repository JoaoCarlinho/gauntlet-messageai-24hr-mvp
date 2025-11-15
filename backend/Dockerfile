# Multi-stage build for MessageAI Backend
# Production-optimized Node.js container for AWS ECS Fargate

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript only (Prisma client already generated via npm install postinstall)
RUN npx tsc

# Stage 2: Production
FROM node:18-alpine AS production

# Install dumb-init, curl, and build tools for native modules (bcrypt)
RUN apk add --no-cache dumb-init curl python3 make g++

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and Prisma schema BEFORE npm install
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies
# First install with --ignore-scripts to avoid Prisma cross-compile issues
# Then rebuild bcrypt to get native bindings for linux/amd64
RUN npm install --only=production --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# Copy generated Prisma client from builder to ensure we have the built version
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application (dist directory)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy runtime files needed
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with schema sync (db push for initial deployment, will migrate later)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node dist/index.js"]

# Multi-stage build for Node.js backend
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S app -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
USER app
EXPOSE 3000
CMD ["dumb-init", "node", "index.js"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=dependencies --chown=app:nodejs /usr/src/app/node_modules ./node_modules

# Copy application code
COPY --chown=app:nodejs . .

# Create logs directory with correct permissions
RUN mkdir -p logs && chown app:nodejs logs

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start application with migrations and proper signal handling
# NOTE: Run seeder manually once: docker exec feastfrenzy-backend npx sequelize-cli db:seed:all
CMD ["dumb-init", "sh", "-c", "npx sequelize-cli db:migrate && node server.prod.js"]
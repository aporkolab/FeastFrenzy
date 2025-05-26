# Multi-stage build for Angular frontend
FROM node:20-alpine AS builder

# Build argument for API URL (Railway can override this)
ARG API_URL=https://feastfrenzy.dev/api/v1
ENV API_URL=${API_URL}

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Replace API URL in environment file before build
RUN sed -i "s|apiUrl:.*|apiUrl: '${API_URL}',|g" src/environments/environment.prod.ts

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:1.25-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist/feastfrenzy /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-group
RUN adduser -S nginx-user -u 1001 -G nginx-group

# Set proper permissions
RUN chown -R nginx-user:nginx-group /usr/share/nginx/html
RUN chown -R nginx-user:nginx-group /var/cache/nginx
RUN chown -R nginx-user:nginx-group /var/log/nginx
RUN chown -R nginx-user:nginx-group /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginx-user:nginx-group /var/run/nginx.pid

# Switch to non-root user
USER nginx-user

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx with proper signal handling
CMD ["dumb-init", "nginx", "-g", "daemon off;"]

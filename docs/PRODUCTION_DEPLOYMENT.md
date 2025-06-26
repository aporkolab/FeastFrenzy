# Production Deployment Guide

This document provides comprehensive instructions for deploying FeastFrenzy to production environments with enterprise-grade practices.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring and Observability](#monitoring-and-observability)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)

## Overview

The FeastFrenzy production setup includes:

- **Multi-stage Docker builds** for optimized images
- **Kubernetes manifests** with security policies
- **Health checks** for load balancers
- **Graceful shutdown** handling
- **Prometheus metrics** for monitoring
- **Structured logging** with Winston
- **Security middleware** with rate limiting
- **Database migrations** with Sequelize
- **CI/CD pipeline** with GitHub Actions

## Prerequisites

### Required Tools

```bash
# Container orchestration
kubectl >= 1.20
docker >= 20.10
helm >= 3.7

# Infrastructure
terraform >= 1.0 (optional)
aws-cli >= 2.0 (for AWS deployment)

# Development
node >= 18.0
npm >= 8.0
```

### Infrastructure Requirements

- **Kubernetes cluster** (EKS, GKE, AKS, or self-managed)
- **Database** (PostgreSQL 13+ recommended)
- **Container registry** (Docker Hub, ECR, etc.)
- **Load balancer** with health check support
- **Monitoring stack** (Prometheus + Grafana)
- **Log aggregation** (ELK stack, CloudWatch, etc.)

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
SHUTDOWN_TIMEOUT=30000

# Database
DB_HOST=postgres.internal
DB_PORT=5432
DB_NAME=feastfrenzy_prod
DB_USER=feastfrenzy
DB_PASS=<secure-password>

# Authentication
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=1h

# API Security
API_KEY=<secure-api-key>

# External Services
FRONTEND_URL=https://feastfrenzy.com
REDIS_URL=redis://redis.internal:6379

# Monitoring (Optional)
SENTRY_DSN=<sentry-dsn>
```

### 2. Secrets Management

Use Kubernetes secrets or cloud provider secret managers:

```bash
# Create database secret
kubectl create secret generic feastfrenzy-db-secret \
  --from-literal=host=postgres.internal \
  --from-literal=port=5432 \
  --from-literal=database=feastfrenzy_prod \
  --from-literal=username=feastfrenzy \
  --from-literal=password=<secure-password>

# Create application secrets
kubectl create secret generic feastfrenzy-app-secret \
  --from-literal=jwt-secret=<strong-random-secret> \
  --from-literal=api-key=<secure-api-key>
```

## Docker Deployment

### 1. Build Production Image

```bash
# Build with build args for metadata
docker build \
  --file backend/Dockerfile.prod \
  --build-arg VERSION=$(git describe --tags) \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --tag feastfrenzy/backend:latest \
  --tag feastfrenzy/backend:$(git describe --tags) \
  .

# Push to registry
docker push feastfrenzy/backend:latest
docker push feastfrenzy/backend:$(git describe --tags)
```

### 2. Run with Docker Compose (for development/staging)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: feastfrenzy/backend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health/liveness', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: feastfrenzy_prod
      POSTGRES_USER: feastfrenzy
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace feastfrenzy
kubectl label namespace feastfrenzy name=feastfrenzy
```

### 2. Deploy Configuration

```bash
# Create ConfigMap
kubectl create configmap feastfrenzy-config \
  --from-literal=NODE_ENV=production \
  --from-literal=FRONTEND_URL=https://feastfrenzy.com \
  --namespace=feastfrenzy
```

### 3. Apply Kubernetes Manifests

```bash
# Apply all manifests
kubectl apply -f backend/k8s/ --namespace=feastfrenzy

# Verify deployment
kubectl get all --namespace=feastfrenzy
kubectl get ingress --namespace=feastfrenzy
```

### 4. Database Migration

```bash
# Run migrations as a Job
kubectl create job feastfrenzy-migrate \
  --image=feastfrenzy/backend:latest \
  --namespace=feastfrenzy \
  -- npm run migrate

# Check migration status
kubectl logs job/feastfrenzy-migrate --namespace=feastfrenzy
```

### 5. Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: feastfrenzy-ingress
  namespace: feastfrenzy
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.feastfrenzy.com
    secretName: feastfrenzy-tls
  rules:
  - host: api.feastfrenzy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: feastfrenzy-backend-service
            port:
              number: 80
```

## Monitoring and Observability

### 1. Prometheus Metrics

The application exposes metrics at `/metrics`:

- HTTP request metrics (count, duration, size)
- Database query performance
- Memory and CPU usage
- Custom business metrics

### 2. Health Checks

Available endpoints:
- `/health/liveness` - Basic liveness check
- `/health/readiness` - Readiness check with dependencies
- `/health` - Comprehensive health information

### 3. Logging

Structured logs are written to:
- Console (for container logs)
- File rotation (if persistent storage available)

Log levels: error, warn, info, debug

### 4. Grafana Dashboard

Import the provided dashboard configuration:

```bash
# Import dashboard (dashboard.json should be created)
curl -X POST \
  http://grafana.example.com/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana-dashboard.json
```

## Security Considerations

### 1. Container Security

- Non-root user (UID 1001)
- Read-only root filesystem
- Security context with dropped capabilities
- Regular base image updates

### 2. Network Policies

- Ingress restrictions to specific pods/namespaces
- Egress limitations to required services only
- DNS resolution allowed for service discovery

### 3. Secrets Management

- Use Kubernetes secrets or cloud secret managers
- Rotate secrets regularly
- Avoid hardcoded secrets in images

### 4. API Security

- Rate limiting (100 req/min by default)
- CORS restrictions
- Security headers (Helmet.js)
- Input validation and sanitization

## Performance Optimization

### 1. Resource Limits

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 2. Horizontal Pod Autoscaling

- CPU threshold: 70%
- Memory threshold: 80%
- Min replicas: 3
- Max replicas: 10

### 3. Database Optimization

- Connection pooling
- Query optimization
- Proper indexing
- Read replicas for heavy read workloads

### 4. Caching

- Redis for session storage
- Application-level caching
- CDN for static assets

## Disaster Recovery

### 1. Backup Strategy

```bash
# Database backups
kubectl create cronjob postgres-backup \
  --image=postgres:15-alpine \
  --schedule="0 2 * * *" \
  -- pg_dump -h postgres.internal -U feastfrenzy feastfrenzy_prod > /backup/db-$(date +%Y%m%d).sql
```

### 2. Multi-Region Deployment

- Deploy to multiple availability zones
- Use cloud provider load balancers
- Database replication across regions

### 3. Recovery Procedures

1. **Database Recovery**: Restore from latest backup
2. **Application Recovery**: Redeploy from known good image
3. **Configuration Recovery**: Restore from Git repository

## Troubleshooting

### Common Issues

#### 1. Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name> --namespace=feastfrenzy --previous

# Check events
kubectl describe pod <pod-name> --namespace=feastfrenzy
```

#### 2. Health Check Failures

```bash
# Test health endpoints manually
kubectl port-forward service/feastfrenzy-backend-service 3000:80 --namespace=feastfrenzy
curl http://localhost:3000/health/readiness
```

#### 3. Database Connection Issues

```bash
# Check database pod status
kubectl get pods --selector=app=postgres --namespace=feastfrenzy

# Test database connectivity
kubectl exec -it <backend-pod> --namespace=feastfrenzy -- npm run db:test
```

#### 4. Performance Issues

```bash
# Check metrics
kubectl port-forward service/feastfrenzy-backend-service 3000:80 --namespace=feastfrenzy
curl http://localhost:3000/metrics

# Check resource usage
kubectl top pods --namespace=feastfrenzy
```

### Debugging Tools

```bash
# Access pod shell
kubectl exec -it <pod-name> --namespace=feastfrenzy -- /bin/sh

# View real-time logs
kubectl logs -f deployment/feastfrenzy-backend --namespace=feastfrenzy

# Port forward for debugging
kubectl port-forward service/feastfrenzy-backend-service 3000:80 --namespace=feastfrenzy
```

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Secrets created and secured
- [ ] Database migrations tested
- [ ] Health checks working
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Security policies applied
- [ ] Performance testing completed
- [ ] Disaster recovery plan tested
- [ ] Documentation updated
- [ ] Team trained on procedures

## Support

For deployment issues:

1. Check the logs: `kubectl logs -f deployment/feastfrenzy-backend --namespace=feastfrenzy`
2. Verify configuration: `kubectl get configmap,secret --namespace=feastfrenzy`
3. Test connectivity: Use port forwarding to test endpoints directly
4. Monitor metrics: Check Prometheus/Grafana dashboards
5. Review security: Ensure network policies and security contexts are correct

For additional support, refer to the main project documentation or create an issue in the repository.
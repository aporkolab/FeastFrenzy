# CI/CD Pipeline Guide

This document provides a comprehensive overview of the FeastFrenzy CI/CD pipeline, deployment strategies, and operational best practices.

---

## Pipeline Overview

The CI/CD pipeline follows a multi-stage approach ensuring code quality, automated testing, and safe deployments.

**Total Pipeline Duration:** ~40 minutes (from PR merge to production)

```
┌─────────────────┐
│   Git Push to   │
│  main/develop   │
└────────┬────────┘
         │
┌────────▼────────┐
│  1. Build Stage │  ⏱️  3 min
│  - npm install  │
│  - TypeScript   │
│  - ESLint       │
└────────┬────────┘
         │
┌────────▼────────────────────────┐
│  2. Test Stage (Parallel)       │  ⏱️  8 min
│  ├─ Backend (385 tests)         │
│  ├─ Frontend (394 tests)        │
│  └─ Coverage validation (>80%)  │
└────────┬────────────────────────┘
         │
┌────────▼────────┐
│  3. E2E Tests   │  ⏱️  12 min
│  - Cypress      │
│  - 609 scenarios│
│  - Accessibility│
└────────┬────────┘
         │
┌────────▼────────────────┐
│  4. Security Scan       │  ⏱️  2 min
│  - npm audit            │
│  - Trivy scan           │
│  - Dependency check     │
└────────┬────────────────┘
         │
┌────────▼────────┐
│  5. Build Images│  ⏱️  4 min
│  - Multi-stage  │
│  - Layer cache  │
│  - Push to ECR  │
└────────┬────────┘
         │
     ┌───▼───┐
     │Branch?│
     └───┬───┘
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ main │  │develop│
└───┬──┘  └──┬────┘
    │        │
┌───▼──────┐ │            ⏱️  2 min
│Production│ │
│ Canary   │ │
│ (10%)    │ │
└───┬──────┘ │
    │        │            ⏱️  5 min
┌───▼──────┐ │
│ Monitor  │ │
│ Metrics  │ │
└───┬──────┘ │
    │        │            ⏱️  2 min
┌───▼──────┐ │
│ Promote  │ │
│ (100%)   │ │
└───┬──────┘ │
    │     ┌──▼──────┐    ⏱️  2 min
    │     │ Staging │
    │     │ Deploy  │
    │     └──┬──────┘
    │        │
┌───▼────────▼───┐        ⏱️  1 min
│  Post-Deploy   │
│  - Health check│
│  - Smoke tests │
│  - Notify team │
└────────────────┘
```

---

## Stage Details

### Stage 1: Build & Lint

**Purpose:** Ensure code compiles and meets quality standards

**Actions:**
1. Checkout code from Git
2. Setup Node.js environment (v18)
3. Install dependencies (with cache)
4. Run ESLint (backend + frontend)
5. TypeScript type checking
6. Build verification (no output, type-check only)

**Exit Criteria:**
- ✅ No linting errors
- ✅ TypeScript compilation successful
- ✅ All dependencies installed

**Failure Actions:**
- ❌ Block PR merge
- 📧 Notify developer via GitHub comment
- 📊 Record failure in metrics

---

### Stage 2: Unit & Integration Tests

**Purpose:** Validate business logic and API contracts

**Backend Tests (385 total):**
```
├── Unit Tests (280)
│   ├── Services (80 tests)
│   ├── Controllers (60 tests)
│   ├── Models (45 tests)
│   ├── Middleware (50 tests)
│   └── Utilities (45 tests)
│
└── Integration Tests (105)
    ├── API Endpoints (70 tests)
    ├── Database Operations (25 tests)
    └── Cache Integration (10 tests)
```

**Frontend Tests (394 total):**
```
├── Component Tests (250)
├── Service Tests (80)
├── Pipe/Directive Tests (40)
└── Guard/Interceptor Tests (24)
```

**Test Environment:**
- MySQL 8.0 (ephemeral, Docker service)
- Redis 7.x (ephemeral, Docker service)
- Isolated database per test suite

**Coverage Requirements:**
```javascript
{
  lines: 80%,
  functions: 75%,
  branches: 50%,
  statements: 80%
}
```

**Parallel Execution:**
- Backend and frontend tests run simultaneously
- Total time: ~8 minutes (max of both)
- Speedup: 3x vs sequential execution

---

### Stage 3: E2E Tests

**Purpose:** Validate user journeys end-to-end

**Cypress Test Suite (609 tests):**
```
├── Authentication Flow (45 tests)
│   ├── Login/logout
│   ├── Registration
│   ├── Password reset
│   └── Token refresh
│
├── Products Management (120 tests)
│   ├── Browse products
│   ├── Filtering/sorting
│   ├── Pagination
│   ├── CRUD operations (Manager/Admin)
│   └── Product search
│
├── Employee Management (110 tests)
│   ├── Employee list
│   ├── Create/edit employee
│   ├── Soft delete
│   ├── Balance management
│   └── Department filtering
│
├── Purchase Flow (150 tests)
│   ├── Create purchase
│   ├── Select products
│   ├── Balance deduction
│   ├── Purchase history
│   └── Receipt generation
│
├── Reports & Analytics (80 tests)
│   ├── Employee consumption reports
│   ├── Product popularity
│   ├── Revenue reports
│   └── Date range filtering
│
├── RBAC & Permissions (60 tests)
│   ├── Employee access
│   ├── Manager permissions
│   ├── Admin capabilities
│   └── Unauthorized access
│
└── Accessibility (44 tests)
    ├── Keyboard navigation
    ├── Screen reader compatibility
    ├── Color contrast (WCAG AA)
    └── Focus management
```

**Test Infrastructure:**
```bash
# Application stack started via Docker Compose
docker-compose -f docker-compose.test.yml up -d

# Services available:
# - Frontend: http://localhost:4200
# - Backend: http://localhost:3000
# - MySQL: localhost:3306
# - Redis: localhost:6379
```

**Retry Strategy:**
- Flaky tests retry up to 2 times
- Screenshots captured on failure
- Video recording for failed tests

---

### Stage 4: Security Scanning

**Purpose:** Identify vulnerabilities before deployment

**1. npm audit**
```bash
# Backend dependencies
npm audit --audit-level=high

# Frontend dependencies
npm audit --audit-level=high

# Threshold: No high or critical vulnerabilities
```

**2. Trivy Container Scanning**
```bash
# Scan Docker images for OS and library vulnerabilities
trivy image --severity HIGH,CRITICAL feastfrenzy/backend:latest
trivy image --severity HIGH,CRITICAL feastfrenzy/frontend:latest

# Check for:
# - CVEs in base images
# - Outdated packages
# - Known exploits
```

**3. Dependency License Check**
```bash
# Ensure no incompatible licenses (GPL, AGPL)
license-checker --onlyAllow "MIT;Apache-2.0;BSD;ISC"
```

**Failure Actions:**
- ❌ Block deployment
- 📊 Create JIRA ticket for remediation
- 📧 Email security team
- 🔒 Quarantine affected images

---

### Stage 5: Docker Image Build

**Purpose:** Create production-ready container images

**Multi-Stage Build Strategy:**

**Backend Dockerfile (optimized):**
```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:18-alpine
RUN apk add --no-cache dumb-init
USER node
WORKDIR /app
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node package*.json ./
EXPOSE 3000
CMD ["dumb-init", "node", "dist/index.js"]
```

**Frontend Dockerfile (Nginx):**
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# Stage 2: Nginx runtime
FROM nginx:alpine
COPY --from=builder /app/dist/feastfrenzy /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Image Optimization:**
- Layer caching for faster builds
- Multi-stage builds (50% size reduction)
- .dockerignore to exclude unnecessary files
- Security best practices:
  - Non-root user
  - Minimal base images (Alpine)
  - Read-only filesystem where possible

**Image Tags:**
```
feastfrenzy-backend:latest           # Latest from main branch
feastfrenzy-backend:<git-sha>        # Specific commit
feastfrenzy-backend:v1.2.0           # Semantic version
```

---

### Stage 6: Deployment (Canary)

**Purpose:** Gradually roll out changes to production

**Canary Deployment Strategy:**

```
Phase 1: 10% Traffic (5 minutes)
┌──────────────────────────┐
│ Stable Version (90%)     │ ← 90% of users
│ - 9 pods                 │
└──────────────────────────┘
┌──────────────────────────┐
│ Canary Version (10%)     │ ← 10% of users
│ - 1 pod                  │
└──────────────────────────┘

Phase 2: Monitor Metrics
- Error rate <1%?
- Latency within SLO?
- No crashes?

Phase 3: 50% Traffic (if metrics OK)
┌──────────────────────────┐
│ Stable Version (50%)     │
│ - 5 pods                 │
└──────────────────────────┘
┌──────────────────────────┐
│ Canary Version (50%)     │
│ - 5 pods                 │
└──────────────────────────┘

Phase 4: 100% Traffic (if still OK)
┌──────────────────────────┐
│ New Version (100%)       │
│ - 10 pods                │
└──────────────────────────┘
```

**Rollback Trigger Conditions:**
- Error rate >1% for 5 minutes
- P95 latency >1 second
- More than 2 pod crashes
- Health check failures >5%

**Automatic Rollback:**
```bash
# Prometheus query triggers rollback
if http_request_errors_total > 0.01 {
  kubectl rollout undo deployment/feastfrenzy-backend
  alert("Deployment rolled back automatically!")
}
```

---

### Stage 7: Post-Deployment Validation

**Purpose:** Verify deployment succeeded

**Health Checks:**
1. **Liveness Probe** (pod is alive)
```bash
curl -f https://feastfrenzy.dev/health
# Expected: {"status": "ok", "timestamp": "..."}
```

2. **Readiness Probe** (pod ready for traffic)
```bash
curl -f https://feastfrenzy.dev/health/ready
# Expected: {"database": "connected", "cache": "connected"}
```

**Smoke Tests:**
```javascript
// Critical user journeys
describe('Smoke Tests', () => {
  it('can login and view products', () => {
    cy.login('employee@feastfrenzy.com');
    cy.visit('/products');
    cy.get('[data-cy=product-card]').should('exist');
  });

  it('can create a purchase', () => {
    cy.login('employee@feastfrenzy.com');
    cy.createPurchase([{ productId: 1, quantity: 2 }]);
    cy.contains('Purchase successful').should('be.visible');
  });

  it('admin can access audit logs', () => {
    cy.login('admin@feastfrenzy.com');
    cy.visit('/admin/audit-logs');
    cy.get('[data-cy=audit-log-table]').should('exist');
  });
});
```

**Metrics Validation:**
```bash
# Query Prometheus for baseline metrics
curl 'http://prometheus:9090/api/v1/query?query=http_requests_total{status="200"}[5m]'

# Verify:
# - Request rate similar to pre-deployment
# - No spike in errors
# - Latency within normal range
```

**Notification:**
```
✅ Deployment Successful

Environment: Production
Version: feastfrenzy-backend:a7f9c21
Deployed by: @adamporkolab
Duration: 42 minutes
Health: All checks passing

📊 Metrics:
- Error rate: 0.03%
- P95 latency: 320ms
- Uptime: 100%

🔗 Links:
- Grafana: https://grafana.feastfrenzy.dev
- Logs: https://kibana.feastfrenzy.dev
```

---

## Deployment Strategies

### 1. Rolling Update (Default)

**Best for:** Most deployments, gradual rollout

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Extra pod during update
    maxUnavailable: 0  # No downtime
```

**Process:**
1. Create 1 new pod (v2)
2. Wait for new pod ready
3. Terminate 1 old pod (v1)
4. Repeat until all pods updated

**Duration:** ~5-10 minutes for 10 pods

---

### 2. Blue-Green Deployment

**Best for:** Major changes, instant rollback

```
Before:
┌─────────┐
│ Blue v1 │ ← 100% traffic
└─────────┘

Deploy Green:
┌─────────┐    ┌──────────┐
│ Blue v1 │    │ Green v2 │ (not receiving traffic yet)
└─────────┘    └──────────┘

Switch traffic:
┌─────────┐    ┌──────────┐
│ Blue v1 │    │ Green v2 │ ← 100% traffic
└─────────┘    └──────────┘

Cleanup:
               ┌──────────┐
               │ Green v2 │ ← 100% traffic
               └──────────┘
```

**Implementation:**
```bash
# Deploy green version
kubectl apply -f deployment-green.yaml

# Test green (internal service)
kubectl port-forward service/feastfrenzy-green 8080:3000
curl http://localhost:8080/health

# Switch traffic
kubectl patch service feastfrenzy-backend \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify
kubectl get service feastfrenzy-backend -o yaml

# Cleanup blue after validation
kubectl delete deployment feastfrenzy-backend-blue
```

---

### 3. Canary Deployment (Production)

**Best for:** Risk mitigation, A/B testing

**Current Implementation:** See Stage 6 above

**Traffic Distribution with Istio:**
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: feastfrenzy-backend
spec:
  hosts:
  - feastfrenzy-backend
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: feastfrenzy-backend
        subset: canary
      weight: 100
  - route:
    - destination:
        host: feastfrenzy-backend
        subset: stable
      weight: 90
    - destination:
        host: feastfrenzy-backend
        subset: canary
      weight: 10
```

---

## Rollback Procedures

### Automated Rollback

**Triggers:**
- Error rate >1% for 5 consecutive minutes
- P95 latency >1 second for 10 minutes
- Pod crash loop (3+ restarts in 15 min)
- Health check failure >5%

**Alerting:**
```yaml
# Prometheus alert rule
- alert: HighErrorRate
  expr: |
    rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Error rate above threshold"
    action: "Triggering automatic rollback"
```

### Manual Rollback

**Quick Rollback (kubectl):**
```bash
# Rollback to previous version
kubectl rollout undo deployment/feastfrenzy-backend \
  -n feastfrenzy-production

# Verify rollback status
kubectl rollout status deployment/feastfrenzy-backend \
  -n feastfrenzy-production

# Expected:
# deployment "feastfrenzy-backend" successfully rolled out
```

**Rollback to Specific Version:**
```bash
# View deployment history
kubectl rollout history deployment/feastfrenzy-backend \
  -n feastfrenzy-production

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Feature: new checkout flow
# 3         Bugfix: balance calculation
# 4         Feature: analytics dashboard (current)

# Rollback to revision 2
kubectl rollout undo deployment/feastfrenzy-backend \
  --to-revision=2 \
  -n feastfrenzy-production
```

**Database Rollback:**
```bash
# If migration needed rollback
kubectl exec -it mysql-pod -n feastfrenzy-production -- bash

# Inside pod:
mysql -u root -p feastfrenzy

# Run down migration
source /migrations/20250115_rollback.sql

# Verify data integrity
SELECT COUNT(*) FROM employees WHERE deletedAt IS NULL;
```

---

## Monitoring & Alerts

### Key Metrics

**Application Metrics:**
```
http_requests_total              # Total requests
http_request_duration_seconds    # Latency (histogram)
http_requests_errors_total       # Error count
database_connections_active      # DB connections
cache_hit_rate                   # Redis cache efficiency
```

**Infrastructure Metrics:**
```
node_cpu_seconds_total           # Node CPU usage
node_memory_bytes                # Node memory
kube_pod_container_restarts      # Pod restarts
kube_deployment_replicas         # Replica count
```

### Alert Rules

**Critical Alerts (PagerDuty):**
```yaml
# Service Down
- alert: ServiceDown
  expr: up{job="feastfrenzy-backend"} == 0
  for: 1m
  
# High Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m

# Database Connection Pool Exhausted
- alert: DatabasePoolExhausted
  expr: database_connections_active / database_connections_max > 0.9
  for: 2m
```

**Warning Alerts (Slack):**
```yaml
# Elevated Latency
- alert: HighLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
  for: 10m

# Pod Restarts
- alert: PodRestarts
  expr: rate(kube_pod_container_restarts[15m]) > 0
  for: 5m
```

---

## Best Practices

### 1. Environment Parity

Keep dev, staging, and production environments as similar as possible:

| Aspect | Dev | Staging | Production |
|--------|-----|---------|------------|
| **Infrastructure** | Docker Compose | Kubernetes | Kubernetes |
| **Database** | MySQL 8.0 | MySQL 8.0 | MySQL 8.0 |
| **Node.js** | 18.x | 18.x | 18.x |
| **Config** | .env.local | ConfigMap | ConfigMap + Secrets |
| **Monitoring** | Optional | Full stack | Full stack |

### 2. Configuration Management

**Never commit secrets:**
```bash
# .gitignore
.env
.env.local
*.pem
*.key
secrets/
```

**Use environment-specific configs:**
```javascript
// config/environments.js
module.exports = {
  development: {
    database: process.env.DATABASE_URL || 'mysql://localhost:3306/feastfrenzy_dev',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    logLevel: 'debug',
  },
  staging: {
    database: process.env.DATABASE_URL,
    redis: process.env.REDIS_URL,
    logLevel: 'info',
  },
  production: {
    database: process.env.DATABASE_URL,
    redis: process.env.REDIS_URL,
    logLevel: 'warn',
  },
};
```

### 3. Database Migrations

**Always backwards compatible:**
```javascript
// Good: Add column with default value
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('employees', 'department_id', {
      type: Sequelize.INTEGER,
      defaultValue: 1,  // Safe default
      allowNull: true,  // Won't break existing code
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('employees', 'department_id');
  },
};

// Bad: Rename column (breaks old code immediately)
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.renameColumn('employees', 'old_name', 'new_name');
  },
};
```

**Migration strategy:**
1. Add new column (deploy code reading both)
2. Backfill data
3. Update code to write to new column
4. Deploy code reading only new column
5. Remove old column (after validation period)

### 4. Feature Flags

**Use flags for gradual rollouts:**
```javascript
// backend/config/features.js
module.exports = {
  enableNewCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
  enableAdvancedAnalytics: process.env.FEATURE_ANALYTICS === 'true',
  enableBetaFeatures: process.env.ENABLE_BETA === 'true',
};

// In code
const features = require('./config/features');

if (features.enableNewCheckout) {
  // New checkout logic
} else {
  // Old checkout logic (fallback)
}
```

### 5. Deployment Checklist

**Pre-Deployment:**
- [ ] All CI tests passing
- [ ] Code review approved (2+ reviewers)
- [ ] Database migrations tested in staging
- [ ] Rollback plan documented
- [ ] Feature flags configured
- [ ] Monitoring dashboards updated
- [ ] On-call engineer notified

**During Deployment:**
- [ ] Monitor error rates in Grafana
- [ ] Watch pod logs (`kubectl logs -f`)
- [ ] Verify database connections
- [ ] Check cache hit rates
- [ ] Test critical user journeys

**Post-Deployment:**
- [ ] Smoke tests pass
- [ ] No spike in error rate (<1%)
- [ ] Response times within SLO (p95 <500ms)
- [ ] Database migrations applied successfully
- [ ] Update CHANGELOG.md
- [ ] Notify team in Slack
- [ ] Monitor for 1 hour before marking complete

---

## Troubleshooting

### Common Issues

**1. Deployment Stuck**
```bash
# Check pod status
kubectl get pods -n feastfrenzy-production

# If pending:
kubectl describe pod <pod-name> -n feastfrenzy-production

# Common causes:
# - Insufficient resources
# - Image pull errors
# - PVC not available
```

**2. Failed Health Checks**
```bash
# View health check logs
kubectl logs <pod-name> -n feastfrenzy-production

# Test health endpoint manually
kubectl exec -it <pod-name> -n feastfrenzy-production -- \
  curl http://localhost:3000/health

# Common causes:
# - Database connection failed
# - Redis unavailable
# - Port conflict
```

**3. High Memory Usage**
```bash
# Check pod resources
kubectl top pod -n feastfrenzy-production

# Increase memory limits
kubectl set resources deployment feastfrenzy-backend \
  --limits=memory=1Gi \
  -n feastfrenzy-production
```

---

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Charts Best Practices](https://helm.sh/docs/chart_best_practices/)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

---

*Last Updated: December 2024*

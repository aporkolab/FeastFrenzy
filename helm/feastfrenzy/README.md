# FeastFrenzy Helm Chart

Enterprise-grade Helm chart for deploying FeastFrenzy to Kubernetes.

## Features

- **High Availability**: HPA, PDB, topology spread constraints
- **Security**: Network policies, non-root containers, secret management
- **Observability**: Prometheus ServiceMonitor, structured logging
- **Database**: MySQL subchart with replication support
- **Caching**: Redis subchart with optional replication
- **Ingress**: Full ingress configuration with TLS

## Prerequisites

- Kubernetes 1.23+
- Helm 3.8+
- PV provisioner (for persistence)
- Ingress controller (nginx recommended)
- cert-manager (optional, for TLS)

## Quick Start

```bash
# Add Bitnami repo for dependencies
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install with default values (development)
helm install feastfrenzy ./helm/feastfrenzy

# Install with custom values
helm install feastfrenzy ./helm/feastfrenzy \
  --set mysql.auth.rootPassword=mysecretpassword \
  --set mysql.auth.password=mydbpassword \
  --set redis.auth.password=myredispassword \
  --set secrets.jwt.secret=my-super-secret-jwt-key-min-32-chars \
  --set secrets.jwt.refreshSecret=my-refresh-secret-min-32-chars

# Install for production
helm install feastfrenzy ./helm/feastfrenzy \
  -f ./helm/feastfrenzy/values-production.yaml \
  --namespace production \
  --create-namespace
```

## Configuration

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullSecrets` | Global image pull secrets | `[]` |
| `global.storageClass` | Global storage class | `""` |
| `global.environment` | Environment name | `production` |

### Backend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.replicaCount` | Number of replicas | `2` |
| `backend.image.repository` | Image repository | `ghcr.io/aporkolab/feastfrenzy/backend` |
| `backend.image.tag` | Image tag | `Chart.appVersion` |
| `backend.resources.limits.cpu` | CPU limit | `500m` |
| `backend.resources.limits.memory` | Memory limit | `512Mi` |
| `backend.autoscaling.enabled` | Enable HPA | `true` |
| `backend.autoscaling.minReplicas` | Minimum replicas | `2` |
| `backend.autoscaling.maxReplicas` | Maximum replicas | `10` |

### Frontend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.replicaCount` | Number of replicas | `2` |
| `frontend.image.repository` | Image repository | `ghcr.io/aporkolab/feastfrenzy/frontend` |
| `frontend.resources.limits.cpu` | CPU limit | `200m` |
| `frontend.resources.limits.memory` | Memory limit | `128Mi` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts[0].host` | Hostname | `feastfrenzy.example.com` |
| `ingress.tls[0].secretName` | TLS secret name | `feastfrenzy-tls` |

### Database Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mysql.enabled` | Deploy MySQL subchart | `true` |
| `mysql.auth.database` | Database name | `feastfrenzy` |
| `mysql.auth.username` | Database username | `feastfrenzy` |
| `mysql.primary.persistence.size` | Storage size | `10Gi` |

### Redis Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy Redis subchart | `true` |
| `redis.architecture` | Redis architecture | `standalone` |
| `redis.auth.enabled` | Enable authentication | `true` |

### Secret Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.jwt.secret` | JWT signing secret | Auto-generated |
| `secrets.jwt.refreshSecret` | JWT refresh secret | Auto-generated |
| `secrets.jwt.existingSecret` | Use existing secret | `""` |

## Environment-Specific Deployments

### Development

```bash
helm install feastfrenzy ./helm/feastfrenzy \
  -f ./helm/feastfrenzy/values-dev.yaml \
  --namespace dev \
  --create-namespace
```

### Production

```bash
# Create secrets first
kubectl create secret generic feastfrenzy-jwt-secret \
  --from-literal=jwt-secret=$(openssl rand -base64 48) \
  --from-literal=jwt-refresh-secret=$(openssl rand -base64 48) \
  -n production

kubectl create secret generic feastfrenzy-mysql-secret \
  --from-literal=mysql-root-password=$(openssl rand -base64 24) \
  --from-literal=mysql-password=$(openssl rand -base64 24) \
  -n production

kubectl create secret generic feastfrenzy-redis-secret \
  --from-literal=redis-password=$(openssl rand -base64 24) \
  -n production

# Deploy
helm install feastfrenzy ./helm/feastfrenzy \
  -f ./helm/feastfrenzy/values-production.yaml \
  --namespace production
```

## Upgrading

```bash
# Update dependencies
helm dependency update ./helm/feastfrenzy

# Upgrade release
helm upgrade feastfrenzy ./helm/feastfrenzy \
  -f ./helm/feastfrenzy/values-production.yaml \
  --namespace production
```

## Uninstalling

```bash
helm uninstall feastfrenzy --namespace production

# Clean up PVCs (WARNING: deletes data!)
kubectl delete pvc -l app.kubernetes.io/instance=feastfrenzy -n production
```

## Troubleshooting

### Check deployment status

```bash
kubectl get pods -l app.kubernetes.io/instance=feastfrenzy -n production
kubectl describe pod <pod-name> -n production
```

### View logs

```bash
# Backend logs
kubectl logs -l app.kubernetes.io/component=backend -n production -f

# Frontend logs  
kubectl logs -l app.kubernetes.io/component=frontend -n production -f
```

### Database connection issues

```bash
# Test MySQL connection
kubectl exec -it <backend-pod> -n production -- \
  node -e "require('./config/database').authenticate().then(() => console.log('OK'))"

# Check MySQL pods
kubectl get pods -l app.kubernetes.io/name=mysql -n production
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Ingress                              │
│                    (nginx-ingress)                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Frontend Service      │     │    Backend Service      │
│   (ClusterIP:80)        │     │   (ClusterIP:3000)      │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Frontend Deployment    │     │   Backend Deployment    │
│  (nginx + Angular)      │     │   (Node.js + Express)   │
│  Replicas: 2-10 (HPA)   │     │   Replicas: 2-20 (HPA)  │
└─────────────────────────┘     └─────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                ┌─────────────────────────┐     ┌─────────────────────────┐
                │      MySQL Service      │     │     Redis Service       │
                │    (Bitnami subchart)   │     │   (Bitnami subchart)    │
                │     Primary + Replica   │     │    Master + Replica     │
                └─────────────────────────┘     └─────────────────────────┘
```

## License

MIT License - see LICENSE file for details.

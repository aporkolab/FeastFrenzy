#!/bin/bash

# Production Deployment Script for FeastFrenzy
# This script handles building and deploying the application to production environments
# Supports both Docker and Kubernetes deployments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default values
DEPLOYMENT_TYPE="kubernetes"
ENVIRONMENT="production"
VERSION=""
REGISTRY="feastfrenzy"
NAMESPACE="feastfrenzy"
BUILD_ONLY=false
SKIP_TESTS=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy FeastFrenzy backend to production environments.

OPTIONS:
    -t, --type TYPE         Deployment type: docker|kubernetes (default: kubernetes)
    -e, --env ENV          Environment: production|staging (default: production)
    -v, --version VERSION  Version tag for the deployment (default: auto-generated)
    -r, --registry REGISTRY Container registry prefix (default: feastfrenzy)
    -n, --namespace NS      Kubernetes namespace (default: feastfrenzy)
    -b, --build-only       Only build, don't deploy
    -s, --skip-tests       Skip running tests
    --verbose              Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0                                          # Deploy to Kubernetes with defaults
    $0 --type docker                           # Deploy using Docker Compose
    $0 --build-only --version v1.2.3          # Only build version v1.2.3
    $0 --env staging --namespace feastfrenzy-staging  # Deploy to staging

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate deployment type
if [[ ! "$DEPLOYMENT_TYPE" =~ ^(docker|kubernetes)$ ]]; then
    log_error "Invalid deployment type: $DEPLOYMENT_TYPE. Must be 'docker' or 'kubernetes'"
    exit 1
fi

# Generate version if not provided
if [[ -z "$VERSION" ]]; then
    if command -v git >/dev/null 2>&1 && [[ -d "$PROJECT_ROOT/.git" ]]; then
        VERSION=$(git describe --tags --always --dirty)
        if [[ -z "$VERSION" ]]; then
            VERSION="v1.0.0-$(git rev-parse --short HEAD)"
        fi
    else
        VERSION="v1.0.0-$(date +%Y%m%d%H%M%S)"
    fi
fi

log_info "Starting deployment with the following configuration:"
log_info "  Deployment Type: $DEPLOYMENT_TYPE"
log_info "  Environment: $ENVIRONMENT"
log_info "  Version: $VERSION"
log_info "  Registry: $REGISTRY"
log_info "  Namespace: $NAMESPACE"
log_info "  Build Only: $BUILD_ONLY"
log_info "  Skip Tests: $SKIP_TESTS"

# Change to backend directory
cd "$BACKEND_DIR"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is required but not installed"
        exit 1
    fi

    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is required but not installed"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check Kubernetes tools if needed
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        if ! command -v kubectl >/dev/null 2>&1; then
            log_error "kubectl is required for Kubernetes deployment"
            exit 1
        fi

        # Check cluster connectivity
        if ! kubectl cluster-info >/dev/null 2>&1; then
            log_error "Cannot connect to Kubernetes cluster"
            exit 1
        fi
    fi

    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    if [[ -f "package-lock.json" ]]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return
    fi

    log_info "Running tests..."
    
    # Run linting
    if command -v eslint >/dev/null 2>&1; then
        npm run lint
        log_success "Linting passed"
    fi

    # Run unit tests
    if npm run test:unit >/dev/null 2>&1; then
        log_success "Unit tests passed"
    else
        log_warning "Unit tests failed or not available, continuing..."
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    local build_args=(
        --file "Dockerfile.prod"
        --build-arg "VERSION=$VERSION"
        --build-arg "BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        --tag "$REGISTRY/backend:$VERSION"
        --tag "$REGISTRY/backend:latest"
    )
    
    # Add VCS ref if in git repository
    if command -v git >/dev/null 2>&1 && [[ -d ".git" ]]; then
        build_args+=(--build-arg "VCS_REF=$(git rev-parse HEAD)")
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        build_args+=(--progress=plain)
    fi
    
    # Build the image
    if docker build "${build_args[@]}" .; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Push image to registry
push_image() {
    log_info "Pushing image to registry..."
    
    docker push "$REGISTRY/backend:$VERSION"
    docker push "$REGISTRY/backend:latest"
    
    log_success "Image pushed to registry"
}

# Deploy with Docker Compose
deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    # Check if docker-compose exists
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose is required for Docker deployment"
        exit 1
    fi

    # Create environment file if it doesn't exist
    local env_file=".env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        log_warning "Environment file $env_file not found, creating template..."
        cat > "$env_file" << EOF
NODE_ENV=$ENVIRONMENT
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=feastfrenzy_$ENVIRONMENT
DB_USER=feastfrenzy
DB_PASS=secure_password_here
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here
FRONTEND_URL=http://localhost:4200
EOF
        log_warning "Please update $env_file with your configuration"
    fi

    # Deploy with Docker Compose
    local compose_file="docker-compose.prod.yml"
    if [[ ! -f "$compose_file" ]]; then
        log_error "Docker Compose file $compose_file not found"
        exit 1
    fi

    docker-compose -f "$compose_file" --env-file "$env_file" up -d
    
    log_success "Docker deployment completed"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_info "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
    fi

    # Check if Kubernetes manifests exist
    if [[ ! -d "k8s" ]]; then
        log_error "Kubernetes manifests directory 'k8s' not found"
        exit 1
    fi

    # Apply ConfigMap
    log_info "Creating ConfigMap..."
    kubectl create configmap feastfrenzy-config \
        --from-literal=NODE_ENV="$ENVIRONMENT" \
        --from-literal=FRONTEND_URL="https://feastfrenzy.com" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Update image tag in deployment
    if command -v sed >/dev/null 2>&1; then
        # Create temporary deployment file with updated image
        local temp_deployment="/tmp/deployment-$VERSION.yaml"
        sed "s|image: feastfrenzy/backend:latest|image: $REGISTRY/backend:$VERSION|g" \
            k8s/deployment.yaml > "$temp_deployment"
        
        # Apply the updated deployment
        kubectl apply -f "$temp_deployment" --namespace="$NAMESPACE"
        rm "$temp_deployment"
    else
        # Apply original deployment
        log_warning "sed not available, using latest tag"
        kubectl apply -f k8s/ --namespace="$NAMESPACE"
    fi

    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/feastfrenzy-backend --namespace="$NAMESPACE" --timeout=300s

    # Run database migrations
    log_info "Running database migrations..."
    kubectl create job "feastfrenzy-migrate-$(date +%Y%m%d%H%M%S)" \
        --image="$REGISTRY/backend:$VERSION" \
        --namespace="$NAMESPACE" \
        -- npm run migrate

    log_success "Kubernetes deployment completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local health_url=""
    local max_attempts=30
    local attempt=1

    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        health_url="http://localhost:3000/health/liveness"
    else
        # Port forward for Kubernetes health check
        log_info "Setting up port forwarding for health check..."
        kubectl port-forward service/feastfrenzy-backend-service 3000:80 \
            --namespace="$NAMESPACE" >/dev/null 2>&1 &
        local port_forward_pid=$!
        sleep 5  # Wait for port forwarding to establish
        health_url="http://localhost:3000/health/liveness"
    fi

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" >/dev/null 2>&1; then
            log_success "Health check passed"
            if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
                kill $port_forward_pid 2>/dev/null || true
            fi
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done

    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Display deployment info
show_deployment_info() {
    log_success "Deployment completed successfully!"
    echo
    log_info "Deployment Information:"
    log_info "  Version: $VERSION"
    log_info "  Environment: $ENVIRONMENT"
    log_info "  Type: $DEPLOYMENT_TYPE"
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        log_info "  Access URL: http://localhost:3000"
        log_info "  Health Check: http://localhost:3000/health"
        log_info "  Metrics: http://localhost:3000/metrics"
        echo
        log_info "To view logs: docker-compose -f docker-compose.prod.yml logs -f backend"
    else
        log_info "  Namespace: $NAMESPACE"
        echo
        log_info "Useful commands:"
        log_info "  View pods: kubectl get pods --namespace=$NAMESPACE"
        log_info "  View logs: kubectl logs -f deployment/feastfrenzy-backend --namespace=$NAMESPACE"
        log_info "  Port forward: kubectl port-forward service/feastfrenzy-backend-service 3000:80 --namespace=$NAMESPACE"
        log_info "  Health check: curl http://localhost:3000/health (after port forwarding)"
    fi
}

# Main execution
main() {
    log_info "Starting FeastFrenzy production deployment..."
    
    check_prerequisites
    install_dependencies
    run_tests
    build_image
    
    if [[ "$BUILD_ONLY" == "false" ]]; then
        push_image
        
        if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
            deploy_docker
        else
            deploy_kubernetes
        fi
        
        health_check
        show_deployment_info
    else
        log_success "Build completed (build-only mode)"
        log_info "Built image: $REGISTRY/backend:$VERSION"
    fi
}

# Handle script interruption
cleanup() {
    log_warning "Deployment interrupted"
    exit 1
}

trap cleanup INT TERM

# Execute main function
main "$@"
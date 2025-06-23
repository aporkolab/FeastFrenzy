#!/bin/bash
# =====================================================
# FeastFrenzy Management Script
# =====================================================
# Usage: ./ff.sh [command]
#
# Commands:
#   start    - Stop any existing, then start fresh
#   stop     - Stop all containers
#   restart  - Restart all containers
#   status   - Show container status
#   logs     - Show logs (follow mode)
#   migrate  - Run database migrations
#   seed     - Run database seeders
#   reset    - Full reset (delete volumes, rebuild)
#   shell    - Open shell in backend container
#   db       - Open MySQL CLI
# =====================================================

set -e

PROJECT_NAME="feastfrenzy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Kill any existing feastfrenzy containers (regardless of compose project)
nuke_existing() {
    log_info "Checking for existing FeastFrenzy containers..."
    
    local containers=$(docker ps -aq --filter "name=feastfrenzy" 2>/dev/null || true)
    if [ -n "$containers" ]; then
        log_warn "Found existing containers, stopping..."
        docker stop $containers 2>/dev/null || true
        docker rm $containers 2>/dev/null || true
        log_success "Removed existing containers"
    fi
}

wait_for_healthy() {
    local container=$1
    local max_wait=${2:-120}
    local elapsed=0
    
    log_info "Waiting for $container to be healthy..."
    
    while [ $elapsed -lt $max_wait ]; do
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not_found")
        
        if [ "$status" = "healthy" ]; then
            log_success "$container is healthy"
            return 0
        elif [ "$status" = "not_found" ]; then
            log_error "$container not found"
            return 1
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    log_error "$container failed to become healthy in ${max_wait}s"
    return 1
}

cmd_start() {
    log_info "Starting FeastFrenzy..."
    
    # Nuke any existing containers first
    nuke_existing
    
    # Build and start
    log_info "Building and starting containers..."
    docker compose up -d --build --remove-orphans
    
    # Wait for services
    wait_for_healthy "feastfrenzy-db" 60
    wait_for_healthy "feastfrenzy-redis" 30
    wait_for_healthy "feastfrenzy-backend" 90
    
    # Run migrations
    log_info "Running migrations..."
    docker exec feastfrenzy-backend npx sequelize-cli db:migrate || true
    
    # Check if seeding needed (empty db)
    local employee_count=$(docker exec feastfrenzy-backend node -e "
        const db = require('./model');
        db.employees.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log(0); process.exit(0); });
    " 2>/dev/null || echo "0")
    
    if [ "$employee_count" = "0" ]; then
        log_info "Empty database detected, running seeders..."
        docker exec feastfrenzy-backend npx sequelize-cli db:seed:all || true
    fi
    
    echo ""
    log_success "FeastFrenzy is running!"
    echo ""
    echo "  Frontend: http://localhost:4200"
    echo "  Backend:  http://localhost:4000"
    echo "  Swagger:  http://localhost:4000/api-docs"
    echo ""
    echo "  Login: admin@kantinrendszer.hu / Admin123!"
    echo ""
}

cmd_stop() {
    log_info "Stopping FeastFrenzy..."
    docker compose down --remove-orphans
    log_success "Stopped"
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_status() {
    echo ""
    echo "=== FeastFrenzy Container Status ==="
    echo ""
    docker ps -a --filter "name=feastfrenzy" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

cmd_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        docker compose logs -f "$service"
    else
        docker compose logs -f
    fi
}

cmd_migrate() {
    log_info "Running migrations..."
    docker exec feastfrenzy-backend npx sequelize-cli db:migrate
    log_success "Migrations complete"
}

cmd_seed() {
    log_info "Running seeders..."
    docker exec feastfrenzy-backend npx sequelize-cli db:seed:all
    log_success "Seeding complete"
}

cmd_reset() {
    log_warn "This will DELETE all data and rebuild from scratch!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Full reset in progress..."
        
        # Stop and remove everything
        docker compose down -v --remove-orphans
        nuke_existing
        
        # Remove volumes explicitly
        docker volume rm feastfrenzy_mysql_data feastfrenzy_redis_data 2>/dev/null || true
        
        # Rebuild
        docker compose build --no-cache
        
        # Start fresh
        cmd_start
        
        log_success "Reset complete!"
    else
        log_info "Cancelled"
    fi
}

cmd_shell() {
    log_info "Opening shell in backend container..."
    docker exec -it feastfrenzy-backend sh
}

cmd_db() {
    log_info "Opening MySQL CLI..."
    docker exec -it feastfrenzy-db mysql -ufeastfrenzy -pfeastfrenzy123 feastfrenzy
}

cmd_help() {
    echo ""
    echo "FeastFrenzy Management Script"
    echo ""
    echo "Usage: ./ff.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start FeastFrenzy (stops existing first)"
    echo "  stop      Stop all containers"
    echo "  restart   Restart all containers"
    echo "  status    Show container status"
    echo "  logs      Show logs (follow mode)"
    echo "  migrate   Run database migrations"
    echo "  seed      Run database seeders"
    echo "  reset     Full reset (deletes all data!)"
    echo "  shell     Open shell in backend"
    echo "  db        Open MySQL CLI"
    echo ""
    echo "Ports:"
    echo "  Frontend: 4200"
    echo "  Backend:  4000"
    echo ""
}

# Main
case "${1:-help}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    status)  cmd_status ;;
    logs)    cmd_logs "${2:-}" ;;
    migrate) cmd_migrate ;;
    seed)    cmd_seed ;;
    reset)   cmd_reset ;;
    shell)   cmd_shell ;;
    db)      cmd_db ;;
    help|*)  cmd_help ;;
esac

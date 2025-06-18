# =====================================================
# FeastFrenzy - Docker Management Makefile
# =====================================================
# Senior-level infrastructure automation
# =====================================================

.PHONY: help dev prod down logs clean test migrate seed \
        shell-backend shell-frontend shell-db \
        build rebuild status ps \
        prod-build prod-up prod-down prod-logs prod-restart \
        db-backup db-restore redis-cli \
        lint test-backend test-frontend test-e2e \
        ssl-generate security-check

# Default target
.DEFAULT_GOAL := help

# Colors for pretty output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# =====================================================
# Help
# =====================================================
help:
	@echo ""
	@echo "$(BLUE)╔═══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║         FeastFrenzy Docker Commands                       ║$(NC)"
	@echo "$(BLUE)╚═══════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start development environment"
	@echo "  make dev-build        Build and start development environment"
	@echo "  make down             Stop all containers"
	@echo "  make restart          Restart all containers"
	@echo "  make logs             View logs (all services)"
	@echo "  make logs-backend     View backend logs only"
	@echo "  make logs-frontend    View frontend logs only"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make prod             Start production stack"
	@echo "  make prod-build       Build production images"
	@echo "  make prod-up          Start production (detached)"
	@echo "  make prod-down        Stop production stack"
	@echo "  make prod-logs        View production logs"
	@echo "  make prod-restart     Restart production stack"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make migrate          Run database migrations"
	@echo "  make seed             Seed database with demo data"
	@echo "  make db-backup        Backup database to ./backups/"
	@echo "  make db-restore       Restore database from backup"
	@echo "  make redis-cli        Open Redis CLI"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-backend     Run backend tests only"
	@echo "  make test-frontend    Run frontend tests only"
	@echo "  make test-e2e         Run Cypress E2E tests"
	@echo "  make lint             Run linters"
	@echo ""
	@echo "$(GREEN)Shell Access:$(NC)"
	@echo "  make shell-backend    Shell into backend container"
	@echo "  make shell-frontend   Shell into frontend container"
	@echo "  make shell-db         MySQL CLI in database container"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make status           Show container status"
	@echo "  make clean            Remove all containers and volumes"
	@echo "  make clean-images     Remove all project images"
	@echo "  make ssl-generate     Generate self-signed SSL certs"
	@echo "  make security-check   Run security audit"
	@echo ""

# =====================================================
# Development Commands
# =====================================================
dev:
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose up

dev-build:
	@echo "$(GREEN)Building and starting development environment...$(NC)"
	docker-compose up --build

down:
	@echo "$(YELLOW)Stopping all containers...$(NC)"
	docker-compose down
	docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

restart:
	@echo "$(YELLOW)Restarting containers...$(NC)"
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# =====================================================
# Production Commands
# =====================================================
prod:
	@echo "$(GREEN)Starting production stack...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found. Copy .env.example to .env and configure.$(NC)"; \
		exit 1; \
	fi
	docker-compose -f docker-compose.prod.yml up

prod-build:
	@echo "$(GREEN)Building production images...$(NC)"
	docker-compose -f docker-compose.prod.yml build

prod-up:
	@echo "$(GREEN)Starting production stack (detached)...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	@echo "$(YELLOW)Stopping production stack...$(NC)"
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-restart:
	@echo "$(YELLOW)Restarting production stack...$(NC)"
	docker-compose -f docker-compose.prod.yml restart

# =====================================================
# Database Commands
# =====================================================
migrate:
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec backend npm run migrate

seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	docker-compose exec backend npm run seed

db-backup:
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p ./backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker-compose exec -T database mysqldump -u root -p$${DB_ROOT_PASSWORD:-rootpassword} feastfrenzy > ./backups/feastfrenzy_$$TIMESTAMP.sql; \
	echo "$(GREEN)Backup saved to ./backups/feastfrenzy_$$TIMESTAMP.sql$(NC)"

db-restore:
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: Specify backup file with BACKUP_FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	docker-compose exec -T database mysql -u root -p$${DB_ROOT_PASSWORD:-rootpassword} feastfrenzy < $(BACKUP_FILE)
	@echo "$(GREEN)Database restored from $(BACKUP_FILE)$(NC)"

redis-cli:
	docker-compose exec redis redis-cli

# =====================================================
# Testing Commands
# =====================================================
test: test-backend test-frontend
	@echo "$(GREEN)All tests completed!$(NC)"

test-backend:
	@echo "$(GREEN)Running backend tests...$(NC)"
	docker-compose exec backend npm test

test-frontend:
	@echo "$(GREEN)Running frontend tests...$(NC)"
	docker-compose exec frontend npm test

test-e2e:
	@echo "$(GREEN)Running E2E tests...$(NC)"
	docker-compose exec frontend npm run cypress:run

lint:
	@echo "$(GREEN)Running linters...$(NC)"
	docker-compose exec backend npm run lint
	docker-compose exec frontend npm run lint

# =====================================================
# Shell Access
# =====================================================
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec database mysql -u root -p$${DB_ROOT_PASSWORD:-rootpassword} feastfrenzy

# =====================================================
# Status and Cleanup
# =====================================================
status:
	@echo "$(BLUE)Container Status:$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)Resource Usage:$(NC)"
	@docker stats --no-stream $$(docker-compose ps -q) 2>/dev/null || echo "No running containers"

ps:
	docker-compose ps

clean:
	@echo "$(RED)WARNING: This will remove all containers and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete$(NC)"

clean-images:
	@echo "$(RED)Removing project images...$(NC)"
	docker-compose down --rmi local
	docker-compose -f docker-compose.prod.yml down --rmi local 2>/dev/null || true

# =====================================================
# SSL Certificate Generation (Development)
# =====================================================
ssl-generate:
	@echo "$(GREEN)Generating self-signed SSL certificates...$(NC)"
	@mkdir -p ./nginx/ssl
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout ./nginx/ssl/private.key \
		-out ./nginx/ssl/certificate.crt \
		-subj "/C=US/ST=State/L=City/O=FeastFrenzy/CN=localhost"
	@echo "$(GREEN)SSL certificates generated in ./nginx/ssl/$(NC)"
	@echo "$(YELLOW)Note: These are self-signed certs for development only!$(NC)"

# =====================================================
# Security
# =====================================================
security-check:
	@echo "$(GREEN)Running security audit...$(NC)"
	@echo "$(BLUE)Backend dependencies:$(NC)"
	docker-compose exec backend npm audit --audit-level=moderate || true
	@echo ""
	@echo "$(BLUE)Frontend dependencies:$(NC)"
	docker-compose exec frontend npm audit --audit-level=moderate || true
	@echo ""
	@echo "$(BLUE)Docker image scan:$(NC)"
	@docker scan feastfrenzy-backend:latest 2>/dev/null || echo "Docker scan not available"

# =====================================================
# Quick development setup
# =====================================================
setup:
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env from .env.example$(NC)"; \
	fi
	@$(MAKE) ssl-generate
	@$(MAKE) dev-build
	@echo "$(GREEN)Setup complete! Access the app at:$(NC)"
	@echo "  Frontend: http://localhost:4200"
	@echo "  Backend:  http://localhost:3000"
	@echo "  Swagger:  http://localhost:3000/api-docs"

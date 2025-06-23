#!/bin/bash
#
# FeastFrenzy Database Setup Script
# ---------------------------------
# This script ensures MySQL user exists with correct password for BOTH localhost and % hosts.
# Run this ONCE after fresh install, or whenever you get "Access denied" errors.
#
# Usage: ./setup-db.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   FeastFrenzy Database Setup Script    ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""

# Find the .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="${SCRIPT_DIR}/backend/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Expected at: ${SCRIPT_DIR}/.env or ${SCRIPT_DIR}/backend/.env"
    exit 1
fi

echo -e "${GREEN}✓ Found .env file: ${ENV_FILE}${NC}"

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Validate required variables
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}ERROR: Missing required DB variables in .env${NC}"
    echo "Required: DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

echo ""
echo "Database Configuration:"
echo "  DB_NAME:     $DB_NAME"
echo "  DB_USER:     $DB_USER"
echo "  DB_PASSWORD: ${DB_PASSWORD:0:4}****"
echo "  DB_HOST:     ${DB_HOST:-localhost}"
echo ""

# Check if we can connect to MySQL as root
echo -e "${YELLOW}Checking MySQL root access...${NC}"
if sudo mysql -e "SELECT 1" > /dev/null 2>&1; then
    MYSQL_CMD="sudo mysql"
    echo -e "${GREEN}✓ Using sudo mysql (socket auth)${NC}"
elif mysql -u root -e "SELECT 1" > /dev/null 2>&1; then
    MYSQL_CMD="mysql -u root"
    echo -e "${GREEN}✓ Using mysql -u root${NC}"
else
    echo -e "${RED}ERROR: Cannot connect to MySQL as root${NC}"
    echo "Try: sudo mysql or set MySQL root password"
    exit 1
fi

echo ""
echo -e "${YELLOW}Setting up database and user...${NC}"

# Create database if not exists
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;"
echo -e "${GREEN}✓ Database '${DB_NAME}' ready${NC}"

# Drop and recreate users to ensure clean state
# This handles the case where user exists with wrong password
$MYSQL_CMD -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';"
$MYSQL_CMD -e "DROP USER IF EXISTS '${DB_USER}'@'%';"
$MYSQL_CMD -e "DROP USER IF EXISTS '${DB_USER}'@'127.0.0.1';"

# Create users with correct password for ALL possible hosts
$MYSQL_CMD -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
$MYSQL_CMD -e "CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';"
$MYSQL_CMD -e "CREATE USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';"

# Grant privileges
$MYSQL_CMD -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
$MYSQL_CMD -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';"
$MYSQL_CMD -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';"
$MYSQL_CMD -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}✓ User '${DB_USER}' created for localhost, %, and 127.0.0.1${NC}"

# Test connection with the new credentials
echo ""
echo -e "${YELLOW}Testing connection with new credentials...${NC}"
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection test PASSED${NC}"
else
    echo -e "${RED}✗ Connection test FAILED${NC}"
    echo "Something went wrong. Check MySQL logs."
    exit 1
fi

# Run migrations if in the right directory
echo ""
if [ -d "${SCRIPT_DIR}/backend/migrations" ]; then
    echo -e "${YELLOW}Running migrations...${NC}"
    cd "${SCRIPT_DIR}/backend"
    npx sequelize-cli db:migrate
    echo -e "${GREEN}✓ Migrations complete${NC}"
    
    echo ""
    echo -e "${YELLOW}Running seeders...${NC}"
    npx sequelize-cli db:seed:all 2>/dev/null || echo -e "${YELLOW}⚠ Some seeders may have already run (this is OK)${NC}"
    echo -e "${GREEN}✓ Seeders complete${NC}"
elif [ -d "${SCRIPT_DIR}/migrations" ]; then
    echo -e "${YELLOW}Running migrations...${NC}"
    cd "${SCRIPT_DIR}"
    npx sequelize-cli db:migrate
    echo -e "${GREEN}✓ Migrations complete${NC}"
    
    echo ""
    echo -e "${YELLOW}Running seeders...${NC}"
    npx sequelize-cli db:seed:all 2>/dev/null || echo -e "${YELLOW}⚠ Some seeders may have already run (this is OK)${NC}"
    echo -e "${GREEN}✓ Seeders complete${NC}"
fi

# Restart Docker if running
echo ""
if docker ps | grep -q feastfrenzy-backend; then
    echo -e "${YELLOW}Restarting Docker backend...${NC}"
    docker restart feastfrenzy-backend
    echo -e "${GREEN}✓ Docker backend restarted${NC}"
    
    # Wait and check health
    echo -e "${YELLOW}Waiting for backend to start...${NC}"
    sleep 5
    
    for i in {1..10}; do
        if curl -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is healthy!${NC}"
            break
        fi
        echo "  Waiting... ($i/10)"
        sleep 2
    done
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup Complete! 🎉             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Login credentials:"
echo "  📧 admin@kantinrendszer.hu / Admin123!"
echo "  📧 vezerigazgato@cegem.hu / Manager123!"
echo "  📧 kovacs.peter@cegem.hu / Employee123!"
echo ""

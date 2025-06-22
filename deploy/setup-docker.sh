#!/bin/bash
#
# FeastFrenzy Docker Server Setup Script
# Target: feastfrenzy.dev
# Server: Ubuntu 24.04 + Nginx + MySQL + Redis + Docker
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - MySQL running on host
#   - Redis running on host
#   - Nginx running on host
#

set -e

echo "=========================================="
echo "  FeastFrenzy Production Setup (Docker)"
echo "  Domain: feastfrenzy.dev"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
APP_DIR="/var/www/feastfrenzy"
DOMAIN="feastfrenzy.dev"
DB_NAME="feastfrenzy_prod"
DB_USER="feastfrenzy"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found! Install it first:${NC}"
    echo "curl -fsSL https://get.docker.com | sh"
    echo "sudo usermod -aG docker \$USER"
    exit 1
fi

echo -e "${YELLOW}[1/7] Creating application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo -e "${YELLOW}[2/7] Cloning repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest..."
    cd $APP_DIR && git pull origin main
else
    git clone https://github.com/APorkolab/FeastFrenzy.git $APP_DIR
fi

echo -e "${YELLOW}[3/7] Setting up MySQL database...${NC}"

# Generate random password for app user
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}Database created: $DB_NAME${NC}"
echo -e "${GREEN}Database user: $DB_USER${NC}"

echo -e "${YELLOW}[4/7] Creating .env file...${NC}"
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

cat > $APP_DIR/.env <<EOF
# FeastFrenzy Production Environment
# Used by docker-compose.server.yml

# Database (host MySQL)
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# JWT
JWT_SECRET=$JWT_SECRET
EOF

echo -e "${GREEN}.env created${NC}"
echo ""
echo -e "${RED}=========================================="
echo "  SAVE THESE CREDENTIALS!"
echo "==========================================${NC}"
echo "Database: $DB_NAME"
echo "DB User: $DB_USER"
echo "DB Password: $DB_PASS"
echo "JWT Secret: $JWT_SECRET"
echo -e "${RED}==========================================${NC}"
echo ""

echo -e "${YELLOW}[5/7] Building frontend...${NC}"
cd $APP_DIR/frontend
sed -i "s|apiUrl:.*|apiUrl: 'https://$DOMAIN/api/v1',|g" src/environments/environment.prod.ts
npm ci --legacy-peer-deps
npm run build:prod

echo -e "${YELLOW}[6/7] Starting Docker container...${NC}"
cd $APP_DIR
docker compose -f docker-compose.server.yml up -d --build

echo -e "${YELLOW}[7/7] Running database migrations...${NC}"
sleep 5  # Wait for container to start
docker compose -f docker-compose.server.yml exec backend npm run migrate
docker compose -f docker-compose.server.yml exec backend npm run seed:prod || true

echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Copy nginx config:"
echo "   sudo cp $APP_DIR/deploy/nginx-feastfrenzy.conf /etc/nginx/sites-available/feastfrenzy"
echo ""
echo "2. Enable site:"
echo "   sudo ln -sf /etc/nginx/sites-available/feastfrenzy /etc/nginx/sites-enabled/"
echo ""
echo "3. Test nginx:"
echo "   sudo nginx -t"
echo ""
echo "4. Reload nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "5. Setup SSL:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Your app will be live at: https://$DOMAIN"
echo ""
echo "Docker status:"
docker compose -f docker-compose.server.yml ps

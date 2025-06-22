#!/bin/bash
#
# FeastFrenzy Server Setup Script
# Target: feastfrenzy.dev
# Server: Ubuntu 24.04 + Nginx + MySQL + Redis + PM2
#

set -e

echo "=========================================="
echo "  FeastFrenzy Production Setup"
echo "  Domain: feastfrenzy.dev"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
APP_NAME="feastfrenzy"
APP_DIR="/var/www/feastfrenzy"
REPO_URL="https://github.com/APorkolab/FeastFrenzy.git"  # <-- CSERÉLD KI A SAJÁT REPÓDRA
DOMAIN="feastfrenzy.dev"
NODE_PORT=3000
DB_NAME="feastfrenzy_prod"
DB_USER="feastfrenzy"

echo -e "${YELLOW}[1/8] Creating application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo -e "${YELLOW}[2/8] Cloning repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest..."
    cd $APP_DIR && git pull origin main
else
    git clone $REPO_URL $APP_DIR
fi

echo -e "${YELLOW}[3/8] Setting up MySQL database...${NC}"
echo -e "${RED}Enter MySQL root password:${NC}"
read -s MYSQL_ROOT_PASS

# Generate random password for app user
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}Database created: $DB_NAME${NC}"
echo -e "${GREEN}Database user: $DB_USER${NC}"
echo -e "${GREEN}Database password: $DB_PASS${NC}"
echo ""
echo -e "${RED}⚠️  SAVE THIS PASSWORD! You won't see it again!${NC}"
echo ""

echo -e "${YELLOW}[4/8] Creating backend .env file...${NC}"
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

cat > $APP_DIR/backend/.env <<EOF
# Production Environment - feastfrenzy.dev
NODE_ENV=production
PORT=$NODE_PORT

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_ENABLED=true

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://$DOMAIN

# Logging
LOG_LEVEL=info
EOF

echo -e "${GREEN}Backend .env created${NC}"

echo -e "${YELLOW}[5/8] Installing backend dependencies...${NC}"
cd $APP_DIR/backend
npm ci --production

echo -e "${YELLOW}[6/8] Running database migrations...${NC}"
npm run migrate
npm run seed:prod || true

echo -e "${YELLOW}[7/8] Building frontend...${NC}"
cd $APP_DIR/frontend

# Update production API URL
sed -i "s|apiUrl:.*|apiUrl: 'https://$DOMAIN/api/v1',|g" src/environments/environment.prod.ts

npm ci --legacy-peer-deps
npm run build:prod

echo -e "${YELLOW}[8/8] Setting up PM2...${NC}"
cd $APP_DIR/backend
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start server.prod.js --name $APP_NAME --env production
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Copy nginx config: sudo cp $APP_DIR/deploy/nginx-feastfrenzy.conf /etc/nginx/sites-available/feastfrenzy"
echo "2. Enable site: sudo ln -sf /etc/nginx/sites-available/feastfrenzy /etc/nginx/sites-enabled/"
echo "3. Test nginx: sudo nginx -t"
echo "4. Reload nginx: sudo systemctl reload nginx"
echo "5. Setup SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Your app will be live at: https://$DOMAIN"

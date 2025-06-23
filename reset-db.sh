#!/bin/bash
#
# FeastFrenzy - Full Database Reset Script
# =========================================
# Idempotens script: akárhányszor futtatod, ugyanazt csinálja.
# Minden DB-vel kapcsolatos szart megold egyszerre.
#
# Használat:
#   chmod +x reset-db.sh
#   ./reset-db.sh
#
# Mi kell hozzá:
#   - MySQL root jelszó (interaktívan kéri)
#   - A backend/.env fájl legyen kitöltve
#

set -e  # Kilép hiba esetén

# Színek
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🍽️  FeastFrenzy Database Reset Script            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Alap útvonalak
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
BACKEND_DIR="${PROJECT_ROOT}/backend"
ENV_FILE="${BACKEND_DIR}/.env"

# Ellenőrzések
echo -e "${YELLOW}[1/7] Előfeltételek ellenőrzése...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Nincs .env fájl: ${ENV_FILE}${NC}"
    exit 1
fi

# .env beolvasása
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Változók kinyerése
DB_NAME="${DB_NAME:-feastfrenzy_prod}"
DB_USER="${DB_USER:-feastfrenzy}"
DB_PASSWORD="${DB_PASSWORD:-feastfrenzy123}"
DB_HOST="${DB_HOST:-localhost}"

echo -e "  📦 Database: ${DB_NAME}"
echo -e "  👤 User: ${DB_USER}"
echo -e "  🏠 Host: ${DB_HOST}"
echo -e "${GREEN}  ✅ .env beolvasva${NC}"

# MySQL root jelszó bekérése
echo ""
echo -e "${YELLOW}[2/7] MySQL root authentikáció...${NC}"
read -sp "  MySQL root jelszó: " MYSQL_ROOT_PASSWORD
echo ""

# MySQL kapcsolat tesztelése
if ! mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" &>/dev/null; then
    echo -e "${RED}❌ Nem sikerült csatlakozni MySQL-hez root-ként${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ MySQL root kapcsolat OK${NC}"

# Database és user létrehozása
echo ""
echo -e "${YELLOW}[3/7] Database és user létrehozása/resetelése...${NC}"

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Database törlése és újralétrehozása
DROP DATABASE IF EXISTS \`${DB_NAME}\`;
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- User törlése ha létezik (minden host-ról)
DROP USER IF EXISTS '${DB_USER}'@'localhost';
DROP USER IF EXISTS '${DB_USER}'@'%';
DROP USER IF EXISTS '${DB_USER}'@'172.%';

-- User létrehozása MINDEN lehetséges host-ról
-- localhost: direkt kapcsolatok (CLI, Node.js host módban)
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

-- %: bármilyen távoli kapcsolat (Docker, külső szerverek)
CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';

FLUSH PRIVILEGES;

-- Ellenőrzés
SELECT User, Host FROM mysql.user WHERE User='${DB_USER}';
EOF

echo -e "${GREEN}  ✅ Database '${DB_NAME}' létrehozva${NC}"
echo -e "${GREEN}  ✅ User '${DB_USER}' létrehozva (localhost + %)${NC}"

# Migrációk futtatása
echo ""
echo -e "${YELLOW}[4/7] Sequelize migrációk futtatása...${NC}"
cd "$BACKEND_DIR"

# Node.js environment beállítása
export NODE_ENV=production

npx sequelize-cli db:migrate --env production
echo -e "${GREEN}  ✅ Migrációk lefutottak${NC}"

# Seederek futtatása
echo ""
echo -e "${YELLOW}[5/7] Seederek futtatása...${NC}"
npx sequelize-cli db:seed:all --env production
echo -e "${GREEN}  ✅ Seederek lefutottak${NC}"

# Docker konténer újraindítása (ha van)
echo ""
echo -e "${YELLOW}[6/7] Docker backend újraindítása...${NC}"

if docker ps -a --format '{{.Names}}' | grep -q 'feastfrenzy-backend'; then
    docker restart feastfrenzy-backend
    echo -e "  ⏳ Várakozás a backend indulására (10 sec)..."
    sleep 10
    
    # Log ellenőrzés
    if docker logs feastfrenzy-backend --tail 5 2>&1 | grep -q "Server running"; then
        echo -e "${GREEN}  ✅ Backend sikeresen elindult${NC}"
    elif docker logs feastfrenzy-backend --tail 5 2>&1 | grep -q "error"; then
        echo -e "${RED}  ⚠️  Backend hiba - logok:${NC}"
        docker logs feastfrenzy-backend --tail 20
    else
        echo -e "${YELLOW}  ⏳ Backend indulóban... (nézd: docker logs feastfrenzy-backend)${NC}"
    fi
else
    echo -e "${YELLOW}  ⏭️  Nincs feastfrenzy-backend konténer, kihagyva${NC}"
fi

# Health check
echo ""
echo -e "${YELLOW}[7/7] Health check...${NC}"

# Direkt DB teszt
if mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" -e "SELECT COUNT(*) as employees FROM employees;" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Database kapcsolat OK${NC}"
else
    echo -e "${RED}  ❌ Database kapcsolat FAILED${NC}"
fi

# API health check (ha fut)
if command -v curl &>/dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}  ✅ API health check OK${NC}"
    else
        echo -e "${YELLOW}  ⏭️  API nem elérhető localhost:3000-en (lehet Docker network)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🎉 KÉSZ!                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📧 Admin login: admin@kantinrendszer.hu / Admin123!"
echo -e "  📧 Manager:     vezerigazgato@cegem.hu / Manager123!"
echo -e "  📧 Employee:    kovacs.peter@cegem.hu / Employee123!"
echo ""

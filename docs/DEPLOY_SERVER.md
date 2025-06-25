# FeastFrenzy Server Deployment Guide

## Target Environment
- **Domain**: feastfrenzy.dev
- **Server**: Ubuntu 24.04 LTS
- **Stack**: Docker + Nginx + MySQL (host) + Redis (host)

---

## Quick Reference

```bash
# Deploy/Update
cd /var/www/feastfrenzy && ./deploy/deploy-docker.sh

# View logs
docker compose -f docker-compose.server.yml logs -f

# Restart container
docker compose -f docker-compose.server.yml restart

# Check status
docker compose -f docker-compose.server.yml ps
curl https://feastfrenzy.dev/health
```

---

## Architecture

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  feastfrenzy.dev │
              │   (DNS → Server) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     NGINX       │
              │   :80 / :443    │
              │  (host)         │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    /api/*        /api-docs      /* (other)
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Docker  │   │ Docker  │   │ Angular │
    │ :3001   │   │ :3001   │   │ Static  │
    │ Node.js │   │ Node.js │   │ (host)  │
    └────┬────┘   └─────────┘   └─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ MySQL │ │ Redis │
│ :3306 │ │ :6379 │
│ (host)│ │ (host)│
└───────┘ └───────┘
```

**Key points:**
- Node.js backend runs in Docker container (port 3001)
- MySQL and Redis run on host (already installed)
- Frontend is built static files served by Nginx
- Nginx handles SSL termination and reverse proxy

---

## Initial Setup (One-Time)

### 1. DNS Configuration

Add these records at your domain registrar:

```
Type  Name    Value               TTL
A     @       YOUR_SERVER_IP      3600
A     www     YOUR_SERVER_IP      3600
```

### 2. Clone Repository

```bash
sudo mkdir -p /var/www/feastfrenzy
sudo chown $USER:$USER /var/www/feastfrenzy
git clone https://github.com/APorkolab/FeastFrenzy.git /var/www/feastfrenzy
cd /var/www/feastfrenzy
```

### 3. Create MySQL Database

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE feastfrenzy_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'feastfrenzy'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON feastfrenzy_prod.* TO 'feastfrenzy'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Configure Backend

```bash
cd /var/www/feastfrenzy/backend
cp .env.example .env
nano .env
```

Set these values:

```env
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=feastfrenzy_prod
DB_USER=feastfrenzy
DB_PASSWORD=YOUR_SECURE_PASSWORD

REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_ENABLED=true

JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=https://feastfrenzy.dev
```

Generate JWT secret:
```bash
openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64
```

### 5. Install Dependencies & Build

```bash
# Backend
cd /var/www/feastfrenzy/backend
npm ci --production
npm run migrate
npm run seed:prod

# Frontend
cd /var/www/feastfrenzy/frontend
# Update API URL first
sed -i "s|apiUrl:.*|apiUrl: 'https://feastfrenzy.dev/api/v1',|g" src/environments/environment.prod.ts
npm ci --legacy-peer-deps
npm run build:prod
```

### 6. Setup Nginx

```bash
# Copy config
sudo cp /var/www/feastfrenzy/deploy/nginx-feastfrenzy.conf /etc/nginx/sites-available/feastfrenzy

# Enable site
sudo ln -sf /etc/nginx/sites-available/feastfrenzy /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 7. Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d feastfrenzy.dev -d www.feastfrenzy.dev
```

### 8. Start Application with PM2

```bash
cd /var/www/feastfrenzy/backend

# Start with ecosystem file
pm2 start /var/www/feastfrenzy/deploy/ecosystem.config.js --env production

# OR simple start
pm2 start server.prod.js --name feastfrenzy --env production

# Save PM2 config (auto-start on reboot)
pm2 save
pm2 startup
```

---

## Ongoing Deployments

After pushing changes to GitHub:

```bash
ssh user@your-server
cd /var/www/feastfrenzy
./deploy/deploy.sh
```

Or manually:

```bash
cd /var/www/feastfrenzy
git pull origin main

cd backend
npm ci --production
npm run migrate

cd ../frontend
npm ci --legacy-peer-deps
npm run build:prod

pm2 reload feastfrenzy
```

---

## Useful Commands

### PM2

```bash
pm2 status                    # Show all processes
pm2 logs feastfrenzy          # View logs
pm2 logs feastfrenzy --lines 100  # Last 100 lines
pm2 reload feastfrenzy        # Zero-downtime restart
pm2 restart feastfrenzy       # Hard restart
pm2 stop feastfrenzy          # Stop
pm2 delete feastfrenzy        # Remove from PM2
pm2 monit                     # Real-time monitoring
```

### Nginx

```bash
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl restart nginx  # Full restart
sudo tail -f /var/log/nginx/feastfrenzy.error.log  # Error logs
```

### MySQL

```bash
mysql -u feastfrenzy -p feastfrenzy_prod  # Connect to DB
```

### SSL Certificate Renewal

```bash
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew            # Renew certificates
```

---

## Troubleshooting

### App not starting?

```bash
# Check PM2 logs
pm2 logs feastfrenzy --lines 50

# Check if port is in use
sudo lsof -i :3000

# Test backend directly
cd /var/www/feastfrenzy/backend
node server.prod.js
```

### 502 Bad Gateway?

```bash
# Check if Node is running
pm2 status

# Check Nginx error log
sudo tail -f /var/log/nginx/feastfrenzy.error.log

# Restart everything
pm2 restart feastfrenzy
sudo systemctl reload nginx
```

### Database connection errors?

```bash
# Test MySQL connection
mysql -u feastfrenzy -p feastfrenzy_prod -e "SELECT 1"

# Check .env file
cat /var/www/feastfrenzy/backend/.env | grep DB_
```

### SSL issues?

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## Architecture

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  feastfrenzy.dev │
              │   (DNS → Server) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     NGINX       │
              │   :80 / :443    │
              │  (SSL termination)│
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    /api/*        /api-docs      /* (other)
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Node.js │   │ Node.js │   │ Angular │
    │  :3000  │   │  :3000  │   │ Static  │
    │  (PM2)  │   │  (PM2)  │   │  Files  │
    └────┬────┘   └─────────┘   └─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ MySQL │ │ Redis │
│ :3306 │ │ :6379 │
└───────┘ └───────┘
```

---

## Security Checklist

- [ ] MySQL root password is strong
- [ ] MySQL app user has minimal privileges
- [ ] JWT_SECRET is 64+ random characters
- [ ] .env file is not committed to git
- [ ] SSL is enabled and auto-renews
- [ ] Firewall allows only 80, 443, 22
- [ ] PM2 runs as non-root user

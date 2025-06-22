#!/bin/bash
#
# FeastFrenzy Quick Deploy Script
# Run this after git push to update the production server
#
# Usage: ./deploy.sh
#

set -e

APP_DIR="/var/www/feastfrenzy"
APP_NAME="feastfrenzy"

echo "🚀 Deploying FeastFrenzy..."

cd $APP_DIR

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing backend dependencies..."
cd $APP_DIR/backend
npm ci --production

echo "🔄 Running migrations..."
npm run migrate || true

echo "🔨 Building frontend..."
cd $APP_DIR/frontend
npm ci --legacy-peer-deps
npm run build:prod

echo "♻️  Restarting PM2..."
pm2 reload $APP_NAME --update-env

echo ""
echo "✅ Deploy complete!"
echo "🌐 Site: https://feastfrenzy.dev"
echo "📊 Health: https://feastfrenzy.dev/health"
echo "📚 Swagger: https://feastfrenzy.dev/api-docs"

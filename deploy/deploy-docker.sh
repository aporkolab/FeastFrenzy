#!/bin/bash
#
# FeastFrenzy Docker Deploy Script
# Run this after git push to update the production server
#
# Usage: ./deploy-docker.sh
#

set -e

APP_DIR="/var/www/feastfrenzy"
COMPOSE_FILE="docker-compose.server.yml"

echo "🚀 Deploying FeastFrenzy (Docker)..."

cd $APP_DIR

echo "📥 Pulling latest code..."
git pull origin main

echo "🔨 Building frontend..."
cd $APP_DIR/frontend
npm ci --legacy-peer-deps
npm run build:prod

echo "🐳 Rebuilding and restarting Docker container..."
cd $APP_DIR
docker compose -f $COMPOSE_FILE build --no-cache
docker compose -f $COMPOSE_FILE up -d

echo "⏳ Waiting for container to be healthy..."
sleep 10

echo "🔍 Checking health..."
curl -s http://127.0.0.1:3001/health | jq . || echo "Health check response received"

echo ""
echo "✅ Deploy complete!"
echo "🌐 Site: https://feastfrenzy.dev"
echo "📊 Health: https://feastfrenzy.dev/health"
echo "📚 Swagger: https://feastfrenzy.dev/api-docs"
echo ""
echo "📋 Docker status:"
docker compose -f $COMPOSE_FILE ps

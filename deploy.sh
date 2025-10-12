#!/bin/bash

# FiveBot v2 - VPS Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting FiveBot v2 deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/opt/fivebot_v2"
REPO_URL="https://github.com/VOTRE-USERNAME/fivebot_v2.git"

echo -e "${BLUE}📦 Updating repository...${NC}"
cd $PROJECT_DIR
git pull origin main

echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install --production
npx prisma generate
npx prisma migrate deploy

echo -e "${BLUE}🔨 Building backend...${NC}"
npm run build

echo -e "${BLUE}📦 Installing bot-manager dependencies...${NC}"
cd ../bot-manager
npm install --production

echo -e "${BLUE}🔨 Building bot-manager...${NC}"
npm run build

echo -e "${BLUE}📦 Installing bot-template dependencies...${NC}"
cd ../bot-template
npm install --production
npm run build

echo -e "${BLUE}🔄 Restarting PM2 processes...${NC}"
cd ..
pm2 restart ecosystem.config.js

echo -e "${BLUE}💾 Saving PM2 configuration...${NC}"
pm2 save

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Application status:${NC}"
pm2 status

echo -e "${BLUE}📝 To view logs, run:${NC}"
echo "  pm2 logs fivebot-api"
echo "  pm2 logs fivebot-worker"
echo "  pm2 logs fivebot-bot-manager"

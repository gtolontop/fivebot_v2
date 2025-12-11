# FiveBot Deployment Guide

This guide covers deploying FiveBot v2 to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deploy](#quick-deploy)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [PM2 Deployment](#pm2-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Updating](#updating)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+ (or any Linux with Docker)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB SSD
- **Node.js**: v18.x or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v7 or higher

### Required Accounts

- Discord Application (for OAuth2 and bot tokens)
  - Create at: https://discord.com/developers/applications
  - Enable required intents: Server Members, Presence, Message Content

---

## Quick Deploy

For VPS with existing setup:

```bash
# Pull latest changes
cd ~/app && git pull

# Deploy everything
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build && \
cd ../bot-template && npm install && npx prisma generate && npm run build && \
cd ../frontend && npm install && npm run build && \
pm2 restart all
```

---

## Docker Deployment

### 1. Clone and Configure

```bash
git clone <repository-url> fivebot
cd fivebot

# Copy environment file
cp .env.example .env
```

### 2. Edit Environment Variables

```bash
nano .env
```

Required variables:
- `POSTGRES_PASSWORD`: Secure database password
- `JWT_SECRET`: Random 32+ character string
- `ENCRYPTION_KEY`: Generate with `openssl rand -base64 32`
- `DISCORD_CLIENT_ID`: From Discord Developer Portal
- `DISCORD_CLIENT_SECRET`: From Discord Developer Portal

### 3. Start Services

```bash
# Start all services (without bot-manager)
docker-compose up -d

# Or with bot-manager
docker-compose --profile with-bot-manager up -d
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# (Optional) Seed initial data
docker-compose exec backend npx prisma db seed
```

### 5. Verify

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

Access the dashboard at: http://localhost:3000

---

## Manual Deployment

### 1. Install Dependencies

```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 2. Configure PostgreSQL

```bash
sudo -u postgres psql

CREATE USER fivebot WITH PASSWORD 'your_secure_password';
CREATE DATABASE fivebot OWNER fivebot;
GRANT ALL PRIVILEGES ON DATABASE fivebot TO fivebot;
\q
```

### 3. Clone and Setup

```bash
git clone <repository-url> ~/app
cd ~/app

# Install all dependencies
npm run setup
```

### 4. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local

# Bot Template
cp bot-template/.env.example bot-template/.env
```

### 5. Build

```bash
# Backend
cd ~/app/backend
npx prisma generate
npx prisma migrate deploy
npm run build

# Bot Template
cd ~/app/bot-template
npx prisma generate
npm run build

# Frontend
cd ~/app/frontend
npm run build
```

---

## PM2 Deployment

### 1. Install PM2

```bash
npm install -g pm2
```

### 2. Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'fivebot-api',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PROCESS_TYPE: 'api'
      }
    },
    {
      name: 'fivebot-worker',
      cwd: './backend',
      script: 'dist/worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PROCESS_TYPE: 'worker'
      }
    },
    {
      name: 'fivebot-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### 3. Start with PM2

```bash
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### 4. Useful PM2 Commands

```bash
pm2 status           # View all processes
pm2 logs            # View logs
pm2 logs fivebot-api --lines 100  # View specific logs
pm2 restart all     # Restart all
pm2 reload all      # Zero-downtime reload
pm2 stop all        # Stop all
pm2 monit           # Real-time monitoring
```

---

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://fivebot:password@localhost:5432/fivebot

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-32-char-min-secret
ENCRYPTION_KEY=base64-encoded-32-byte-key

# Discord OAuth
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_CALLBACK_URL=https://your-domain.com/auth/discord/callback

# API
BACKEND_URL=https://api.your-domain.com
NODE_ENV=production
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
```

---

## Database Setup

### Fresh Migration

```bash
cd backend
npx prisma migrate deploy
```

### Reset Database (Development Only!)

```bash
npx prisma migrate reset
```

### View Database

```bash
npx prisma studio
```

---

## Updating

### Standard Update

```bash
cd ~/app

# Pull changes
git pull

# Update backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Update bot-template
cd ../bot-template
npm install
npx prisma generate
npm run build

# Update frontend
cd ../frontend
npm install
npm run build

# Restart services
pm2 restart all
```

### One-liner

```bash
cd ~/app && git pull && \
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build && \
cd ../bot-template && npm install && npx prisma generate && npm run build && \
cd ../frontend && npm install && npm run build && \
pm2 restart all
```

---

## Troubleshooting

### Bot won't start

1. Check bot token is valid
2. Verify Discord intents are enabled
3. Check logs: `pm2 logs fivebot-worker`

### Database connection failed

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check connection string in .env
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Redis connection failed

1. Verify Redis is running: `redis-cli ping`
2. Check Redis host/port in .env

### Frontend 500 errors

1. Check API URL is correct
2. Verify CORS settings in backend
3. Check browser console for errors

### Migration failed

```bash
# Check migration status
npx prisma migrate status

# Resolve stuck migration
npx prisma migrate resolve --applied <migration_name>

# Then retry
npx prisma migrate deploy
```

### Out of memory

1. Increase swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. Add to /etc/fstab:
```
/swapfile none swap sw 0 0
```

---

## Security Checklist

- [ ] Use strong passwords for database
- [ ] Use HTTPS in production (nginx/caddy reverse proxy)
- [ ] Keep `ENCRYPTION_KEY` and `JWT_SECRET` secure
- [ ] Don't commit .env files
- [ ] Enable firewall (ufw)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

---

## Reverse Proxy (Nginx)

Example nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Backend API
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## Support

For issues or questions:
- GitHub Issues: <repository-url>/issues
- Documentation: See README.md

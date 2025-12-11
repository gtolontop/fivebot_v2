# FiveBot v2 - Advanced Discord Bot Management Platform

FiveBot v2 is a comprehensive Discord bot management and orchestration system. It enables users to create, deploy, and manage custom Discord bots through an intuitive web dashboard and Discord commands.

## Features

### Core Features
- **Multi-Bot Management**: Create and manage unlimited Discord bots from a single dashboard
- **Real-time Dashboard**: Modern Next.js interface with live metrics, logs, and status updates
- **WebSocket Integration**: Real-time log streaming and instant status updates
- **Process Orchestration**: Each bot runs as an isolated process with crash recovery

### Bot Features
- **AI Integration**: OpenAI-powered conversational AI with memory and context awareness
- **Ticket System**: Full-featured support ticket system with categories, staff roles, and transcripts
- **Welcome/Goodbye Messages**: Customizable embed messages for member events
- **Status Rotation**: Automatic bot status cycling
- **Custom Commands**: User-defined slash commands with rich embeds
- **Module System**: Extensible module marketplace

### Security
- **Token Encryption**: AES-256-CBC encryption for all bot tokens at rest
- **Discord OAuth2**: Secure authentication via Discord
- **Granular Permissions**: Role-based access control (VIEWER, MODERATOR, DEVELOPER, ADMIN)
- **Collaborator System**: Invite team members with specific permissions
- **Rate Limiting**: Configurable request throttling
- **Audit Logs**: Complete action traceability

### Integrations
- **FiveLink Module**: Integration with FiveLink bio platform
- **Webhook Support**: External integrations via webhooks

## Architecture

```
fivebot_v2/
├── backend/          # NestJS API server (port 8000)
├── frontend/         # Next.js dashboard (port 3000)
├── bot-manager/      # Main Discord bot for management commands
├── bot-template/     # Template spawned for each user bot
└── docker-compose.yml
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | NestJS 10, TypeScript, Prisma ORM |
| **Database** | PostgreSQL |
| **Cache/Queue** | Redis (ioredis) |
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Real-time** | Socket.io, WebSocket |
| **Bots** | discord.js v14 |
| **Auth** | JWT, Passport, Discord OAuth2 |
| **AI** | OpenAI API |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Git

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd fivebot_v2

# Install all dependencies
npm run setup
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local

# Bot Manager
cp bot-manager/.env.example bot-manager/.env
```

Edit each `.env` file with your configuration.

### 3. Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 4. Start Development

```bash
# Terminal 1 - Backend API
cd backend && npm run start:dev

# Terminal 2 - Worker Process
cd backend && npm run start:worker

# Terminal 3 - Frontend
cd frontend && npm run dev

# Terminal 4 - Bot Manager (optional)
cd bot-manager && npm run dev
```

Or use Docker:

```bash
docker-compose up -d
```

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` | Redis server host | Yes |
| `REDIS_PORT` | Redis server port | Yes |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | Yes |
| `ENCRYPTION_KEY` | Key for token encryption (base64, 32 bytes) | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret | Yes |

See `backend/.env.example` for all options.

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXTAUTH_URL` | Frontend URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret | Yes |

## API Endpoints

### Authentication
- `POST /auth/discord` - Discord OAuth login
- `GET /auth/me` - Get current user

### Bots
- `GET /bots` - List user's bots
- `POST /bots` - Create a new bot
- `GET /bots/:id` - Get bot details
- `PUT /bots/:id/config` - Update bot configuration
- `POST /bots/:id/start` - Start a bot
- `POST /bots/:id/stop` - Stop a bot
- `POST /bots/:id/restart` - Restart a bot
- `GET /bots/:id/logs` - Get bot logs (WebSocket)
- `GET /bots/:id/metrics` - Get bot metrics

### Collaborators
- `GET /bots/:id/collaborators` - List collaborators
- `POST /bots/:id/collaborators` - Invite collaborator
- `DELETE /bots/:id/collaborators/:userId` - Remove collaborator

### Modules
- `GET /modules` - Browse available modules
- `POST /modules/:id/install` - Install module on bot

## Discord Commands (Bot Manager)

| Command | Description |
|---------|-------------|
| `/createbot <token> <name>` | Create a new bot |
| `/listbots` | List your bots |
| `/botinfo <id>` | Get bot information |
| `/creditcheck <user>` | Check user credits |
| `/help` | Show help |

## Project Structure

### Backend (`/backend`)
```
src/
├── auth/              # Authentication (Discord OAuth, JWT)
├── bots/              # Bot management, metrics, logs
├── common/            # Shared modules (prisma, redis, cache, logger)
├── credits/           # Credit system
├── modules/           # Module marketplace
├── notifications/     # Real-time notifications
├── queue/             # Job queue (bot start/stop/restart)
├── tasks/             # Scheduled tasks
└── users/             # User management
```

### Frontend (`/frontend`)
```
src/
├── app/               # Next.js App Router pages
├── components/        # React components
├── contexts/          # React Context providers
├── hooks/             # Custom React hooks
├── types/             # TypeScript definitions
└── utils/             # Utility functions
```

### Bot Template (`/bot-template`)
```
src/
├── commands/          # Slash commands (including FiveLink)
├── events/            # Discord event handlers
├── handlers/          # Interaction handlers
├── services/          # Business logic services
└── utils/             # Utilities
```

## Deployment

### Production with PM2

```bash
# Backend
cd backend
npm run build
pm2 start ecosystem.config.js

# Frontend
cd frontend
npm run build
pm2 start npm --name "frontend" -- start
```

### Production with Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

See `DEPLOY.md` for detailed deployment instructions.

## Development

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Database Migrations

```bash
cd backend

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Code Style

The project uses:
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode

## Troubleshooting

### Bot won't start
1. Verify the bot token is valid in Discord Developer Portal
2. Check that required intents are enabled (Server Members, Presence, Message Content)
3. Review logs in the dashboard console

### Connection issues
1. Ensure Redis is running: `redis-cli ping`
2. Verify PostgreSQL connection: `psql $DATABASE_URL -c "SELECT 1"`
3. Check backend logs: `pm2 logs backend`

### Token encryption errors
1. Ensure `ENCRYPTION_KEY` is set and is a valid 32-byte base64 key
2. Generate a new key: `openssl rand -base64 32`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "feat: add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE for details.

---

Built with passion by the FiveBot team.

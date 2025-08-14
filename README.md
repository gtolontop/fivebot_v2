# FiveBot v2 - Advanced Discord Bot Manager

FiveBot v2 est un système complet de gestion et d'orchestration de bots Discord. Il permet aux utilisateurs de créer, déployer et gérer des bots Discord personnalisés via une interface web intuitive et des commandes Discord.

## 🚀 Fonctionnalités principales

- **Création de bots automatisée** : Créez des bots Discord via commandes slash ou dashboard web
- **Dashboard web complet** : Interface moderne pour gérer vos bots
- **Système de crédits** : Économie interne pour contrôler l'usage
- **Messages de bienvenue personnalisés** : Embeds avec logo personnalisé
- **Sécurité avancée** : Chiffrement des tokens, validation stricte
- **Orchestration Docker** : Chaque bot s'exécute dans son propre container
- **Monitoring en temps réel** : Logs, statuts et métriques

## 🏗️ Architecture

```
fivebot/
├── backend/           # API NestJS + Worker Queue
├── frontend/         # Dashboard Next.js
├── bot-manager/      # Bot principal Discord
├── bot-template/     # Template pour bots enfants
├── docker/          # Configuration Docker
├── database/        # Migrations Prisma
└── docs/           # Documentation
```

## 🛠️ Technologies

- **Backend**: NestJS, TypeScript, Prisma, MariaDB
- **Frontend**: Next.js, React, Tailwind CSS
- **Queue**: BullMQ + Redis
- **Bots**: discord.js v14
- **Orchestration**: Docker
- **Sécurité**: JWT, AES-256, OAuth2

## 🚀 Installation

### Prérequis

- Node.js 18+
- Docker & Docker Compose
- Git

### Installation rapide

```bash
# Cloner le repository
git clone <repository-url>
cd fivebot

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Installer les dépendances
npm run setup

# Lancer la base de données et les services
npm run dev

# Appliquer les migrations
npm run db:migrate
```

## 📖 Utilisation

### Dashboard Web
Accédez au dashboard sur `http://localhost:3000` et connectez-vous avec Discord OAuth2.

### Commandes Discord

Le bot principal propose les commandes suivantes :

- `/createbot token:<bot_token> name:<name>` - Créer un nouveau bot
- `/listbots` - Lister vos bots
- `/botinfo id:<id>` - Informations sur un bot
- `/credit-check user:<@user>` - Vérifier les crédits

### API Endpoints

- `POST /api/bots/create` - Créer un bot
- `GET /api/bots/:id/status` - Statut d'un bot
- `PATCH /api/bots/:id/config` - Configurer un bot
- `POST /api/bots/:id/invite-link` - Générer lien d'invitation

## 🔒 Sécurité

- **Tokens chiffrés** : Tous les tokens Discord sont chiffrés en base
- **Validation stricte** : Seuls les bot tokens sont acceptés (pas de user tokens)
- **RBAC** : Contrôle d'accès basé sur les rôles
- **Rate limiting** : Protection contre les abus
- **Audit logs** : Traçabilité complète des actions

## 🧪 Tests

```bash
# Tests backend
npm run test:backend

# Tests frontend
npm run test:frontend

# Tous les tests
npm test
```

## 📚 Documentation

- [Guide de démarrage](docs/quickstart.md)
- [Configuration](docs/configuration.md)
- [API Reference](docs/api.md)
- [Sécurité](docs/security.md)
- [Déploiement](docs/deployment.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les détails.

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour les détails.

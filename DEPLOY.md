# 🚀 Guide de Déploiement FiveBot

## Prérequis sur le VPS

```bash
# Installer Redis (nécessaire pour le partage d'état entre processus)
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Vérifier Redis
redis-cli ping  # Devrait répondre "PONG"
```

## Déploiement Standard

```bash
# 1. Aller dans le dossier du projet
cd /opt/fivebot

# 2. Récupérer les dernières modifications
git pull origin main

# 3. Build backend
cd backend
npm install
npm run build

# 4. Build bot-manager
cd ../bot-manager
npm install
npm run build

# 5. Redémarrer tous les services
cd /opt/fivebot/backend
pm2 restart all

# 6. Vérifier les logs
pm2 logs
```

## Déploiement Rapide (sans npm install)

Si tu n'as modifié que le code TypeScript :

```bash
cd /opt/fivebot
git pull origin main
cd backend && npm run build
cd ../bot-manager && npm run build
pm2 restart all
```

## Déploiement d'un seul service

### Backend API seulement
```bash
cd /opt/fivebot
git pull origin main
cd backend && npm run build
pm2 restart fivebot-api
```

### Worker seulement
```bash
cd /opt/fivebot
git pull origin main
cd backend && npm run build
pm2 restart fivebot-worker
```

### Bot Manager seulement
```bash
cd /opt/fivebot
git pull origin main
cd bot-manager && npm run build
pm2 restart fivebot-bot-manager
```

## Commandes PM2 Utiles

```bash
# Voir l'état des services
pm2 status

# Voir les logs en temps réel
pm2 logs

# Voir les logs d'un service spécifique
pm2 logs fivebot-api
pm2 logs fivebot-worker
pm2 logs fivebot-bot-manager

# Arrêter les logs (Ctrl+C)

# Redémarrer un service spécifique
pm2 restart fivebot-api

# Arrêter tous les services
pm2 stop all

# Supprimer tous les services
pm2 delete all

# Relancer depuis le fichier de config
pm2 start ecosystem.config.js
```

## En cas de problème

### Redis ne se connecte pas
```bash
sudo systemctl status redis-server
sudo systemctl restart redis-server
redis-cli ping
```

### Base de données PostgreSQL
```bash
# Vérifier le statut
sudo systemctl status postgresql

# Se connecter à la DB
psql -U fivebot -d fivebot

# Lancer les migrations Prisma si besoin
cd /opt/fivebot/backend
npx prisma migrate deploy
npx prisma generate
```

### Erreurs de build
```bash
# Nettoyer et rebuild
cd /opt/fivebot/backend
rm -rf dist node_modules
npm install
npm run build

# Pareil pour bot-manager
cd /opt/fivebot/bot-manager
rm -rf dist node_modules
npm install
npm run build
```

### Les bots ne se lancent pas
```bash
# Vérifier les permissions
cd /opt/fivebot
ls -la bot-template/

# Vérifier le template existe
cd bot-template && npm install

# Tester manuellement
cd bot-template
BOT_ID=test-id npm run dev
```

## Architecture

```
fivebot/
├── backend/              # API + Worker NestJS
│   ├── src/
│   ├── dist/            # Build output
│   └── ecosystem.config.js
├── bot-manager/         # Bot Discord de gestion
│   ├── src/
│   └── dist/
└── bot-template/        # Template des bots enfants
    └── src/
```

### Services PM2

- **fivebot-api** (port 3001) : API REST + gestion des bots
- **fivebot-worker** : Worker pour jobs asynchrones + heartbeat monitoring
- **fivebot-bot-manager** : Bot Discord pour créer/gérer les bots via commandes

### État partagé

Les services utilisent **Redis** pour partager l'état des bots en cours d'exécution :
- API ajoute les bots au démarrage
- Worker vérifie Redis pour le heartbeat
- Plus de problèmes de "split-brain" entre processus

## Workflow Git Recommandé

```bash
# Sur ta machine locale
git add .
git commit -m "fix: description du fix"
git push origin main

# Sur le VPS
cd /opt/fivebot
git pull origin main
cd backend && npm run build
cd ../bot-manager && npm run build
pm2 restart all
```

## Variables d'environnement

Assure-toi que `/opt/fivebot/backend/.env` contient :

```env
DATABASE_URL="postgresql://..."
REDIS_HOST="localhost"
REDIS_PORT="6379"
JWT_SECRET="..."
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
API_URL="https://api.fivebot.lol"
FRONTEND_URL="https://fivebot.lol"
```

## Monitoring

```bash
# Voir l'utilisation mémoire/CPU
pm2 monit

# Voir les infos système
pm2 info fivebot-api

# Fichiers de logs
ls -lh /opt/fivebot/backend/logs/
tail -f /opt/fivebot/backend/logs/api-error.log
```

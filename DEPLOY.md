# 🚀 Guide de Déploiement FiveBot

## 1️⃣ Sur le Serveur (VPS)

### Étape 1: Pull les derniers changements
```bash
cd ~/app
git pull
```

### Étape 2: Backend - Migration de la base de données
```bash
cd ~/app/backend

# Générer le client Prisma avec les nouveaux modèles AI
npx prisma generate

# Créer et appliquer la migration AI
npx prisma migrate deploy

# Rebuild le backend
npm run build
```

### Étape 3: Bot Template
```bash
cd ~/app/bot-template

# Installer les dépendances (openai)
npm install

# Générer le client Prisma
npx prisma generate

# Rebuild
npm run build
```

### Étape 4: Frontend
```bash
cd ~/app/frontend

# Installer les dépendances si nécessaire
npm install

# Rebuild
npm run build
```

### Étape 5: Redémarrer tous les services
```bash
pm2 restart all
pm2 status
pm2 logs
```

## 2️⃣ Commandes rapides

```bash
# Tout en une fois
cd ~/app && git pull && \
cd backend && npx prisma generate && npx prisma migrate deploy && npm run build && \
cd ../bot-template && npm install && npx prisma generate && npm run build && \
cd ../frontend && npm run build && \
pm2 restart all
```

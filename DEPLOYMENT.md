# 🚀 Guide de Déploiement FiveBot v2

## 📋 Budget estimé

- **Vercel** : Gratuit
- **VPS Contabo** : 4-5€/mois
- **Domaine** : ~10€/an
- **Total** : ~5€/mois + 10€/an

---

## Étape 1 : Acheter un VPS (Contabo recommandé)

1. Aller sur [Contabo.com](https://contabo.com)
2. Choisir **VPS S** (4€/mois) :
   - 4 vCPU
   - 8 GB RAM
   - 200 GB SSD
3. Système d'exploitation : **Ubuntu 22.04 LTS**
4. Noter l'**IP publique** fournie

---

## Étape 2 : Configuration initiale du VPS

### Se connecter au VPS

```bash
ssh root@VOTRE_IP_VPS
```

### Installer les dépendances

```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Installer PostgreSQL
apt install -y postgresql postgresql-contrib

# Installer Nginx
apt install -y nginx

# Installer PM2
npm install -g pm2

# Installer Git
apt install -y git
```

### Configurer PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données et l'utilisateur
CREATE DATABASE fivebot;
CREATE USER fivebot_user WITH ENCRYPTED PASSWORD 'VOTRE_MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON DATABASE fivebot TO fivebot_user;
\q
```

---

## Étape 3 : Cloner et configurer le projet

```bash
# Créer le répertoire du projet
mkdir -p /opt/fivebot_v2
cd /opt/fivebot_v2

# Cloner le repository (remplacer par votre repo)
git clone https://github.com/VOTRE-USERNAME/fivebot_v2.git .

# Créer le fichier .env pour le backend
cd backend
cp .env.example .env
nano .env
```

### Éditer le fichier `.env` :

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://fivebot_user:VOTRE_MOT_DE_PASSE@localhost:5432/fivebot"
JWT_SECRET=générer-avec-openssl-rand-base64-32
DISCORD_CLIENT_ID=votre-client-id
DISCORD_CLIENT_SECRET=votre-secret
DISCORD_REDIRECT_URI=https://votredomaine.com/api/auth/callback/discord
FRONTEND_URL=https://votredomaine.com
```

### Installer et build

```bash
# Backend
cd /opt/fivebot_v2/backend
npm install --production
npx prisma generate
npx prisma migrate deploy
npm run build

# Bot Manager
cd /opt/fivebot_v2/bot-manager
npm install --production
npm run build

# Bot Template
cd /opt/fivebot_v2/bot-template
npm install --production
npm run build
```

---

## Étape 4 : Configurer PM2

```bash
cd /opt/fivebot_v2

# Créer le dossier logs
mkdir -p logs

# Démarrer les applications
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

# Auto-démarrage au reboot
pm2 startup
# Copier-coller la commande générée et l'exécuter

# Vérifier le statut
pm2 status
```

---

## Étape 5 : Configurer Nginx

```bash
# Créer la configuration
nano /etc/nginx/sites-available/fivebot-api
```

### Contenu du fichier :

```nginx
server {
    listen 80;
    server_name api.votredomaine.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Activer le site

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/fivebot-api /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

### Installer SSL avec Let's Encrypt

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL
certbot --nginx -d api.votredomaine.com

# Le renouvellement automatique est déjà configuré
```

---

## Étape 6 : Acheter et configurer un domaine

### Acheter un domaine

- [Namecheap](https://www.namecheap.com) (~8€/an)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (~9€/an)
- [OVH](https://www.ovh.com) (~10€/an)

### Configurer les DNS

Dans votre registrar, ajouter ces enregistrements :

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `IP_DE_VERCEL` | Auto |
| A | www | `IP_DE_VERCEL` | Auto |
| A | api | `IP_DE_VOTRE_VPS` | Auto |

> **Note** : L'IP de Vercel sera fournie quand vous ajouterez le domaine dans Vercel Dashboard

---

## Étape 7 : Déployer le Frontend sur Vercel

### Préparer le repo GitHub

```bash
# Depuis votre machine locale
cd c:\Users\teamr\Desktop\fivebot_v2
git add .
git commit -m "feat: add deployment configuration"
git push origin main
```

### Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer **"Import Project"**
4. Sélectionner votre repo `fivebot_v2`
5. Configuration :
   - **Framework Preset** : Next.js
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

6. **Variables d'environnement** :

```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
NEXTAUTH_URL=https://votredomaine.com
NEXTAUTH_SECRET=générer-avec-openssl-rand-base64-32
DISCORD_CLIENT_ID=votre-client-id
DISCORD_CLIENT_SECRET=votre-secret
```

7. Cliquer **"Deploy"**

### Ajouter le domaine custom

1. Dans Vercel Dashboard → Settings → Domains
2. Ajouter `votredomaine.com` et `www.votredomaine.com`
3. Vercel va fournir les IP/CNAME à ajouter dans votre DNS

---

## Étape 8 : Configurer Discord OAuth

1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionner votre application
3. OAuth2 → Redirects :
   - Ajouter : `https://votredomaine.com/api/auth/callback/discord`

---

## 🎉 Déploiement terminé !

### URLs finales

- **Frontend** : https://votredomaine.com
- **Backend API** : https://api.votredomaine.com
- **API Health Check** : https://api.votredomaine.com/health

### Commandes utiles

```bash
# Voir les logs
pm2 logs fivebot-api
pm2 logs fivebot-worker
pm2 logs fivebot-bot-manager

# Redémarrer
pm2 restart all

# Monitoring
pm2 monit

# Mise à jour du code
cd /opt/fivebot_v2
./deploy.sh
```

---

## 🔧 Troubleshooting

### Le backend ne démarre pas

```bash
# Vérifier les logs
pm2 logs fivebot-api --lines 100

# Vérifier la base de données
cd /opt/fivebot_v2/backend
npx prisma studio
```

### Nginx erreur 502

```bash
# Vérifier que le backend écoute sur le port 3001
netstat -tlnp | grep 3001

# Vérifier les logs Nginx
tail -f /var/log/nginx/error.log
```

### SSL ne fonctionne pas

```bash
# Renouveler le certificat
certbot renew --nginx
```

---

## 📊 Monitoring et Maintenance

### Mettre à jour le projet

```bash
cd /opt/fivebot_v2
./deploy.sh
```

### Sauvegarder la base de données

```bash
# Créer un backup
pg_dump -U fivebot_user fivebot > backup_$(date +%Y%m%d).sql

# Restaurer un backup
psql -U fivebot_user fivebot < backup_20241012.sql
```

---

## 💰 Coûts récapitulatifs

| Service | Coût |
|---------|------|
| Vercel (Frontend) | Gratuit |
| VPS Contabo | 4€/mois |
| Domaine | ~10€/an |
| **Total mensuel** | **~5€/mois** |
| **Total annuel** | **~60€ + 10€ = 70€** |

---

## ✅ Checklist finale

- [ ] VPS acheté et accessible via SSH
- [ ] Node.js, PostgreSQL, Nginx, PM2 installés
- [ ] Base de données PostgreSQL créée
- [ ] Projet cloné et configuré sur le VPS
- [ ] Backend build et démarré avec PM2
- [ ] Nginx configuré avec SSL
- [ ] Domaine acheté et DNS configurés
- [ ] Frontend déployé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Discord OAuth configuré
- [ ] Tests : création bot, tickets, commandes

---

Besoin d'aide ? Contactez le support FiveBot ! 🤖

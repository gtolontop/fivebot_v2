# FiveLink Module - Installation & Configuration

Ce document explique comment installer et configurer le module FiveLink pour FiveBot.

## 📋 Prérequis

- FiveBot v2 installé et fonctionnel
- Une clé API FiveLink (obtenue sur https://fivelink.lol/dashboard/api)
- Redis installé et accessible

## 🚀 Installation

### 1. Installer les dépendances manquantes

```bash
cd fivebot_v2/bot-template
npm install axios@^1.6.0
```

### 2. Seed le module dans la base de données

```bash
cd fivebot_v2/backend
npx ts-node prisma/seeds/fivelink-module.seed.ts
```

Cela créera le module FiveLink dans la base de données avec :
- Slug: `fivelink`
- Prix: 0 (gratuit)
- Auteur: FiveLink
- Catégorie: UTILITY
- 4 commandes Discord incluses

### 3. Vérifier l'installation

Vérifiez que le module apparaît dans votre dashboard FiveBot :
- Allez sur le dashboard FiveBot
- Section "Modules"
- Cherchez "FiveLink Integration" (gratuit)

## ⚙️ Configuration

### 1. Obtenir une clé API FiveLink

1. Connectez-vous sur https://fivelink.lol
2. Allez sur https://fivelink.lol/dashboard/api
3. Cliquez sur "Create Key"
4. Donnez un nom (ex: "Mon Bot Discord")
5. Copiez la clé (format: `fl_live_xxxxxxxxxxxxx`)

⚠️ **Important:** La clé n'est affichée qu'une seule fois !

### 2. Configurer le module sur votre bot

Dans le dashboard FiveBot :

1. Activez le module FiveLink sur votre bot
2. Configurez les paramètres :
   - **API Key** (requis): Votre clé API FiveLink
   - **Cache Enabled** (optionnel): `true` (recommandé)
   - **Cache TTL** (optionnel): `3600` secondes (1 heure)

### 3. Redémarrer le bot

Le bot doit être redémarré pour charger le module et ses commandes.

## 📝 Commandes disponibles

Une fois le module activé, 4 commandes seront disponibles :

### `/leaderboard [type]`

Affiche les leaderboards FiveLink avec pagination interactive.

**Types disponibles:**
- `views` - Profils les plus vus
- `clicks` - Profils les plus cliqués
- `customId` - Utilisateurs les plus anciens
- `badges` - Plus de badges
- `mediaUploads` - Plus de médias uploadés

**Features:**
- 10 entrées par page
- Pagination jusqu'à 100 entrées (10 pages)
- Boutons interactifs pour changer de type
- Bouton refresh pour actualiser

### `/me`

Affiche votre profil FiveLink si votre Discord est lié.

**Affiche:**
- UUID et username
- Total de vues et clics
- Nombre de médias uploadés
- Badges collectés
- Liens vers votre profil et l'éditeur

**Note:** Votre compte Discord doit être lié à FiveLink. Pour lier :
1. Allez sur https://fivelink.lol/login
2. Connectez-vous avec Discord

### `/profile <username>`

Recherche et affiche n'importe quel profil FiveLink public.

**Paramètres:**
- `username` - Le slug ou alias du profil FiveLink

**Affiche:**
- Toutes les infos du profil (comme `/me`)
- Lien vers le profil public

### `/stats`

Affiche les statistiques globales de la plateforme FiveLink.

**Affiche:**
- Total utilisateurs, profils, vues, clics
- Statistiques des dernières 24 heures
- Bouton refresh pour actualiser
- Liens vers FiveLink

## 🔧 Fichiers créés

Le module FiveLink a ajouté ces fichiers au projet :

```
bot-template/
├── src/
│   ├── services/
│   │   └── fivelink.service.ts          # Service API avec cache Redis
│   └── commands/
│       └── fivelink/
│           ├── leaderboard.ts           # Commande /leaderboard
│           ├── me.ts                    # Commande /me
│           ├── profile.ts               # Commande /profile
│           └── stats.ts                 # Commande /stats
│
backend/
└── prisma/
    └── seeds/
        └── fivelink-module.seed.ts      # Seed du module
```

## 🐛 Résolution de problèmes

### Erreur "API key invalid"

- Vérifiez que la clé API est correcte
- Vérifiez qu'elle n'a pas été supprimée sur FiveLink
- Vérifiez qu'elle est active (pas désactivée)

### Erreur "Discord account not linked"

Pour `/me` :
- Le compte Discord doit être lié à un compte FiveLink
- Connectez-vous sur FiveLink avec Discord
- Ou dans Intégrations, liez votre compte Discord

### Cache ne fonctionne pas

- Vérifiez que Redis est démarré
- Vérifiez la connexion Redis dans la config du bot
- Vérifiez les logs du bot pour des erreurs Redis

### Commandes n'apparaissent pas

- Vérifiez que le module est activé sur votre bot
- Redémarrez le bot après activation
- Vérifiez les logs pour des erreurs au chargement
- Assurez-vous que les commandes sont bien enregistrées sur Discord

## 📊 Cache et Performance

Le module utilise Redis pour optimiser les performances :

### Durées de cache par défaut

- **Leaderboards**: 1 heure (configurable)
- **User profiles**: 1 heure (configurable)
- **Global stats**: 5 minutes (fixe)

### Bouton Refresh

Sur les commandes avec bouton refresh, l'utilisateur peut :
- Forcer le rafraîchissement des données
- Bypass le cache pour obtenir les données les plus récentes
- Utile pour vérifier les changements en temps réel

### Désactiver le cache

Si vous voulez désactiver le cache :
1. Dans la config du module
2. Mettez `cacheEnabled` à `false`
3. Redémarrez le bot

**Note:** Désactiver le cache augmentera les appels API et pourrait atteindre les rate limits plus rapidement.

## 📈 Rate Limits

Avec une clé API normale :
- **10,000 requêtes par jour**
- **1,000 requêtes par heure**

**Recommandations:**
- Gardez le cache activé
- TTL d'au moins 1 heure recommandé
- Surveillez l'usage dans le dashboard FiveLink

## 🔗 Liens utiles

- **Dashboard API FiveLink**: https://fivelink.lol/dashboard/api
- **Documentation API complète**: Voir `FIVELINK_API_INTEGRATION.md`
- **Support FiveBot**: [Votre lien support]

## ✅ Checklist d'installation

- [ ] Axios installé (`npm install axios`)
- [ ] Module seedé dans la base de données
- [ ] Clé API FiveLink obtenue
- [ ] Module configuré avec la clé API
- [ ] Cache Redis fonctionnel
- [ ] Bot redémarré
- [ ] Commandes testées et fonctionnelles

## 🎉 C'est prêt !

Votre module FiveLink est maintenant configuré et prêt à l'emploi. Les utilisateurs de votre bot Discord peuvent maintenant :
- Consulter les leaderboards FiveLink
- Afficher leurs profils FiveLink liés
- Rechercher des profils publics
- Voir les stats globales de la plateforme

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-01-07

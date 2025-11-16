# AI Contextual Features - Guide d'utilisation

Ce document explique les nouvelles fonctionnalités contextuelles du système AI.

## Nouvelles fonctionnalités

### 1. Prompts système contextuels

Vous pouvez maintenant définir différents prompts système selon le contexte :

#### DM System Prompt
Prompt spécifique utilisé quand le bot répond dans les messages privés (DM).

**Exemple :**
```json
{
  "dmSystemPrompt": "Tu es un assistant personnel privé. Sois chaleureux et utilise un ton plus décontracté car nous sommes en conversation privée."
}
```

#### Channel Prompts
Prompts spécifiques par canal. Utile pour avoir un comportement différent selon le canal.

**Exemple :**
```json
{
  "channelPrompts": {
    "1234567890": "Tu es dans le canal #support. Sois professionnel et aide les utilisateurs avec leurs problèmes techniques.",
    "0987654321": "Tu es dans le canal #général. Sois amical et conversationnel."
  }
}
```

#### Thread Prompts
Prompts spécifiques par thread Discord. Permet d'avoir un contexte unique pour chaque thread.

**Exemple :**
```json
{
  "threadPrompts": {
    "thread_id_123": "Ce thread concerne le développement de la fonctionnalité X. Fournis des conseils techniques détaillés.",
    "thread_id_456": "Ce thread est pour le brainstorming. Sois créatif et propose des idées innovantes."
  }
}
```

### 2. Vision Support (Lecture d'images)

Le bot peut maintenant lire et analyser les images dans les messages.

**Configuration :**
```json
{
  "enableVision": true
}
```

**Utilisation :**
- Envoyez simplement un message avec une image attachée
- Le bot analysera automatiquement l'image
- Fonctionne avec tous les formats d'image supportés par Discord (PNG, JPG, GIF, etc.)

**Exemple :**
```
User: [envoie une image de code] Qu'est-ce qui ne va pas dans ce code ?
Bot: [analyse l'image] Je vois que tu as oublié de fermer la parenthèse à la ligne 5...
```

### 3. Contexte utilisateur enrichi

Le bot inclut automatiquement des informations sur l'utilisateur dans ses réponses.

**Configuration :**
```json
{
  "includeUserContext": true
}
```

**Informations incluses :**
- Username Discord
- Display Name (pseudo du serveur)
- User ID
- Rôles de l'utilisateur

**Comportement :**
- Le bot appellera l'utilisateur par son display name
- Il connaîtra les rôles de l'utilisateur
- Permet des réponses plus personnalisées

**Exemple :**
```
User: Salut
Bot: Salut JohnDoe ! Comment puis-je t'aider aujourd'hui ?
```

### 4. Contexte de canal enrichi

Le bot connaît le contexte du canal où il répond.

**Configuration :**
```json
{
  "includeChannelContext": true
}
```

**Informations incluses :**
- Nom du serveur
- Nom du canal
- ID du canal
- Si c'est un thread : canal parent et créateur du thread

**Utilité :**
- Le bot sait où il se trouve
- Peut adapter ses réponses selon le canal
- Utile pour les threads pour maintenir le contexte

### 5. Gestion améliorée des threads

Le bot peut maintenant suivre des conversations dans les threads Discord.

**Configuration :**
```json
{
  "enableInThreads": true
}
```

**Fonctionnalités :**
- Réponses automatiques dans les threads
- Maintien du contexte tout au long du thread
- Connaissance du créateur du thread
- Prompt spécifique par thread possible

## Configuration complète - Exemple

```json
{
  "enabled": true,
  "apiKey": "sk-...",
  "model": "GPT_4",

  // Prompts contextuels
  "systemPrompt": "Tu es un assistant utile sur ce serveur Discord.",
  "dmSystemPrompt": "Tu es un assistant personnel. Sois chaleureux et décontracté.",
  "channelPrompts": {
    "channel_support_id": "Tu es dans #support. Aide les utilisateurs professionnellement.",
    "channel_fun_id": "Tu es dans #fun. Sois détendu et amusant !"
  },
  "threadPrompts": {
    "thread_dev_id": "Thread de développement. Fournis des conseils techniques."
  },

  // Vision et contexte
  "enableVision": true,
  "includeUserContext": true,
  "includeChannelContext": true,

  // Autres paramètres
  "conversationHistory": true,
  "contextWindow": 10,
  "enableInThreads": true,
  "temperature": 0.7,
  "maxTokens": 1000
}
```

## API Endpoints

### Créer/Mettre à jour la configuration

**POST/PUT** `/bots/:botId/ai/config`

```json
{
  "systemPrompt": "Prompt général",
  "dmSystemPrompt": "Prompt pour DM",
  "channelPrompts": {
    "channelId": "Prompt pour ce canal"
  },
  "threadPrompts": {
    "threadId": "Prompt pour ce thread"
  },
  "enableVision": true,
  "includeUserContext": true,
  "includeChannelContext": true
}
```

## Cas d'usage

### 1. Bot de support avec contexte
```json
{
  "channelPrompts": {
    "support_channel_id": "Tu es un agent de support technique. Sois patient et détaillé dans tes explications."
  },
  "includeUserContext": true,
  "enableInThreads": true
}
```

### 2. Bot d'analyse d'images
```json
{
  "enableVision": true,
  "systemPrompt": "Tu es un expert en analyse d'images. Décris en détail ce que tu vois."
}
```

### 3. Bot personnalisé par thread
```json
{
  "enableInThreads": true,
  "threadPrompts": {
    "thread_brainstorm": "Sois créatif et propose des idées",
    "thread_review": "Sois critique et analytique"
  },
  "includeChannelContext": true
}
```

### 4. Assistant personnel en DM
```json
{
  "dmSystemPrompt": "Tu es un assistant personnel privé. Utilise un ton amical et tutoie l'utilisateur.",
  "includeUserContext": true
}
```

## Notes importantes

1. **Vision Support** : Nécessite un modèle compatible (GPT-4 Vision, GPT-4 Turbo)
2. **Prompts prioritaires** :
   - Thread prompt (si défini) > Channel prompt > DM prompt > System prompt
3. **Performance** : Les prompts plus longs consomment plus de tokens
4. **Confidentialité** : Les infos utilisateur sont incluses dans le prompt, soyez conscient des coûts

## Déploiement

Pour déployer ces fonctionnalités sur votre serveur :

```bash
# Windows
deploy-ai-context.bat

# Linux/Mac
./deploy-ai-context.sh
```

Le script va :
1. Appliquer les migrations de base de données
2. Pousser le code sur le repository
3. Déployer sur le serveur
4. Redémarrer les bots

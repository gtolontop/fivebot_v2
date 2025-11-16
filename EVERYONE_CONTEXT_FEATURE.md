# Fonctionnalité @everyone Contextuel Intelligent

## 🎯 Concept

Le bot analyse intelligemment les @everyone pour comprendre le VRAI contexte :

**Avant :**
```
Arthuxx: "Hello, I'm new to the staff team!"
Gtol: @everyone
Bot: *répond juste au ping*
```

**Maintenant :**
```
Arthuxx: "Hello, I'm new to the staff team!"
Gtol: @everyone
Bot: "Bienvenue dans l'équipe Arthuxx ! 👋 N'hésite pas si tu as besoin d'aide"
```

## ✨ Fonctionnalités

### 1. **Analyse du contexte AVANT le ping**
- Lit les X derniers messages (configurable)
- Comprend QUI a parlé avant
- Détecte le SUJET de conversation

### 2. **Suivi des reply chains**
- Si quelqu'un répond à un message, le bot lit aussi le message original
- Comprend les fils de conversation complets

### 3. **Détection intelligente du type**
- **Annonce** : "Hey everyone, new feature!"
- **Giveaway** : "Giveaway time! React with..."
- **Question** : "Does anyone know..."
- **Bienvenue** : "New member joined"
- **Random ping** : Juste un ping sans contexte

### 4. **Contexte multi-utilisateurs**
- Ne prend PAS que le contexte de celui qui ping
- Prend TOUS les messages avant le ping
- Comprend les conversations entre plusieurs personnes

## 📋 Configuration

```json
{
  "respondToEveryone": true,        // Activer réponse aux @everyone
  "everyoneContextDepth": 10,       // Nombre de messages à analyser avant
  "followReplyChains": true,        // Suivre les fils de réponses
  "detectContextType": true         // Détecter le type (annonce, giveaway, etc.)
}
```

## 🔧 Implémentation

### Dans `ai.service.ts` du bot-template :

```typescript
private async shouldRespond(message: Message, config: AIConfig): Promise<boolean> {
  // ... code existant ...

  // Check for @everyone ping
  if (message.content.includes('@everyone') && config.respondToEveryone) {
    return true;
  }

  // ... reste du code ...
}

private async getConversationContext(message: Message, config: AIConfig): Promise<ConversationContext[]> {
  if (!config.conversationHistory) return [];

  // Si c'est un @everyone, récupérer contexte enrichi
  if (message.content.includes('@everyone') && config.respondToEveryone) {
    return await this.getEveryoneContext(message, config);
  }

  // Code existant pour contexte normal
  // ...
}

private async getEveryoneContext(message: Message, config: AIConfig): Promise<ConversationContext[]> {
  const context: ConversationContext[] = [];

  try {
    // Fetch messages AVANT le @everyone
    const messages = await message.channel.messages.fetch({
      limit: config.everyoneContextDepth,
      before: message.id
    });

    // Trier par ordre chronologique
    const sortedMessages = Array.from(messages.values()).reverse();

    for (const msg of sortedMessages) {
      // Ajouter message au contexte
      if (!msg.author.bot) {
        let content = `[${msg.author.username}]: ${msg.content}`;

        // Si c'est une réponse et qu'on suit les chains
        if (config.followReplyChains && msg.reference) {
          try {
            const replied = await msg.channel.messages.fetch(msg.reference.messageId!);
            if (replied) {
              content = `[${replied.author.username}]: ${replied.content}\n↳ [${msg.author.username}]: ${msg.content}`;
            }
          } catch (e) {
            // Message original supprimé ou inaccessible
          }
        }

        context.push({
          role: 'user',
          content
        });
      }
    }

    // Détecter le type de contexte si activé
    if (config.detectContextType) {
      const contextType = this.detectEveryoneContextType(sortedMessages);
      context.unshift({
        role: 'system',
        content: `Context Type: ${contextType}. The user pinged @everyone to bring attention to the above conversation.`
      });
    }

  } catch (error) {
    console.error('[AI] Error fetching @everyone context:', error);
  }

  return context;
}

private detectEveryoneContextType(messages: Message[]): string {
  if (messages.length === 0) return 'RANDOM_PING';

  // Combiner tous les messages en un texte
  const allText = messages.map(m => m.content.toLowerCase()).join(' ');

  // Patterns de détection
  if (allText.includes('giveaway') || allText.includes('win') || allText.includes('react')) {
    return 'GIVEAWAY';
  }

  if (allText.includes('announce') || allText.includes('announcement') || allText.includes('new feature')) {
    return 'ANNOUNCEMENT';
  }

  if (allText.includes('welcome') || allText.includes('new') && allText.includes('team')) {
    return 'WELCOME';
  }

  if (allText.includes('?') || allText.includes('anyone') || allText.includes('help')) {
    return 'QUESTION';
  }

  // Vérifier si quelqu'un vient de parler juste avant
  if (messages.length >= 1) {
    const lastMsg = messages[messages.length - 1];
    const timeDiff = Date.now() - lastMsg.createdTimestamp;

    // Si message récent (< 30 secondes), probablement contextuel
    if (timeDiff < 30000) {
      return 'CONTEXTUAL';
    }
  }

  return 'RANDOM_PING';
}
```

## 🎭 Exemples d'utilisation

### Exemple 1 : Nouveau membre
```
[Messages récents]
Arthuxx: "Hello everyone, I'm Arthuxx, new to the staff team!"
Sarah: "Welcome!"
John: "Hey!"

Gtol: @everyone

Bot comprend : "Nouveau membre Arthuxx rejoint l'équipe"
Bot répond : "Welcome to the team Arthuxx! 🎉"
```

### Exemple 2 : Giveaway
```
[Messages récents]
Admin: "GIVEAWAY! React with 🎉 to win nitro!"
Admin: "Ends in 1 hour!"

Gtol: @everyone

Bot comprend : "Giveaway nitro en cours"
Bot répond : "Good luck everyone! 🍀"
```

### Exemple 3 : Question technique
```
[Messages récents]
Dev1: "Does anyone know how to fix the API error?"
Dev2: "I'm getting 500 errors too"
Dev1: "It's been down for 10 minutes"

Gtol: @everyone

Bot comprend : "Problème technique API down"
Bot répond : "I see there's an API issue. Have you checked the server logs?"
```

### Exemple 4 : Reply chain
```
[Messages]
Alice: "What time is the meeting?"
Bob: *replies to Alice* "It's at 3PM"
Charlie: *replies to Bob* "Can we make it 4PM instead?"

Gtol: @everyone

Bot comprend : TOUTE la conversation sur le meeting
Bot répond : "The meeting time discussion - looks like there's a request to move from 3PM to 4PM"
```

## 🚀 Avantages

1. **Intelligent** : Comprend le VRAI contexte, pas juste le ping
2. **Social** : Lit les conversations de tout le monde
3. **Pertinent** : Adapte sa réponse au type de situation
4. **Complet** : Suit les fils de réponses
5. **Configurable** : Tout est customizable

## ⚙️ Migration SQL

```sql
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS respond_to_everyone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS everyone_context_depth INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS follow_reply_chains BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS detect_context_type BOOLEAN DEFAULT true;
```

## 🎯 Prochaines étapes

1. Appliquer la migration SQL
2. Copier le code dans `ai.service.ts` du bot-template
3. Update Prisma schema
4. Build et déployer
5. Activer `respondToEveryone: true` dans la config

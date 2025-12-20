/**
 * Predefined Module Definitions
 * These modules can be seeded into the database for a rich module marketplace
 */

import { ModuleCategory } from '@prisma/client';

export interface ModuleDefinition {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  category: ModuleCategory;
  price: number;
  icon: string;
  version: string;
  author: string;
  tags: string[];
  features: string[];
  dependencies: string[];
  configSchema: object;
  isCore: boolean;
}

export const PREDEFINED_MODULES: ModuleDefinition[] = [
  // ==================== FRAMEWORK MODULES (Core) ====================
  {
    slug: 'framework-core',
    name: 'Framework Core',
    description: 'Essential bot framework - required for all bots',
    longDescription: `The core framework module provides essential functionality for your Discord bot:

- Command handling and routing
- Event system management
- Permission checking
- Rate limiting
- Error handling
- Bot status management

This module is automatically included with every bot and cannot be disabled.`,
    category: 'FRAMEWORK',
    price: 0,
    icon: '🔧',
    version: '2.0.0',
    author: 'FiveBot',
    tags: ['core', 'essential', 'framework'],
    features: [
      'Slash command system',
      'Event handling',
      'Permission management',
      'Rate limiting',
      'Error handling',
    ],
    dependencies: [],
    configSchema: {},
    isCore: true,
  },

  // ==================== MODERATION MODULES ====================
  {
    slug: 'moderation-basic',
    name: 'Basic Moderation',
    description: 'Essential moderation commands: ban, kick, mute, warn',
    longDescription: `Complete moderation toolkit for managing your Discord server:

**Commands included:**
- /ban - Ban members with optional reason and duration
- /kick - Remove members from the server
- /mute - Timeout members for specified duration
- /unmute - Remove timeout from members
- /warn - Issue warnings to members
- /warnings - View member warning history
- /clear - Bulk delete messages

**Features:**
- Automatic moderation logging
- Case history tracking
- Customizable permissions
- DM notifications to punished users`,
    category: 'MODERATION',
    price: 0,
    icon: '🛡️',
    version: '1.5.0',
    author: 'FiveBot',
    tags: ['moderation', 'ban', 'kick', 'mute', 'warn', 'admin'],
    features: [
      'Ban/Kick/Mute commands',
      'Warning system with history',
      'Bulk message deletion',
      'Moderation case logging',
      'DM notifications',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        dmOnPunishment: {
          type: 'boolean',
          title: 'DM on Punishment',
          description: 'Send DM to users when they are punished',
          default: true,
        },
        modLogChannel: {
          type: 'string',
          title: 'Mod Log Channel',
          description: 'Channel ID for moderation logs',
        },
        muteRole: {
          type: 'string',
          title: 'Mute Role',
          description: 'Role ID to assign for muted users (legacy)',
        },
      },
    },
    isCore: false,
  },
  {
    slug: 'auto-mod',
    name: 'Auto Moderation',
    description: 'Automatic moderation: anti-spam, anti-raid, word filter',
    longDescription: `Protect your server with automatic moderation features:

**Anti-Spam Protection:**
- Detect and prevent message spam
- Prevent emoji/mention spam
- Link filtering with whitelist

**Anti-Raid Protection:**
- Detect mass join raids
- Automatic lockdown mode
- Join rate limiting

**Content Filtering:**
- Custom word/phrase blacklist
- Regex pattern matching
- Invite link blocking
- Phishing link detection`,
    category: 'MODERATION',
    price: 50,
    icon: '🤖',
    version: '1.3.0',
    author: 'FiveBot',
    tags: ['automod', 'anti-spam', 'anti-raid', 'filter', 'protection'],
    features: [
      'Anti-spam detection',
      'Anti-raid protection',
      'Word/phrase filtering',
      'Link filtering',
      'Automatic punishments',
    ],
    dependencies: ['moderation-basic'],
    configSchema: {
      type: 'object',
      properties: {
        antiSpamEnabled: {
          type: 'boolean',
          title: 'Enable Anti-Spam',
          default: true,
        },
        spamThreshold: {
          type: 'number',
          title: 'Spam Threshold',
          description: 'Messages per 5 seconds before action',
          default: 5,
          minimum: 3,
          maximum: 20,
        },
        antiRaidEnabled: {
          type: 'boolean',
          title: 'Enable Anti-Raid',
          default: true,
        },
        raidThreshold: {
          type: 'number',
          title: 'Raid Threshold',
          description: 'Joins per minute to trigger raid mode',
          default: 10,
        },
        blacklistedWords: {
          type: 'array',
          title: 'Blacklisted Words',
          items: { type: 'string' },
          default: [],
        },
        blockInvites: {
          type: 'boolean',
          title: 'Block Discord Invites',
          default: false,
        },
      },
    },
    isCore: false,
  },

  // ==================== LOGGING MODULES ====================
  {
    slug: 'server-logging',
    name: 'Server Logging',
    description: 'Comprehensive logging: messages, joins, leaves, edits, deletes',
    longDescription: `Keep track of everything happening in your server:

**Message Logging:**
- Message edits with before/after
- Message deletions with content
- Bulk delete logging
- Attachment logging

**Member Logging:**
- Join/Leave events
- Role changes
- Nickname changes
- Avatar changes

**Server Logging:**
- Channel create/edit/delete
- Role create/edit/delete
- Server setting changes
- Invite tracking`,
    category: 'LOGGING',
    price: 0,
    icon: '📝',
    version: '1.4.0',
    author: 'FiveBot',
    tags: ['logging', 'audit', 'logs', 'tracking', 'history'],
    features: [
      'Message edit/delete logging',
      'Member join/leave logging',
      'Role change tracking',
      'Channel update logging',
      'Beautiful embed logs',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        logChannel: {
          type: 'string',
          title: 'Log Channel',
          description: 'Channel ID for all logs',
        },
        logMessages: {
          type: 'boolean',
          title: 'Log Messages',
          default: true,
        },
        logMembers: {
          type: 'boolean',
          title: 'Log Member Events',
          default: true,
        },
        logRoles: {
          type: 'boolean',
          title: 'Log Role Changes',
          default: true,
        },
        logChannels: {
          type: 'boolean',
          title: 'Log Channel Changes',
          default: true,
        },
        ignoredChannels: {
          type: 'array',
          title: 'Ignored Channels',
          items: { type: 'string' },
          default: [],
        },
        ignoredRoles: {
          type: 'array',
          title: 'Ignored Roles',
          items: { type: 'string' },
          default: [],
        },
      },
    },
    isCore: false,
  },

  // ==================== AUTOMATION MODULES ====================
  {
    slug: 'auto-role',
    name: 'Auto Role',
    description: 'Automatically assign roles to new members',
    longDescription: `Streamline your onboarding process with automatic role assignment:

**Features:**
- Assign roles instantly when members join
- Multiple roles support
- Bot filtering (don't assign to bots)
- Configurable delay before assignment
- Role verification checks

**Use Cases:**
- Member role assignment
- Access role distribution
- Color role assignment
- Verified member roles`,
    category: 'AUTOMATION',
    price: 0,
    icon: '🎭',
    version: '1.2.0',
    author: 'FiveBot',
    tags: ['autorole', 'automation', 'roles', 'onboarding'],
    features: [
      'Multiple role assignment',
      'Bot filtering',
      'Delay configuration',
      'Permission verification',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Enable Auto Role',
          default: true,
        },
        roles: {
          type: 'array',
          title: 'Roles to Assign',
          items: { type: 'string' },
          default: [],
        },
        delay: {
          type: 'number',
          title: 'Delay (seconds)',
          description: 'Wait before assigning roles',
          default: 0,
          minimum: 0,
          maximum: 300,
        },
        ignoreBots: {
          type: 'boolean',
          title: 'Ignore Bots',
          default: true,
        },
      },
    },
    isCore: false,
  },
  {
    slug: 'reaction-roles',
    name: 'Reaction Roles',
    description: 'Let members self-assign roles via reactions',
    longDescription: `Create interactive role selection with reaction-based role assignment:

**Features:**
- Multiple reaction role panels
- Beautiful embed customization
- Role limits and exclusions
- Unique role mode (one role per panel)
- Temporary roles with expiration

**Panel Types:**
- Standard reaction roles
- Button-based selection
- Dropdown menu selection`,
    category: 'AUTOMATION',
    price: 25,
    icon: '✨',
    version: '1.3.0',
    author: 'FiveBot',
    tags: ['reaction', 'roles', 'self-assign', 'buttons', 'dropdown'],
    features: [
      'Reaction-based role assignment',
      'Button role selection',
      'Dropdown menus',
      'Multiple panels',
      'Role limits',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        panels: {
          type: 'array',
          title: 'Role Panels',
          items: {
            type: 'object',
            properties: {
              channelId: { type: 'string' },
              messageId: { type: 'string' },
              roles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    emoji: { type: 'string' },
                    roleId: { type: 'string' },
                  },
                },
              },
            },
          },
          default: [],
        },
      },
    },
    isCore: false,
  },

  // ==================== WELCOME MODULES ====================
  {
    slug: 'welcome-system',
    name: 'Welcome System',
    description: 'Customizable welcome and goodbye messages',
    longDescription: `Create a warm welcome experience for new members:

**Welcome Messages:**
- Custom embed messages
- Dynamic variables ({user}, {server}, {memberCount})
- Welcome images with custom backgrounds
- DM welcome messages
- Welcome role assignment

**Goodbye Messages:**
- Custom leave messages
- Member count updates
- Leave reason tracking

**Variables Available:**
- {user} - Username
- {user.mention} - User mention
- {user.tag} - Username#0000
- {server} - Server name
- {memberCount} - Total members`,
    category: 'WELCOME',
    price: 0,
    icon: '👋',
    version: '1.5.0',
    author: 'FiveBot',
    tags: ['welcome', 'goodbye', 'greet', 'onboarding', 'leave'],
    features: [
      'Custom welcome messages',
      'Goodbye messages',
      'Dynamic variables',
      'DM welcomes',
      'Beautiful embeds',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        welcomeEnabled: {
          type: 'boolean',
          title: 'Enable Welcome Messages',
          default: true,
        },
        welcomeChannel: {
          type: 'string',
          title: 'Welcome Channel',
        },
        welcomeMessage: {
          type: 'string',
          title: 'Welcome Message',
          default: 'Welcome to {server}, {user.mention}! You are member #{memberCount}',
        },
        goodbyeEnabled: {
          type: 'boolean',
          title: 'Enable Goodbye Messages',
          default: false,
        },
        goodbyeChannel: {
          type: 'string',
          title: 'Goodbye Channel',
        },
        goodbyeMessage: {
          type: 'string',
          title: 'Goodbye Message',
          default: 'Goodbye {user.tag}, we hope to see you again!',
        },
        dmWelcome: {
          type: 'boolean',
          title: 'Send DM Welcome',
          default: false,
        },
        dmMessage: {
          type: 'string',
          title: 'DM Message',
        },
      },
    },
    isCore: false,
  },

  // ==================== UTILITY MODULES ====================
  {
    slug: 'utility-commands',
    name: 'Utility Commands',
    description: 'Useful utility commands: serverinfo, userinfo, avatar, etc.',
    longDescription: `Essential utility commands for your server:

**Information Commands:**
- /serverinfo - Detailed server information
- /userinfo - User profile and stats
- /roleinfo - Role details and members
- /channelinfo - Channel information

**Utility Commands:**
- /avatar - View user avatars
- /banner - View user banners
- /embed - Create custom embeds
- /poll - Create polls
- /remind - Set reminders
- /timestamp - Generate Discord timestamps`,
    category: 'UTILITY',
    price: 0,
    icon: '🔨',
    version: '1.4.0',
    author: 'FiveBot',
    tags: ['utility', 'info', 'avatar', 'embed', 'tools'],
    features: [
      'Server/User/Role info',
      'Avatar viewer',
      'Embed builder',
      'Poll creation',
      'Reminders',
    ],
    dependencies: [],
    configSchema: {},
    isCore: false,
  },

  // ==================== TICKETS MODULE ====================
  {
    slug: 'ticket-system',
    name: 'Ticket System',
    description: 'Full-featured support ticket system with categories and transcripts',
    longDescription: `Professional support ticket system for your server:

**Ticket Features:**
- Multiple ticket categories
- Custom embed panels
- Staff role assignment
- Ticket claiming
- Priority levels
- Transcripts with HTML export

**Panel Types:**
- Button-based panels
- Dropdown selection
- Direct message tickets

**Management:**
- Claim/unclaim tickets
- Add/remove users
- Rename tickets
- Close with reason
- Ticket logs`,
    category: 'TICKETS',
    price: 0,
    icon: '🎫',
    version: '2.0.0',
    author: 'FiveBot',
    tags: ['tickets', 'support', 'help', 'customer service'],
    features: [
      'Multiple categories',
      'Staff assignment',
      'Ticket claiming',
      'Priority system',
      'Transcripts',
      'Custom panels',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        supportRole: {
          type: 'string',
          title: 'Support Staff Role',
        },
        ticketCategory: {
          type: 'string',
          title: 'Ticket Category',
          description: 'Category to create ticket channels in',
        },
        transcriptChannel: {
          type: 'string',
          title: 'Transcript Channel',
        },
        maxTicketsPerUser: {
          type: 'number',
          title: 'Max Tickets per User',
          default: 3,
          minimum: 1,
          maximum: 10,
        },
        closeOnInactivity: {
          type: 'boolean',
          title: 'Auto-close Inactive',
          default: false,
        },
        inactivityHours: {
          type: 'number',
          title: 'Inactivity Hours',
          default: 48,
        },
      },
    },
    isCore: false,
  },

  // ==================== AI MODULES ====================
  {
    slug: 'ai-assistant',
    name: 'AI Assistant',
    description: 'Intelligent AI chatbot powered by GPT with context awareness',
    longDescription: `Bring AI-powered conversations to your Discord server:

**AI Features:**
- Natural language conversations
- Context-aware responses
- Multi-turn conversations
- Image analysis (vision)
- Custom personality/prompts

**Configuration:**
- System prompt customization
- Channel-specific behaviors
- User context awareness
- Memory management
- Rate limiting`,
    category: 'AI',
    price: 100,
    icon: '🤖',
    version: '2.0.0',
    author: 'FiveBot',
    tags: ['ai', 'chatgpt', 'gpt', 'assistant', 'chatbot'],
    features: [
      'GPT-powered responses',
      'Context awareness',
      'Image analysis',
      'Custom prompts',
      'Conversation memory',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Enable AI Assistant',
          default: true,
        },
        systemPrompt: {
          type: 'string',
          title: 'System Prompt',
          description: 'Custom personality/instructions for the AI',
        },
        allowedChannels: {
          type: 'array',
          title: 'Allowed Channels',
          items: { type: 'string' },
          default: [],
        },
        maxTokens: {
          type: 'number',
          title: 'Max Response Tokens',
          default: 500,
          minimum: 100,
          maximum: 2000,
        },
      },
    },
    isCore: false,
  },

  // ==================== LEVELING MODULE ====================
  {
    slug: 'leveling-system',
    name: 'Leveling System',
    description: 'XP and leveling system with rewards and leaderboards',
    longDescription: `Engage your community with a complete leveling system:

**Features:**
- XP for messages and voice activity
- Customizable XP rates
- Level-up notifications
- Role rewards at levels
- Server leaderboard
- Rank cards

**Commands:**
- /rank - View your rank card
- /leaderboard - Server leaderboard
- /setxp - Admin XP management
- /xpsettings - Configure XP rates`,
    category: 'LEVELING',
    price: 75,
    icon: '📈',
    version: '1.3.0',
    author: 'FiveBot',
    tags: ['leveling', 'xp', 'rank', 'leaderboard', 'rewards'],
    features: [
      'XP system',
      'Level-up notifications',
      'Role rewards',
      'Leaderboards',
      'Rank cards',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Enable Leveling',
          default: true,
        },
        xpPerMessage: {
          type: 'number',
          title: 'XP per Message',
          default: 15,
          minimum: 1,
          maximum: 100,
        },
        xpCooldown: {
          type: 'number',
          title: 'XP Cooldown (seconds)',
          default: 60,
        },
        levelUpChannel: {
          type: 'string',
          title: 'Level Up Notification Channel',
        },
        roleRewards: {
          type: 'array',
          title: 'Role Rewards',
          items: {
            type: 'object',
            properties: {
              level: { type: 'number' },
              roleId: { type: 'string' },
            },
          },
          default: [],
        },
        ignoredChannels: {
          type: 'array',
          title: 'Ignored Channels',
          items: { type: 'string' },
          default: [],
        },
      },
    },
    isCore: false,
  },

  // ==================== FUN MODULES ====================
  {
    slug: 'fun-commands',
    name: 'Fun Commands',
    description: 'Fun and entertainment commands: memes, games, random',
    longDescription: `Add fun and entertainment to your server:

**Image Commands:**
- /meme - Random memes from Reddit
- /cat - Random cat pictures
- /dog - Random dog pictures
- /joke - Random jokes

**Interactive Commands:**
- /8ball - Magic 8-ball answers
- /coinflip - Flip a coin
- /roll - Roll dice
- /rps - Rock Paper Scissors

**Social Commands:**
- /hug - Hug someone
- /pat - Pat someone
- /slap - Slap someone`,
    category: 'FUN',
    price: 0,
    icon: '🎮',
    version: '1.2.0',
    author: 'FiveBot',
    tags: ['fun', 'games', 'memes', 'entertainment'],
    features: [
      'Meme commands',
      'Mini games',
      'Random images',
      'Social interactions',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        nsfwAllowed: {
          type: 'boolean',
          title: 'Allow NSFW Content',
          default: false,
        },
      },
    },
    isCore: false,
  },

  // ==================== CUSTOM COMMANDS ====================
  {
    slug: 'custom-commands',
    name: 'Custom Commands',
    description: 'Create your own custom slash commands with embeds',
    longDescription: `Build your own commands without coding:

**Features:**
- Create custom slash commands
- Rich embed responses
- Variable support
- Button and select menus
- Auto-responders
- Scheduled messages

**Use Cases:**
- Info commands (rules, links)
- FAQ responses
- Role information
- Server-specific commands`,
    category: 'CUSTOM',
    price: 0,
    icon: '⚙️',
    version: '1.4.0',
    author: 'FiveBot',
    tags: ['custom', 'commands', 'embed', 'no-code'],
    features: [
      'Custom slash commands',
      'Embed builder',
      'Variables support',
      'Button/select menus',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          title: 'Custom Commands',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              response: { type: 'string' },
              embed: { type: 'object' },
            },
          },
          default: [],
        },
      },
    },
    isCore: false,
  },

  // ==================== UTILITY MODULES ====================
  {
    slug: 'ghost-ping',
    name: 'Ghost Ping',
    description: 'Ping automatiquement les nouveaux membres - le message se supprime instantanément',
    longDescription: `Ghost Ping notifie automatiquement les nouveaux membres quand ils rejoignent:

**Comment ça marche:**
1. Un nouveau membre rejoint le serveur
2. Le bot ping le membre dans le channel configuré
3. Le message est immédiatement supprimé
4. Le membre reçoit la notification mais le ping disparaît

**Cas d'utilisation:**
- Attirer l'attention des nouveaux sur un channel important
- Notification discrète sans polluer le chat
- S'assurer que les nouveaux voient les règles/infos

**Fonctionnalités:**
- Ping automatique à l'arrivée
- Suppression instantanée du message
- Channel configurable
- Délai de suppression personnalisable`,
    category: 'UTILITY',
    price: 0,
    icon: '👻',
    version: '1.1.0',
    author: 'FiveBot',
    tags: ['utility', 'ping', 'ghost', 'welcome', 'nouveaux'],
    features: [
      'Ping automatique des nouveaux membres',
      'Suppression instantanée',
      'Channel configurable',
      'Délai personnalisable',
    ],
    dependencies: [],
    configSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          label: 'Activer le Ghost Ping',
          description: 'Activer le ping automatique des nouveaux membres',
          default: true,
        },
        pingChannel: {
          type: 'channel',
          label: 'Channel de ping',
          description: 'Channel où ping les nouveaux membres à leur arrivée',
        },
        deleteDelay: {
          type: 'number',
          label: 'Délai de suppression (ms)',
          description: 'Temps avant de supprimer le ping (0 = instantané)',
          default: 100,
          min: 0,
          max: 5000,
        },
      },
    },
    isCore: false,
  },

  // ==================== UTILITY MODULES ====================
  {
    slug: 'embed-builder',
    name: 'Embed Builder',
    description: 'Create and send beautiful Discord embeds with a visual editor',
    longDescription: `Design stunning Discord embeds with an intuitive visual builder:

**Features:**
- Drag-and-drop container/component system
- Live Discord preview
- Template library (Rules, Welcome, Info, Pricing)
- Rich text formatting support
- Media gallery support
- Action row buttons with customization

**V2 Container Components:**
- Text blocks with markdown support
- Media galleries with images
- Dividers with custom spacing
- Action rows with buttons (styles, URLs, emojis)

**Use Cases:**
- Server rules embeds
- Welcome messages
- Announcements
- Info panels
- Pricing tables
- Custom message design`,
    category: 'UTILITY',
    price: 0,
    icon: '📋',
    version: '2.0.0',
    author: 'FiveBot',
    tags: ['utility', 'embeds', 'messages', 'design', 'visual'],
    features: [
      'Visual drag-and-drop editor',
      'Live Discord preview',
      'Template library',
      'Container-based design (V2)',
      'Media gallery support',
      'Button customization',
      'Rich markdown support',
    ],
    dependencies: ['framework-core'],
    configSchema: {
      type: 'object',
      properties: {
        defaultColor: {
          type: 'string',
          title: 'Default Embed Color',
          default: '#5865F2',
        },
        allowUserTemplates: {
          type: 'boolean',
          title: 'Allow users to save custom templates',
          default: true,
        },
      },
    },
    isCore: false,
  },
];

/**
 * Get all module definitions
 */
export function getAllModuleDefinitions(): ModuleDefinition[] {
  return PREDEFINED_MODULES;
}

/**
 * Get module by slug
 */
export function getModuleDefinition(slug: string): ModuleDefinition | undefined {
  return PREDEFINED_MODULES.find(m => m.slug === slug);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return PREDEFINED_MODULES.filter(m => m.category === category);
}

/**
 * Get core modules
 */
export function getCoreModules(): ModuleDefinition[] {
  return PREDEFINED_MODULES.filter(m => m.isCore);
}

/**
 * Get free modules
 */
export function getFreeModules(): ModuleDefinition[] {
  return PREDEFINED_MODULES.filter(m => m.price === 0);
}

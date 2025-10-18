import { PrismaClient, ModuleCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const modules = [
  // ==================== FRAMEWORK (CORE) ====================
  {
    slug: 'framework',
    name: 'Framework',
    description: 'Essential core features for your bot - always included',
    longDescription: `
## Core Features

The Framework module provides essential functionality that every bot needs:

- **Collaborator System**: Invite team members to help manage your bot
- **Permission Management**: Control who can access what
- **Basic Logging**: Keep track of important bot events
- **Command Handler**: Process and execute commands
- **Event Handler**: Listen to Discord events

This module is automatically included with every bot and cannot be removed.
    `,
    category: ModuleCategory.FRAMEWORK,
    price: 0,
    icon: '🏗️',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['core', 'essential', 'framework']),
    features: JSON.stringify([
      'Collaborator management system',
      'Role-based permissions',
      'Basic event logging',
      'Command processing',
      'Event handling',
    ]),
    dependencies: JSON.stringify([]),
    isCore: true,
    isActive: true,
  },

  // ==================== MODERATION ====================
  {
    slug: 'moderation',
    name: 'Moderation',
    description: 'Complete moderation toolkit - ban, kick, mute, warn and more',
    longDescription: `
## Moderation Tools

Keep your server safe and organized with powerful moderation features:

### Features
- Ban/Unban members with reason tracking
- Kick members
- Timeout (mute) members
- Warning system with history
- Moderation logs
- Case tracking
- Auto-moderation rules

### Commands
- \`/ban\` - Ban a member
- \`/kick\` - Kick a member
- \`/timeout\` - Timeout a member
- \`/warn\` - Warn a member
- \`/modlogs\` - View moderation history
    `,
    category: ModuleCategory.MODERATION,
    price: 0,
    icon: '🛡️',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['moderation', 'admin', 'security']),
    features: JSON.stringify([
      'Ban/Unban members',
      'Kick members',
      'Timeout (mute) system',
      'Warning system',
      'Moderation logs',
      'Case management',
    ]),
    configSchema: JSON.stringify({
      modLogChannel: { type: 'channel', label: 'Moderation Log Channel', required: false },
      autoDeleteInvites: { type: 'boolean', label: 'Auto-delete Discord invites', default: false },
      maxWarnings: { type: 'number', label: 'Max warnings before action', default: 3, min: 1, max: 10 },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== WELCOME ====================
  {
    slug: 'welcome',
    name: 'Welcome & Goodbye',
    description: 'Greet new members and say goodbye with custom messages',
    longDescription: `
## Welcome System

Make new members feel at home with customizable welcome messages!

### Features
- Custom welcome messages with embeds
- Customizable embed design (colors, images, fields)
- Member count variables
- User mention support
- Server logo integration
- Goodbye messages

### Configuration
Design beautiful welcome embeds directly from the dashboard with:
- Custom title and description
- Color picker
- Image/thumbnail support
- Dynamic variables (\`{user}\`, \`{server}\`, \`{memberCount}\`)
    `,
    category: ModuleCategory.WELCOME,
    price: 0,
    icon: '👋',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['welcome', 'greetings', 'community']),
    features: JSON.stringify([
      'Custom welcome messages',
      'Embed designer',
      'Dynamic variables',
      'Goodbye messages',
      'Server logo support',
    ]),
    configSchema: JSON.stringify({
      welcomeChannel: { type: 'channel', label: 'Welcome Channel', required: true },
      embedTitle: { type: 'string', label: 'Embed Title', default: 'Welcome to {server}!', maxLength: 256 },
      welcomeMessage: { type: 'text', label: 'Welcome Message (Description)', default: 'Welcome {user} to {server}!\n\nYou are member #{memberCount}!' },
      embedColor: { type: 'color', label: 'Embed Color', default: '#5865F2' },
      showMemberCount: { type: 'boolean', label: 'Show member count', default: true },
      logoUrl: { type: 'string', label: 'Logo URL (Image)', required: false, maxLength: 1024 },
      thumbnailUrl: { type: 'string', label: 'Thumbnail URL', required: false, maxLength: 1024 },
      showServerIcon: { type: 'boolean', label: 'Use server icon as thumbnail', default: true },
      goodbyeEnabled: { type: 'boolean', label: 'Enable goodbye messages', default: false },
      goodbyeMessage: { type: 'text', label: 'Goodbye Message', default: '{user} has left the server. We now have {memberCount} members.' },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== AUTO-ROLE ====================
  {
    slug: 'auto-role',
    name: 'Auto-Role',
    description: 'Automatically assign roles to new members',
    longDescription: `
## Auto-Role System

Automatically assign roles when members join your server!

### Features
- Assign multiple roles at once
- Role verification
- Bot permission checks
- Detailed logging
- Support for multiple role sets

### Use Cases
- Give everyone a "Member" role
- Auto-assign regional roles
- Setup verification systems
- Create role hierarchies
    `,
    category: ModuleCategory.AUTOMATION,
    price: 0,
    icon: '🎭',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['automation', 'roles', 'members']),
    features: JSON.stringify([
      'Multiple role assignment',
      'Permission validation',
      'Assignment logging',
      'Role hierarchy support',
    ]),
    configSchema: JSON.stringify({
      roles: { type: 'roles', label: 'Roles to assign', required: true, multiple: true },
      assignOnVerify: { type: 'boolean', label: 'Wait for verification', default: false },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== TICKETS ====================
  {
    slug: 'tickets',
    name: 'Ticket System',
    description: 'Professional support ticket system with panels, categories, and transcripts',
    longDescription: `
## Advanced Ticket System

Provide professional support with a complete ticket management system!

### Features
- **Multiple ticket types**: Support, Sales, Bug Reports, etc.
- **Ticket panels**: Button or dropdown interfaces
- **Staff roles**: Assign support team roles
- **Transcripts**: Save ticket conversations
- **Categories**: Organize tickets by type
- **Priority system**: LOW, NORMAL, HIGH, URGENT
- **Assignment models**: Auto-assign, collaborative, claim-based
- **Auto-close**: Automatic ticket closure after inactivity

### Container Types
- Channels (traditional ticket channels)
- Threads (lightweight threads)
- Hybrid (best of both)

### Commands
- \`/ticket setup\` - Configure the system
- \`/ticket panel\` - Create a ticket panel
- \`/ticket validate\` - Validate configuration
    `,
    category: ModuleCategory.TICKETS,
    price: 50,
    icon: '🎫',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['support', 'tickets', 'help', 'customer-service']),
    features: JSON.stringify([
      'Multiple ticket categories',
      'Ticket panels (buttons/dropdown)',
      'Staff role management',
      'Transcript saving',
      'Priority levels',
      'Auto-assignment',
      'Auto-close system',
      'Ticket statistics',
    ]),
    configSchema: JSON.stringify({
      supportCategory: { type: 'channel', label: 'Support Category', channelType: 'category', required: true },
      staffRoles: { type: 'roles', label: 'Staff Roles', multiple: true, required: true },
      transcriptChannel: { type: 'channel', label: 'Transcript Channel', required: false },
      maxTicketsPerUser: { type: 'number', label: 'Max tickets per user', default: 3, min: 1, max: 10 },
      autoCloseHours: { type: 'number', label: 'Auto-close after (hours)', default: 48, min: 1, max: 168 },
    }),
    dependencies: JSON.stringify(['framework', 'logging']),
    isCore: false,
    isActive: true,
  },

  // ==================== LOGGING ====================
  {
    slug: 'logging',
    name: 'Event Logging',
    description: 'Log all server events - members, messages, moderation, and more',
    longDescription: `
## Comprehensive Event Logging

Keep track of everything happening in your server!

### Logged Events
- **Member Events**: Joins, leaves, role changes, nickname changes
- **Message Events**: Edits, deletions, bulk deletes
- **Moderation**: Bans, kicks, timeouts, warnings
- **Channel Events**: Creates, deletes, updates
- **Role Events**: Creates, deletes, updates
- **Server Events**: Updates, emoji changes, sticker changes

### Features
- Separate channels for different event types
- Rich embed logs with timestamps
- User and moderator tracking
- Reason logging
- Attachment preservation
    `,
    category: ModuleCategory.LOGGING,
    price: 0,
    icon: '📝',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['logging', 'audit', 'moderation', 'security']),
    features: JSON.stringify([
      'Member event logging',
      'Message logging',
      'Moderation logging',
      'Channel event logging',
      'Role event logging',
      'Server event logging',
    ]),
    configSchema: JSON.stringify({
      logChannel: { type: 'channel', label: 'Main Log Channel', required: true },
      logMemberEvents: { type: 'boolean', label: 'Log member events', default: true },
      logMessageEvents: { type: 'boolean', label: 'Log message events', default: true },
      logModerationEvents: { type: 'boolean', label: 'Log moderation', default: true },
      ignoreBotsEnabled: { type: 'boolean', label: 'Ignore bot actions', default: true },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== CUSTOM COMMANDS ====================
  {
    slug: 'custom-commands',
    name: 'Custom Commands',
    description: 'Create your own custom commands with responses',
    longDescription: `
## Custom Commands

Create unlimited custom commands for your server!

### Features
- Simple text responses
- Embed responses
- Variable support
- Permission restrictions
- Cooldown system
- Command aliases

### Use Cases
- Server rules command
- FAQ responses
- Information commands
- Fun commands
- Role-specific commands
    `,
    category: ModuleCategory.CUSTOM,
    price: 0,
    icon: '⚙️',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['commands', 'custom', 'utility']),
    features: JSON.stringify([
      'Unlimited custom commands',
      'Text and embed responses',
      'Variable system',
      'Permission control',
      'Cooldown system',
    ]),
    configSchema: JSON.stringify({
      prefix: { type: 'string', label: 'Command Prefix', default: '!', maxLength: 5 },
      allowEdits: { type: 'boolean', label: 'Allow command editing', default: true },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== EMBED BUILDER ====================
  {
    slug: 'embed-builder',
    name: 'Embed Builder',
    description: 'Create and send beautiful embeds with an intuitive interface',
    longDescription: `
## Embed Builder

Design and send beautiful Discord embeds with ease!

### Features
- Visual embed designer
- Live preview
- Save embed templates
- Send to any channel
- Support for fields, images, thumbnails
- Color picker
- Timestamp support

### Commands
- \`/embed create\` - Create a new embed
- \`/embed send\` - Send an embed to a channel
- \`/embed edit\` - Edit an existing embed
    `,
    category: ModuleCategory.UTILITY,
    price: 0,
    icon: '📋',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['utility', 'embeds', 'messages']),
    features: JSON.stringify([
      'Visual embed designer',
      'Template saving',
      'Live preview',
      'Field support',
      'Image/thumbnail support',
    ]),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },

  // ==================== STATUS ROTATION ====================
  {
    slug: 'status-rotation',
    name: 'Status Rotation',
    description: 'Automatically rotate your bot\'s status messages',
    longDescription: `
## Status Rotation

Keep your bot's status fresh with automatic rotation!

### Features
- Multiple status messages
- Customizable rotation interval
- Support for all activity types (Playing, Watching, Listening, Competing)
- Random or sequential rotation
- Variables support ({servers}, {users}, {uptime})

### Configuration
Set up multiple status messages that will rotate automatically at your chosen interval.

### Activity Types
- Playing - "Playing a game"
- Watching - "Watching something"
- Listening - "Listening to music"
- Competing - "Competing in an event"
    `,
    category: ModuleCategory.UTILITY,
    price: 0,
    icon: '🔄',
    version: '1.0.0',
    author: 'FiveBot',
    tags: JSON.stringify(['utility', 'status', 'presence', 'activity']),
    features: JSON.stringify([
      'Multiple status messages',
      'Customizable intervals',
      'All activity types',
      'Random or sequential',
      'Dynamic variables',
    ]),
    configSchema: JSON.stringify({
      statuses: {
        type: 'array',
        label: 'Status Messages',
        required: true,
        itemSchema: {
          type: { type: 'select', options: ['PLAYING', 'WATCHING', 'LISTENING', 'COMPETING'] },
          text: { type: 'string', maxLength: 128 }
        }
      },
      interval: { type: 'number', label: 'Rotation Interval (seconds)', default: 60, min: 10, max: 3600 },
      mode: { type: 'select', label: 'Rotation Mode', options: ['sequential', 'random'], default: 'sequential' },
    }),
    dependencies: JSON.stringify(['framework']),
    isCore: false,
    isActive: true,
  },
];

export async function seedModules() {
  console.log('🌱 Seeding modules...');

  for (const moduleData of modules) {
    const exists = await prisma.module.findUnique({
      where: { slug: moduleData.slug },
    });

    if (!exists) {
      await prisma.module.create({
        data: moduleData,
      });
      console.log(`✅ Created module: ${moduleData.name}`);
    } else {
      await prisma.module.update({
        where: { slug: moduleData.slug },
        data: moduleData,
      });
      console.log(`🔄 Updated module: ${moduleData.name}`);
    }
  }

  console.log('✅ Modules seeded successfully!');
}

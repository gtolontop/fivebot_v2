/**
 * Seed FiveLink Module
 * Free module for FiveLink integration
 */

import { PrismaClient, ModuleCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFiveLinkModule() {
  console.log('🔗 Seeding FiveLink module...');

  // Create or update FiveLink module
  const module = await prisma.module.upsert({
    where: { slug: 'fivelink' },
    update: {
      name: 'FiveLink Integration',
      description: 'Integrate FiveLink profiles, leaderboards, and stats into your Discord bot',
      longDescription: `
# FiveLink Integration Module

Connect your Discord server with FiveLink, the ultimate bio link platform!

## Features

- 📊 **Leaderboards**: Display FiveLink leaderboards with interactive buttons
- 👤 **User Profiles**: Show FiveLink profiles linked to Discord accounts
- 📈 **Global Stats**: Display FiveLink platform statistics
- 🔗 **Profile Lookup**: Search and display any FiveLink profile
- 🎨 **Beautiful Embeds**: Powered by Discord Components V2

## Commands

### /leaderboard
Display FiveLink leaderboards with pagination and category switching.

**Categories:**
- 👁️ Views - Top profiles by views
- 🎯 Clicks - Most clicked profiles
- 🆔 Custom ID - Earliest FiveLink users
- 🏆 Badges - Most badges collected
- 📸 Media Uploads - Most media uploaded

### /me
Show your FiveLink profile (if your Discord is linked to FiveLink).

Displays your UUID, username, views, clicks, badges, and media uploads.

### /profile <username>
Look up any FiveLink profile by username or alias.

### /stats
Display global FiveLink platform statistics.

## Setup

1. Get your FiveLink API key from https://fivelink.lol/dashboard/api
2. Configure the module with your API key
3. Start using the commands!

## Configuration

The module requires a FiveLink API key to function. You can create one for free on the FiveLink dashboard.
      `.trim(),
      category: ModuleCategory.UTILITY,
      price: 0, // Free module
      icon: '🔗',
      banner: 'https://cdn.fivelink.lol/modules/fivelink-banner.png',
      version: '1.0.0',
      author: 'FiveLink',
      tags: JSON.stringify(['fivelink', 'integration', 'stats', 'leaderboard', 'profile']),
      features: JSON.stringify([
        'FiveLink leaderboards with pagination',
        'Discord-linked profile lookup',
        'Global platform statistics',
        'Profile search by username',
        'Beautiful V2 embeds with interactive buttons',
        'Real-time data from FiveLink API',
        'Automatic caching for performance',
      ]),
      screenshots: JSON.stringify([
        'https://cdn.fivelink.lol/modules/fivelink-leaderboard.png',
        'https://cdn.fivelink.lol/modules/fivelink-profile.png',
        'https://cdn.fivelink.lol/modules/fivelink-stats.png',
      ]),
      dependencies: JSON.stringify([]), // No dependencies
      configSchema: JSON.stringify({
        apiKey: {
          type: 'string',
          label: 'FiveLink API Key',
          required: true,
          placeholder: 'fl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          maxLength: 100,
        },
        cacheEnabled: {
          type: 'boolean',
          label: 'Enable Caching',
          default: true,
        },
        cacheTTL: {
          type: 'number',
          label: 'Cache Duration (seconds)',
          default: 3600,
          min: 60,
          max: 86400,
        },
      }),
      isCore: false,
      isActive: true,
    },
    create: {
      slug: 'fivelink',
      name: 'FiveLink Integration',
      description: 'Integrate FiveLink profiles, leaderboards, and stats into your Discord bot',
      longDescription: `
# FiveLink Integration Module

Connect your Discord server with FiveLink, the ultimate bio link platform!

## Features

- 📊 **Leaderboards**: Display FiveLink leaderboards with interactive buttons
- 👤 **User Profiles**: Show FiveLink profiles linked to Discord accounts
- 📈 **Global Stats**: Display FiveLink platform statistics
- 🔗 **Profile Lookup**: Search and display any FiveLink profile
- 🎨 **Beautiful Embeds**: Powered by Discord Components V2

## Commands

### /leaderboard
Display FiveLink leaderboards with pagination and category switching.

### /me
Show your FiveLink profile (if your Discord is linked to FiveLink).

### /profile <username>
Look up any FiveLink profile by username or alias.

### /stats
Display global FiveLink platform statistics.
      `.trim(),
      category: ModuleCategory.UTILITY,
      price: 0,
      icon: '🔗',
      version: '1.0.0',
      author: 'FiveLink',
      tags: JSON.stringify(['fivelink', 'integration', 'stats', 'leaderboard', 'profile']),
      features: JSON.stringify([
        'FiveLink leaderboards with pagination',
        'Discord-linked profile lookup',
        'Global platform statistics',
        'Profile search by username',
        'Beautiful V2 embeds with interactive buttons',
      ]),
      dependencies: JSON.stringify([]),
      configSchema: JSON.stringify({
        apiKey: {
          type: 'string',
          label: 'FiveLink API Key',
          required: true,
          placeholder: 'fl_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          maxLength: 100,
        },
        cacheEnabled: {
          type: 'boolean',
          label: 'Enable Caching',
          default: true,
        },
        cacheTTL: {
          type: 'number',
          label: 'Cache Duration (seconds)',
          default: 3600,
          min: 60,
          max: 86400,
        },
      }),
      isCore: false,
      isActive: true,
    },
  });

  console.log(`✅ FiveLink module created/updated: ${module.id}`);
}

// Run seed
seedFiveLinkModule()
  .catch((e) => {
    console.error('❌ Error seeding FiveLink module:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

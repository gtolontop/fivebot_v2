import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('user-profile')
  .setDescription('Display beautiful user profile templates');

// Default embed data - fivelink.lol style
const DEFAULT_EMBED_DATA = [
  // Container 1 - Header
  {
    id: 1,
    type: 17,
    components: [
      {
        id: 2,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750257025384-userprofile.png",
            },
            description: "User profile banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __User Profile Templates__" },
      {
        id: 4,
        type: 10,
        content: `> Showcase your community members with beautiful profile displays
> that highlight their contributions and achievements.
> 
> Perfect for member spotlights and recognition.`,
      },
      { id: 5, type: 14, divider: true, spacing: 1 },
      {
        id: 6,
        type: 1,
        components: [
          {
            id: 7,
            type: 2,
            style: 5,
            url: "https://example.com/profiles",
            label: "🧷 View Gallery",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/leaderboard",
            label: "🧷 Leaderboard",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Profile Example
  {
    id: 10,
    type: 17,
    components: [
      {
        id: 11,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750257134892-profile.png",
            },
            description: "Profile template",
            spoiler: false,
          },
        ],
      },
      { id: 12, type: 10, content: "# __Member Profile Example__" },
      {
        id: 13,
        type: 10,
        content: `\`- Username\`
-# **@example • Level 42 • 🟢 Online**
\`- Member Since\`
-# **January 2022 • 2+ years**
\`- Server Rank\`
-# **#15 on leaderboard • Top 5%**
\`- Total Messages\`
-# **12,450 messages • 25/day average**
\`- Voice Time\`
-# **156 hours • Most active in General**
\`- Reputation\`
-# **⭐⭐⭐⭐⭐ (487 points)**

> Active contributor and valued community member`,
      },
      { id: 14, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Achievement Showcase
  {
    id: 20,
    type: 17,
    components: [
      {
        id: 21,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750257251049-achievements.png",
            },
            description: "Achievements banner",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __🏆 Achievement System__" },
      {
        id: 23,
        type: 10,
        content: `\`- First Steps\`
-# **🎯 Join the server and verify**
\`- Conversation Starter\`
-# **💬 Send 100 messages**
\`- Regular\`
-# **📅 Active for 30 days**
\`- Helper\`
-# **🤝 Help 10 members**
\`- Event Participant\`
-# **🎉 Join 5 server events**
\`- Content Creator\`
-# **🎨 Share original content**
\`- Dedicated\`
-# **💎 1 year membership**
\`- Legend\`
-# **👑 Top contributor status**

> Achievements unlock special perks and recognition`,
      },
      { id: 24, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Role Progression
  {
    id: 30,
    type: 17,
    components: [
      {
        id: 31,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750257364827-roles.png",
            },
            description: "Roles banner",
            spoiler: false,
          },
        ],
      },
      { id: 32, type: 10, content: "# __🎭 Role Progression__" },
      {
        id: 33,
        type: 10,
        content: `## Level-Based Roles
\`Level 1-10\`
-# **@Newcomer • Starting your journey**
\`Level 11-25\`
-# **@Member • Established community member**
\`Level 26-50\`
-# **@Regular • Consistent contributor**
\`Level 51-75\`
-# **@Veteran • Experienced member**
\`Level 76-99\`
-# **@Elite • Top tier member**
\`Level 100+\`
-# **@Legend • Achieved maximum prestige**

## Special Recognition Roles
\`- Helpful Member\`
-# **Consistently assists others**
\`- Event Champion\`
-# **Wins community competitions**
\`- Content Creator\`
-# **Shares quality content**
\`- Booster\`
-# **Supports the server**`,
      },
      { id: 34, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - Profile Features
  {
    id: 40,
    type: 17,
    components: [
      {
        id: 41,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750257481953-features.png",
            },
            description: "Features banner",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __Profile Features__" },
      {
        id: 43,
        type: 10,
        content: `## What Profiles Include
\`- Basic Information\`
-# **Username, avatar, status, badges**
\`- Server Statistics\`
-# **Messages, voice time, activity level**
\`- Achievements\`
-# **Earned badges and milestones**
\`- Reputation System\`
-# **Community rating and feedback**
\`- Recent Activity\`
-# **Latest contributions and posts**
\`- Custom Bio\`
-# **Personal description and interests**

## Interactive Elements
\`- View Full Profile\`
-# **Detailed stats and history**
\`- Send Reputation\`
-# **Give kudos to members**
\`- Compare Stats\`
-# **See how you stack up**
\`- Report Profile\`
-# **Flag inappropriate content**`,
      },
      { id: 44, type: 14, divider: true, spacing: 1 },
      {
        id: 45,
        type: 1,
        components: [
          {
            id: 46,
            type: 2,
            style: 3,
            label: "View My Profile",
            custom_id: "profile:view:me",
          },
          {
            id: 47,
            type: 2,
            style: 5,
            url: "https://example.com/profile-guide",
            label: "🧷 Profile Guide",
          },
        ],
      },
      { id: 48, type: 14, divider: true, spacing: 1 },
    ],
  },
];

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Get bot ID from environment or client
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.reply({ content: '❌ Bot configuration error', ephemeral: true });
      return;
    }

    // Create config service
    const configService = new ConfigService(prisma, botId);
    const config = await configService.getConfig();
    
    // Get custom embed data or use default
    let embedData = DEFAULT_EMBED_DATA;
    if ((config as any).embedV2Commands) {
      const v2Commands = (config as any).embedV2Commands;
      if (v2Commands['user-profile']?.embedV2Data && v2Commands['user-profile'].embedV2Data.length > 0) {
        embedData = v2Commands['user-profile'].embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in user-profile command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying user profiles', 
      ephemeral: true 
    });
  }
}
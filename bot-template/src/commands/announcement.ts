import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('announcement')
  .setDescription('Create announcement templates with beautiful embeds');

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
              url: "http://83.150.218.36:3030/uploads/1750255125893-announcement.png",
            },
            description: "Announcement banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Announcement Templates__" },
      {
        id: 4,
        type: 10,
        content: `> Choose from our pre-designed announcement templates to share
> important updates with your community in style.
> 
> Each template is crafted to maximize engagement and clarity.`,
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
            url: "https://example.com/announcements",
            label: "🧷 View All",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/subscribe",
            label: "🧷 Subscribe",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Update Template
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
              url: "http://83.150.218.36:3030/uploads/1750255258471-update.png",
            },
            description: "Update template",
            spoiler: false,
          },
        ],
      },
      { id: 12, type: 10, content: "# __📢 General Update Template__" },
      {
        id: 13,
        type: 10,
        content: `\`- What's New\`
-# **Share new features, improvements, or changes**
\`- Bug Fixes\`
-# **List resolved issues and improvements**
\`- Coming Soon\`
-# **Preview upcoming features**

> Perfect for regular updates to keep your community informed
> about the latest developments.`,
      },
      { id: 14, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Event Template
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
              url: "http://83.150.218.36:3030/uploads/1750255370148-event.png",
            },
            description: "Event template",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __🎉 Event Template__" },
      {
        id: 23,
        type: 10,
        content: `\`- Event Details\`
-# **Date, time, location, and description**
\`- Registration\`
-# **RSVP buttons and attendance tracking**
\`- Reminders\`
-# **Automated reminder system**
\`- Prizes & Rewards\`
-# **Highlight special incentives**

> Ideal for community events, game nights, tournaments,
> and special occasions.`,
      },
      { id: 24, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Important Notice Template
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
              url: "http://83.150.218.36:3030/uploads/1750255487829-important.png",
            },
            description: "Important notice",
            spoiler: false,
          },
        ],
      },
      { id: 32, type: 10, content: "# __⚠️ Important Notice Template__" },
      {
        id: 33,
        type: 10,
        content: `\`- Critical Updates\`
-# **Rule changes, policy updates, or urgent matters**
\`- Action Required\`
-# **Clear call-to-action for community members**
\`- Acknowledgment\`
-# **Confirmation buttons for important messages**
\`- Support Contact\`
-# **Direct links to help channels**

> Use for critical announcements that require immediate
> attention from your community.`,
      },
      { id: 34, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - How to Use
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
              url: "http://83.150.218.36:3030/uploads/1750255612043-howtouse.png",
            },
            description: "How to use",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __How to Create Announcements__" },
      {
        id: 43,
        type: 10,
        content: `## Quick Start Guide
\`1. Choose Template\`
-# **Select the appropriate template for your message**
\`2. Customize Content\`
-# **Edit text, images, and buttons to match your needs**
\`3. Preview\`
-# **Review your announcement before sending**
\`4. Schedule or Send\`
-# **Post immediately or schedule for later**

## Pro Tips
\`- Use @everyone wisely\`
-# **Only for truly important announcements**
\`- Add visual elements\`
-# **Images and emojis increase engagement**
\`- Keep it concise\`
-# **Clear and focused messages work best**
\`- Include CTAs\`
-# **Buttons and links drive action**`,
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
            label: "Create Announcement",
            custom_id: "announcement:create",
          },
          {
            id: 47,
            type: 2,
            style: 5,
            url: "https://example.com/announcement-guide",
            label: "🧷 Full Guide",
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
      if (v2Commands.announcement?.embedV2Data && v2Commands.announcement.embedV2Data.length > 0) {
        embedData = v2Commands.announcement.embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in announcement command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying announcements', 
      ephemeral: true 
    });
  }
}
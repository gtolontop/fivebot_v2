import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('team')
  .setDescription('Display team members with beautiful embeds');

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
              url: "http://83.150.218.36:3030/uploads/1750254139627-team.png",
            },
            description: "Team banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Meet Our Team__" },
      {
        id: 4,
        type: 10,
        content: `> Our community is powered by passionate individuals dedicated to creating
> the best experience for all our members.
> 
> Each team member brings unique skills and perspectives that help make
> our server an amazing place to be!`,
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
            url: "https://discord.gg/support",
            label: "🧷 Join Our Team",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/team",
            label: "🧷 Team Info",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Leadership
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
              url: "http://83.150.218.36:3030/uploads/1750254255312-leadership.png",
            },
            description: "Leadership banner",
            spoiler: false,
          },
        ],
      },
      { id: 12, type: 10, content: "# __Leadership Team__" },
      {
        id: 13,
        type: 10,
        content: `\`- Founder & CEO\`
-# **@username • Leading with vision and passion**
\`- Co-Founder & CTO\`
-# **@techuser • Building the technical foundation**
\`- Head of Community\`
-# **@community • Fostering connections and growth**
\`- Creative Director\`
-# **@creative • Shaping our visual identity**`,
      },
      {
        id: 14,
        type: 10,
        content: `> Our leadership team works tirelessly to ensure the community
> thrives and evolves with our members' needs.`,
      },
      { id: 15, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Admin Team
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
              url: "http://83.150.218.36:3030/uploads/1750254354628-admin.png",
            },
            description: "Admin banner",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __Admin Team__" },
      {
        id: 23,
        type: 10,
        content: `\`- Head Administrator\`
-# **@admin1 • EST timezone • Server security specialist**
\`- Community Administrator\`
-# **@admin2 • PST timezone • Event management expert**
\`- Technical Administrator\`
-# **@admin3 • GMT timezone • Bot and systems manager**
\`- Content Administrator\`
-# **@admin4 • CET timezone • Content moderation lead**`,
      },
      {
        id: 24,
        type: 10,
        content: `## Available Support Times
\`Monday - Friday\`
-# **9 AM - 11 PM EST with rotating coverage**
\`Weekends\`
-# **24/7 coverage with on-call admins**`,
      },
      { id: 25, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Moderator & Support Team
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
              url: "http://83.150.218.36:3030/uploads/1750254460847-moderators.png",
            },
            description: "Moderator banner",
            spoiler: false,
          },
        ],
      },
      { id: 32, type: 10, content: "# __Moderator & Support Team__" },
      {
        id: 33,
        type: 10,
        content: `\`- Senior Moderators (3)\`
-# **Handling complex issues and training new staff**
\`- Moderators (8)\`
-# **Maintaining order and helping community members**
\`- Support Specialists (5)\`
-# **Answering questions and providing assistance**
\`- Welcome Team (10)\`
-# **Making new members feel at home**

> Our moderation team is available across all timezones to ensure
> 24/7 support for our community members.`,
      },
      { id: 34, type: 14, divider: true, spacing: 1 },
      {
        id: 35,
        type: 1,
        components: [
          {
            id: 36,
            type: 2,
            style: 3,
            label: "Open Support Ticket",
            custom_id: "ticket:create",
          },
        ],
      },
      { id: 37, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - Join the Team
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
              url: "http://83.150.218.36:3030/uploads/1750254571951-joinus.png",
            },
            description: "Join us banner",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __Want to Join Our Team?__" },
      {
        id: 43,
        type: 10,
        content: `> We're always looking for passionate individuals who want to
> make a positive impact on our community!

## Requirements
\`- Active Member\`
-# **Minimum 30 days in the server**
\`- Good Standing\`
-# **No recent warnings or violations**
\`- Time Commitment\`
-# **5+ hours per week availability**
\`- Positive Attitude\`
-# **Helpful, friendly, and patient**

## Benefits
\`- Exclusive Role\`
-# **Stand out with a special team role**
\`- Private Channels\`
-# **Access to staff-only areas**
\`- Early Access\`
-# **Preview new features and updates**
\`- Team Events\`
-# **Participate in staff-exclusive activities**`,
      },
      { id: 44, type: 14, divider: true, spacing: 1 },
      {
        id: 45,
        type: 1,
        components: [
          {
            id: 46,
            type: 2,
            style: 5,
            url: "https://example.com/apply",
            label: "🧷 Apply Now",
          },
          {
            id: 47,
            type: 2,
            style: 5,
            url: "https://example.com/team-info",
            label: "🧷 Learn More",
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
      if (v2Commands.team?.embedV2Data && v2Commands.team.embedV2Data.length > 0) {
        embedData = v2Commands.team.embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in team command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying the team', 
      ephemeral: true 
    });
  }
}
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('rules')
  .setDescription('Display server rules with beautiful embed');

// Default embed data if none is configured
const DEFAULT_EMBED_DATA = [
  // Container 1 - Welcome
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
              url: "https://cdn.discordapp.com/attachments/1234567890/banner1.png",
            },
            description: "Welcome banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Welcome to Our Server__" },
      {
        id: 4,
        type: 10,
        content: `
>>> **Welcome** to our amazing community server!

Here you can:
- **Share** your ideas and projects  
- **Connect** with other members  
- **Learn** new things every day

Whether you're a **beginner** or an **expert**,  
everyone is welcome here!
        `,
      },
      { id: 5, type: 14, divider: true, spacing: 1 },
      {
        id: 6,
        type: 1,
        components: [
          {
            id: 7,
            type: 2,
            style: 1,
            label: "Invite Friends",
            emoji: {
              id: null,
              name: "✉️"
            },
            custom_id: "invite_button",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            label: "Website",
            emoji: {
              id: null,
              name: "🌐"
            },
            url: "https://yourwebsite.com",
          },
        ],
      },
    ],
  },
  // Container 2 - Rules
  {
    id: 9,
    type: 17,
    components: [
      {
        id: 10,
        type: 12,
        items: [
          {
            media: {
              url: "https://cdn.discordapp.com/attachments/1234567890/rules_banner.png",
            },
            description: "Rules banner",
            spoiler: false,
          },
        ],
      },
      { id: 11, type: 10, content: "# 📜 __Server Rules__", style: 4 },
      { id: 12, type: 14, divider: true },
      {
        id: 13,
        type: 10,
        content: `
**1. Be respectful** 🤝  
Treat all members with kindness and respect. No harassment, discrimination, or hate speech.

**2. No spam** 🚫  
Avoid repetitive messages, excessive emojis, or unnecessary pings.

**3. Stay on topic** 💭  
Keep conversations relevant to the channel you're in.

**4. No NSFW content** 🔞  
Keep all content appropriate for all ages.

**5. Follow Discord ToS** 📋  
Abide by Discord's Terms of Service at all times.

**6. Listen to staff** 👮  
Follow instructions from moderators and administrators.
        `,
      },
      { id: 14, type: 14, divider: true, spacing: 2 },
      {
        id: 15,
        type: 10,
        content: "**Breaking these rules may result in warnings, mutes, or bans.**",
        style: 1,
      },
    ],
  },
  // Container 3 - Useful Links
  {
    id: 16,
    type: 17,
    components: [
      {
        id: 17,
        type: 12,
        items: [
          {
            media: {
              url: "https://cdn.discordapp.com/attachments/1234567890/links_banner.png",
            },
            description: "Links banner",
            spoiler: false,
          },
        ],
      },
      { id: 18, type: 10, content: "## 🔗 __Useful Links__", style: 2 },
      {
        id: 19,
        type: 10,
        content: `
**Important Channels:**
- <#123456789> - General chat
- <#123456790> - Announcements
- <#123456791> - Support

**Resources:**
- [FAQ](https://yourwebsite.com/faq) - Frequently asked questions
- [Guide](https://yourwebsite.com/guide) - Getting started guide
        `,
      },
      { id: 20, type: 14, divider: true },
      {
        id: 21,
        type: 1,
        components: [
          {
            id: 22,
            type: 2,
            style: 2,
            label: "Rules",
            emoji: { id: null, name: "📜" },
            custom_id: "rules_button",
          },
          {
            id: 23,
            type: 2,
            style: 3,
            label: "Support",
            emoji: { id: null, name: "🎫" },
            custom_id: "support_button",
          },
          {
            id: 24,
            type: 2,
            style: 4,
            label: "Report",
            emoji: { id: null, name: "🚨" },
            custom_id: "report_button",
          },
        ],
      },
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
      if (v2Commands.rules?.embedV2Data && v2Commands.rules.embedV2Data.length > 0) {
        embedData = v2Commands.rules.embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in rules command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying the rules', 
      ephemeral: true 
    });
  }
}
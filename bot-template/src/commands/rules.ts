import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('rules')
  .setDescription('Display server rules with beautiful embed');

// Default embed data - fivelink.lol style
const DEFAULT_EMBED_DATA = [
  // Container 1
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
              url: "http://83.150.218.36:3030/uploads/1746373855851-MAINFrame%2016.png",
            },
            description: "Illustration des règles",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Welcome to Our Server__" },
      {
        id: 4,
        type: 10,
        content: `>>> **Our server** is your platform for the *entire* community.

Create a **100% personalized profile** for yourself, your store, your developer, designer or videomaker portfolio, or your host or roleplay server page.

- **Share** your services, creations and projects  
- **Exchange ideas** with other enthusiasts  
- **Benefit** from a helping hand in a *friendly, collaborative atmosphere*

Whether you're a **novice** or an **expert**,  
**our server** is here to **showcase your know-how**  
and **connect** the community in a single space.`,
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
            url: "https://discord.gg/yourinvite",
            label: "🧷 Support",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/contact",
            label: "🧷 Contact us",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2
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
              url: "http://83.150.218.36:3030/uploads/1746374152805-noxwayFrame%2017.png",
            },
            description: "Rule banner",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __Server Rules__" },
      {
        id: 23,
        type: 10,
        content: "`1. Be Respectful`\n-# **Treat others with courtesy and consideration.**",
      },
      {
        id: 24,
        type: 10,
        content: "`2. No Spam or Flooding`\n-# **Avoid repeated or irrelevant messages.**",
      },
      {
        id: 25,
        type: 10,
        content: "`3. Stay On-Topic`\n-# **Keep discussions relevant to the channel.**",
      },
      {
        id: 26,
        type: 10,
        content: "`4. No NSFW or Illegal Content`\n-# **Strictly prohibited, report if spotted.**",
      },
      {
        id: 27,
        type: 10,
        content: "`5. No Self-Promotion`\n-# **Limit promotions to appropriate channels.**",
      },
      {
        id: 28,
        type: 10,
        content: "`6. Protect Privacy`\n-# **Do not share personal information.**",
      },
      {
        id: 29,
        type: 10,
        content: "`7. No Cheating or Exploits`\n-# **Keep gameplay fair and honest.**",
      },
      {
        id: 30,
        type: 10,
        content: "`8. Listen to Staff`\n-# **Follow directions from moderators and admins.**",
      },
      { id: 31, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3
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
              url: "http://83.150.218.36:3030/uploads/1746375533818-abtFrame%2018.png",
            },
            description: "About Banner",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __Useful Links__" },
      {
        id: 43,
        type: 10,
        content: "**Visit our website** for features and updates.\nhttps://example.com",
      },
      {
        id: 44,
        type: 10,
        content: "**Check out our docs** for helpful guides.\nhttps://example.com/docs",
      },
      {
        id: 45,
        type: 10,
        content: "**Join our community** discussions.\nhttps://example.com/community",
      },
      { id: 46, type: 14, divider: true, spacing: 1 },
      {
        id: 47,
        type: 1,
        components: [
          {
            id: 48,
            type: 2,
            style: 5,
            url: "https://example.com",
            label: "🧷 Website",
          },
          {
            id: 49,
            type: 2,
            style: 5,
            url: "https://example.com/docs",
            label: "🧷 Documentation",
          },
          {
            id: 50,
            type: 2,
            style: 5,
            url: "https://example.com/support",
            label: "🧷 Support",
          },
        ],
      },
      { id: 51, type: 14, divider: true, spacing: 1 },
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
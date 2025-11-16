import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('pricing')
  .setDescription('Show pricing plans with interactive buttons');

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
              url: "http://83.150.218.36:3030/uploads/1746373855851-MAINFrame%2016.png",
            },
            description: "Illustration des règles",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Pricing Plans__" },
      {
        id: 4,
        type: 10,
        content: `> Discover our platform's pricing tiers:
> 
> **Free** *(Default)* – Some essential features at no cost (all things you really need)
> **Premium** *(Most Popular)* – Unlock advanced tools 
> **Business** *(Ideal for large communities and companies)* – Full suite with custom integrations
> 
> We also offer bespoke services to make your profile stand out:
> • Custom badges
> • Tailored solutions on demand
## Currently all Plans are completely FREE - we're not here for the money <3

### __By the community for the community__`,
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
            label: "🧷 Support",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com/contact",
            label: "🧷 Mail us",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Free Plan
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
              url: "http://83.150.218.36:3030/uploads/1750253319345-free.png",
            },
            description: "Pricing Banner",
            spoiler: false,
          },
        ],
      },
      { id: 13, type: 10, content: "# __Free Plan__" },
      {
        id: 14,
        type: 10,
        content: `\`- Brand/Personal Profile\`
-# **Basic brand or personal profile page**
\`- Max File Size 100 MB\`
-# **Upload files up to 100MB**
\`- Beta Access\`
-# **Early access to new features**
\`- Layout Customization\`
-# **Choose your profile layout**
\`- Cursor Effects\`
-# **Custom cursor animations**
\`- Profile Widgets\`
-# **Add widgets to your profile**
\`- Social Link Customization\`
-# **Customize social link appearance**
\`- Metadata & SEO Customization\`
-# **Optimize profile metadata for SEO**
\`- Advanced Typewriter\`
-# **Enhanced typewriter text effects**
\`- Color Customization\`
-# **Select custom theme colors**
\`- Username Effects\`
-# **Stylized username animations**
\`- Advanced Customization\`
-# **Extra profile customization options**
\`- Support 24/7\`
-# **Round-the-clock community support**`,
      },
      { id: 26, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Premium Plan
  {
    id: 27,
    type: 17,
    components: [
      {
        id: 28,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750253319351-premium.png",
            },
            description: "Pricing Banner",
            spoiler: false,
          },
        ],
      },
      { id: 29, type: 10, content: "# __Premium Plan__" },
      {
        id: 30,
        type: 10,
        content: `\`All in Free Plan\`
-# **Includes all Free Plan features**
\`- Max File Size 250 MB\`
-# **Upload files up to 250MB**
\`- API Access (REST)\`
-# **Programmatic API access**
\`- 1 Page Alias (personal)\`
-# **One custom personal page alias**
\`- Premium Badge\`
-# **Exclusive premium badge**
\`- Premium Discord Role\`
-# **Special role in Discord server**
\`- Integration Discord Webhook Logs\`
-# **Webhook integration and logging**
\`- Daily Backups\`
-# **Automatic daily backups**
\`- Priority Email Support\`
-# **High-priority email assistance**
\`- Data Exports every 24 hours\`
-# **Daily data export availability**
\`- Scheduled Content Publishing\`
-# **Schedule posts and updates**
\`- Broken Link Monitoring\`
-# **Automated broken link checks**
\`- Exports Data CSV\`
-# **Download data in CSV format**`,
      },
      { id: 43, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Business Plan
  {
    id: 44,
    type: 17,
    components: [
      {
        id: 45,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750253487527-pricing.png",
            },
            description: "Pricing banner",
            spoiler: false,
          },
        ],
      },
      { id: 46, type: 10, content: "# __Business Plan__" },
      {
        id: 47,
        type: 10,
        content: `\`- All in Free & Premium Plan\`
-# **All features from Free and Premium tiers**
\`- Max File Size 500 MB\`
-# **Upload files up to 500MB**
\`- 5 Brand Pages\`
-# **Manage up to five brand pages**
\`- 5 Team Collaborators\`
-# **Invite up to five team members**
\`- API Company Tier (more request & speed)\`
-# **Enhanced API limits and performance**
\`- Invoice & Billing Management\`
-# **Integrated invoicing and billing tools**
\`- Role-Based Access Control\`
-# **Granular access control by role**
\`- SLA 99.9% Uptime Guarantee\`
-# **Guaranteed 99.9% service uptime**
\`- Business Badge\`
-# **Unique business badge**
\`- Business Discord Role\`
-# **Exclusive business Discord role**
\`- Link A/B Testing\`
-# **Test and compare link variants**
\`- Priority Feature Requests\`
-# **Submit and prioritize feature requests**
\`- Multi-Language Support\`
-# **Support for multiple languages**`,
      },
      { id: 60, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - CTA
  {
    id: 90,
    type: 17,
    components: [
      {
        id: 145,
        type: 12,
        items: [
          {
            media: {
              url: "http://83.150.218.36:3030/uploads/1750253835873-pricingamazing.png",
            },
            description: "Pricing Banner",
            spoiler: false,
          },
        ],
      },
      { id: 103, type: 10, content: "# __Take your profile to the next level__" },
      {
        id: 80,
        type: 10,
        content: `> **Get started today** and open your profile now!
> 
> Questions? Make a ticket or ask in the discussion
## Thank you for being part of our community!`,
      },
      { id: 81, type: 14, divider: true, spacing: 1 },
      {
        id: 82,
        type: 1,
        components: [
          {
            id: 108,
            type: 2,
            style: 5,
            url: "https://example.com",
            label: "🧷 Website",
          },
          {
            id: 109,
            type: 2,
            style: 5,
            url: "https://example.com/pricing",
            label: "🧷 Pricing",
          },
          {
            id: 100,
            type: 2,
            style: 5,
            url: "https://example.com/dashboard",
            label: "🧷 Open your Profile",
          },
        ],
      },
      { id: 85, type: 14, divider: true, spacing: 1 },
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
      if (v2Commands.pricing?.embedV2Data && v2Commands.pricing.embedV2Data.length > 0) {
        embedData = v2Commands.pricing.embedV2Data;
      }
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: embedData
    });
  } catch (error) {
    console.error('Error in pricing command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying the pricing', 
      ephemeral: true 
    });
  }
}
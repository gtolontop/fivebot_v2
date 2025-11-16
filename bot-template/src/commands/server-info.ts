import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('server-info')
  .setDescription('Display detailed server information with live stats');

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
              url: "http://83.150.218.36:3030/uploads/1750256021934-serverinfo.png",
            },
            description: "Server info banner",
            spoiler: false,
          },
        ],
      },
      { id: 3, type: 10, content: "# __Server Information__" },
      {
        id: 4,
        type: 10,
        content: `> Welcome to our server's information hub! Here you'll find
> everything you need to know about our community.
> 
> Updated live with the latest statistics and features.`,
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
            label: "🧷 Invite Link",
          },
          {
            id: 8,
            type: 2,
            style: 5,
            url: "https://example.com",
            label: "🧷 Website",
          },
        ],
      },
      { id: 9, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 2 - Server Stats
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
              url: "http://83.150.218.36:3030/uploads/1750256133782-stats.png",
            },
            description: "Stats banner",
            spoiler: false,
          },
        ],
      },
      { id: 12, type: 10, content: "# __📊 Live Statistics__" },
      {
        id: 13,
        type: 10,
        content: `\`- Total Members\`
-# **1,234 members in our community**
\`- Online Now\`
-# **567 members currently active**
\`- Server Boosts\`
-# **Level 3 with 14 boosts**
\`- Total Channels\`
-# **45 text and 12 voice channels**
\`- Total Roles\`
-# **32 roles for organization**
\`- Emojis & Stickers\`
-# **250 custom emojis and 50 stickers**`,
      },
      { id: 14, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 3 - Server Features
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
              url: "http://83.150.218.36:3030/uploads/1750256242487-features.png",
            },
            description: "Features banner",
            spoiler: false,
          },
        ],
      },
      { id: 22, type: 10, content: "# __✨ Server Features__" },
      {
        id: 23,
        type: 10,
        content: `\`- Community Server\`
-# **Enabled with announcement channels**
\`- Server Banner\`
-# **Custom banner for server identity**
\`- Vanity URL\`
-# **discord.gg/custom**
\`- Member Screening\`
-# **Rules acceptance required**
\`- Discovery\`
-# **Listed in server discovery**
\`- Welcome Screen\`
-# **Custom welcome for new members**

> Our server utilizes Discord's best features to provide
> an amazing community experience.`,
      },
      { id: 24, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 4 - Boost Benefits
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
              url: "http://83.150.218.36:3030/uploads/1750256358741-boost.png",
            },
            description: "Boost banner",
            spoiler: false,
          },
        ],
      },
      { id: 32, type: 10, content: "# __💎 Boost Benefits__" },
      {
        id: 33,
        type: 10,
        content: `## Current Level: **Level 3** 🎉

\`- Upload Limit\`
-# **100 MB file uploads**
\`- Audio Quality\`
-# **384 kbps voice quality**
\`- Stream Quality\`
-# **1080p 60fps streaming**
\`- Custom Invite\`
-# **discord.gg/custom background**
\`- More Emojis\`
-# **500 emoji slots**
\`- Thread Archive\`
-# **1 week archive duration**

> Thank you to all our boosters for supporting the server!`,
      },
      { id: 34, type: 14, divider: true, spacing: 1 },
      {
        id: 35,
        type: 1,
        components: [
          {
            id: 36,
            type: 2,
            style: 5,
            url: "https://discord.com/servers/YOUR_SERVER_ID",
            label: "🧷 Boost Server",
          },
        ],
      },
      { id: 37, type: 14, divider: true, spacing: 1 },
    ],
  },
  // Container 5 - Server Details
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
              url: "http://83.150.218.36:3030/uploads/1750256472839-details.png",
            },
            description: "Details banner",
            spoiler: false,
          },
        ],
      },
      { id: 42, type: 10, content: "# __📋 Server Details__" },
      {
        id: 43,
        type: 10,
        content: `\`- Server Owner\`
-# **@owner • Managing since 2020**
\`- Created Date\`
-# **January 1, 2020 • 4 years ago**
\`- Server ID\`
-# **123456789012345678**
\`- Verification Level\`
-# **High - Must be member for 10 minutes**
\`- Content Filter\`
-# **All members scanned**
\`- 2FA Requirement\`
-# **Required for moderation**

> This server has been carefully maintained to ensure
> a safe and welcoming environment for all members.`,
      },
      { id: 44, type: 14, divider: true, spacing: 1 },
      {
        id: 45,
        type: 1,
        components: [
          {
            id: 46,
            type: 2,
            style: 2,
            label: "Refresh Stats",
            custom_id: "serverinfo:refresh",
          },
          {
            id: 47,
            type: 2,
            style: 5,
            url: "https://example.com/server",
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
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

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
      if (v2Commands['server-info']?.embedV2Data && v2Commands['server-info'].embedV2Data.length > 0) {
        embedData = v2Commands['server-info'].embedV2Data;
      }
    }

    // Replace placeholders with actual data in the embed
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const roleCount = guild.roles.cache.size;
    const emojiCount = guild.emojis.cache.size;
    const stickerCount = guild.stickers.cache.size;
    const createdDate = guild.createdAt.toLocaleDateString();
    const daysOld = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
    const yearsOld = Math.floor(daysOld / 365);

    // Update the default embed with real data
    const updatedEmbedData = JSON.parse(JSON.stringify(embedData));
    
    // Update server name in header
    if (updatedEmbedData[0]?.components[1]?.content) {
      updatedEmbedData[0].components[1].content = `# __${guild.name}__`;
    }
    
    // Update stats in container 2
    if (updatedEmbedData[1]?.components[2]?.content) {
      updatedEmbedData[1].components[2].content = `\`- Total Members\`
-# **${totalMembers.toLocaleString()} members in our community**
\`- Online Now\`
-# **${onlineMembers.toLocaleString()} members currently active**
\`- Server Boosts\`
-# **Level ${boostLevel} with ${boostCount} boosts**
\`- Total Channels\`
-# **${textChannels} text and ${voiceChannels} voice channels**
\`- Total Roles\`
-# **${roleCount} roles for organization**
\`- Emojis & Stickers\`
-# **${emojiCount} custom emojis and ${stickerCount} stickers**`;
    }
    
    // Update boost benefits in container 4
    const uploadLimits = ['25 MB', '50 MB', '100 MB', '500 MB'];
    const voiceQualities = ['96 kbps', '128 kbps', '256 kbps', '384 kbps'];
    if (updatedEmbedData[3]?.components[2]?.content) {
      updatedEmbedData[3].components[2].content = `## Current Level: **Level ${boostLevel}** ${boostLevel === 3 ? '🎉' : boostLevel === 2 ? '✨' : boostLevel === 1 ? '⭐' : ''}

\`- Upload Limit\`
-# **${uploadLimits[boostLevel] || '25 MB'} file uploads**
\`- Audio Quality\`
-# **${voiceQualities[boostLevel] || '96 kbps'} voice quality**
\`- Stream Quality\`
-# **${boostLevel >= 1 ? '720p 60fps' : '480p 30fps'} streaming**
\`- Custom Invite\`
-# **${boostLevel >= 3 ? 'discord.gg/custom background' : 'Not available'}**
\`- More Emojis\`
-# **${boostLevel >= 1 ? '150+' : '50'} emoji slots**
\`- Thread Archive\`
-# **${boostLevel >= 2 ? '1 week' : '3 days'} archive duration**

> Thank you to all our boosters for supporting the server!`;
    }
    
    // Update server details in container 5
    if (updatedEmbedData[4]?.components[2]?.content) {
      updatedEmbedData[4].components[2].content = `\`- Server Owner\`
-# **<@${guild.ownerId}> • Managing since ${createdDate}**
\`- Created Date\`
-# **${createdDate} • ${yearsOld} year${yearsOld !== 1 ? 's' : ''} ago**
\`- Server ID\`
-# **${guild.id}**
\`- Verification Level\`
-# **${guild.verificationLevel.toString().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}**
\`- Content Filter\`
-# **${guild.explicitContentFilter.toString().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}**
\`- 2FA Requirement\`
-# **${guild.mfaLevel === 1 ? 'Required for moderation' : 'Not required'}**

> This server has been carefully maintained to ensure
> a safe and welcoming environment for all members.`;
    }

    // Send the V2 embed
    await interaction.reply({
      flags: COMP_V2_FLAG,
      components: updatedEmbedData
    });
  } catch (error) {
    console.error('Error in server-info command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while displaying server info', 
      ephemeral: true 
    });
  }
}
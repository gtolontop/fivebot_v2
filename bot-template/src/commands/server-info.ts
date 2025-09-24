import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('server-info')
  .setDescription('Display detailed server information with live stats');

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
    return;
  }

  // Calculate stats
  const totalMembers = guild.memberCount;
  const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
  const boostLevel = guild.premiumTier;
  const boostCount = guild.premiumSubscriptionCount || 0;
  const createdDate = guild.createdAt.toLocaleDateString();
  const daysOld = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));

  const componentsV2 = [
    // Server Overview
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
                url: guild.bannerURL() || guild.iconURL() || "https://i.imgur.com/AfFp7pu.png",
              },
              description: "Server banner",
              spoiler: false,
            },
          ],
        },
        { 
          id: 3, 
          type: 10, 
          content: `# ${guild.name}` 
        },
        {
          id: 4,
          type: 10,
          content: guild.description || "*No server description set*",
        },
        { id: 5, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Live Statistics
    {
      id: 20,
      type: 17,
      components: [
        { 
          id: 21, 
          type: 10, 
          content: "## 📊 **Live Statistics**" 
        },
        {
          id: 22,
          type: 10,
          content: `\`\`\`ansi
[2;37m[2;34m━━━ MEMBER STATS ━━━[0m[2;37m[0m
[2;32m👥 Total Members:[0m [1;37m${totalMembers.toLocaleString()}[0m
[2;32m🟢 Online Now:[0m [1;32m${onlineMembers}[0m
[2;32m🎭 Total Roles:[0m [1;37m${guild.roles.cache.size}[0m
[2;32m💬 Text Channels:[0m [1;37m${guild.channels.cache.filter(c => c.type === 0).size}[0m
[2;32m🔊 Voice Channels:[0m [1;37m${guild.channels.cache.filter(c => c.type === 2).size}[0m
\`\`\``,
        },
        {
          id: 23,
          type: 10,
          content: `\`\`\`ansi
[2;37m[2;35m━━━ BOOST STATS ━━━[0m[2;37m[0m
[2;35m⚡ Boost Level:[0m [1;35mTier ${boostLevel}[0m
[2;35m💎 Boost Count:[0m [1;35m${boostCount} boosts[0m
[2;35m📤 Upload Limit:[0m [1;37m${getUploadLimit(boostLevel)}[0m
[2;35m🎤 Voice Quality:[0m [1;37m${getVoiceQuality(boostLevel)}[0m
\`\`\``,
        },
      ],
    },

    // Server Features
    {
      id: 30,
      type: 17,
      components: [
        { 
          id: 31, 
          type: 10, 
          content: "## ✨ **Server Features**" 
        },
        {
          id: 32,
          type: 10,
          content: generateFeaturesList(guild.features),
        },
        { id: 33, type: 14, divider: true, spacing: 1 },
      ],
    },

    // Server Info Footer
    {
      id: 40,
      type: 17,
      components: [
        {
          id: 41,
          type: 10,
          content: `
📅 **Created:** ${createdDate} *(${daysOld} days ago)*
👑 **Owner:** <@${guild.ownerId}>
🆔 **Server ID:** \`${guild.id}\`
🌍 **Region:** Auto
          `,
        },
        {
          id: 42,
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              label: "Refresh Stats",
              emoji: "🔄",
              custom_id: "serverinfo:refresh",
            },
            ...(guild.vanityURLCode ? [{
              type: 2,
              style: 5,
              label: "Vanity URL",
              url: `https://discord.gg/${guild.vanityURLCode}`,
            }] : []),
          ],
        },
      ],
    },
  ];

  await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
}

function getUploadLimit(tier: number): string {
  const limits = ['25 MB', '50 MB', '100 MB', '500 MB'];
  return limits[tier] || '25 MB';
}

function getVoiceQuality(tier: number): string {
  const quality = ['96 kbps', '128 kbps', '256 kbps', '384 kbps'];
  return quality[tier] || '96 kbps';
}

function generateFeaturesList(features: string[]): string {
  const featureEmojis: Record<string, string> = {
    'COMMUNITY': '👥',
    'VERIFIED': '✅',
    'PARTNERED': '🤝',
    'DISCOVERABLE': '🔍',
    'FEATURABLE': '⭐',
    'ANIMATED_ICON': '🎞️',
    'BANNER': '🖼️',
    'INVITE_SPLASH': '🎨',
    'VANITY_URL': '🔗',
    'PREVIEW_ENABLED': '👁️',
    'MEMBER_VERIFICATION_GATE_ENABLED': '🛡️',
    'MONETIZATION_ENABLED': '💰',
  };

  if (features.length === 0) {
    return '*No special features enabled*';
  }

  return features
    .filter(f => featureEmojis[f])
    .map(f => `${featureEmojis[f]} **${f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}**`)
    .join('\n') || '*Standard server features*';
}
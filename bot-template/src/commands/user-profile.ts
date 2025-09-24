import { SlashCommandBuilder, ChatInputCommandInteraction, User } from 'discord.js';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('user-profile')
  .setDescription('Display a beautiful user profile card')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to display profile for')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const member = interaction.guild?.members.cache.get(user.id);
  
  // Calculate account age
  const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
  const joinedAge = member ? Math.floor((Date.now() - member.joinedTimestamp!) / (1000 * 60 * 60 * 24)) : 0;
  
  // Get user badges
  const badges = getUserBadges(user);
  
  // Get user status and activities
  const status = member?.presence?.status || 'offline';
  const activities = member?.presence?.activities || [];
  const customStatus = activities.find(a => a.type === 4);
  const playing = activities.find(a => a.type === 0);
  const streaming = activities.find(a => a.type === 1);
  const listening = activities.find(a => a.type === 2);

  const componentsV2 = [
    // Profile Header
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
                url: user.displayAvatarURL({ size: 512 }),
              },
              description: "User avatar",
              spoiler: false,
            },
          ],
        },
        { 
          id: 3, 
          type: 10, 
          content: `# ${user.displayName} ${getStatusEmoji(status)}` 
        },
        {
          id: 4,
          type: 10,
          content: `**@${user.username}** ${user.bot ? '🤖' : ''} ${badges}`,
        },
        {
          id: 5,
          type: 10,
          content: customStatus ? `> *${customStatus.state}*` : '',
        },
        { id: 6, type: 14, divider: true, spacing: 1 },
      ],
    },

    // User Info
    {
      id: 20,
      type: 17,
      components: [
        { 
          id: 21, 
          type: 10, 
          content: "## 📋 **User Information**" 
        },
        {
          id: 22,
          type: 10,
          content: `
🆔 **User ID:** \`${user.id}\`
📅 **Account Created:** ${user.createdAt.toLocaleDateString()} *(${accountAge} days ago)*
${member ? `📥 **Joined Server:** ${member.joinedAt?.toLocaleDateString()} *(${joinedAge} days ago)*` : ''}
${member ? `🎨 **Display Color:** ${member.displayHexColor}` : ''}
          `,
        },
      ],
    },

    // Activities
    ...(activities.length > 0 ? [{
      id: 30,
      type: 17,
      components: [
        { 
          id: 31, 
          type: 10, 
          content: "## 🎮 **Current Activities**" 
        },
        {
          id: 32,
          type: 10,
          content: `${playing ? `🎮 **Playing:** ${playing.name}\n` : ''}${streaming ? `📺 **Streaming:** [${streaming.name}](${streaming.url})\n` : ''}${listening ? `🎵 **Listening to:** ${listening.name}\n` : ''}`,
        },
      ],
    }] : []),

    // Roles (if in server)
    ...(member && member.roles.cache.size > 1 ? [{
      id: 40,
      type: 17,
      components: [
        { 
          id: 41, 
          type: 10, 
          content: "## 🎭 **Server Roles**" 
        },
        {
          id: 42,
          type: 10,
          content: member.roles.cache
            .filter(r => r.id !== interaction.guild!.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 10)
            .join(' ') + (member.roles.cache.size > 11 ? ` +${member.roles.cache.size - 11} more` : ''),
        },
      ],
    }] : []),

    // Permissions Overview
    ...(member ? [{
      id: 50,
      type: 17,
      components: [
        { 
          id: 51, 
          type: 10, 
          content: "## 🛡️ **Key Permissions**" 
        },
        {
          id: 52,
          type: 10,
          content: generatePermissionsList(member),
        },
      ],
    }] : []),

    // Action Buttons
    {
      id: 60,
      type: 17,
      components: [
        { id: 61, type: 14, divider: true, spacing: 1 },
        {
          id: 62,
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "View Avatar",
              url: user.displayAvatarURL({ size: 1024 }),
              emoji: "🖼️",
            },
            ...(member ? [{
              type: 2,
              style: 2,
              label: "Server Stats",
              custom_id: `profile:stats:${user.id}`,
              emoji: "📊",
            }] : []),
          ],
        },
      ],
    },
  ];

  await interaction.reply({ flags: COMP_V2_FLAG, components: componentsV2 });
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    'online': '🟢',
    'idle': '🟡',
    'dnd': '🔴',
    'offline': '⚫',
  };
  return emojis[status] || '⚫';
}

function getUserBadges(user: User): string {
  const badges: string[] = [];
  const flags = user.flags?.toArray() || [];
  
  const badgeEmojis: Record<string, string> = {
    'Staff': '⚙️',
    'Partner': '🤝',
    'Hypesquad': '🏠',
    'BugHunterLevel1': '🐛',
    'BugHunterLevel2': '🐛',
    'HypeSquadOnlineHouse1': '🟣',
    'HypeSquadOnlineHouse2': '🔴',
    'HypeSquadOnlineHouse3': '🟢',
    'PremiumEarlySupporter': '👑',
    'VerifiedBot': '✅',
    'VerifiedDeveloper': '✅',
    'CertifiedModerator': '🛡️',
    'ActiveDeveloper': '🔧',
  };
  
  flags.forEach(flag => {
    if (badgeEmojis[flag]) {
      badges.push(badgeEmojis[flag]);
    }
  });
  
  return badges.join(' ');
}

function generatePermissionsList(member: any): string {
  const perms = member.permissions.toArray();
  const keyPerms = [
    'Administrator',
    'ManageGuild', 
    'ManageRoles',
    'ManageChannels',
    'KickMembers',
    'BanMembers',
    'ManageMessages',
    'MentionEveryone',
  ];
  
  const hasPerms = keyPerms.filter(p => perms.includes(p));
  
  if (hasPerms.includes('Administrator')) {
    return '👑 **Administrator** (all permissions)';
  }
  
  if (hasPerms.length === 0) {
    return '📝 Standard member permissions';
  }
  
  return hasPerms
    .map(p => `✅ ${p.replace(/([A-Z])/g, ' $1').trim()}`)
    .join('\n');
}
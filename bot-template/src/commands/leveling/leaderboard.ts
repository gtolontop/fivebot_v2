import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show server leaderboard')
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Leaderboard timeframe')
      .setRequired(false)
      .addChoices(
        { name: 'All Time', value: 'all-time' },
        { name: 'Weekly', value: 'weekly' },
        { name: 'Monthly', value: 'monthly' }
      )
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Number of users to display (default: 10, max: 25)')
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    // Get bot ID from environment
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.editReply({ content: '❌ Bot configuration error' });
      return;
    }

    // Get guild ID
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({ content: '❌ This command can only be used in a server' });
      return;
    }

    // Get options
    const type = (interaction.options.getString('type') || 'all-time') as 'all-time' | 'weekly' | 'monthly';
    const limit = interaction.options.getInteger('limit') || 10;

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get leaderboard data
    const leaderboard = await levelingService.getLeaderboard(guildId, botId, type, limit);

    if (leaderboard.length === 0) {
      await interaction.editReply({ content: '❌ No leveling data found for this server' });
      return;
    }

    // Create medal emojis for top 3
    const medals = ['🥇', '🥈', '🥉'];

    // Build leaderboard description
    const leaderboardText = await Promise.all(
      leaderboard.map(async (userLevel, index) => {
        try {
          const user = await interaction.client.users.fetch(userLevel.userId).catch(() => null);
          const username = user ? user.username : `User ${userLevel.userId.slice(0, 8)}`;
          const medal = index < 3 ? medals[index] : `**${index + 1}.**`;

          return `${medal} **${username}**\n` +
            `└ Level ${userLevel.level} • ${userLevel.totalXp.toLocaleString()} XP • ${userLevel.messageCount.toLocaleString()} messages`;
        } catch (error) {
          return null;
        }
      })
    );

    // Filter out null values and join
    const filteredText = leaderboardText.filter(text => text !== null).join('\n\n');

    // Get type display name
    const typeDisplayNames = {
      'all-time': 'All Time',
      'weekly': 'Weekly',
      'monthly': 'Monthly'
    };

    // Create leaderboard embed
    const leaderboardEmbed = new EmbedBuilder()
      .setTitle(`📊 ${typeDisplayNames[type]} Leaderboard`)
      .setDescription(filteredText || 'No data available')
      .setColor('#FFD700')
      .setFooter({
        text: `${interaction.guild?.name} • Showing top ${leaderboard.length} members`,
        iconURL: interaction.guild?.iconURL() || undefined
      })
      .setTimestamp();

    // Add user's rank if they're not in the top list
    const userInTop = leaderboard.some(ul => ul.userId === interaction.user.id);
    if (!userInTop) {
      const userRank = await levelingService.getUserRank(guildId, interaction.user.id, botId);
      const userLevel = await levelingService.getUserLevel(guildId, interaction.user.id, botId);

      leaderboardEmbed.addFields({
        name: '📍 Your Rank',
        value: `#${userRank} • Level ${userLevel.level} • ${userLevel.totalXp.toLocaleString()} XP`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [leaderboardEmbed] });
  } catch (error) {
    console.error('Error in leaderboard command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while fetching leaderboard data' }
      : { content: '❌ An error occurred while fetching leaderboard data', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('Show user rank card with level, XP, and progress')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to view rank for (defaults to yourself)')
      .setRequired(false)
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

    // Get target user (or self)
    const targetUser = (interaction.options.getUser('user') || interaction.user) as User;

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get user level data
    const userLevel = await levelingService.getUserLevel(guildId, targetUser.id, botId);

    // Get user rank
    const rank = await levelingService.getUserRank(guildId, targetUser.id, botId);

    // Calculate XP needed for next level
    const xpForNextLevel = levelingService.getXpForNextLevel(userLevel.level);
    const currentXp = userLevel.xp;
    const xpPercentage = levelingService.getXpPercentage(currentXp, xpForNextLevel);
    const progressBar = levelingService.generateProgressBar(currentXp, xpForNextLevel, 20);

    // Get guild member for color
    const member = await interaction.guild?.members.fetch(targetUser.id);
    const displayColor = member?.displayHexColor || '#5865F2';

    // Create rank card embed
    const rankEmbed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Rank Card`)
      .setColor(displayColor as any)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: '📊 Rank',
          value: `#${rank}`,
          inline: true
        },
        {
          name: '⭐ Level',
          value: `${userLevel.level}`,
          inline: true
        },
        {
          name: '💬 Messages',
          value: `${userLevel.messageCount.toLocaleString()}`,
          inline: true
        },
        {
          name: '✨ Current XP',
          value: `${currentXp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} (${xpPercentage}%)`,
          inline: false
        },
        {
          name: '📈 Progress to Next Level',
          value: `\`${progressBar}\``,
          inline: false
        },
        {
          name: '🏆 Total XP',
          value: `${userLevel.totalXp.toLocaleString()}`,
          inline: true
        }
      )
      .setFooter({
        text: `Keep chatting to gain more XP!`,
        iconURL: interaction.client.user?.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [rankEmbed] });
  } catch (error) {
    console.error('Error in rank command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while fetching rank data' }
      : { content: '❌ An error occurred while fetching rank data', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

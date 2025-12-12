import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, User } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('set-level')
  .setDescription('Set a user\'s level directly (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to set level for')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('level')
      .setDescription('The level to set')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ You need Administrator permission to use this command',
        ephemeral: true
      });
      return;
    }

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
    const targetUser = interaction.options.getUser('user', true) as User;
    const newLevel = interaction.options.getInteger('level', true);

    // Don't allow setting level for bots
    if (targetUser.bot) {
      await interaction.editReply({ content: '❌ You cannot set level for bots' });
      return;
    }

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get user's old level
    const oldUserLevel = await levelingService.getUserLevel(guildId, targetUser.id, botId);
    const oldLevel = oldUserLevel.level;
    const oldTotalXp = oldUserLevel.totalXp;

    // Set level
    const updatedUserLevel = await levelingService.setLevel(guildId, targetUser.id, botId, newLevel);

    // Get new rank
    const newRank = await levelingService.getUserRank(guildId, targetUser.id, botId);

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Level Set Successfully')
      .setColor('#4CAF50')
      .setDescription(`Successfully set ${targetUser}'s level to **Level ${newLevel}**`)
      .addFields(
        {
          name: '📊 Previous Stats',
          value: `Level ${oldLevel} • ${oldTotalXp.toLocaleString()} XP`,
          inline: true
        },
        {
          name: '📈 New Stats',
          value: `Level ${updatedUserLevel.level} • ${updatedUserLevel.totalXp.toLocaleString()} XP`,
          inline: true
        },
        {
          name: '📍 New Rank',
          value: `#${newRank}`,
          inline: true
        }
      )
      .setFooter({
        text: `Action performed by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add change indicator
    if (newLevel > oldLevel) {
      successEmbed.addFields({
        name: '📈 Change',
        value: `Level increased by **${newLevel - oldLevel}** levels`,
        inline: false
      });
    } else if (newLevel < oldLevel) {
      successEmbed.addFields({
        name: '📉 Change',
        value: `Level decreased by **${oldLevel - newLevel}** levels`,
        inline: false
      });
    } else {
      successEmbed.addFields({
        name: 'ℹ️ Note',
        value: 'Level remained the same, but XP was reset to the beginning of this level',
        inline: false
      });
    }

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Error in set-level command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while setting level' }
      : { content: '❌ An error occurred while setting level', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

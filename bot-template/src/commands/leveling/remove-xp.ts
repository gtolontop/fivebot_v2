import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, User } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('remove-xp')
  .setDescription('Remove XP from a user (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to remove XP from')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('amount')
      .setDescription('Amount of XP to remove')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100000)
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
    const amount = interaction.options.getInteger('amount', true);

    // Don't allow removing XP from bots
    if (targetUser.bot) {
      await interaction.editReply({ content: '❌ You cannot remove XP from bots' });
      return;
    }

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get user's old level
    const oldUserLevel = await levelingService.getUserLevel(guildId, targetUser.id, botId);
    const oldLevel = oldUserLevel.level;
    const oldTotalXp = oldUserLevel.totalXp;

    // Remove XP
    const updatedUserLevel = await levelingService.removeXp(guildId, targetUser.id, botId, amount);

    // Calculate actual XP removed (can't go below 0)
    const actualRemoved = oldTotalXp - updatedUserLevel.totalXp;

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ XP Removed Successfully')
      .setColor('#FF6B6B')
      .setDescription(`Successfully removed **${actualRemoved.toLocaleString()} XP** from ${targetUser}`)
      .addFields(
        {
          name: '📊 Previous Stats',
          value: `Level ${oldLevel} • ${oldTotalXp.toLocaleString()} XP`,
          inline: true
        },
        {
          name: '📉 New Stats',
          value: `Level ${updatedUserLevel.level} • ${updatedUserLevel.totalXp.toLocaleString()} XP`,
          inline: true
        }
      )
      .setFooter({
        text: `Action performed by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add level down notification if user lost levels
    if (updatedUserLevel.level < oldLevel) {
      successEmbed.addFields({
        name: '📉 Level Decreased',
        value: `${targetUser.username} went from **Level ${oldLevel}** to **Level ${updatedUserLevel.level}**`,
        inline: false
      });
    }

    // Add note if hit minimum
    if (actualRemoved < amount) {
      successEmbed.addFields({
        name: 'ℹ️ Note',
        value: `User had less XP than requested. Removed all available XP (${actualRemoved.toLocaleString()})`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    console.error('Error in remove-xp command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while removing XP' }
      : { content: '❌ An error occurred while removing XP', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

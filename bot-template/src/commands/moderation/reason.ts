import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('reason')
  .setDescription('Update the reason for a moderation case')
  .addIntegerOption(option =>
    option
      .setName('case-number')
      .setDescription('The case number to update')
      .setRequired(true)
      .setMinValue(1)
  )
  .addStringOption(option =>
    option
      .setName('new-reason')
      .setDescription('The new reason for this case')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const caseNumber = interaction.options.getInteger('case-number', true);
  const newReason = interaction.options.getString('new-reason', true);

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const prisma = getPrismaClient();
    const moderationService = new ModerationService(prisma);

    // Check if moderator has permissions
    const canModerate = await moderationService.canModerate(
      interaction.member as any,
      interaction.guild.id
    );

    if (!canModerate) {
      await interaction.editReply({
        content: '❌ You do not have permission to use moderation commands.',
      });
      return;
    }

    // Get existing case
    const existingCase = await moderationService.getCase(interaction.guild.id, caseNumber);
    if (!existingCase) {
      await interaction.editReply({
        content: `❌ Case #${caseNumber} not found.`,
      });
      return;
    }

    // Update case reason
    await moderationService.updateCaseReason(interaction.guild.id, caseNumber, newReason);

    // Update log message if it exists
    const config = await moderationService.getConfig(interaction.guild.id);
    if (config && config.modLogChannelId && existingCase.logMessageId) {
      try {
        const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
        if (logChannel) {
          const logMessage = await logChannel.messages.fetch(existingCase.logMessageId).catch(() => null);
          if (logMessage && logMessage.embeds.length > 0) {
            const embed = EmbedBuilder.from(logMessage.embeds[0]);

            // Update the reason field
            const fields = embed.data.fields || [];
            const reasonFieldIndex = fields.findIndex(f => f.name === 'Reason');
            if (reasonFieldIndex !== -1) {
              fields[reasonFieldIndex].value = newReason;
              embed.setFields(fields);
            }

            // Add updated footer
            embed.setFooter({
              text: `User ID: ${existingCase.userId} | Reason updated by ${interaction.user.tag}`,
            });

            await logMessage.edit({ embeds: [embed] });
          }
        }
      } catch (error) {
        console.error('[Reason Command] Error updating log message:', error);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Case Reason Updated')
      .addFields(
        { name: 'Case Number', value: `#${caseNumber}`, inline: true },
        { name: 'Old Reason', value: existingCase.reason || 'No reason provided', inline: false },
        { name: 'New Reason', value: newReason, inline: false },
        { name: 'Updated By', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Reason Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to update case reason. Please try again.',
    });
  }
}

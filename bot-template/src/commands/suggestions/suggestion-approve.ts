/**
 * /suggestion approve command
 * Approve a suggestion (staff only)
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { SuggestionsService } from '../../services/suggestions.service';

export const data = new SlashCommandBuilder()
  .setName('suggestion')
  .setDescription('Manage suggestions')
  .addSubcommand(subcommand =>
    subcommand
      .setName('approve')
      .setDescription('Approve a suggestion')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The suggestion number')
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption(option =>
        option
          .setName('response')
          .setDescription('Optional response message')
          .setRequired(false)
          .setMaxLength(500)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'approve') return;

  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const suggestionNumber = interaction.options.getInteger('id', true);
    const response = interaction.options.getString('response');
    const suggestionsService = new SuggestionsService();

    // Get configuration
    const config = await suggestionsService.getConfig(interaction.guildId);
    if (!config || !config.enabled) {
      await interaction.editReply({
        content: '❌ The suggestions system is not configured or is disabled.',
      });
      return;
    }

    // Get the suggestion
    const suggestion = await suggestionsService.getSuggestionByNumber(
      interaction.guildId,
      suggestionNumber
    );

    if (!suggestion) {
      await interaction.editReply({
        content: `❌ Suggestion #${suggestionNumber} not found.`,
      });
      return;
    }

    if (suggestion.status !== 'pending') {
      await interaction.editReply({
        content: `❌ This suggestion has already been ${suggestion.status}.`,
      });
      return;
    }

    // Update suggestion status
    await suggestionsService.updateSuggestion(suggestion.id, {
      status: 'approved',
      reviewedBy: interaction.user.id,
      reviewedAt: new Date(),
      response: response || undefined,
    });

    // Update the message
    if (suggestion.messageId && config.channelId) {
      try {
        const channel = await interaction.guild.channels.fetch(
          config.channelId
        ) as TextChannel;
        const message = await channel.messages.fetch(suggestion.messageId);

        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x00FF00)
          .spliceFields(2, 1, {
            name: 'Status',
            value: `✅ Approved by ${interaction.user.tag}`,
            inline: true,
          });

        if (response) {
          embed.addFields({
            name: '📝 Staff Response',
            value: response,
          });
        }

        await message.edit({ embeds: [embed], components: [] });

        // Notify author if configured
        if (config.notifyOnDecision) {
          try {
            const author = await interaction.client.users.fetch(suggestion.authorId);
            const dmEmbed = new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle('✅ Suggestion Approved')
              .setDescription(
                `Your suggestion #${suggestionNumber} has been approved!\n\n` +
                `**Suggestion:** ${suggestion.content}`
              )
              .setFooter({ text: `Server: ${interaction.guild.name}` })
              .setTimestamp();

            if (response) {
              dmEmbed.addFields({
                name: 'Staff Response',
                value: response,
              });
            }

            await author.send({ embeds: [dmEmbed] });
          } catch (error) {
            console.log('[Suggestion Approve] Could not DM author');
          }
        }
      } catch (error) {
        console.error('[Suggestion Approve] Error updating message:', error);
      }
    }

    await interaction.editReply({
      content: `✅ Suggestion #${suggestionNumber} has been approved.`,
    });
  } catch (error: any) {
    console.error('[Suggestion Approve] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to approve suggestion: ${error.message}`,
    });
  }
}

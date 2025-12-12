/**
 * /suggestion implement command
 * Mark a suggestion as implemented (staff only)
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
      .setName('implement')
      .setDescription('Mark a suggestion as implemented')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The suggestion number')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'implement') return;

  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const suggestionNumber = interaction.options.getInteger('id', true);
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

    // Update suggestion status
    await suggestionsService.updateSuggestion(suggestion.id, {
      status: 'implemented',
      reviewedBy: interaction.user.id,
      reviewedAt: new Date(),
    });

    // Update the message
    if (suggestion.messageId && config.channelId) {
      try {
        const channel = await interaction.guild.channels.fetch(
          config.channelId
        ) as TextChannel;
        const message = await channel.messages.fetch(suggestion.messageId);

        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x00FFFF)
          .spliceFields(2, 1, {
            name: 'Status',
            value: `🎉 Implemented by ${interaction.user.tag}`,
            inline: true,
          });

        await message.edit({ embeds: [embed], components: [] });

        // Notify author if configured
        if (config.notifyOnDecision) {
          try {
            const author = await interaction.client.users.fetch(suggestion.authorId);
            const dmEmbed = new EmbedBuilder()
              .setColor(0x00FFFF)
              .setTitle('🎉 Suggestion Implemented')
              .setDescription(
                `Your suggestion #${suggestionNumber} has been implemented!\n\n` +
                `**Suggestion:** ${suggestion.content}`
              )
              .setFooter({ text: `Server: ${interaction.guild.name}` })
              .setTimestamp();

            await author.send({ embeds: [dmEmbed] });
          } catch (error) {
            console.log('[Suggestion Implement] Could not DM author');
          }
        }
      } catch (error) {
        console.error('[Suggestion Implement] Error updating message:', error);
      }
    }

    await interaction.editReply({
      content: `✅ Suggestion #${suggestionNumber} has been marked as implemented.`,
    });
  } catch (error: any) {
    console.error('[Suggestion Implement] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to mark suggestion as implemented: ${error.message}`,
    });
  }
}

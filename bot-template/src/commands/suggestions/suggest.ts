/**
 * /suggest command
 * Create a new suggestion
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import { SuggestionsService } from '../../services/suggestions.service';

export const data = new SlashCommandBuilder()
  .setName('suggest')
  .setDescription('Submit a suggestion')
  .addStringOption(option =>
    option
      .setName('suggestion')
      .setDescription('Your suggestion')
      .setRequired(true)
      .setMaxLength(1000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const suggestionText = interaction.options.getString('suggestion', true);
    const suggestionsService = new SuggestionsService();

    // Get or create configuration
    const botId = process.env.BOT_ID || interaction.client.user.id;
    let config = await suggestionsService.getConfig(interaction.guildId);

    if (!config) {
      // Create default config
      config = await suggestionsService.createConfig({
        guildId: interaction.guildId,
        botId,
      });
    }

    if (!config.enabled) {
      await interaction.editReply({
        content: '❌ The suggestions system is disabled in this server.',
      });
      return;
    }

    if (!config.channelId) {
      await interaction.editReply({
        content: '❌ No suggestions channel has been configured. Please ask an administrator to set it up.',
      });
      return;
    }

    // Get the suggestions channel
    const suggestionsChannel = await interaction.guild.channels.fetch(
      config.channelId
    ) as TextChannel;

    if (!suggestionsChannel) {
      await interaction.editReply({
        content: '❌ The configured suggestions channel was not found.',
      });
      return;
    }

    // Create the suggestion
    const suggestion = await suggestionsService.createSuggestion({
      guildId: interaction.guildId,
      botId,
      authorId: interaction.user.id,
      content: suggestionText,
    });

    // Build suggestion embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(`💡 Suggestion #${suggestion.suggestionNumber}`)
      .setDescription(suggestionText)
      .addFields(
        {
          name: '👍 Upvotes',
          value: '0',
          inline: true,
        },
        {
          name: '👎 Downvotes',
          value: '0',
          inline: true,
        },
        {
          name: 'Status',
          value: '🔵 Pending',
          inline: true,
        }
      )
      .setFooter({ text: `Author ID: ${interaction.user.id}` })
      .setTimestamp();

    // Create voting buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion:upvote:${suggestion.id}`)
        .setLabel('Upvote')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👍'),
      new ButtonBuilder()
        .setCustomId(`suggestion:downvote:${suggestion.id}`)
        .setLabel('Downvote')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👎')
    );

    // Send to suggestions channel
    const suggestionMessage = await suggestionsChannel.send({
      embeds: [embed],
      components: [row],
    });

    // Update suggestion with message ID
    await suggestionsService.updateSuggestion(suggestion.id, {
      messageId: suggestionMessage.id,
    });

    // Add default reactions if configured
    if (config.useReactions) {
      await suggestionMessage.react('👍');
      await suggestionMessage.react('👎');
    }

    await interaction.editReply({
      content: `✅ Your suggestion has been submitted! View it in ${suggestionsChannel}`,
    });
  } catch (error: any) {
    console.error('[Suggest Command] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to submit suggestion: ${error.message}`,
    });
  }
}

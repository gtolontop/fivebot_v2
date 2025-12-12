/**
 * /starboard setup command
 * Setup the starboard system for the server
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { StarboardService } from '../../services/starboard.service';

export const data = new SlashCommandBuilder()
  .setName('starboard')
  .setDescription('Manage the starboard system')
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup')
      .setDescription('Setup the starboard system')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel to post starred messages')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('emoji')
          .setDescription('The emoji to use for starring (default: ⭐)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('threshold')
          .setDescription('Number of stars required (default: 3)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'setup') return;

  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    const emoji = interaction.options.getString('emoji') || '⭐';
    const threshold = interaction.options.getInteger('threshold') || 3;

    // Validate emoji
    if (!isValidEmoji(emoji)) {
      await interaction.editReply({
        content: '❌ Invalid emoji. Please use a standard emoji or a custom emoji from this server.',
      });
      return;
    }

    // Verify bot has permissions in the starboard channel
    const permissions = channel.permissionsFor(interaction.client.user!);
    if (!permissions || !permissions.has(['SendMessages', 'EmbedLinks'])) {
      await interaction.editReply({
        content: '❌ I need permission to send messages and embed links in the starboard channel.',
      });
      return;
    }

    const starboardService = new StarboardService();
    const botId = process.env.BOT_ID || interaction.client.user.id;

    // Create or update starboard configuration
    const config = await starboardService.setupStarboard({
      guildId: interaction.guildId,
      botId,
      channelId: channel.id,
      emoji,
      threshold,
    });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('⭐ Starboard Setup Complete')
      .setDescription('The starboard system has been configured successfully!')
      .addFields(
        { name: 'Starboard Channel', value: `${channel}`, inline: true },
        { name: 'Star Emoji', value: emoji, inline: true },
        { name: 'Star Threshold', value: `${threshold} stars`, inline: true }
      )
      .setFooter({ text: 'React with the star emoji to add messages to the starboard!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send a test message to the starboard channel
    const testEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setDescription('🌟 **Starboard is now active!**\n\nWhen a message receives enough star reactions, it will appear here.');

    await channel.send({ embeds: [testEmbed] });
  } catch (error: any) {
    console.error('[Starboard Setup] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to setup starboard: ${error.message}`,
    });
  }
}

function isValidEmoji(emoji: string): boolean {
  // Check if it's a custom emoji (format: <:name:id> or <a:name:id>)
  const customEmojiRegex = /^<a?:\w+:\d+>$/;
  if (customEmojiRegex.test(emoji)) {
    return true;
  }

  // Check if it's a standard emoji (basic check)
  // This is a simplified check - in production you might want a more robust solution
  const emojiRegex = /\p{Emoji}/u;
  return emojiRegex.test(emoji) && emoji.length <= 10;
}

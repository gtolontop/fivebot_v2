import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  Collection,
  Message,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk delete messages')
  .addIntegerOption(option =>
    option
      .setName('amount')
      .setDescription('Number of messages to delete (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('Only delete messages from this user')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('contains')
      .setDescription('Only delete messages containing this text')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const amount = interaction.options.getInteger('amount', true);
  const targetUser = interaction.options.getUser('user');
  const contains = interaction.options.getString('contains');

  if (!interaction.guild || !interaction.member || !interaction.channel) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server text channel.',
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

    const channel = interaction.channel as TextChannel;

    // Fetch messages
    let messages = await channel.messages.fetch({ limit: amount });

    // Filter messages
    if (targetUser) {
      messages = messages.filter(msg => msg.author.id === targetUser.id);
    }

    if (contains) {
      messages = messages.filter(msg => msg.content.toLowerCase().includes(contains.toLowerCase()));
    }

    // Discord only allows bulk delete for messages younger than 14 days
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const validMessages = messages.filter(msg => now - msg.createdTimestamp < twoWeeks);

    if (validMessages.size === 0) {
      await interaction.editReply({
        content: '❌ No messages found to delete (messages must be less than 14 days old).',
      });
      return;
    }

    // Bulk delete
    const deleted = await channel.bulkDelete(validMessages, true);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🧹 Messages Purged')
      .setDescription(`Successfully deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}`)
      .addFields({ name: 'Channel', value: `${channel}`, inline: true })
      .setTimestamp();

    if (targetUser) {
      embed.addFields({ name: 'User Filter', value: targetUser.tag, inline: true });
    }

    if (contains) {
      embed.addFields({ name: 'Content Filter', value: contains, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });

    // Send to mod log
    const config = await moderationService.getConfig(interaction.guild.id);
    if (config && config.modLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('🧹 Messages Purged')
          .addFields(
            { name: 'Channel', value: `${channel}`, inline: true },
            { name: 'Moderator', value: interaction.user.tag, inline: true },
            { name: 'Messages Deleted', value: `${deleted.size}`, inline: true }
          )
          .setTimestamp();

        if (targetUser) {
          logEmbed.addFields({ name: 'User Filter', value: targetUser.tag, inline: true });
        }

        if (contains) {
          logEmbed.addFields({ name: 'Content Filter', value: contains, inline: true });
        }

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error('[Purge Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to purge messages. Please try again.',
    });
  }
}

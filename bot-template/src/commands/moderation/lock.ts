import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Lock a channel (prevent @everyone from sending messages)')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel to lock (defaults to current channel)')
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for locking the channel')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const channelOption = interaction.options.getChannel('channel');
  const reason = interaction.options.getString('reason') || 'No reason provided';

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

    const channel = (channelOption || interaction.channel) as TextChannel;

    if (!channel) {
      await interaction.editReply({
        content: '❌ Invalid channel.',
      });
      return;
    }

    // Lock the channel by denying SEND_MESSAGES for @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
    });

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔒 Channel Locked')
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send message in locked channel
    const lockEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔒 Channel Locked')
      .setDescription(`This channel has been locked by ${interaction.user.tag}`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setTimestamp();

    await channel.send({ embeds: [lockEmbed] });

    // Send to mod log
    const config = await moderationService.getConfig(interaction.guild.id);
    if (config && config.modLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
      if (logChannel && logChannel.id !== channel.id) {
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('[Lock Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to lock channel. Please try again.',
    });
  }
}

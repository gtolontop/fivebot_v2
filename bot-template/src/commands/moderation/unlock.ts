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
  .setName('unlock')
  .setDescription('Unlock a channel (allow @everyone to send messages)')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel to unlock (defaults to current channel)')
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const channelOption = interaction.options.getChannel('channel');

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

    // Unlock the channel by removing SEND_MESSAGES override for @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔓 Channel Unlocked')
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send message in unlocked channel
    const unlockEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔓 Channel Unlocked')
      .setDescription(`This channel has been unlocked by ${interaction.user.tag}`)
      .setTimestamp();

    await channel.send({ embeds: [unlockEmbed] });

    // Send to mod log
    const config = await moderationService.getConfig(interaction.guild.id);
    if (config && config.modLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
      if (logChannel && logChannel.id !== channel.id) {
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('[Unlock Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to unlock channel. Please try again.',
    });
  }
}

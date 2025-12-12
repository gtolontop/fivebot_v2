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
  .setName('slowmode')
  .setDescription('Set channel slowmode delay')
  .addIntegerOption(option =>
    option
      .setName('seconds')
      .setDescription('Slowmode delay in seconds (0 to disable, max 21600)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21600)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const seconds = interaction.options.getInteger('seconds', true);

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

    // Set slowmode
    await channel.setRateLimitPerUser(seconds);

    const embed = new EmbedBuilder()
      .setColor(seconds > 0 ? 0xFFA500 : 0x00FF00)
      .setTitle(seconds > 0 ? '⏱️ Slowmode Enabled' : '⏱️ Slowmode Disabled')
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    if (seconds > 0) {
      let delayStr = '';
      if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        delayStr += `${hours}h `;
      }
      if (seconds >= 60) {
        const minutes = Math.floor((seconds % 3600) / 60);
        if (minutes > 0) delayStr += `${minutes}m `;
      }
      const remainingSeconds = seconds % 60;
      if (remainingSeconds > 0 || delayStr === '') {
        delayStr += `${remainingSeconds}s`;
      }

      embed.addFields({
        name: 'Delay',
        value: delayStr.trim(),
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });

    // Send to mod log
    const config = await moderationService.getConfig(interaction.guild.id);
    if (config && config.modLogChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
      if (logChannel && logChannel.id !== channel.id) {
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('[Slowmode Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to set slowmode. Please try again.',
    });
  }
}

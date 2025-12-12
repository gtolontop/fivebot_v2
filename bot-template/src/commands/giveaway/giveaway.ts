/**
 * /giveaway start command
 * Start a new giveaway
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .addSubcommand(subcommand =>
    subcommand
      .setName('start')
      .setDescription('Start a new giveaway')
      .addStringOption(option =>
        option
          .setName('prize')
          .setDescription('The prize for the giveaway')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('duration')
          .setDescription('Duration (e.g., 1h, 30m, 1d, 2w)')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('winners')
          .setDescription('Number of winners')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
      )
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to post the giveaway (defaults to current)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addRoleOption(option =>
        option
          .setName('required-role')
          .setDescription('Required role to enter')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('required-level')
          .setDescription('Required level to enter')
          .setRequired(false)
          .setMinValue(1)
      )
      .addIntegerOption(option =>
        option
          .setName('required-messages')
          .setDescription('Required message count to enter')
          .setRequired(false)
          .setMinValue(1)
      )
      .addRoleOption(option =>
        option
          .setName('bonus-role')
          .setDescription('Role that gets bonus entries')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('bonus-entries')
          .setDescription('Number of bonus entries for the bonus role')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'start') return;

  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const prize = interaction.options.getString('prize', true);
    const durationStr = interaction.options.getString('duration', true);
    const winners = interaction.options.getInteger('winners', true);
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
    const requiredRole = interaction.options.getRole('required-role');
    const requiredLevel = interaction.options.getInteger('required-level');
    const requiredMessages = interaction.options.getInteger('required-messages');
    const bonusRole = interaction.options.getRole('bonus-role');
    const bonusEntries = interaction.options.getInteger('bonus-entries') || 1;

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      await interaction.editReply({
        content: '❌ Invalid duration format. Use formats like: 1h, 30m, 1d, 2w',
      });
      return;
    }

    if (duration < 60000) {
      await interaction.editReply({
        content: '❌ Duration must be at least 1 minute.',
      });
      return;
    }

    if (duration > 30 * 24 * 60 * 60 * 1000) {
      await interaction.editReply({
        content: '❌ Duration cannot exceed 30 days.',
      });
      return;
    }

    // Calculate end time
    const endTime = new Date(Date.now() + duration);

    // Create the giveaway service
    const giveawayService = new GiveawayService();
    const botId = process.env.BOT_ID || interaction.client.user!.id;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`🎉 ${prize}`)
      .setDescription(
        `React with 🎉 to enter!\n\n` +
        `**Winners:** ${winners}\n` +
        `**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n` +
        `**Hosted by:** ${interaction.user}`
      )
      .setFooter({ text: `${0} entries` })
      .setTimestamp(endTime);

    // Add requirements field if any
    const requirements: string[] = [];
    if (requiredRole) requirements.push(`Role: ${requiredRole}`);
    if (requiredLevel) requirements.push(`Level: ${requiredLevel}+`);
    if (requiredMessages) requirements.push(`Messages: ${requiredMessages}+`);

    if (requirements.length > 0) {
      embed.addFields({
        name: '📋 Requirements',
        value: requirements.join('\n'),
      });
    }

    // Add bonus info if applicable
    if (bonusRole && bonusEntries > 1) {
      embed.addFields({
        name: '⭐ Bonus Entries',
        value: `${bonusRole} gets **${bonusEntries}x** entries!`,
      });
    }

    // Create button
    const button = new ButtonBuilder()
      .setCustomId('giveaway:enter')
      .setLabel('Enter Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    // Send the giveaway message
    const giveawayMessage = await channel.send({
      embeds: [embed],
      components: [row],
    });

    // Save to database
    const giveaway = await giveawayService.createGiveaway(interaction.guildId, botId, {
      messageId: giveawayMessage.id,
      channelId: channel.id,
      prize,
      winnersCount: winners,
      hostId: interaction.user.id,
      endTime,
      requirements: {
        roleId: requiredRole?.id,
        level: requiredLevel,
        messages: requiredMessages,
      },
      bonusEntries: bonusRole && bonusEntries > 1 ? {
        roleId: bonusRole.id,
        multiplier: bonusEntries,
      } : undefined,
    });

    await interaction.editReply({
      content: `✅ Giveaway created in ${channel}!\n🎉 **Prize:** ${prize}\n⏰ **Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`,
    });

    // Schedule auto-end
    setTimeout(async () => {
      await giveawayService.endGiveaway(giveaway.id, interaction.client);
    }, duration);

  } catch (error: any) {
    console.error('[Giveaway] Error creating giveaway:', error);
    await interaction.editReply({
      content: `❌ Failed to create giveaway: ${error.message}`,
    });
  }
}

function parseDuration(duration: string): number | null {
  const regex = /^(\d+)([smhdw])$/;
  const match = duration.toLowerCase().match(regex);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

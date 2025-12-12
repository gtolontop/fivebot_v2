/**
 * /remind command
 * Set a reminder
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { RemindersService } from '../../services/reminders.service';

export const data = new SlashCommandBuilder()
  .setName('remind')
  .setDescription('Set a reminder')
  .addStringOption(option =>
    option
      .setName('time')
      .setDescription('When to remind (e.g., 1m, 1h, 1d, 1w)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('What to remind you about')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const timeStr = interaction.options.getString('time', true);
    const message = interaction.options.getString('message', true);

    // Parse time
    const duration = parseDuration(timeStr);
    if (!duration) {
      return interaction.reply({
        content: '❌ Invalid time format. Use formats like: 1m, 1h, 1d, 1w',
        flags: 64, // Ephemeral
      });
    }

    if (duration < 60000) {
      return interaction.reply({
        content: '❌ Reminder time must be at least 1 minute.',
        flags: 64, // Ephemeral
      });
    }

    if (duration > 365 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        content: '❌ Reminder time cannot exceed 1 year.',
        flags: 64, // Ephemeral
      });
    }

    const remindAt = new Date(Date.now() + duration);
    const botId = interaction.client.user.id;

    const remindersService = new RemindersService();
    await remindersService.createReminder(botId, {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      message,
      remindAt,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Reminder Set')
      .setDescription(`I'll remind you about: **${message}**`)
      .addFields(
        {
          name: '⏰ Time',
          value: `<t:${Math.floor(remindAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: '📍 Location',
          value: `<#${interaction.channelId}>`,
          inline: true,
        }
      )
      .setFooter({ text: `You'll receive a DM and a message in this channel` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  } catch (error: any) {
    console.error('[Remind] Error setting reminder:', error);
    await interaction.reply({
      content: `❌ Failed to set reminder: ${error.message}`,
      flags: 64,
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

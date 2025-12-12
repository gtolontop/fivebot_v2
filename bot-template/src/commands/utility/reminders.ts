/**
 * /reminders command
 * View your active reminders
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { RemindersService } from '../../services/reminders.service';

export const data = new SlashCommandBuilder()
  .setName('reminders')
  .setDescription('View and manage your active reminders');

export async function execute(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction) {
  try {
    const botId = interaction.client.user.id;
    const remindersService = new RemindersService();
    const reminders = await remindersService.getUserReminders(interaction.user.id, botId);

    if (reminders.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Your Reminders')
        .setDescription('You have no active reminders.')
        .setFooter({ text: 'Use /remind to set a reminder' })
        .setTimestamp();

      if (interaction.isStringSelectMenu()) {
        await interaction.update({
          embeds: [embed],
          components: [],
        });
      } else {
        await interaction.reply({
          embeds: [embed],
        });
      }
      return;
    }

    // Create embed with reminders list
    let description = '';
    reminders.slice(0, 10).forEach((reminder: any, index: number) => {
      const remindAt = new Date(reminder.remindAt);
      description += `\n**${index + 1}.** ${reminder.message.substring(0, 50)}${reminder.message.length > 50 ? '...' : ''}`;
      description += `\n⏰ <t:${Math.floor(remindAt.getTime() / 1000)}:R> • 📍 <#${reminder.channelId}>\n`;
    });

    if (reminders.length > 10) {
      description += `\n*...and ${reminders.length - 10} more*`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Your Reminders')
      .setDescription(description)
      .setFooter({ text: `${reminders.length} active ${reminders.length === 1 ? 'reminder' : 'reminders'}` })
      .setTimestamp();

    // Create select menu for deleting reminders (only if <= 25 reminders)
    const components = [];
    if (reminders.length <= 25) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('reminders:delete')
        .setPlaceholder('Select a reminder to delete')
        .addOptions(
          reminders.map((reminder: any, index: number) => ({
            label: `${index + 1}. ${reminder.message.substring(0, 90)}`,
            description: `Due: ${new Date(reminder.remindAt).toLocaleString()}`,
            value: reminder.id,
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      components.push(row);
    }

    if (interaction.isStringSelectMenu()) {
      await interaction.update({
        embeds: [embed],
        components,
      });
    } else {
      await interaction.reply({
        embeds: [embed],
        components,
      });
    }
  } catch (error: any) {
    console.error('[Reminders] Error fetching reminders:', error);

    const errorMessage = {
      content: `❌ Failed to fetch reminders: ${error.message}`,
      flags: 64,
    };

    if (interaction.isStringSelectMenu()) {
      await interaction.update(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

/**
 * Handle reminder deletion
 */
export async function handleDelete(interaction: StringSelectMenuInteraction) {
  try {
    const reminderId = interaction.values[0];
    const remindersService = new RemindersService();

    const success = await remindersService.deleteReminder(reminderId, interaction.user.id);

    if (success) {
      // Refresh the reminders list
      await execute(interaction);
    } else {
      await interaction.update({
        content: '❌ Failed to delete reminder.',
        components: [],
      });
    }
  } catch (error: any) {
    console.error('[Reminders] Error deleting reminder:', error);
    await interaction.update({
      content: `❌ Failed to delete reminder: ${error.message}`,
      components: [],
    });
  }
}

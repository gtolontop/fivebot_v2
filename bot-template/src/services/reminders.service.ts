/**
 * Reminders Service
 * Handles all reminder-related operations
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getPrismaClient } from './prisma-singleton.service';

interface CreateReminderData {
  guildId: string | null;
  channelId: string;
  userId: string;
  message: string;
  remindAt: Date;
}

export class RemindersService {
  private prisma = getPrismaClient();

  /**
   * Create a new reminder
   */
  async createReminder(botId: string, data: CreateReminderData) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO reminders (
          id, guild_id, channel_id, user_id, bot_id,
          message, remind_at, reminded, created_at
        ) VALUES (
          gen_random_uuid(),
          ${data.guildId},
          ${data.channelId},
          ${data.userId},
          ${botId},
          ${data.message},
          ${data.remindAt},
          false,
          NOW()
        )
      `;

      // Fetch the created reminder
      const created = await this.prisma.$queryRaw`
        SELECT * FROM reminders
        WHERE user_id = ${data.userId}
          AND bot_id = ${botId}
          AND remind_at = ${data.remindAt}
          AND reminded = false
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[];

      return created[0];
    } catch (error) {
      console.error('[RemindersService] Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Get all active reminders for a user
   */
  async getUserReminders(userId: string, botId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM reminders
        WHERE user_id = ${userId}
          AND bot_id = ${botId}
          AND reminded = false
        ORDER BY remind_at ASC
      ` as any[];

      return result;
    } catch (error) {
      console.error('[RemindersService] Error fetching user reminders:', error);
      return [];
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string, userId: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM reminders
        WHERE id = ${reminderId}::uuid
          AND user_id = ${userId}
      `;

      return true;
    } catch (error) {
      console.error('[RemindersService] Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(reminderId: string) {
    try {
      await this.prisma.$executeRaw`
        UPDATE reminders
        SET reminded = true
        WHERE id = ${reminderId}::uuid
      `;
    } catch (error) {
      console.error('[RemindersService] Error marking reminder as sent:', error);
    }
  }

  /**
   * Get due reminders
   */
  async getDueReminders() {
    try {
      const now = new Date();
      const result = await this.prisma.$queryRaw`
        SELECT * FROM reminders
        WHERE reminded = false
          AND remind_at <= ${now}
      ` as any[];

      return result;
    } catch (error) {
      console.error('[RemindersService] Error fetching due reminders:', error);
      return [];
    }
  }

  /**
   * Send a reminder
   */
  async sendReminder(reminder: any, client: Client) {
    try {
      const channel = await client.channels.fetch(reminder.channelId) as TextChannel;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('⏰ Reminder')
        .setDescription(reminder.message)
        .setFooter({
          text: `Set ${formatRelativeTime(new Date(reminder.createdAt))}`,
        })
        .setTimestamp();

      await channel.send({
        content: `<@${reminder.userId}>`,
        embeds: [embed],
      });

      // Try to DM the user as well
      try {
        const user = await client.users.fetch(reminder.userId);
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle('⏰ Reminder')
              .setDescription(reminder.message)
              .addFields({
                name: '📍 Location',
                value: reminder.guildId
                  ? `[Jump to Channel](https://discord.com/channels/${reminder.guildId}/${reminder.channelId})`
                  : 'DM',
              })
              .setFooter({
                text: `Set ${formatRelativeTime(new Date(reminder.createdAt))}`,
              })
              .setTimestamp(),
          ],
        });
      } catch (error) {
        console.log(`[RemindersService] Could not DM user ${reminder.userId}`);
      }

      await this.markReminderSent(reminder.id);
    } catch (error) {
      console.error('[RemindersService] Error sending reminder:', error);
      // Mark as sent anyway to avoid spam
      await this.markReminderSent(reminder.id);
    }
  }

  /**
   * Start reminder monitor
   */
  startReminderMonitor(client: Client) {
    console.log('[RemindersService] Starting reminder monitor...');

    // Check every 30 seconds for due reminders
    setInterval(async () => {
      try {
        const dueReminders = await this.getDueReminders();

        for (const reminder of dueReminders) {
          console.log(`[RemindersService] Sending reminder: ${reminder.id}`);
          await this.sendReminder(reminder, client);
        }
      } catch (error) {
        console.error('[RemindersService] Error in reminder monitor:', error);
      }
    }, 30000); // Check every 30 seconds
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

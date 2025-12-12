/**
 * Giveaway Handler
 * Handles button interactions for giveaway entries
 */

import {
  Client,
  Interaction,
  ButtonInteraction,
  GuildMember,
} from 'discord.js';
import { GiveawayService } from '../services/giveaway.service';

export class GiveawayHandler {
  private giveawayService: GiveawayService;

  constructor(private client: Client) {
    this.giveawayService = new GiveawayService();
  }

  /**
   * Main interaction handler
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      if (!interaction.isButton()) return;

      const [namespace, action] = interaction.customId.split(':');

      if (namespace !== 'giveaway') return;

      switch (action) {
        case 'enter':
          await this.handleEnterButton(interaction);
          break;
      }
    } catch (error) {
      console.error('[GiveawayHandler] Error handling interaction:', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Handle giveaway entry button
   */
  private async handleEnterButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
      return;
    }

    try {
      // Get the giveaway
      const giveaway = await this.giveawayService.getGiveawayByMessageId(interaction.message.id);

      if (!giveaway) {
        await interaction.editReply({
          content: '❌ Giveaway not found.',
        });
        return;
      }

      if (giveaway.ended) {
        await interaction.editReply({
          content: '❌ This giveaway has already ended.',
        });
        return;
      }

      // Check if giveaway has ended (by time)
      const now = new Date();
      const endTime = new Date(giveaway.endTime);

      if (now >= endTime) {
        await interaction.editReply({
          content: '❌ This giveaway has ended.',
        });
        return;
      }

      const member = interaction.member as GuildMember;

      // Check requirements
      const requirements = giveaway.requirements ? JSON.parse(giveaway.requirements as string) : {};

      if (requirements.roleId) {
        if (!member.roles.cache.has(requirements.roleId)) {
          await interaction.editReply({
            content: `❌ You need the <@&${requirements.roleId}> role to enter this giveaway.`,
          });
          return;
        }
      }

      // Note: Level and message count checks would require additional database tables
      // For now, we'll skip those checks and add a TODO comment
      // TODO: Implement level and message count requirement checks

      // Calculate entry multiplier
      let multiplier = 1;
      const bonusEntries = giveaway.bonusEntries ? JSON.parse(giveaway.bonusEntries as string) : null;

      if (bonusEntries && member.roles.cache.has(bonusEntries.roleId)) {
        multiplier = bonusEntries.multiplier;
      }

      // Enter the giveaway
      const result = await this.giveawayService.enterGiveaway(
        giveaway.id,
        interaction.user.id,
        multiplier
      );

      if (!result.success) {
        await interaction.editReply({
          content: `❌ ${result.message}`,
        });
        return;
      }

      await interaction.editReply({
        content: `✅ ${result.message}`,
      });

      // Update the giveaway message to show new entry count
      await this.giveawayService.updateGiveawayMessage(giveaway, this.client);

    } catch (error: any) {
      console.error('[GiveawayHandler] Error entering giveaway:', error);
      await interaction.editReply({
        content: `❌ Failed to enter giveaway: ${error.message}`,
      });
    }
  }

  /**
   * Start monitoring active giveaways for auto-end
   */
  async startGiveawayMonitor(): Promise<void> {
    try {
      console.log('[GiveawayHandler] Starting giveaway monitor...');

      // Check every minute for giveaways that need to end
      setInterval(async () => {
        try {
          const prisma = (this.giveawayService as any).prisma;
          const now = new Date();

          // Find giveaways that should have ended
          const endedGiveaways = await prisma.$queryRaw`
            SELECT * FROM giveaways
            WHERE ended = false
              AND end_time <= ${now}
          ` as any[];

          for (const giveaway of endedGiveaways) {
            console.log(`[GiveawayHandler] Auto-ending giveaway: ${giveaway.id}`);
            await this.giveawayService.endGiveaway(giveaway.id, this.client);
          }
        } catch (error) {
          console.error('[GiveawayHandler] Error in giveaway monitor:', error);
        }
      }, 60000); // Check every minute

    } catch (error) {
      console.error('[GiveawayHandler] Error starting giveaway monitor:', error);
    }
  }
}

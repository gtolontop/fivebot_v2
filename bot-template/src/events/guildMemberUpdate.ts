import { GuildMember, PartialGuildMember } from 'discord.js';
import { FiveLinkService } from '../services/fivelink.service';

/**
 * Handle guild member updates - particularly for detecting booster status changes
 */
export async function guildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  fivelinkService: FiveLinkService | null
) {
  try {
    // Skip if no FiveLink service configured
    if (!fivelinkService) {
      return;
    }

    // Check for booster status change
    const wasBooster = oldMember.premiumSince !== null;
    const isBooster = newMember.premiumSince !== null;

    // No change in booster status
    if (wasBooster === isBooster) {
      return;
    }

    const discordId = newMember.user.id;

    if (isBooster && !wasBooster) {
      // User just started boosting
      console.log(`[Booster] ${newMember.user.tag} started boosting ${newMember.guild.name}`);
      
      const result = await fivelinkService.grantBoosterBadge(discordId);
      
      if (result.success) {
        if (result.alreadyHad) {
          console.log(`[Booster] ${newMember.user.tag} already had the booster badge`);
        } else {
          console.log(`[Booster] Granted booster badge to ${newMember.user.tag}`);
        }
      } else {
        // Don't log "User not linked" as error - it's expected for many users
        if (result.error?.includes('not linked')) {
          console.log(`[Booster] ${newMember.user.tag} is not linked to FiveLink`);
        } else {
          console.error(`[Booster] Failed to grant badge to ${newMember.user.tag}:`, result.error);
        }
      }
    } else if (!isBooster && wasBooster) {
      // User stopped boosting
      console.log(`[Booster] ${newMember.user.tag} stopped boosting ${newMember.guild.name}`);
      
      const result = await fivelinkService.revokeBoosterBadge(discordId);
      
      if (result.success) {
        if (result.hadBadge) {
          console.log(`[Booster] Revoked booster badge from ${newMember.user.tag}`);
        } else {
          console.log(`[Booster] ${newMember.user.tag} did not have the booster badge`);
        }
      } else {
        if (result.error?.includes('not linked')) {
          console.log(`[Booster] ${newMember.user.tag} is not linked to FiveLink`);
        } else {
          console.error(`[Booster] Failed to revoke badge from ${newMember.user.tag}:`, result.error);
        }
      }
    }
  } catch (error) {
    console.error('[Booster] Error handling member update:', error);
  }
}

import { GuildMember, PartialGuildMember } from 'discord.js';
import { FiveLinkService } from '../services/fivelink.service';

export interface FiveLinkConfig {
  staffRoleId?: string;
}

/**
 * Handle guild member updates - particularly for detecting booster and staff role changes
 */
export async function guildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  fivelinkService: FiveLinkService | null,
  fivelinkConfig?: FiveLinkConfig
) {
  try {
    // Skip if no FiveLink service configured
    if (!fivelinkService) {
      return;
    }

    const discordId = newMember.user.id;

    // Check for booster status change
    await handleBoosterChange(oldMember, newMember, fivelinkService);

    // Check for staff role change
    if (fivelinkConfig?.staffRoleId) {
      await handleStaffRoleChange(oldMember, newMember, fivelinkService, fivelinkConfig.staffRoleId);
    }
  } catch (error) {
    console.error('[FiveLink] Error handling member update:', error);
  }
}

/**
 * Handle booster status changes
 */
async function handleBoosterChange(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  fivelinkService: FiveLinkService
) {
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
}

/**
 * Handle staff role changes
 */
async function handleStaffRoleChange(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  fivelinkService: FiveLinkService,
  staffRoleId: string
) {
  const hadStaffRole = oldMember.roles?.cache?.has(staffRoleId) ?? false;
  const hasStaffRole = newMember.roles.cache.has(staffRoleId);

  // No change in staff role
  if (hadStaffRole === hasStaffRole) {
    return;
  }

  const discordId = newMember.user.id;

  if (hasStaffRole && !hadStaffRole) {
    // User just got staff role
    console.log(`[Staff] ${newMember.user.tag} received staff role`);

    const result = await fivelinkService.grantStaffBadge(discordId);

    if (result.success) {
      if (result.alreadyHad) {
        console.log(`[Staff] ${newMember.user.tag} already had the staff badge`);
      } else {
        console.log(`[Staff] Granted staff badge to ${newMember.user.tag}`);
      }
    } else {
      if (result.error?.includes('not linked')) {
        console.log(`[Staff] ${newMember.user.tag} is not linked to FiveLink`);
      } else {
        console.error(`[Staff] Failed to grant badge to ${newMember.user.tag}:`, result.error);
      }
    }
  } else if (!hasStaffRole && hadStaffRole) {
    // User lost staff role
    console.log(`[Staff] ${newMember.user.tag} lost staff role`);

    const result = await fivelinkService.revokeStaffBadge(discordId);

    if (result.success) {
      if (result.hadBadge) {
        console.log(`[Staff] Revoked staff badge from ${newMember.user.tag}`);
      } else {
        console.log(`[Staff] ${newMember.user.tag} did not have the staff badge`);
      }
    } else {
      if (result.error?.includes('not linked')) {
        console.log(`[Staff] ${newMember.user.tag} is not linked to FiveLink`);
      } else {
        console.error(`[Staff] Failed to revoke badge from ${newMember.user.tag}:`, result.error);
      }
    }
  }
}

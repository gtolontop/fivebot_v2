/**
 * Leveling System Commands
 *
 * This module exports all leveling-related Discord slash commands.
 *
 * Commands:
 * - /rank [user] - Display user's rank card with level, XP, and progress
 * - /leaderboard [type] - Show server leaderboard (all-time, weekly, monthly)
 * - /give-xp <user> <amount> - Give XP to a user (Admin only)
 * - /remove-xp <user> <amount> - Remove XP from a user (Admin only)
 * - /set-level <user> <level> - Set a user's level directly (Admin only)
 * - /xp-settings - View current XP and leveling settings
 */

import * as rank from './rank';
import * as leaderboard from './leaderboard';
import * as giveXp from './give-xp';
import * as removeXp from './remove-xp';
import * as setLevel from './set-level';
import * as xpSettings from './xp-settings';

// Export all commands
export {
  rank,
  leaderboard,
  giveXp,
  removeXp,
  setLevel,
  xpSettings,
};

// Export command data for registration
export const levelingCommands = [
  rank.data,
  leaderboard.data,
  giveXp.data,
  removeXp.data,
  setLevel.data,
  xpSettings.data,
];

// Export command executors
export const levelingExecutors = {
  rank: rank.execute,
  leaderboard: leaderboard.execute,
  'give-xp': giveXp.execute,
  'remove-xp': removeXp.execute,
  'set-level': setLevel.execute,
  'xp-settings': xpSettings.execute,
};

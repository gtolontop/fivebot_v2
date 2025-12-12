// Moderation Commands Export
// This file exports all moderation commands for easy importing

import * as warnCommand from './warn';
import * as warningsCommand from './warnings';
import * as clearWarningsCommand from './clear-warnings';
import * as muteCommand from './mute';
import * as unmuteCommand from './unmute';
import * as kickCommand from './kick';
import * as banCommand from './ban';
import * as unbanCommand from './unban';
import * as softbanCommand from './softban';
import * as caseCommand from './case';
import * as casesCommand from './cases';
import * as reasonCommand from './reason';
import * as purgeCommand from './purge';
import * as slowmodeCommand from './slowmode';
import * as lockCommand from './lock';
import * as unlockCommand from './unlock';
import * as roleCommand from './role';

export const moderationCommands = {
  warn: warnCommand,
  warnings: warningsCommand,
  'clear-warnings': clearWarningsCommand,
  mute: muteCommand,
  unmute: unmuteCommand,
  kick: kickCommand,
  ban: banCommand,
  unban: unbanCommand,
  softban: softbanCommand,
  case: caseCommand,
  cases: casesCommand,
  reason: reasonCommand,
  purge: purgeCommand,
  slowmode: slowmodeCommand,
  lock: lockCommand,
  unlock: unlockCommand,
  role: roleCommand,
};

// Export individual commands
export {
  warnCommand,
  warningsCommand,
  clearWarningsCommand,
  muteCommand,
  unmuteCommand,
  kickCommand,
  banCommand,
  unbanCommand,
  softbanCommand,
  caseCommand,
  casesCommand,
  reasonCommand,
  purgeCommand,
  slowmodeCommand,
  lockCommand,
  unlockCommand,
  roleCommand,
};

// Export all command data for registration
export const moderationCommandData = [
  warnCommand.data,
  warningsCommand.data,
  clearWarningsCommand.data,
  muteCommand.data,
  unmuteCommand.data,
  kickCommand.data,
  banCommand.data,
  unbanCommand.data,
  softbanCommand.data,
  caseCommand.data,
  casesCommand.data,
  reasonCommand.data,
  purgeCommand.data,
  slowmodeCommand.data,
  lockCommand.data,
  unlockCommand.data,
  roleCommand.data,
];

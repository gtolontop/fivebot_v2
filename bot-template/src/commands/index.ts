import { SlashCommandBuilder } from 'discord.js';
import * as ticketCommand from './ticket';
import * as ticketExampleCommand from './ticketExample';
import * as ticketDebugCommand from './ticketDebug';
import * as rulesCommand from './rules';
import * as pricingCommand from './pricing';
import * as embedBuilderCommand from './embed-builder';
import * as serverInfoCommand from './server-info';
import * as userProfileCommand from './user-profile';
import * as teamCommand from './team';
import * as announcementCommand from './announcement';
import * as fivelinkLeaderboardCommand from './fivelink/leaderboard';
import * as fivelinkProfileCommand from './fivelink/profile';
import * as fivelinkStatsCommand from './fivelink/stats';
import * as fivelinkMeCommand from './fivelink/me';

// Get ticket enabled status from environment config
const config = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : {};
const ticketEnabled = config.ticketData?.ticketEnabled || false;

// V2 commands will be handled dynamically in buildCommands function

// Base commands (always available)
const baseCommands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot help and panel link'),
];

// Default bot commands (without V2 commands which are handled dynamically)
const defaultCommands = [...baseCommands];

// Function to build commands dynamically including custom commands
export function buildCommands(customCommands: Record<string, any> = {}, v2CommandsConfig: Record<string, any> = {}) {
  // Start with base commands
  const commands: any[] = [...baseCommands];
  
  // Add V2 commands based on config
  if (v2CommandsConfig['rules']?.enabled) commands.push(rulesCommand.data);
  if (v2CommandsConfig['pricing']?.enabled) commands.push(pricingCommand.data);
  if (v2CommandsConfig['embed-builder']?.enabled) commands.push(embedBuilderCommand.data);
  if (v2CommandsConfig['server-info']?.enabled) commands.push(serverInfoCommand.data);
  if (v2CommandsConfig['user-profile']?.enabled) commands.push(userProfileCommand.data);
  if (v2CommandsConfig['team']?.enabled) commands.push(teamCommand.data);
  if (v2CommandsConfig['announcement']?.enabled) commands.push(announcementCommand.data);
  
  // Add dynamic V2 embeds (custom embeds created by users)
  const presetCommands = ['rules', 'pricing', 'server-info', 'user-profile', 'team', 'announcement', 'embed-builder'];
  Object.entries(v2CommandsConfig).forEach(([name, data]: [string, any]) => {
    if (!presetCommands.includes(name) && data.enabled) {
      const command = new SlashCommandBuilder()
        .setName(name)
        .setDescription(data.description || `Display ${name} embed`);
      commands.push(command);
    }
  });

  // Add FiveLink commands if module is enabled
  // We check if the module exists in bot_modules table at runtime
  // For now, always register them so they're available when module is enabled
  commands.push(fivelinkLeaderboardCommand.data);
  commands.push(fivelinkProfileCommand.data);
  commands.push(fivelinkStatsCommand.data);
  
  // Add ticket commands if enabled
  const parsedConfig = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : {};
  const ticketEnabledNow = parsedConfig.ticketEnabled || false;
  if (ticketEnabledNow) {
    // Add ticket moderation commands based on ticketData.commands config
    const ticketData = parsedConfig.ticketData ?
      (typeof parsedConfig.ticketData === 'string' ? JSON.parse(parsedConfig.ticketData) : parsedConfig.ticketData) :
      {};
    const ticketCommands = ticketData.commands || {};

    // Import and add enabled commands
    const ticketCommandsModule = require('./ticket-commands');
    if (ticketCommands.close !== false) commands.push(ticketCommandsModule.ticketCommands.close.data);
    if (ticketCommands.add !== false) commands.push(ticketCommandsModule.ticketCommands.add.data);
    if (ticketCommands.remove !== false) commands.push(ticketCommandsModule.ticketCommands.remove.data);
    if (ticketCommands.claim !== false) commands.push(ticketCommandsModule.ticketCommands.claim.data);
    if (ticketCommands.unclaim !== false) commands.push(ticketCommandsModule.ticketCommands.unclaim.data);
    if (ticketCommands.rename !== false) commands.push(ticketCommandsModule.ticketCommands.rename.data);
    if (ticketCommands.priority !== false) commands.push(ticketCommandsModule.ticketCommands.priority.data);
  }
  
  // Add custom commands
  Object.entries(customCommands).forEach(([commandName, commandData]) => {
    if (commandData && commandData.name && (commandData.response || commandData.embed)) {
      const command = new SlashCommandBuilder()
        .setName(commandData.name)
        .setDescription(commandData.description || `Custom command: ${commandData.name}`);
      
      commands.push(command);
    }
  });
  
  return commands.map(command => 'toJSON' in command ? command.toJSON() : command);
}

// Export default commands for backwards compatibility
export const commands = defaultCommands.map(command => command.toJSON());
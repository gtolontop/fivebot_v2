import { SlashCommandBuilder } from 'discord.js';
import * as statsCommand from './stats';
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

// Get ticket enabled status from environment config
const config = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : {};
const ticketEnabled = config.ticketData?.ticketEnabled || false;

// V2 commands will be handled dynamically in buildCommands function

// Base commands (always available)
const baseCommands = [
  new SlashCommandBuilder()
    .setName('set-welcome')
    .setDescription('Configure welcome messages')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable welcome messages')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send welcome messages')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Welcome message title')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Welcome message description (use {user} to mention)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Embed color (hex format: #5865F2)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('Show bot status and configuration'),

  new SlashCommandBuilder()
    .setName('reload-config')
    .setDescription('Reload bot configuration from database'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot help'),
    
  statsCommand.data,
];

// V2 Embed commands (conditionally added based on config)
const v2Commands = [];
if (embedV2Commands['rules']?.enabled) v2Commands.push(rulesCommand.data);
if (embedV2Commands['pricing']?.enabled) v2Commands.push(pricingCommand.data);
if (embedV2Commands['embed-builder']?.enabled) v2Commands.push(embedBuilderCommand.data);
if (embedV2Commands['server-info']?.enabled) v2Commands.push(serverInfoCommand.data);
if (embedV2Commands['user-profile']?.enabled) v2Commands.push(userProfileCommand.data);
if (embedV2Commands['team']?.enabled) v2Commands.push(teamCommand.data);
if (embedV2Commands['announcement']?.enabled) v2Commands.push(announcementCommand.data);

// Ticket commands (only if ticket system is enabled)
const ticketCommands = ticketEnabled ? [
  ticketCommand.data,
  ticketExampleCommand.data,
  ticketDebugCommand.data,
] : [];

// Default bot commands
const defaultCommands = [...baseCommands, ...v2Commands, ...ticketCommands];

// Function to build commands dynamically including custom commands
export function buildCommands(customCommands: Record<string, any> = {}, v2CommandsConfig: Record<string, any> = {}) {
  // Start with base commands
  const commands = [...baseCommands];
  
  // Add V2 commands based on config
  if (v2CommandsConfig['rules']?.enabled) commands.push(rulesCommand.data);
  if (v2CommandsConfig['pricing']?.enabled) commands.push(pricingCommand.data);
  if (v2CommandsConfig['embed-builder']?.enabled) commands.push(embedBuilderCommand.data);
  if (v2CommandsConfig['server-info']?.enabled) commands.push(serverInfoCommand.data);
  if (v2CommandsConfig['user-profile']?.enabled) commands.push(userProfileCommand.data);
  if (v2CommandsConfig['team']?.enabled) commands.push(teamCommand.data);
  if (v2CommandsConfig['announcement']?.enabled) commands.push(announcementCommand.data);
  
  // Add ticket commands if enabled
  if (ticketEnabled) {
    commands.push(ticketCommand.data);
    commands.push(ticketExampleCommand.data);
    commands.push(ticketDebugCommand.data);
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
  
  return commands.map(command => command.toJSON());
}

// Export default commands for backwards compatibility
export const commands = defaultCommands.map(command => command.toJSON());
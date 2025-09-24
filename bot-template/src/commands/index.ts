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
  rulesCommand.data,
  pricingCommand.data,
  embedBuilderCommand.data,
  serverInfoCommand.data,
  userProfileCommand.data,
  teamCommand.data,
  announcementCommand.data,
];

// Ticket commands (only if ticket system is enabled)
const ticketCommands = ticketEnabled ? [
  ticketCommand.data,
  ticketExampleCommand.data,
  ticketDebugCommand.data,
] : [];

// Default bot commands
const defaultCommands = [...baseCommands, ...ticketCommands];

// Function to build commands dynamically including custom commands
export function buildCommands(customCommands: Record<string, any> = {}) {
  const commands = [...defaultCommands];
  
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
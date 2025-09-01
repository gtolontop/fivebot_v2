import { SlashCommandBuilder } from 'discord.js';
import * as statsCommand from './stats';
import * as ticketCommand from './ticket';

// Default bot commands
const defaultCommands = [
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
  ticketCommand.data,
];

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
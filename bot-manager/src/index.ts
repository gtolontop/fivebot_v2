import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import commands
import { help } from './commands/help';

// Import events
import { ready } from './events/ready';
import { interactionCreate } from './events/interactionCreate';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Database connection
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// Commands collection
client.commands = new Collection();

// Register commands
const commands = [help];
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Register events
client.once('ready', () => ready(client, prisma));
client.on('interactionCreate', (interaction) => interactionCreate(interaction, prisma));

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Deploy commands function
async function deployCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
    
    const commandsData = commands.map(command => command.data.toJSON());

    console.log('🚀 Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commandsData },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

// Start the bot
async function start() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');

    // Deploy commands
    await deployCommands();

    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
});

start();

export { client, prisma };
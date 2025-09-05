import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ready } from './events/ready';
import { interactionCreate } from './events/interactionCreate';
import { messageCreate } from './events/messageCreate';
import { guildMemberAdd } from './events/guildMemberAdd';
import { MetricsService } from './services/metrics.service';

dotenv.config();

// Environment variables
const BOT_ID = process.env.BOT_ID!;
const BOT_TOKEN = process.env.BOT_TOKEN!;
const CONFIG = JSON.parse(process.env.CONFIG || '{}');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

// Initialize database
const prisma = new PrismaClient({
  log: ['error'],
});

// Initialize metrics service
let metricsService: MetricsService;

// Register events
client.once('ready', async () => {
  console.log(`[Bot ${BOT_ID}] Initializing...`);
  
  // Initialize metrics service after client is ready
  metricsService = new MetricsService(client, prisma, BOT_ID);
  console.log(`[Bot ${BOT_ID}] Metrics service initialized`);
  
  await ready(client, prisma, BOT_ID);
});

client.on('interactionCreate', (interaction) => interactionCreate(interaction, prisma, CONFIG));
client.on('messageCreate', (message) => messageCreate(message, prisma, CONFIG));
client.on('guildMemberAdd', (member) => guildMemberAdd(member, CONFIG));

// Error handling
client.on('error', (error) => {
  console.error(`[Bot ${BOT_ID}] Discord client error:`, error);
});

process.on('unhandledRejection', (error) => {
  console.error(`[Bot ${BOT_ID}] Unhandled promise rejection:`, error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(`[Bot ${BOT_ID}] Shutting down gracefully...`);
  
  // Force sync any remaining metrics
  if (metricsService) {
    await metricsService.forceSync();
    metricsService.destroy();
  }
  
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`[Bot ${BOT_ID}] Received SIGTERM, shutting down...`);
  
  // Force sync any remaining metrics
  if (metricsService) {
    await metricsService.forceSync();
    metricsService.destroy();
  }
  
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the bot
async function start() {
  try {
    await prisma.$connect();
    console.log(`[Bot ${BOT_ID}] Database connected`);

    await client.login(BOT_TOKEN);
    console.log(`[Bot ${BOT_ID}] Discord login successful`);
  } catch (error) {
    console.error(`[Bot ${BOT_ID}] Failed to start:`, error);
    process.exit(1);
  }
}

start();

export { client, prisma, metricsService };
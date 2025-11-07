import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export async function setupGracefulShutdown() {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

    try {
      // 1. Kill all bot processes FIRST
      // Don't mark bots as OFFLINE - let recovery service handle restart
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq bot-*"').catch(() => {});
      } else {
        // Kill all tsx and node processes spawned by the bot
        await execAsync('pkill -f "tsx src/index.ts"').catch(() => {});
        await execAsync('pkill -f "bot-template"').catch(() => {});
      }
      console.log('✅ Terminated all bot processes');

      // 2. Disconnect from database
      await prisma.$disconnect();
      console.log('✅ Disconnected from database');

      // 3. Exit
      console.log('✅ Graceful shutdown complete - bots will be auto-recovered on restart');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  // Windows specific
  if (process.platform === 'win32') {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.on('SIGINT', () => {
      process.emit('SIGINT');
    });
  }
}
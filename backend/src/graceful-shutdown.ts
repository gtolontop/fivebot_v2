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
      // 1. Mark all bots as OFFLINE
      const result = await prisma.$executeRaw`
        UPDATE bots 
        SET status = 'OFFLINE', updated_at = NOW()
        WHERE status != 'OFFLINE'
      `;
      console.log(`✅ Marked ${result} bot(s) as OFFLINE`);

      // 2. Kill all bot processes
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq bot-*"').catch(() => {});
      } else {
        await execAsync('pkill -f "bot-"').catch(() => {});
      }
      console.log('✅ Terminated all bot processes');

      // 3. Disconnect from database
      await prisma.$disconnect();
      console.log('✅ Disconnected from database');

      // 4. Exit
      console.log('✅ Graceful shutdown complete');
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
/**
 * Prisma Singleton Service
 * Provides a single PrismaClient instance across the application
 * to avoid "too many connections" errors
 */

import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

/**
 * Get or create a singleton PrismaClient instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [],
      errorFormat: 'minimal',
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
      }
    });

    process.on('SIGINT', async () => {
      if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
      }
    });

    process.on('SIGTERM', async () => {
      if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
      }
    });
  }

  return prismaInstance;
}

/**
 * Manually disconnect the Prisma client (use with caution)
 */
export async function disconnectPrismaClient(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Default export for convenience
const prisma = getPrismaClient();
export default prisma;

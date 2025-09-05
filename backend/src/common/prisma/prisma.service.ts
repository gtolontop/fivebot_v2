import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  constructor() {
    super({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'connection_limit=20&pool_timeout=30',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully with connection pool configured');
      
      // Log connection pool configuration
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const connectionLimit = dbUrl.includes('connection_limit') ? 'custom' : '20 (default)';
        const poolTimeout = dbUrl.includes('pool_timeout') ? 'custom' : '30s (default)';
        this.logger.log(`📊 Connection pool: limit=${connectionLimit}, timeout=${poolTimeout}`);
      }
      
      // Auto-create tables if they don't exist
      await this.ensureTablesExist();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  private async ensureTablesExist() {
    try {
      // Check if tables exist by trying to query the users table
      await this.$queryRaw`SELECT 1 FROM users LIMIT 1`;
      console.log('✅ Database tables already exist');
    } catch (error) {
      console.log('⚠️ Tables not found, creating database schema...');
      try {
        // Deploy the Prisma schema to create all tables
        const { execSync } = require('child_process');
        execSync('npx prisma db push --force-reset', { 
          cwd: process.cwd(),
          stdio: 'inherit'
        });
        console.log('✅ Database schema created successfully');
      } catch (pushError) {
        console.error('❌ Failed to create database schema:', pushError);
        throw pushError;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const tables = await this.$queryRaw<Array<{ TABLE_NAME: string }>>`
      SELECT TABLE_NAME from information_schema.TABLES WHERE TABLE_SCHEMA = 'fivebot';
    `;

    await this.$transaction(
      tables.map((table) =>
        this.$executeRawUnsafe(`TRUNCATE TABLE \`${table.TABLE_NAME}\``),
      ),
    );
  }

  /**
   * Execute a database operation with automatic retry on lock timeout
   * @param operation The database operation to execute
   * @param options Retry options
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      operationName?: string;
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 100,
      maxDelay = 5000,
      operationName = 'database operation',
    } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isLockTimeout =
          error.code === 'P2034' || // Prisma lock timeout
          error.code === 'ER_LOCK_WAIT_TIMEOUT' || // MySQL lock wait timeout
          error.message?.includes('timeout') ||
          error.message?.includes('Lock wait timeout exceeded');

        const isDeadlock =
          error.code === 'P2023' || // Prisma deadlock
          error.code === 'ER_LOCK_DEADLOCK' || // MySQL deadlock
          error.message?.includes('deadlock');

        if ((isLockTimeout || isDeadlock) && attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
          const jitter = Math.random() * delay * 0.1; // Add 10% jitter
          const totalDelay = Math.floor(delay + jitter);

          this.logger.warn(
            `⚠️ ${isDeadlock ? 'Deadlock' : 'Lock timeout'} on ${operationName} (attempt ${attempt}/${maxRetries}), retrying in ${totalDelay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, totalDelay));
          continue;
        }

        // Not a retryable error or max retries exceeded
        throw error;
      }
    }

    throw new Error(`Failed to execute ${operationName} after ${maxRetries} attempts`);
  }
}
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
    
    // Auto-create tables if they don't exist
    await this.ensureTablesExist();
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
}
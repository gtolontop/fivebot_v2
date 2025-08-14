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
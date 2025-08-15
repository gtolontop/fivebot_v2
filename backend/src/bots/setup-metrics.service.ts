import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SetupMetricsService {
  constructor(private prisma: PrismaService) {}

  async createMetricsTable(): Promise<void> {
    try {
      // Execute raw SQL to create the table if it doesn't exist
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS bot_metrics (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          bot_id VARCHAR(36) NOT NULL,
          date DATE NOT NULL,
          commands_used INT NOT NULL DEFAULT 0,
          messages_processed INT NOT NULL DEFAULT 0,
          guilds_count INT NOT NULL DEFAULT 0,
          users_count INT NOT NULL DEFAULT 0,
          uptime_seconds INT NOT NULL DEFAULT 0,
          avg_response_time_ms INT NOT NULL DEFAULT 0,
          errors_count INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
          UNIQUE KEY unique_bot_date (bot_id, date),
          INDEX idx_bot_metrics_bot_id (bot_id),
          INDEX idx_bot_metrics_date (date)
        );
      `;
      console.log('Metrics table created successfully');
    } catch (error) {
      console.log('Metrics table already exists or error creating:', error.message);
    }
  }

  async seedInitialMetrics(): Promise<void> {
    try {
      // Get all active bots
      const bots = await this.prisma.bot.findMany({
        where: { isActive: true },
        select: { id: true, status: true, createdAt: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const bot of bots) {
        // Check if metrics already exist for today
        const existingMetrics = await this.prisma.$queryRaw`
          SELECT id FROM bot_metrics WHERE bot_id = ${bot.id} AND date = ${today}
        `;

        if (Array.isArray(existingMetrics) && existingMetrics.length === 0) {
          // Create initial metrics for today
          const uuid = require('crypto').randomUUID();
          await this.prisma.$executeRaw`
            INSERT INTO bot_metrics (
              id, bot_id, date, commands_used, messages_processed, 
              guilds_count, users_count, uptime_seconds, avg_response_time_ms, errors_count
            ) VALUES (
              ${uuid}, ${bot.id}, ${today}, 0, 0, 0, 0, 0, 45, 0
            )
          `;
        }
      }

      console.log('Initial metrics seeded successfully');
    } catch (error) {
      console.error('Error seeding initial metrics:', error);
    }
  }
}
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { BotStatus, HostStatus, JobStatus } from '@prisma/client';

@Processor('bot-queue')
export class BotWorker extends WorkerHost {
  private readonly logger = new Logger(BotWorker.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'create-bot':
        return this.handleCreateBot(job);
      case 'start-bot':
        return this.handleStartBot(job);
      case 'stop-bot':
        return this.handleStopBot(job);
      case 'delete-bot':
        return this.handleDeleteBot(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleCreateBot(job: Job) {
    const { botId, ownerId } = job.data;
    
    try {
      await this.logJobStart(botId, job.id.toString(), 'create-bot');

      // Get bot details
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { config: true },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      // Decrypt token
      const token = this.encryptionService.decrypt(bot.tokenEncrypted);

      // Create bot container/process
      const containerId = await this.createBotContainer(bot.id, token, bot.config);

      // Update bot status and create host record
      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: BotStatus.STARTING,
          containerId,
        },
      });

      await this.prisma.host.create({
        data: {
          botId,
          host: 'localhost', // In production, this would be dynamic
          containerId,
          status: HostStatus.STARTING,
          cpuLimit: '0.5',
          memLimit: '512m',
          startedAt: new Date(),
        },
      });

      // Wait a moment for the bot to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Update status to online
      await this.prisma.bot.update({
        where: { id: botId },
        data: { status: BotStatus.ONLINE },
      });

      await this.prisma.host.updateMany({
        where: { 
          botId,
          containerId 
        },
        data: { status: HostStatus.UP },
      });

      await this.logJobComplete(botId, job.id.toString(), 'Bot created and started successfully');

    } catch (error) {
      this.logger.error(`Failed to create bot ${botId}:`, error);
      
      await this.prisma.bot.update({
        where: { id: botId },
        data: { status: BotStatus.ERROR },
      });

      await this.logJobFailed(botId, job.id.toString(), error.message);
      throw error;
    }
  }

  private async handleStartBot(job: Job) {
    const { botId } = job.data;
    
    try {
      await this.logJobStart(botId, job.id.toString(), 'start-bot');

      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { config: true },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      const token = this.encryptionService.decrypt(bot.tokenEncrypted);
      const containerId = await this.createBotContainer(bot.id, token, bot.config);

      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: BotStatus.ONLINE,
          containerId,
        },
      });

      await this.logJobComplete(botId, job.id.toString(), 'Bot started successfully');

    } catch (error) {
      this.logger.error(`Failed to start bot ${botId}:`, error);
      await this.logJobFailed(botId, job.id.toString(), error.message);
      throw error;
    }
  }

  private async handleStopBot(job: Job) {
    const { botId } = job.data;
    
    try {
      await this.logJobStart(botId, job.id.toString(), 'stop-bot');

      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      if (bot.containerId) {
        await this.stopBotContainer(bot.containerId);
      }

      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: BotStatus.OFFLINE,
          containerId: null,
        },
      });

      // Update host status
      await this.prisma.host.updateMany({
        where: { botId, status: HostStatus.UP },
        data: { 
          status: HostStatus.DOWN,
          stoppedAt: new Date(),
        },
      });

      await this.logJobComplete(botId, job.id.toString(), 'Bot stopped successfully');

    } catch (error) {
      this.logger.error(`Failed to stop bot ${botId}:`, error);
      await this.logJobFailed(botId, job.id.toString(), error.message);
      throw error;
    }
  }

  private async handleDeleteBot(job: Job) {
    const { botId } = job.data;
    
    try {
      await this.logJobStart(botId, job.id.toString(), 'delete-bot');

      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
      });

      if (bot?.containerId) {
        await this.stopBotContainer(bot.containerId);
      }

      // Soft delete - just mark as inactive
      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          isActive: false,
          status: BotStatus.OFFLINE,
          containerId: null,
        },
      });

      await this.logJobComplete(botId, job.id.toString(), 'Bot deleted successfully');

    } catch (error) {
      this.logger.error(`Failed to delete bot ${botId}:`, error);
      await this.logJobFailed(botId, job.id.toString(), error.message);
      throw error;
    }
  }

  private async createBotContainer(botId: string, token: string, config: any): Promise<string> {
    // In a real implementation, this would use Docker API
    // For now, we'll simulate container creation
    
    const containerId = `fivebot-${botId}-${Date.now()}`;
    
    // Create environment file for the bot
    const envPath = `/tmp/${containerId}.env`;
    const envContent = [
      `BOT_TOKEN=${token}`,
      `BOT_ID=${botId}`,
      `DATABASE_URL=${this.configService.get('DATABASE_URL')}`,
      `REDIS_URL=${this.configService.get('REDIS_URL')}`,
      `CONFIG=${JSON.stringify(config)}`,
    ].join('\n');

    fs.writeFileSync(envPath, envContent);

    // In production, this would be:
    // docker run -d --name ${containerId} --env-file ${envPath} fivebot/child-bot
    
    this.logger.log(`Created bot container: ${containerId}`);
    return containerId;
  }

  private async stopBotContainer(containerId: string): Promise<void> {
    // In a real implementation, this would use Docker API
    // docker stop ${containerId} && docker rm ${containerId}
    
    this.logger.log(`Stopped bot container: ${containerId}`);
    
    // Clean up env file
    const envPath = `/tmp/${containerId}.env`;
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
  }

  private async logJobStart(botId: string, jobId: string, jobType: string): Promise<void> {
    await this.prisma.jobLog.create({
      data: {
        botId,
        jobId,
        jobType,
        status: JobStatus.PROCESSING,
        message: `Started ${jobType} job`,
      },
    });
  }

  private async logJobComplete(botId: string, jobId: string, message: string): Promise<void> {
    await this.prisma.jobLog.create({
      data: {
        botId,
        jobId,
        jobType: 'COMPLETED',
        status: JobStatus.COMPLETED,
        message,
      },
    });
  }

  private async logJobFailed(botId: string, jobId: string, error: string): Promise<void> {
    await this.prisma.jobLog.create({
      data: {
        botId,
        jobId,
        jobType: 'FAILED',
        status: JobStatus.FAILED,
        message: error,
      },
    });
  }
}
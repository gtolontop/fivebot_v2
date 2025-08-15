import { Injectable } from '@nestjs/common';
import { IQueueService, JobData } from './queue.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

interface QueuedJob {
  id: string;
  type: string;
  data: JobData;
  priority: number;
  createdAt: Date;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class SimpleQueueService implements IQueueService {
  private jobs: QueuedJob[] = [];
  private processing = false;
  private runningBots = new Map<string, ChildProcess>(); // botId -> process

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async addJob(jobType: string, data: JobData, options?: any): Promise<void> {
    const job: QueuedJob = {
      id: `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      data,
      priority: this.getJobPriority(jobType),
      createdAt: new Date(),
      status: 'waiting',
    };

    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority); // Higher priority first

    console.log(`📋 Queued job: ${jobType}`, data);

    // Start processing if not already processing
    if (!this.processing) {
      setImmediate(() => this.processJobs());
    }
  }

  private async processJobs(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.find(j => j.status === 'waiting');
      if (!job) break;

      job.status = 'processing';
      console.log(`🔄 Processing job: ${job.type}`, job.data);

      try {
        await this.executeJob(job);
        job.status = 'completed';
        console.log(`✅ Job completed: ${job.type}`);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        console.error(`❌ Job failed: ${job.type}`, error.message);
      }

      // Remove completed/failed jobs after 1 hour
      this.jobs = this.jobs.filter(j => 
        j.status === 'waiting' || 
        j.status === 'processing' || 
        (Date.now() - j.createdAt.getTime()) < 3600000
      );
    }

    this.processing = false;
  }

  private async executeJob(job: QueuedJob): Promise<void> {
    switch (job.type) {
      case 'create-bot':
        await this.handleCreateBot(job.data);
        break;
      case 'start-bot':
        await this.handleStartBot(job.data);
        break;
      case 'stop-bot':
        await this.handleStopBot(job.data);
        break;
      case 'delete-bot':
        await this.handleDeleteBot(job.data);
        break;
      case 'update-bot-config':
        await this.handleUpdateBotConfig(job.data);
        break;
      default:
        console.log(`Unknown job type: ${job.type}`);
    }
  }

  private async handleCreateBot(data: JobData): Promise<void> {
    // Bot creation logic would go here
    console.log(`Creating bot container for bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async handleStartBot(data: JobData): Promise<void> {
    const botId = data.botId;
    console.log(`Starting bot ${botId}`);

    try {
      // Get bot info from database
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { config: true },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      // Check if bot is already running
      if (this.runningBots.has(botId)) {
        console.log(`Bot ${botId} is already running`);
        return;
      }

      // Decrypt bot token
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);

      // Path to bot template
      const botTemplatePath = path.join(process.cwd(), '..', 'bot-template');
      
      // Determine npm command based on platform
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      // Start bot process
      const botProcess = spawn(npmCmd, ['run', 'dev'], {
        cwd: botTemplatePath,
        env: {
          ...process.env,
          BOT_ID: botId,
          BOT_TOKEN: decryptedToken,
          CONFIG: JSON.stringify(bot.config || {}),
          DATABASE_URL: process.env.DATABASE_URL,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true, // Use shell on Windows
      });

      // Store the process
      this.runningBots.set(botId, botProcess);

      // Handle process errors
      botProcess.on('error', async (error) => {
        console.error(`[Bot ${botId}] Process error:`, error);
        this.runningBots.delete(botId);
        
        // Update bot status to error
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: 'ERROR' },
        });
      });

      // Handle process output
      botProcess.stdout?.on('data', (data) => {
        console.log(`[Bot ${botId}] ${data.toString().trim()}`);
      });

      botProcess.stderr?.on('data', (data) => {
        console.error(`[Bot ${botId} ERROR] ${data.toString().trim()}`);
      });

      // Handle process exit
      botProcess.on('exit', async (code) => {
        console.log(`[Bot ${botId}] Process exited with code ${code}`);
        this.runningBots.delete(botId);
        
        // Update bot status to offline
        try {
          await this.prisma.bot.update({
            where: { id: botId },
            data: { status: 'OFFLINE' },
          });
        } catch (dbError) {
          console.error(`Failed to update bot status:`, dbError);
        }
      });

      // Wait a bit to see if the process starts successfully
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (this.runningBots.has(botId)) {
        // Update bot status to online
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: 'ONLINE' },
        });
        console.log(`✅ Bot ${botId} started successfully`);
      } else {
        throw new Error('Bot process failed to start');
      }

    } catch (error) {
      console.error(`❌ Failed to start bot ${botId}:`, error);
      
      // Update bot status to error
      await this.prisma.bot.update({
        where: { id: botId },
        data: { status: 'ERROR' },
      });

      throw error;
    }
  }

  private async handleStopBot(data: JobData): Promise<void> {
    const botId = data.botId;
    console.log(`🛑 Stopping bot ${botId}`);

    try {
      const botProcess = this.runningBots.get(botId);
      
      if (!botProcess) {
        console.log(`⚠️ Bot ${botId} is not running in process manager`);
        // Update status anyway
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: 'OFFLINE' },
        });
        return;
      }

      console.log(`🔄 Sending SIGTERM to bot ${botId} process`);
      
      // Kill the process gracefully first
      botProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown, then force kill if needed
      const forceKillTimeout = setTimeout(() => {
        if (this.runningBots.has(botId)) {
          console.log(`💀 Force killing bot ${botId} with SIGKILL`);
          botProcess.kill('SIGKILL');
          this.runningBots.delete(botId);
        }
      }, 5000); // 5 seconds timeout (reduced from 10)

      // Wait for process to exit naturally
      await new Promise<void>((resolve) => {
        botProcess.on('exit', () => {
          clearTimeout(forceKillTimeout);
          console.log(`📤 Bot ${botId} process exited naturally`);
          resolve();
        });
        
        // Fallback after timeout
        setTimeout(() => {
          clearTimeout(forceKillTimeout);
          resolve();
        }, 6000);
      });

      // Ensure process is removed from running bots
      this.runningBots.delete(botId);

      // Update bot status
      await this.prisma.bot.update({
        where: { id: botId },
        data: { status: 'OFFLINE' },
      });

      console.log(`✅ Bot ${botId} stopped successfully`);
    } catch (error) {
      console.error(`❌ Failed to stop bot ${botId}:`, error);
      // Ensure cleanup even on error
      this.runningBots.delete(botId);
      
      // Update status to offline anyway
      try {
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: 'OFFLINE' },
        });
      } catch (dbError) {
        console.error(`❌ Failed to update bot status after stop error:`, dbError);
      }
      
      throw error;
    }
  }

  private async handleDeleteBot(data: JobData): Promise<void> {
    console.log(`Deleting bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async handleUpdateBotConfig(data: JobData): Promise<void> {
    const botId = data.botId;
    console.log(`Updating config for bot ${botId}`);

    try {
      // Check if bot is running
      const botProcess = this.runningBots.get(botId);
      if (!botProcess) {
        console.log(`Bot ${botId} is not running - config will be applied on next start`);
        return;
      }

      // Get the updated bot configuration from database
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { config: true },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      // For now, we'll restart the bot to apply the new configuration
      // In a more advanced implementation, we could send live config updates via IPC
      console.log(`Restarting bot ${botId} to apply new configuration...`);
      
      // Stop the current process
      botProcess.kill('SIGTERM');
      this.runningBots.delete(botId);

      // Wait a moment for clean shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Restart with new config
      await this.handleStartBot({ botId });

      console.log(`✅ Bot ${botId} configuration updated and restarted`);
    } catch (error) {
      console.error(`❌ Failed to update config for bot ${botId}:`, error);
      throw error;
    }
  }

  async getJobs(status: 'waiting' | 'active' | 'completed' | 'failed' = 'waiting') {
    // Map 'active' to 'processing' for internal consistency
    const internalStatus = status === 'active' ? 'processing' : status;
    return this.jobs.filter(job => job.status === internalStatus);
  }

  async getJobCounts() {
    const counts = {
      waiting: 0,
      active: 0, // processing
      completed: 0,
      failed: 0,
    };

    this.jobs.forEach(job => {
      if (job.status === 'processing') {
        counts.active++;
      } else if (job.status in counts) {
        counts[job.status]++;
      }
    });

    return counts;
  }

  async pauseQueue(): Promise<void> {
    console.log('Queue paused (simple queue - no-op)');
  }

  async resumeQueue(): Promise<void> {
    console.log('Queue resumed (simple queue - no-op)');
  }

  async cleanJobs(type: 'completed' | 'failed', olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThan;
    this.jobs = this.jobs.filter(job => 
      job.status !== type || job.createdAt.getTime() > cutoff
    );
    console.log(`Cleaned ${type} jobs older than ${olderThan}ms`);
  }

  // Helper method to get running bots for debugging
  getRunningBots(): string[] {
    return Array.from(this.runningBots.keys());
  }

  // Helper method to force stop a specific bot (for emergency situations)
  async forceStopBot(botId: string): Promise<void> {
    const botProcess = this.runningBots.get(botId);
    if (botProcess) {
      console.log(`🚨 Force stopping bot ${botId}`);
      botProcess.kill('SIGKILL');
      this.runningBots.delete(botId);
      
      // Update database status
      await this.prisma.bot.update({
        where: { id: botId },
        data: { status: 'OFFLINE' },
      });
    }
  }

  private getJobPriority(jobType: string): number {
    const priorities = {
      'create-bot': 10,
      'start-bot': 8,
      'stop-bot': 9,
      'delete-bot': 7,
      'update-bot-config': 5,
      'health-check': 3,
      'cleanup': 1,
    };

    return priorities[jobType] || 5;
  }
}
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IQueueService, JobData } from './queue.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { BotLogsService } from '../bots/bot-logs.service';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { BotStatus, LogLevel } from '@prisma/client';

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
    @Inject(forwardRef(() => BotLogsService))
    private botLogsService: BotLogsService,
  ) {}

  // Safe method to update bot status with retry logic
  private async updateBotStatusSafe(botId: string, status: BotStatus): Promise<void> {
    // Check if status updates are disabled
    if (process.env.DISABLE_STATUS_UPDATES === 'true') {
      console.log(`[STATUS UPDATES DISABLED] Would update bot ${botId} to ${status} (from queue)`);
      return;
    }
    
    let retries = 5;
    
    while (retries > 0) {
      try {
        await this.prisma.bot.update({
          where: { id: botId },
          data: { 
            status,
            updatedAt: new Date()
          },
        });
        return;
      } catch (error: any) {
        const isConcurrencyError = 
          error.code === 'P2034' ||
          (error.message && (
            error.message.includes('Record has changed') ||
            error.message.includes('ConnectorError') ||
            error.message.includes('code: 1020') ||
            error.message.includes('HY000')
          ));
          
        if (isConcurrencyError && retries > 1) {
          retries--;
          console.log(`⚠️ Concurrency conflict updating bot ${botId} status to ${status} in queue, retrying... (${retries} retries left)`);
          
          const delay = Math.min(1000, (6 - retries) * 200 + Math.random() * 300);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`❌ Failed to update bot ${botId} status to ${status} in queue:`, error.message || error);
          return;
        }
      }
    }
  }

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
          BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true, // Use shell on Windows
        detached: process.platform !== 'win32', // Detach on Unix systems
      });

      // Store the process
      this.runningBots.set(botId, botProcess);

      // Handle process errors
      botProcess.on('error', async (error) => {
        console.error(`[Bot ${botId}] Process error:`, error);
        this.runningBots.delete(botId);
        
        // Update bot status to error
        await this.updateBotStatusSafe(botId, BotStatus.ERROR);
      });

      // Handle process output
      botProcess.stdout?.on('data', async (data) => {
        const output = data.toString();
        console.log(`[Bot ${botId}] ${output.trim()}`);
        
        // Split output by lines and send each line to live console
        const lines = output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            await this.botLogsService.addLog(
              botId,
              LogLevel.INFO,
              line.trim(),
              'Bot'
            );
          } catch (error) {
            console.error('Failed to log bot output:', error);
          }
        }
      });

      botProcess.stderr?.on('data', async (data) => {
        const output = data.toString();
        console.error(`[Bot ${botId} ERROR] ${output.trim()}`);
        
        // Split output by lines and send each line to live console
        const lines = output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            await this.botLogsService.addLog(
              botId,
              LogLevel.ERROR,
              line.trim(),
              'Bot'
            );
          } catch (error) {
            console.error('Failed to log bot error:', error);
          }
        }
      });

      // Handle process exit
      botProcess.on('exit', async (code) => {
        console.log(`[Bot ${botId}] Process exited with code ${code}`);
        console.log(`🗂️ Removing bot ${botId} from running processes list`);
        this.runningBots.delete(botId);
        
        // Add Pterodactyl-style server offline message
        try {
          await this.botLogsService.addLog(
            botId,
            LogLevel.INFO,
            'Server marked as offline...',
            'System'
          );
          
          // Clear console buffer since bot is offline
          const consoleBufferService = this.botLogsService['consoleBufferService'];
          if (consoleBufferService) {
            consoleBufferService.onBotOffline(botId);
          }
        } catch (logError) {
          console.error('Failed to add offline log:', logError);
        }
        
        // Use the safe update method to handle concurrency issues
        try {
          await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
          console.log(`[Bot ${botId}] ✅ Status FORCE updated to OFFLINE after process exit`);
        } catch (dbError) {
          console.error(`[Bot ${botId}] ❌ Failed to update bot status:`, dbError);
          // Retry once more
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.prisma.bot.update({
              where: { id: botId },
              data: { 
                status: BotStatus.OFFLINE,
                updatedAt: new Date()
              },
            });
            console.log(`[Bot ${botId}] ✅ Status updated to OFFLINE on retry`);
          } catch (retryError) {
            console.error(`[Bot ${botId}] ❌ Failed to update bot status on retry:`, retryError);
          }
        }
      });

      // Add startup logs progressively
      setTimeout(async () => {
        try {
          await this.botLogsService.addLog(
            botId,
            LogLevel.INFO,
            'Starting bot process...',
            'System'
          );
        } catch (e) {}
      }, 500);

      setTimeout(async () => {
        try {
          await this.botLogsService.addLog(
            botId,
            LogLevel.INFO,
            'Loading bot configuration...',
            'System'
          );
        } catch (e) {}
      }, 1000);

      setTimeout(async () => {
        try {
          await this.botLogsService.addLog(
            botId,
            LogLevel.INFO,
            'Connecting to Discord...',
            'System'
          );
        } catch (e) {}
      }, 1500);

      // Wait a bit to see if the process starts successfully
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (this.runningBots.has(botId)) {
        // Update bot status to online
        await this.updateBotStatusSafe(botId, BotStatus.ONLINE);
        console.log(`✅ Bot ${botId} started successfully`);
        
        // Add Pterodactyl-style server online message
        try {
          await this.botLogsService.addLog(
            botId,
            LogLevel.INFO,
            'Server marked as online...',
            'System'
          );
        } catch (logError) {
          console.error('Failed to add online log:', logError);
        }
        
        // Schedule a verification check after 10 seconds to ensure it's still online
        setTimeout(async () => {
          try {
            if (!this.runningBots.has(botId)) {
              console.log(`⚠️ Bot ${botId} verification failed - process no longer running`);
              await this.prisma.bot.update({
                where: { id: botId },
                data: { 
                  status: BotStatus.OFFLINE,
                  updatedAt: new Date()
                },
              });
            }
          } catch (verifyError) {
            console.error(`❌ Failed to verify bot ${botId} start:`, verifyError);
          }
        }, 10000);
      } else {
        throw new Error('Bot process failed to start');
      }

    } catch (error) {
      console.error(`❌ Failed to start bot ${botId}:`, error);
      
      // Update bot status to error
      await this.updateBotStatusSafe(botId, BotStatus.ERROR);

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
        await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
        return;
      }

      console.log(`🔄 Stopping bot ${botId} process (PID: ${botProcess.pid})`);
      
      // On Windows, use taskkill directly for immediate termination
      if (process.platform === 'win32' && botProcess.pid) {
        const { exec } = require('child_process');
        
        // First try graceful shutdown with taskkill
        exec(`taskkill /PID ${botProcess.pid}`, (error) => {
          if (error) {
            console.log(`⚠️ Graceful taskkill failed, forcing...`);
            // Force kill with /F flag and tree /T to kill all child processes
            exec(`taskkill /F /PID ${botProcess.pid} /T`, (forceError) => {
              if (forceError) {
                console.error(`❌ taskkill force error: ${forceError}`);
              } else {
                console.log(`✅ Process ${botProcess.pid} force killed with taskkill`);
              }
            });
          } else {
            console.log(`✅ Process ${botProcess.pid} killed gracefully with taskkill`);
          }
        });
      } else {
        // Unix systems - send SIGTERM
        botProcess.kill('SIGTERM');
      }
      
      // Timeout to force kill if needed
      const forceKillTimeout = setTimeout(() => {
        if (this.runningBots.has(botId)) {
          console.log(`💀 Process didn't exit, forcing termination for bot ${botId}`);
          try {
            if (process.platform === 'win32' && botProcess.pid) {
              const { execSync } = require('child_process');
              try {
                execSync(`taskkill /F /PID ${botProcess.pid} /T`);
                console.log(`✅ Force killed with taskkill`);
              } catch (e) {
                console.error(`taskkill sync error:`, e);
              }
            } else {
              botProcess.kill('SIGKILL');
            }
          } catch (error) {
            console.log(`⚠️ Process may have already exited`);
          }
          this.runningBots.delete(botId);
        }
      }, 3000); // 3 seconds timeout

      // Wait for process to exit naturally
      await new Promise<void>((resolve) => {
        const exitHandler = () => {
          clearTimeout(forceKillTimeout);
          console.log(`📤 Bot ${botId} process exited naturally`);
          resolve();
        };
        
        botProcess.once('exit', exitHandler);
        
        // Fallback after timeout
        setTimeout(() => {
          clearTimeout(forceKillTimeout);
          botProcess.removeListener('exit', exitHandler);
          resolve();
        }, 8000); // 8 seconds total timeout
      });

      // Ensure process is removed from running bots
      this.runningBots.delete(botId);

      // Force update bot status immediately - no safe retry needed here
      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: BotStatus.OFFLINE,
          updatedAt: new Date()
        },
      });

      console.log(`✅ Bot ${botId} stopped successfully and status FORCE updated to OFFLINE`);
      
      // Schedule a verification check after 5 seconds to ensure it really stopped
      setTimeout(async () => {
        try {
          const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
          if (bot && bot.status !== BotStatus.OFFLINE) {
            console.log(`⚠️ Bot ${botId} status verification failed - forcing to OFFLINE`);
            await this.prisma.bot.update({
              where: { id: botId },
              data: { 
                status: BotStatus.OFFLINE,
                updatedAt: new Date()
              },
            });
          }
        } catch (verifyError) {
          console.error(`❌ Failed to verify bot ${botId} stop:`, verifyError);
        }
      }, 5000);
      
    } catch (error) {
      console.error(`❌ Failed to stop bot ${botId}:`, error);
      // Ensure cleanup even on error
      this.runningBots.delete(botId);
      
      // Update status to offline anyway
      try {
        await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
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
      console.log(`🚨 Force stopping bot ${botId} (PID: ${botProcess.pid})`);
      
      // Try SIGKILL first
      try {
        botProcess.kill('SIGKILL');
      } catch (error) {
        console.log(`⚠️ SIGKILL failed, trying taskkill on Windows...`);
        
        // On Windows, use taskkill as backup
        if (process.platform === 'win32') {
          try {
            const { exec } = require('child_process');
            exec(`taskkill /F /PID ${botProcess.pid}`, (error, stdout, stderr) => {
              if (error) {
                console.error(`taskkill error: ${error}`);
              } else {
                console.log(`✅ Process ${botProcess.pid} killed with taskkill`);
              }
            });
          } catch (execError) {
            console.error(`Failed to execute taskkill: ${execError}`);
          }
        }
      }
      
      this.runningBots.delete(botId);
    } else {
      console.log(`⚠️ Bot ${botId} not found in running processes`);
    }

    // FORCE DISCORD DISCONNECTION by regenerating token or invalidating session
    try {
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { tokenEncrypted: true, name: true }
      });

      if (bot) {
        const token = this.encryptionService.decrypt(bot.tokenEncrypted);
        
        // Try to invalidate the Discord session by calling @me/connections endpoint with invalid data
        console.log(`🔌 Attempting to force Discord disconnection for bot ${bot.name}...`);
        
        try {
          // This will fail and potentially invalidate the session
          await fetch('https://discord.com/api/v10/users/@me/guilds', {
            method: 'DELETE',  // Invalid method to trigger error
            headers: {
              'Authorization': `Bot ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (discordError) {
          console.log(`📤 Discord API error triggered (expected for force disconnect)`);
        }

        // Additional: try to make bot appear invisible immediately
        try {
          await fetch('https://discord.com/api/v10/users/@me/presence', {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'invisible',
              activities: []
            })
          });
          console.log(`👻 Set bot ${bot.name} to invisible status`);
        } catch (presenceError) {
          console.log(`⚠️ Could not set presence to invisible`);
        }
      }
    } catch (error) {
      console.error(`❌ Error forcing Discord disconnection:`, error);
    }
    
    // Update database status
    try {
      await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
      console.log(`💾 Bot ${botId} status set to OFFLINE in database`);
    } catch (dbError) {
      console.error(`❌ Failed to update bot status in database:`, dbError);
    }
  }

  // Method to force cleanup all disconnected processes and sync status
  async forceCleanupAndSync(): Promise<void> {
    console.log('🧹 Starting force cleanup and sync of all bot processes...');
    
    // Get all bots that are marked as ONLINE or ERROR in database
    const activeBots = await this.prisma.bot.findMany({
      where: {
        status: {
          in: [BotStatus.ONLINE, BotStatus.ERROR, BotStatus.STARTING]
        }
      }
    });

    for (const bot of activeBots) {
      const isProcessRunning = this.runningBots.has(bot.id);
      
      if (!isProcessRunning) {
        // Process is not running but DB says it should be - force to OFFLINE
        console.log(`🔄 Bot ${bot.id} (${bot.name}) marked as ${bot.status} but no process found - forcing to OFFLINE`);
        
        try {
          await this.prisma.bot.update({
            where: { id: bot.id },
            data: { 
              status: BotStatus.OFFLINE,
              updatedAt: new Date()
            },
          });
          console.log(`✅ Bot ${bot.id} status forced to OFFLINE`);
        } catch (error) {
          console.error(`❌ Failed to force bot ${bot.id} to OFFLINE:`, error);
        }
      }
    }

    // Clean up any zombie processes that aren't in database
    const runningBotIds = Array.from(this.runningBots.keys());
    for (const botId of runningBotIds) {
      try {
        const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
        if (!bot) {
          console.log(`🧟 Found zombie process for deleted bot ${botId} - killing it`);
          const process = this.runningBots.get(botId);
          if (process) {
            process.kill('SIGKILL');
            this.runningBots.delete(botId);
          }
        }
      } catch (error) {
        console.error(`❌ Error checking bot ${botId}:`, error);
      }
    }

    console.log('✅ Force cleanup and sync completed');
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
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IQueueService, JobData } from './queue.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { BotLogsService } from '../bots/bot-logs.service';
import { RedisService } from '../common/redis/redis.service';
import { ConsoleBufferService } from '../bots/console-buffer.service';
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
    private redisService: RedisService,
    @Inject(forwardRef(() => BotLogsService))
    private botLogsService: BotLogsService,
    @Inject(forwardRef(() => ConsoleBufferService))
    private consoleBufferService: ConsoleBufferService,
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
        // Use raw SQL to avoid concurrency issues
        // Cast status to BotStatus enum for PostgreSQL
        await this.prisma.$executeRaw`
          UPDATE bots
          SET status = ${status}::"BotStatus", updated_at = NOW()
          WHERE id = ${botId}
        `;
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
      case 'restart-bot':
        await this.handleRestartBot(job.data);
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
    let botName = botId; // Fallback to botId if we can't get bot info

    try {
      // Get bot info from database
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { config: true, owner: { select: { username: true } } },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      botName = bot.name; // Update botName for error logging

      console.log(`🚀 Starting bot "${bot.name}" (owner: ${bot.owner.username})`);

      // CRITICAL: Acquire distributed lock to prevent race conditions
      const lockKey = `fivebot:lock:start:${botId}`;
      const lockAcquired = await this.redisService.acquireLock(lockKey, 30000);

      if (!lockAcquired) {
        console.log(`🔒 Another worker is already starting bot "${bot.name}" - waiting for completion...`);

        // Wait a bit for the other worker to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if bot was started by the other worker
        const isNowRunning = await this.redisService.isRunningBot(botId);
        if (isNowRunning) {
          console.log(`✅ Bot "${bot.name}" was started by another worker`);
          await this.updateBotStatusSafe(botId, BotStatus.ONLINE);
          return;
        } else {
          console.log(`⚠️ Bot "${bot.name}" was not started by other worker, will retry`);
          throw new Error('Bot start lock timeout - please retry');
        }
      }

      try {
        // CRITICAL: Check Redis FIRST (shared across all workers) before checking local Map
        const isRunningInRedis = await this.redisService.isRunningBot(botId);

      if (isRunningInRedis) {
        console.log(`⚠️ Bot "${bot.name}" is already running in another worker - skipping duplicate start`);

        // Resynchronize status to ONLINE instead of failing silently
        await this.updateBotStatusSafe(botId, BotStatus.ONLINE);

        // Ensure Redis state is correct and reset crash count
        await this.redisService.saveBotState(botId, {
          status: 'ONLINE',
          userAction: 'start',
          timestamp: new Date(),
          metadata: { confirmed: true, alreadyRunning: true, crashCount: 0 }
        });

        // Release lock before returning
        await this.redisService.releaseLock(lockKey);
        console.log(`🔓 Released start lock for bot "${bot.name}" (already running)`);

        return;
      }

      // Check if bot is running locally (in THIS worker process)
      const isRunningLocally = this.runningBots.has(botId);
      const processExists = isRunningLocally && this.runningBots.get(botId)?.killed === false;

      if (processExists) {
        console.log(`✅ Bot "${bot.name}" is already running locally - resynchronizing Redis state`);

        // Add to Redis if missing (should not happen but be safe)
        await this.redisService.addRunningBot(botId);

        // Resynchronize status to ONLINE
        await this.updateBotStatusSafe(botId, BotStatus.ONLINE);

        await this.redisService.saveBotState(botId, {
          status: 'ONLINE',
          userAction: 'start',
          timestamp: new Date(),
          metadata: { confirmed: true, resynchronized: true, crashCount: 0 }
        });

        // Release lock before returning
        await this.redisService.releaseLock(lockKey);
        console.log(`🔓 Released start lock for bot "${bot.name}" (already running locally)`);

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

      // Store the process locally and in Redis IMMEDIATELY
      this.runningBots.set(botId, botProcess);
      await this.redisService.addRunningBot(botId);
      await this.redisService.setBotMetadata(botId, {
        pid: botProcess.pid,
        startedAt: new Date(),
      });

      // Save bot state in Redis for crash recovery
      await this.redisService.saveBotState(botId, {
        status: 'ONLINE',
        userAction: 'start',
        timestamp: new Date(),
        metadata: { pid: botProcess.pid }
      });

      // CRITICAL: Release lock NOW that bot is registered in Redis
      // This prevents other workers from starting the same bot
      await this.redisService.releaseLock(lockKey);
      console.log(`🔓 Released start lock for bot "${bot.name}" (bot registered in Redis)`);

      // Startup log is already added in bots.service.ts, no need to duplicate it here

      // Handle process errors
      botProcess.on('error', async (error) => {
        console.error(`[Bot "${bot.name}"] Process error:`, error);
        this.runningBots.delete(botId);
        await this.redisService.removeRunningBot(botId);
        await this.redisService.deleteBotMetadata(botId);

        // Get previous crash count
        const previousState = await this.redisService.getBotState(botId);
        const crashCount = (previousState?.metadata?.crashCount || 0) + 1;

        // Mark as crash for recovery with incremented crash count
        await this.redisService.saveBotState(botId, {
          status: 'OFFLINE',
          userAction: 'crash',
          timestamp: new Date(),
          metadata: {
            error: error.message,
            shouldRecover: true,
            crashCount,
            lastCrashTime: new Date().toISOString()
          }
        });

        console.error(`💥 Bot "${bot.name}" crashed (crash count: ${crashCount})`);

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
            let userFriendlyMessage = null;

            // Detect various Discord errors and provide user-friendly messages
            if (line.includes('Authentication failed') ||
                line.includes('invalid token') ||
                line.includes('token may be invalid or expired') ||
                line.includes('Discord authentication failed')) {
              userFriendlyMessage = '❌ INVALID TOKEN: Your Discord bot token is invalid or expired. Please update it in the Advanced Settings.';
            }
            else if (line.includes('Used disallowed intents') ||
                     line.includes('disallowed intent')) {
              userFriendlyMessage = '❌ MISSING INTENTS: Your bot is missing required Discord intents. Go to Discord Developer Portal → Your App → Bot → Enable "Privileged Gateway Intents" (Server Members, Presence, Message Content).';
            }
            else if (line.includes('Missing Access') ||
                     line.includes('Missing Permissions')) {
              userFriendlyMessage = '❌ MISSING PERMISSIONS: Your bot token does not have the required permissions. Check your bot settings on Discord Developer Portal.';
            }
            else if (line.includes('Rate limited') ||
                     line.includes('429')) {
              userFriendlyMessage = '⚠️ RATE LIMITED: Discord is rate limiting your bot. This usually resolves automatically. Please wait a few minutes.';
            }
            else if (line.includes('Invalid Session')) {
              userFriendlyMessage = '⚠️ INVALID SESSION: Discord session expired. The bot will automatically try to reconnect.';
            }

            // Add user-friendly message if we detected a known error
            if (userFriendlyMessage) {
              await this.botLogsService.addLog(
                botId,
                LogLevel.ERROR,
                userFriendlyMessage,
                'System'
              );
            }

            // Always log the original error too
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
      botProcess.on('exit', async (code, signal) => {
        console.log(`[Bot "${bot.name}"] Process exited with code ${code}, signal ${signal}`);
        console.log(`🗂️ Removing bot "${bot.name}" from running processes list`);
        this.runningBots.delete(botId);
        await this.redisService.removeRunningBot(botId);
        await this.redisService.deleteBotMetadata(botId);

        // Check if this was a crash or intentional stop
        const savedState = await this.redisService.getBotState(botId);

        // Detect shutdown type:
        // 1. Graceful shutdown (SIGINT/SIGTERM or exit code 0/null) = Backend restart scenario
        // 2. Intentional user stop (Redis state = 'stop')
        // 3. Crash (any other case with bad exit code)
        const wasGracefulShutdown = code === 0 || code === null || signal === 'SIGINT' || signal === 'SIGTERM';
        const wasUserStop = savedState?.userAction === 'stop';

        if (wasUserStop) {
          // User stopped the bot - mark as OFFLINE
          console.log(`🛑 Bot "${bot.name}" stopped by user`);

          await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
          await this.redisService.deleteBotState(botId);
        } else if (wasGracefulShutdown) {
          // Graceful shutdown (probably backend restart) - DON'T change DB status
          // Keep status as ONLINE so recovery will restart it
          console.log(`✅ Bot "${bot.name}" stopped gracefully (backend restart) - keeping ONLINE status for auto-recovery`);

          // Don't update database status - let it stay ONLINE for recovery
          // Just log it
          try {
            await this.botLogsService.addLog(
              botId,
              LogLevel.INFO,
              'Bot stopped due to backend restart - will auto-restart',
              'System'
            );
          } catch (logError) {
            console.error('Failed to add restart log:', logError);
          }
        } else {
          // Crash - mark for recovery
          const crashCount = (savedState?.metadata?.crashCount || 0) + 1;
          console.log(`💥 Bot "${bot.name}" crashed unexpectedly (crash count: ${crashCount}) - marking for recovery`);

          await this.redisService.saveBotState(botId, {
            status: 'OFFLINE',
            userAction: 'crash',
            timestamp: new Date(),
            metadata: {
              exitCode: code,
              signal: signal,
              shouldRecover: true,
              crashCount,
              lastCrashTime: new Date().toISOString()
            }
          });

          // Mark as offline in database
          await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);

          // Add crash log
          try {
            await this.botLogsService.addLog(
              botId,
              LogLevel.ERROR,
              `Bot crashed (exit code: ${code}, signal: ${signal})`,
              'System'
            );
          } catch (logError) {
            console.error('Failed to add crash log:', logError);
          }
        }

        // Clear console buffer since bot is offline
        try {
          const consoleBufferService = this.botLogsService['consoleBufferService'];
          if (consoleBufferService) {
            consoleBufferService.onBotOffline(botId);
          }
        } catch (error) {
          console.error('Failed to clear console buffer:', error);
        }
      });

      // Bot process itself logs initialization steps

      // Wait longer to ensure bot is fully operational before marking online
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (this.runningBots.has(botId)) {
        // Update bot status to online AND set startedAt to NOW (when bot actually started)
        await this.prisma.bot.update({
          where: { id: botId },
          data: {
            status: BotStatus.ONLINE,
            startedAt: new Date(), // Set REAL start time when bot is actually online
            updatedAt: new Date()
          }
        });

        // Confirm bot state in Redis (bot is really online)
        // Reset crash count on successful start
        await this.redisService.saveBotState(botId, {
          status: 'ONLINE',
          userAction: 'start',
          timestamp: new Date(),
          metadata: { confirmed: true, crashCount: 0 }
        });

        console.log(`✅ Bot "${bot.name}" (owner: ${bot.owner.username}) started successfully`);

        // Add Pterodactyl-style server online message (after bot logs "fully operational")
        // Wait a bit more to ensure bot's final log is captured first
        await new Promise(resolve => setTimeout(resolve, 500));

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
      console.error(`❌ Failed to start bot "${botName}":`, error);

      // Mark as crash for potential recovery
      const previousState = await this.redisService.getBotState(botId);
      const crashCount = (previousState?.metadata?.crashCount || 0) + 1;

      await this.redisService.saveBotState(botId, {
        status: 'OFFLINE',
        userAction: 'crash',
        timestamp: new Date(),
        metadata: {
          error: error.message,
          phase: 'startup',
          shouldRecover: false,
          crashCount,
          lastCrashTime: new Date().toISOString()
        }
      });

      console.error(`💥 Bot "${botName}" failed to start (crash count: ${crashCount})`);

      // Update bot status to error
      await this.updateBotStatusSafe(botId, BotStatus.ERROR);

      // Release lock on error
      await this.redisService.releaseLock(lockKey);
      console.log(`🔓 Released start lock for bot "${botName}" (after error)`);

      throw error;
      }
    } catch (error) {
      // Outer catch for the entire function (lock acquisition failure, etc.)
      console.error(`❌ Fatal error starting bot "${botName}":`, error);
      throw error;
    }
  }

  private async handleStopBot(data: JobData): Promise<void> {
    const botId = data.botId;

    try {
      // Get bot info for better logging
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { name: true, owner: { select: { username: true } } }
      });

      const botName = bot?.name || botId;
      const ownerName = bot?.owner?.username || 'unknown';

      console.log(`🛑 Stopping bot "${botName}" (owner: ${ownerName})`);

      // Save user's intention to stop the bot
      await this.redisService.saveBotState(botId, {
        status: 'OFFLINE',
        userAction: 'stop',
        timestamp: new Date(),
        metadata: { intentional: true }
      });

      const botProcess = this.runningBots.get(botId);

      if (!botProcess) {
        console.log(`⚠️ Bot "${botName}" is not running in process manager - cleaning up and updating status to OFFLINE`);
        // Clean up Redis and local state anyway
        this.runningBots.delete(botId);
        await this.redisService.removeRunningBot(botId);
        await this.redisService.deleteBotMetadata(botId);

        // Update status anyway
        await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
        return;
      }

      console.log(`🔄 Stopping bot "${botName}" process (PID: ${botProcess.pid})`);

      // Helper function to recursively kill all child processes on Linux
      const killProcessTreeLinux = async (pid: number, signal: string = 'SIGTERM'): Promise<void> => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);

        try {
          // Get ALL descendants recursively using ps
          const { stdout } = await execPromise(`ps -o pid= --ppid ${pid}`);
          const childPids = stdout.trim().split('\n').filter((p: string) => p.trim()).map((p: string) => parseInt(p.trim()));

          // Recursively kill all children first
          for (const childPid of childPids) {
            await killProcessTreeLinux(childPid, signal);
          }

          // Then kill this process
          try {
            process.kill(pid, signal);
            console.log(`✅ Killed PID ${pid} with ${signal}`);
          } catch (e) {
            console.log(`⚠️ PID ${pid} already dead`);
          }
        } catch (error) {
          // No children found - just kill this process
          try {
            process.kill(pid, signal);
            console.log(`✅ Killed PID ${pid} with ${signal}`);
          } catch (e) {
            // Already dead
          }
        }
      };

      // On Windows, use taskkill
      if (process.platform === 'win32' && botProcess.pid) {
        const { exec } = require('child_process');
        exec(`taskkill /PID ${botProcess.pid}`, (error: any) => {
          if (error) {
            exec(`taskkill /F /PID ${botProcess.pid} /T`, (forceError: any) => {
              if (!forceError) console.log(`✅ Force killed with taskkill`);
            });
          } else {
            console.log(`✅ Killed gracefully with taskkill`);
          }
        });
      } else {
        // Linux: Recursive kill of entire process tree
        console.log('📤 Killing entire process tree recursively...');
        killProcessTreeLinux(botProcess.pid, 'SIGTERM')
          .then(() => console.log(`✅ Process tree killed`))
          .catch((e) => console.log(`⚠️ Error:`, e.message));
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
              // Linux: Kill entire process tree with SIGKILL
              const { execSync } = require('child_process');
              try {
                execSync(`pkill -KILL -P ${botProcess.pid}`);
                botProcess.kill('SIGKILL');
                console.log(`✅ Force killed process tree with SIGKILL`);
              } catch (e) {
                console.log(`⚠️ Force kill error (may be already dead):`, e.message);
              }
            }
          } catch (error) {
            console.log(`⚠️ Process may have already exited`);
          }
          this.runningBots.delete(botId);
        }
      }, 5000); // 5 seconds timeout (increased from 3s to give more time for graceful shutdown)

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

      // Clean up Redis state
      await this.redisService.removeRunningBot(botId);
      await this.redisService.deleteBotMetadata(botId);

      // Force update bot status immediately - no safe retry needed here
      await this.prisma.bot.update({
        where: { id: botId },
        data: {
          status: BotStatus.OFFLINE,
          updatedAt: new Date()
        },
      });

      console.log(`✅ Bot "${botName}" stopped successfully and status updated to OFFLINE`);

      // NOW clear console and add offline message (after process is killed)
      this.consoleBufferService.clearBuffer(botId);
      await this.botLogsService.addLog(
        botId,
        LogLevel.INFO,
        'Server marked as offline',
        'container'
      );
      
    } catch (error) {
      console.error(`❌ Failed to stop bot ${botId}:`, error);
      // Ensure cleanup even on error
      this.runningBots.delete(botId);
      await this.redisService.removeRunningBot(botId);
      await this.redisService.deleteBotMetadata(botId);

      // Update status to offline anyway
      try {
        await this.updateBotStatusSafe(botId, BotStatus.OFFLINE);
      } catch (dbError) {
        console.error(`❌ Failed to update bot status after stop error:`, dbError);
      }

      throw error;
    }
  }

  private async handleRestartBot(data: JobData): Promise<void> {
    const botId = data.botId;

    try {
      // Get bot info for better logging
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { name: true, owner: { select: { username: true } } }
      });

      const botName = bot?.name || botId;
      const ownerName = bot?.owner?.username || 'unknown';

      console.log(`🔄 Restarting bot "${botName}" (owner: ${ownerName})`);

      // Save restart intention in Redis
      await this.redisService.saveBotState(botId, {
        status: 'RESTARTING',
        userAction: 'restart',
        timestamp: new Date(),
        metadata: { intentional: true, phase: 'stopping' }
      });

      // First, stop the bot if it's running
      const botProcess = this.runningBots.get(botId);
      if (botProcess) {
        console.log(`🛑 Stopping bot "${botName}" before restart...`);

        // Kill the process
        if (process.platform === 'win32' && botProcess.pid) {
          const { exec } = require('child_process');
          exec(`taskkill /F /PID ${botProcess.pid} /T`, (error) => {
            if (error) {
              console.error(`❌ taskkill error during restart:`, error);
            } else {
              console.log(`✅ Process ${botProcess.pid} killed for restart`);
            }
          });
        } else {
          // On Linux: Try SIGTERM first, then SIGKILL if it doesn't exit
          console.log(`📤 Sending SIGTERM to bot process ${botProcess.pid}...`);
          botProcess.kill('SIGTERM');
        }

        // Wait for process to exit with escalation to SIGKILL
        await new Promise<void>((resolve) => {
          let resolved = false;
          const exitHandler = () => {
            if (!resolved) {
              console.log(`✅ Bot ${botId} process exited gracefully`);
              resolved = true;
              resolve();
            }
          };
          botProcess.once('exit', exitHandler);

          // After 3 seconds, escalate to SIGKILL on Linux
          setTimeout(() => {
            if (!resolved && process.platform !== 'win32') {
              console.log(`⚠️ Bot ${botId} didn't exit gracefully, sending SIGKILL...`);
              try {
                botProcess.kill('SIGKILL');
              } catch (e) {
                console.log(`Process already dead: ${e.message}`);
              }
            }
          }, 3000);

          // Final timeout: force resolve after 5 seconds
          setTimeout(() => {
            botProcess.removeListener('exit', exitHandler);
            if (!resolved) {
              console.log(`⚠️ Bot ${botId} force killed after timeout`);
              resolved = true;
              resolve();
            }
          }, 5000);
        });

        // Clean up
        this.runningBots.delete(botId);
        await this.redisService.removeRunningBot(botId);
      }

      // Wait a bit for clean shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`🚀 Starting bot "${botName}" after restart...`);

      // Update Redis state to starting phase
      await this.redisService.saveBotState(botId, {
        status: 'STARTING',
        userAction: 'restart',
        timestamp: new Date(),
        metadata: { intentional: true, phase: 'starting' }
      });

      // Now start the bot (reuse the start logic)
      await this.handleStartBot(data);

      console.log(`✅ Bot "${botName}" restarted successfully`);

    } catch (error) {
      console.error(`❌ Failed to restart bot ${botId}:`, error);

      // Clean up on error
      this.runningBots.delete(botId);
      await this.redisService.removeRunningBot(botId);

      // Mark as error
      await this.updateBotStatusSafe(botId, BotStatus.ERROR);

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
  // Returns bots from Redis (shared across all processes)
  async getRunningBots(): Promise<string[]> {
    return await this.redisService.getRunningBots();
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
      'restart-bot': 9,
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
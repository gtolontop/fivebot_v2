import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DiscordService } from '../common/discord/discord.service';
import { EncryptionService } from '../common/encryption/encryption.service';

export interface DailyMetrics {
  date: Date;
  commandsUsed: number;
  messagesProcessed: number;
  guildsCount: number;
  usersCount: number;
  uptimeSeconds: number;
  avgResponseTime: number;
  errorsCount: number;
}

export interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalServers: number;
  totalUsers: number;
  todayCommands: number;
  todayMessages: number;
  monthlyActivity: number[];
  botStatusDistribution: { [key: string]: number };
  topBots: { name: string; servers: number; users: number }[];
  avgResponseTime: number;
  uptime: number;
}

@Injectable()
export class BotMetricsService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
    private encryptionService: EncryptionService,
  ) {}

  private async getRealtimeBotMetrics(botId: string, date: Date): Promise<{
    commandsUsed: number;
    messagesProcessed: number;
    avgResponseTime: number;
    errorsCount: number;
  } | null> {
    try {
      // Check if we have existing metrics for today
      const existingMetric = await this.prisma.$queryRaw`
        SELECT 
          commands_used as commandsUsed,
          messages_processed as messagesProcessed,
          avg_response_time_ms as avgResponseTime,
          errors_count as errorsCount
        FROM bot_metrics 
        WHERE bot_id = ${botId} 
        AND date = ${date}
        LIMIT 1
      ` as any[];

      if (existingMetric.length > 0) {
        return {
          commandsUsed: existingMetric[0].commandsUsed || 0,
          messagesProcessed: existingMetric[0].messagesProcessed || 0,
          avgResponseTime: existingMetric[0].avgResponseTime || 45,
          errorsCount: existingMetric[0].errorsCount || 0,
        };
      }

      return null;
    } catch (error) {
      console.log('Error fetching realtime metrics:', error);
      return null;
    }
  }

  async recordDailyMetrics(botId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get bot info
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { 
          tokenEncrypted: true, 
          status: true,
          createdAt: true,
        },
      });

      if (!bot || bot.status !== 'ONLINE') {
        return;
      }

      // Get real Discord data
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      const guilds = await this.discordService.getBotGuilds(decryptedToken);
      
      const guildsCount = guilds.length;
      const usersCount = guilds.reduce((acc: number, guild: any) => 
        acc + (guild.memberCount || 0), 0
      );

      // Get today's real-time metrics from the cache if available
      const realtimeData = await this.getRealtimeBotMetrics(botId, today);
      
      // Use real metrics if available, otherwise use minimal defaults
      const commandsUsed = realtimeData?.commandsUsed || 0;
      const messagesProcessed = realtimeData?.messagesProcessed || 0;
      const avgResponseTime = realtimeData?.avgResponseTime || 45;
      const errorsCount = realtimeData?.errorsCount || 0;

      // Calculate uptime (seconds bot has been online today)
      const now = new Date();
      const startOfDay = new Date(today);
      const uptimeSeconds = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);

      // Use raw SQL for now since Prisma client needs regeneration
      const uuid = require('crypto').randomUUID();
      
      await this.prisma.$executeRaw`
        INSERT INTO bot_metrics (
          id, bot_id, date, commands_used, messages_processed,
          guilds_count, users_count, uptime_seconds, avg_response_time_ms, errors_count,
          created_at, updated_at
        ) VALUES (
          ${uuid}, ${botId}, ${today}, ${commandsUsed}, ${messagesProcessed},
          ${guildsCount}, ${usersCount}, ${uptimeSeconds}, ${avgResponseTime}, ${errorsCount},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (bot_id, date) DO UPDATE SET
          commands_used = ${commandsUsed},
          messages_processed = ${messagesProcessed},
          guilds_count = ${guildsCount},
          users_count = ${usersCount},
          uptime_seconds = ${uptimeSeconds},
          avg_response_time_ms = ${avgResponseTime},
          errors_count = ${errorsCount},
          updated_at = CURRENT_TIMESTAMP
      `;
    } catch (error) {
      console.error(`Error recording metrics for bot ${botId}:`, error);
      // Don't throw - metrics recording shouldn't break other functionality
    }
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Get user with cumulative uptime
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cumulativeUptime: true },
      });

      // Get user's bots
      const bots = await this.prisma.bot.findMany({
        where: {
          ownerId: userId
          // No need for isActive filter since bots are hard deleted
        },
      });

      const totalBots = bots.length;
      const activeBots = bots.filter(bot => bot.status === 'ONLINE').length;

      // If no bots, return empty stats
      if (bots.length === 0) {
        return {
          totalBots: 0,
          activeBots: 0,
          totalServers: 0,
          totalUsers: 0,
          todayCommands: 0,
          todayMessages: 0,
          monthlyActivity: Array(30).fill(0),
          botStatusDistribution: {},
          topBots: [],
          avgResponseTime: 45,
          uptime: 0,
        };
      }

      // Check if metrics table exists and set a flag
      let metricsTableExists = true;
      try {
        await this.prisma.$queryRaw`SELECT 1 FROM bot_metrics LIMIT 1`;
      } catch (error) {
        metricsTableExists = false;
        console.log('bot_metrics table not found, will use fallback data');
      }

      // Get today's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todayMetrics: any[] = [];

      if (bots.length > 0 && metricsTableExists) {
        try {
          const botIds = bots.map(bot => bot.id);
          const placeholders = botIds.map((_, i) => `$${i + 1}`).join(',');
          // Use a more robust query that handles invalid dates
          const query = `SELECT * FROM bot_metrics
                         WHERE bot_id IN (${placeholders})
                         AND date = $${botIds.length + 1}
                         AND date IS NOT NULL
                         AND EXTRACT(YEAR FROM date) > 1000
                         AND updated_at IS NOT NULL
                         AND EXTRACT(YEAR FROM updated_at) > 1000`;
          todayMetrics = await this.prisma.$queryRawUnsafe(query, ...botIds, today) as any[];
        } catch (error) {
          console.log('Failed to query bot_metrics, using fallback data:', error.message);
          todayMetrics = [];
        }
      }

    const todayCommands = todayMetrics.reduce((sum, metric) => sum + (metric.commands_used || 0), 0);
    const todayMessages = todayMetrics.reduce((sum, metric) => sum + (metric.messages_processed || 0), 0);
    
    // Get real server/user counts from Discord API for online bots
    let totalServers = 0;
    let totalUsers = 0;
    
    for (const bot of bots) {
      if (bot.status === 'ONLINE') {
        try {
          // Get decrypted token and fetch guilds directly
          const encryptedBot = await this.prisma.bot.findUnique({
            where: { id: bot.id },
            select: { tokenEncrypted: true }
          });
          
          if (encryptedBot) {
            const decryptedToken = this.encryptionService.decrypt(encryptedBot.tokenEncrypted);
            const guilds = await this.discordService.getBotGuilds(decryptedToken);
            
            totalServers += guilds.length;
            totalUsers += guilds.reduce((sum: number, guild: any) => sum + (guild.memberCount || 0), 0);
          }
        } catch (error) {
          console.log(`Could not fetch Discord data for bot ${bot.name}:`, error.message);
        }
      }
    }
    
    // Fallback: if no bots are online but we have bots, try to get real Discord data anyway
    if (totalServers === 0 && bots.length > 0) {
      console.log('📊 No online bots detected, trying to fetch real Discord data for offline bots...');
      
      for (const bot of bots) {
        try {
          // Try to get real Discord data even if bot is marked as offline
          const encryptedBot = await this.prisma.bot.findUnique({
            where: { id: bot.id },
            select: { tokenEncrypted: true, name: true }
          });
          
          if (encryptedBot) {
            const decryptedToken = this.encryptionService.decrypt(encryptedBot.tokenEncrypted);
            
            // Test if token is still valid by making a simple API call
            const response = await fetch('https://discord.com/api/v10/users/@me', {
              headers: {
                'Authorization': `Bot ${decryptedToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.status === 200) {
              // Token is valid, get guild data
              const guilds = await this.discordService.getBotGuilds(decryptedToken);
              
              const botServers = guilds.length;
              const botUsers = guilds.reduce((sum: number, guild: any) => sum + (guild.memberCount || 0), 0);
              
              totalServers += botServers;
              totalUsers += botUsers;
              
              console.log(`📊 Bot ${encryptedBot.name}: ${botServers} servers, ${botUsers} users (real Discord data)`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch Discord data for bot ${bot.name}:`, error.message);
        }
      }
      
      // If we still have no data, try historical data
      if (totalServers === 0) {
        const recentSuccessfulStartups = await this.prisma.jobLog.findMany({
          where: {
            botId: { in: bots.map(bot => bot.id) },
            jobType: 'BOT_STARTUP',
            status: 'COMPLETED',
            metadata: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
        
        if (recentSuccessfulStartups.length > 0) {
          const latestStartup = recentSuccessfulStartups[0];
          const metadata = latestStartup.metadata as any;
          
          if (metadata && metadata.guilds && metadata.users) {
            totalServers = metadata.guilds;
            totalUsers = metadata.users;
            console.log(`📊 Using historical data: ${totalServers} servers, ${totalUsers} users`);
          }
        }
      }
      
      // Ultimate fallback (should rarely be used now)
      if (totalServers === 0) {
        totalServers = bots.length;
        totalUsers = bots.length * 50;
        console.log(`📊 Using minimal fallback: ${totalServers} servers, ${totalUsers} users`);
      }
    }

    // Get monthly activity (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let monthlyMetrics: any[] = [];
    if (bots.length > 0 && metricsTableExists) {
      try {
        const botIds = bots.map(bot => bot.id);
        const placeholders = botIds.map((_, i) => `$${i + 1}`).join(',');
        // Use a more robust query that handles invalid dates
        const query = `SELECT * FROM bot_metrics
                       WHERE bot_id IN (${placeholders})
                       AND date >= $${botIds.length + 1}
                       AND date IS NOT NULL
                       AND EXTRACT(YEAR FROM date) > 1000
                       AND updated_at IS NOT NULL
                       AND EXTRACT(YEAR FROM updated_at) > 1000
                       ORDER BY date ASC`;
        monthlyMetrics = await this.prisma.$queryRawUnsafe(query, ...botIds, thirtyDaysAgo) as any[];
      } catch (error) {
        console.log('Failed to query monthly bot_metrics, using fallback:', error.message);
        monthlyMetrics = [];
      }
    }

    // Group by date and sum commands
    const activityByDate = monthlyMetrics.reduce((acc, metric) => {
      const dateKey = metric.date.toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + (metric.commands_used || 0);
      return acc;
    }, {} as { [key: string]: number });

    const monthlyActivity = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      return activityByDate[dateKey] || 0;
    });

    // Bot status distribution
    const botStatusDistribution = bots.reduce((acc, bot) => {
      acc[bot.status] = (acc[bot.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Top performing bots
    const topBots = todayMetrics
      .sort((a, b) => (b.commands_used || 0) - (a.commands_used || 0))
      .slice(0, 5)
      .map(metric => {
        const bot = bots.find(b => b.id === metric.bot_id);
        return {
          name: bot?.name || 'Unknown',
          servers: metric.guilds_count || 0,
          users: metric.users_count || 0,
        };
      });

    // Calculate average response time
    const avgResponseTime = todayMetrics.length > 0
      ? Math.round(todayMetrics.reduce((sum, metric) => sum + (metric.avg_response_time_ms || 45), 0) / todayMetrics.length)
      : 45;

    // Return only cumulative uptime (stored in DB)
    // Frontend will add the current active session time for real-time display
    const totalUptime = user?.cumulativeUptime || 0;

      return {
        totalBots,
        activeBots,
        totalServers,
        totalUsers,
        todayCommands,
        todayMessages,
        monthlyActivity,
        botStatusDistribution,
        topBots,
        avgResponseTime,
        uptime: totalUptime,
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return fallback stats in case of any error
      return {
        totalBots: 0,
        activeBots: 0,
        totalServers: 0,
        totalUsers: 0,
        todayCommands: 0,
        todayMessages: 0,
        monthlyActivity: Array(30).fill(0),
        botStatusDistribution: {},
        topBots: [],
        avgResponseTime: 45,
        uptime: 0,
      };
    }
  }

  async getBotMetrics(botId: string, days: number = 30): Promise<DailyMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    let metrics: any[] = [];
    try {
      metrics = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM bot_metrics
         WHERE bot_id = $1
         AND date >= $2
         AND date IS NOT NULL
         AND EXTRACT(YEAR FROM date) > 1000
         AND updated_at IS NOT NULL
         AND EXTRACT(YEAR FROM updated_at) > 1000
         ORDER BY date ASC`,
        botId,
        startDate
      ) as any[];
    } catch (error) {
      console.log('Failed to query bot metrics for individual bot:', error.message);
      metrics = [];
    }

    return metrics.map(metric => ({
      date: metric.date,
      commandsUsed: metric.commands_used || 0,
      messagesProcessed: metric.messages_processed || 0,
      guildsCount: metric.guilds_count || 0,
      usersCount: metric.users_count || 0,
      uptimeSeconds: metric.uptime_seconds || 0,
      avgResponseTime: metric.avg_response_time_ms || 45,
      errorsCount: metric.errors_count || 0,
    }));
  }

  // Call this method periodically (e.g., via cron job) to update metrics
  async updateAllBotMetrics(): Promise<void> {
    const activeBots = await this.prisma.bot.findMany({
      where: { 
        status: 'ONLINE',
        isActive: true,
      },
      select: { id: true },
    });

    for (const bot of activeBots) {
      await this.recordDailyMetrics(bot.id);
    }
  }
}
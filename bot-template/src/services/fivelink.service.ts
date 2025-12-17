/**
 * FiveLink API Service
 * Handles all API calls to FiveLink with caching
 */

import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';

export interface FiveLinkConfig {
  apiKey: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface FiveLinkProfile {
  id: string;
  slug: string;
  alias?: string;
  customId?: number;
  displayName: string;
  pageTitle?: string;
  avatar?: string;
  theme: string;
  views: number;
  published: boolean;
  createdAt: string;
}

export interface FiveLinkUser {
  id: string;
  name?: string;
  image?: string;
  role: string;
  createdAt: string;
}

export interface FiveLinkStats {
  mediaUploads: number;
  totalBadges: number;
  totalClicks: number;
}

export interface FiveLinkBadge {
  badge?: {
    key: string;
    name: string;
    icon: string;
    color?: string;
  };
  customName?: string;
  customIcon?: string;
  customColor?: string;
}

export interface FiveLinkLeaderboardEntry {
  rank: number;
  profileId: string;
  slug: string;
  alias?: string;
  customId?: number;
  displayName: string;
  avatar?: string;
  value: number;
  metric: string;
  createdAt: string;
}

export interface FiveLinkGlobalStats {
  allTime: {
    totalProfiles: number;
    totalViews: number;
    totalClicks: number;
    totalUsers: number;
    activeProfiles: number;
  };
  last24Hours: {
    views: number;
    clicks: number;
    newProfiles: number;
  };
}

export class FiveLinkService {
  private api: AxiosInstance;
  private redis: Redis;
  private config: FiveLinkConfig;

  constructor(config: FiveLinkConfig, redis: Redis) {
    this.config = config;
    this.redis = redis;

    this.api = axios.create({
      baseURL: 'https://fivelink.lol/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // Increased to 30s
      // Force IPv4 and add retry logic
      httpAgent: new (require('http').Agent)({
        family: 4,
        keepAlive: true,
        keepAliveMsecs: 1000,
      }),
      httpsAgent: new (require('https').Agent)({
        family: 4,
        keepAlive: true,
        keepAliveMsecs: 1000,
        rejectUnauthorized: true,
      }),
    });

    // Add response interceptor for better error handling
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;

        // Retry on network errors (max 3 attempts)
        if (!config || !config.retry) {
          config.retry = 0;
        }

        const shouldRetry =
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENETUNREACH' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND';

        if (shouldRetry && config.retry < 3) {
          config.retry += 1;
          console.log(`[FiveLink] Retry attempt ${config.retry}/3 for ${config.url}`);

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * config.retry));

          return this.api.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get from cache or fetch from API
   */
  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    noCache = false
  ): Promise<T> {
    // Check cache if enabled
    if (this.config.cacheEnabled && !noCache) {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Fetch from API
    const data = await fetcher();

    // Cache if enabled
    if (this.config.cacheEnabled && !noCache) {
      await this.redis.setex(key, this.config.cacheTTL, JSON.stringify(data));
    }

    return data;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    type: 'views' | 'clicks' | 'customId' | 'badges' | 'mediaUploads',
    limit = 10,
    offset = 0
  ): Promise<FiveLinkLeaderboardEntry[]> {
    const cacheKey = `fivelink:leaderboard:${type}:${limit}:${offset}`;

    return this.getCached(cacheKey, async () => {
      const response = await this.api.get('/stats/leaderboard', {
        params: { type, limit, offset },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch leaderboard');
      }

      return response.data.data.leaderboard;
    });
  }

  /**
   * Get user by Discord ID
   */
  async getUserByDiscordId(
    discordId: string
  ): Promise<{
    user: FiveLinkUser;
    profile: FiveLinkProfile | null;
    stats: FiveLinkStats;
    badges: FiveLinkBadge[];
    discord: { id: string; linked: boolean };
  } | null> {
    const cacheKey = `fivelink:user:discord:${discordId}`;

    try {
      return await this.getCached(cacheKey, async () => {
        const response = await this.api.get(`/users/discord/${discordId}`);

        if (!response.data.success) {
          return null;
        }

        return response.data.data;
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get profile by username (slug or alias)
   */
  async getProfile(username: string): Promise<{
    profile: FiveLinkProfile;
    owner: {
      id: string;
      name?: string;
      image?: string;
      badges: FiveLinkBadge[];
    };
    stats: {
      views: number;
      clicks: number;
      mediaUploads: number;
    };
  } | null> {
    const cacheKey = `fivelink:profile:${username.toLowerCase()}`;

    try {
      return await this.getCached(cacheKey, async () => {
        const response = await this.api.get(`/profiles/${username}`);

        if (!response.data.success) {
          return null;
        }

        return response.data.data;
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get global stats
   */
  async getGlobalStats(): Promise<FiveLinkGlobalStats> {
    const cacheKey = 'fivelink:stats:global';

    // Use shorter cache for global stats (5 minutes)
    const data = await this.getCached(
      cacheKey,
      async () => {
        const response = await this.api.get('/stats/global');

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch global stats');
        }

        return response.data.data;
      },
      false
    );

    // Override cache TTL for global stats (5 minutes)
    if (this.config.cacheEnabled) {
      await this.redis.setex(cacheKey, 300, JSON.stringify(data));
    }

    return data;
  }

  /**
   * Clear cache for a specific key or pattern
   */
  async clearCache(pattern?: string): Promise<void> {
    if (!pattern) {
      // Clear all FiveLink cache
      const keys = await this.redis.keys('fivelink:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      // Clear specific pattern
      const keys = await this.redis.keys(`fivelink:${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.api.post('/auth/validate');
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }


  /**
   * Grant a badge to a user by Discord ID
   * Uses the admin API endpoint (not v1 API)
   */
  async grantBadge(discordId: string, badgeKey: string, reason?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    alreadyHad?: boolean;
  }> {
    try {
      const response = await axios.post(
        'https://fivelink.lol/api/admin/badges/grant',
        {
          discordId,
          badgeKey,
          reason: reason || 'Granted automatically by FiveBot',
          grantedBy: 'FiveBot',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: response.data.message,
        alreadyHad: response.data.badge?.alreadyHad,
      };
    } catch (error: any) {
      console.error('[FiveLink] Error granting badge:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Revoke a badge from a user by Discord ID
   * Uses the admin API endpoint (not v1 API)
   */
  async revokeBadge(discordId: string, badgeKey: string, reason?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    hadBadge?: boolean;
  }> {
    try {
      const response = await axios.post(
        'https://fivelink.lol/api/admin/badges/revoke',
        {
          discordId,
          badgeKey,
          reason: reason || 'Revoked automatically by FiveBot',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: response.data.message,
        hadBadge: response.data.badge?.hadBadge,
      };
    } catch (error: any) {
      console.error('[FiveLink] Error revoking badge:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Grant Discord Booster badge
   */
  async grantBoosterBadge(discordId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    alreadyHad?: boolean;
  }> {
    return this.grantBadge(discordId, 'discord-booster', 'Boosting the Discord server');
  }

  /**
   * Revoke Discord Booster badge
   */
  async revokeBoosterBadge(discordId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    hadBadge?: boolean;
  }> {
    return this.revokeBadge(discordId, 'discord-booster', 'No longer boosting the Discord server');
  }
}
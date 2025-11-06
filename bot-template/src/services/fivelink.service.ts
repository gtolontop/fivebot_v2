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
      timeout: 10000,
    });
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
}

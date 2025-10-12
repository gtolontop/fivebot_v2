import { Injectable } from '@nestjs/common';

interface CacheItem {
  data: any;
  expiresAt: number;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

@Injectable()
export class CacheService {
  private cache: Map<string, CacheItem> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  
  // Default cache TTL (5 minutes)
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  
  // Rate limit settings (per endpoint)
  private readonly RATE_LIMITS = {
    'discord_guilds': { maxRequests: 1, windowMs: 60 * 1000 }, // 1 request per minute
    'discord_channels': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute  
    'discord_roles': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  };

  set(key: string, data: any, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.DEFAULT_TTL);
    this.cache.set(key, { data, expiresAt });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete rate limit for a specific endpoint and identifier
   */
  deleteRateLimit(endpoint: string, identifier?: string): boolean {
    const key = identifier ? `${endpoint}:${identifier}` : endpoint;
    return this.rateLimits.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.rateLimits.clear();
  }

  // Get cache keys matching pattern
  getKeys(pattern: string): string[] {
    const keys: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keys.push(key);
      }
    }
    return keys;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    // Clean expired rate limits
    for (const [key, info] of this.rateLimits.entries()) {
      if (now > info.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }

  // Rate limiting methods
  canMakeRequest(endpoint: string, identifier?: string): boolean {
    const key = identifier ? `${endpoint}:${identifier}` : endpoint;
    const now = Date.now();
    const rateLimitInfo = this.rateLimits.get(key);
    const rateLimit = this.RATE_LIMITS[endpoint];

    if (!rateLimit) {
      return true; // No rate limit defined
    }

    if (!rateLimitInfo) {
      // First request
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + rateLimit.windowMs
      });
      return true;
    }

    // Check if window has reset
    if (now > rateLimitInfo.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + rateLimit.windowMs
      });
      return true;
    }

    // Check if under limit
    if (rateLimitInfo.count < rateLimit.maxRequests) {
      rateLimitInfo.count++;
      return true;
    }

    return false; // Rate limited
  }

  getRateLimitInfo(endpoint: string, identifier?: string): { canRequest: boolean; resetIn?: number } {
    const key = identifier ? `${endpoint}:${identifier}` : endpoint;
    const now = Date.now();
    const rateLimitInfo = this.rateLimits.get(key);

    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      return { canRequest: true };
    }

    const rateLimit = this.RATE_LIMITS[endpoint];
    if (!rateLimit) {
      return { canRequest: true };
    }

    const canRequest = rateLimitInfo.count < rateLimit.maxRequests;
    const resetIn = rateLimitInfo.resetTime - now;

    return { canRequest, resetIn };
  }

  // Utility method to create cache keys
  createKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      rateLimitEntries: this.rateLimits.size
    };
  }
}
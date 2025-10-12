import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string;
  accent_color?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

interface DiscordApplication {
  id: string;
  name: string;
  icon?: string;
  description: string;
  bot_public: boolean;
  bot_require_code_grant: boolean;
  terms_of_service_url?: string;
  privacy_policy_url?: string;
  owner: DiscordUser;
  verify_key: string;
}

@Injectable()
export class DiscordService {
  private readonly baseURL = 'https://discord.com/api/v10';

  constructor(private cacheService: CacheService) {}

  /**
   * Invalidate all Discord cache for a specific bot
   * Call this when bot status changes or when fresh data is needed
   */
  invalidateBotCache(botToken: string): void {
    const tokenPrefix = botToken.substring(0, 10);

    // Clear guilds cache
    const guildsKey = this.cacheService.createKey('discord_guilds', tokenPrefix);
    this.cacheService.delete(guildsKey);

    // Clear rate limits to allow immediate fresh fetch
    this.cacheService.deleteRateLimit('discord_guilds', tokenPrefix);

    console.log(`🗑️ Invalidated Discord cache and rate limit for bot ${tokenPrefix}`);
  }

  /**
   * Invalidate cache for a specific guild (channels, roles)
   */
  invalidateGuildCache(guildId: string): void {
    const channelsKey = this.cacheService.createKey('discord_channels', guildId);
    const rolesKey = this.cacheService.createKey('discord_roles', guildId);

    this.cacheService.delete(channelsKey);
    this.cacheService.delete(rolesKey);

    // Clear rate limits
    this.cacheService.deleteRateLimit('discord_channels', guildId);
    this.cacheService.deleteRateLimit('discord_roles', guildId);

    console.log(`🗑️ Invalidated cache and rate limits for guild ${guildId}`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delayMs = retryAfter ? parseFloat(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
          
          console.log(`Rate limited, waiting ${delayMs}ms before retry ${attempt + 1}/${maxRetries}`);
          await this.delay(delayMs);
          continue;
        }
        
        // If not a rate limit error, don't retry
        throw error;
      }
    }
    
    throw lastError;
  }

  async validateBotToken(token: string): Promise<{
    isValid: boolean;
    user?: DiscordUser;
    application?: DiscordApplication;
    error?: string;
  }> {
    try {
      console.log('Discord API: Validation du token...');
      
      // Test the token by fetching bot user info
      const userResponse = await axios.get<DiscordUser>(`${this.baseURL}/users/@me`, {
        headers: {
          Authorization: `Bot ${token}`,
        },
        timeout: 10000,
      });

      console.log('Discord API: Réponse user obtenue');

      const user = userResponse.data;

      // Verify it's actually a bot account
      if (!user.bot) {
        return {
          isValid: false,
          error: 'Token is not a bot token. Only bot tokens are allowed.',
        };
      }

      // Get application info
      const appResponse = await axios.get<DiscordApplication>(
        `${this.baseURL}/applications/@me`,
        {
          headers: {
            Authorization: `Bot ${token}`,
          },
          timeout: 10000,
        },
      );

      return {
        isValid: true,
        user,
        application: appResponse.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            isValid: false,
            error: 'Invalid bot token provided',
          };
        }
        if (error.response?.status === 403) {
          return {
            isValid: false,
            error: 'Bot token does not have required permissions',
          };
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          return {
            isValid: false,
            error: 'Unable to connect to Discord API',
          };
        }
      }

      return {
        isValid: false,
        error: 'Failed to validate token with Discord API',
      };
    }
  }

  generateInviteUrl(clientId: string, permissions?: string): string {
    const baseUrl = 'https://discord.com/api/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'bot applications.commands',
      permissions: permissions || '8', // Administrator permission by default
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await axios.get<DiscordUser>(`${this.baseURL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new HttpException('Invalid access token', HttpStatus.UNAUTHORIZED);
        }
      }
      throw new HttpException(
        'Failed to fetch user info from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getBotGuilds(botToken: string): Promise<any[]> {
    const cacheKey = this.cacheService.createKey('discord_guilds', botToken.substring(0, 10));
    
    // Check cache first
    const cached = this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      console.log('Returning cached guild data');
      return cached;
    }

    // Check rate limit
    if (!this.cacheService.canMakeRequest('discord_guilds', botToken.substring(0, 10))) {
      const rateLimitInfo = this.cacheService.getRateLimitInfo('discord_guilds', botToken.substring(0, 10));
      console.log(`Rate limited for guild request, retry in ${rateLimitInfo.resetIn}ms`);
      
      // Return empty array or throw with retry info
      throw new HttpException(
        `Rate limited. Try again in ${Math.ceil(rateLimitInfo.resetIn! / 1000)} seconds`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    try {
      const guilds = await this.retryWithBackoff(async () => {
        const response = await axios.get(`${this.baseURL}/users/@me/guilds`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          timeout: 15000,
        });

        // Get additional guild info including member count for each guild
        const guildsWithDetails = await Promise.all(
          response.data.map(async (guild: any) => {
            try {
              // Get guild details with approximate_member_count
              const guildResponse = await axios.get(`${this.baseURL}/guilds/${guild.id}?with_counts=true`, {
                headers: {
                  Authorization: `Bot ${botToken}`,
                },
                timeout: 5000,
              });

              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                owner: guild.owner,
                permissions: guild.permissions,
                memberCount: guildResponse.data.approximate_member_count || 0
              };
            } catch (error) {
              // If we can't get guild details, return basic info
              console.warn(`Failed to get member count for guild ${guild.id}:`, error.message);
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                owner: guild.owner,
                permissions: guild.permissions,
                memberCount: 0
              };
            }
          })
        );

        return guildsWithDetails;
      });

      // Cache the result for 1 minute (reduced from 10 minutes for fresher data)
      this.cacheService.set(cacheKey, guilds, 1 * 60 * 1000);
      console.log(`Cached ${guilds.length} guilds`);
      
      return guilds;
    } catch (error) {
      console.error('Error fetching bot guilds:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'Discord API rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      throw new HttpException(
        'Failed to fetch bot guilds from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getGuildChannels(botToken: string, guildId: string): Promise<any[]> {
    const cacheKey = this.cacheService.createKey('discord_channels', guildId);
    
    // Check cache first
    const cached = this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    if (!this.cacheService.canMakeRequest('discord_channels', guildId)) {
      const rateLimitInfo = this.cacheService.getRateLimitInfo('discord_channels', guildId);
      throw new HttpException(
        `Rate limited. Try again in ${Math.ceil(rateLimitInfo.resetIn! / 1000)} seconds`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    try {
      const channels = await this.retryWithBackoff(async () => {
        const response = await axios.get(`${this.baseURL}/guilds/${guildId}/channels`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          timeout: 15000,
        });

        return response.data.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position,
          parent_id: channel.parent_id,
        }));
      });

      // Cache for 1 minute (reduced for fresher data)
      this.cacheService.set(cacheKey, channels, 1 * 60 * 1000);
      return channels;
    } catch (error) {
      console.error('Error fetching guild channels:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'Discord API rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      throw new HttpException(
        'Failed to fetch guild channels from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getGuildRoles(botToken: string, guildId: string): Promise<any[]> {
    const cacheKey = this.cacheService.createKey('discord_roles', guildId);
    
    // Check cache first
    const cached = this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    if (!this.cacheService.canMakeRequest('discord_roles', guildId)) {
      const rateLimitInfo = this.cacheService.getRateLimitInfo('discord_roles', guildId);
      throw new HttpException(
        `Rate limited. Try again in ${Math.ceil(rateLimitInfo.resetIn! / 1000)} seconds`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    try {
      // Get bot user info first to find bot's member
      const botUser = await axios.get(`${this.baseURL}/users/@me`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        timeout: 15000,
      });

      const botId = botUser.data.id;

      // Get bot's member info in the guild to find its highest role
      let botHighestRolePosition = 0;
      try {
        const botMember = await axios.get(`${this.baseURL}/guilds/${guildId}/members/${botId}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          timeout: 15000,
        });

        // Get all roles first to find positions
        const rolesResponse = await axios.get(`${this.baseURL}/guilds/${guildId}/roles`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          timeout: 15000,
        });

        const allRoles = rolesResponse.data;
        const botRoleIds = botMember.data.roles;

        // Find the highest position among bot's roles
        botHighestRolePosition = Math.max(
          ...botRoleIds.map((roleId: string) => {
            const role = allRoles.find((r: any) => r.id === roleId);
            return role ? role.position : 0;
          })
        );
      } catch (memberError) {
        console.warn('Could not fetch bot member info, assuming no role management permissions');
      }

      const roles = await this.retryWithBackoff(async () => {
        const response = await axios.get(`${this.baseURL}/guilds/${guildId}/roles`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          timeout: 15000,
        });

        return response.data.map((role: any) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          permissions: role.permissions,
          managed: role.managed,
          mentionable: role.mentionable,
          canAssign: role.position < botHighestRolePosition && !role.managed && role.name !== '@everyone',
        }));
      });

      // Cache for 1 minute (reduced for fresher data)
      this.cacheService.set(cacheKey, roles, 1 * 60 * 1000);
      return roles;
    } catch (error) {
      console.error('Error fetching guild roles:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'Discord API rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      throw new HttpException(
        'Failed to fetch guild roles from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Method to clear cache for a specific bot
  clearBotCache(botToken: string): void {
    const tokenPrefix = botToken.substring(0, 10);
    const keys = this.cacheService.getKeys(`discord_guilds:${tokenPrefix}`);
    keys.forEach(key => this.cacheService.delete(key));
  }

  // Method to get cache stats
  getCacheStats() {
    return this.cacheService.getStats();
  }

  // Method to cleanup expired cache entries
  cleanupCache(): void {
    this.cacheService.cleanup();
  }
}
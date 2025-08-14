import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

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
    try {
      const response = await axios.get(`${this.baseURL}/users/@me/guilds`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        timeout: 10000,
      });

      return response.data.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        permissions: guild.permissions,
      }));
    } catch (error) {
      console.error('Error fetching bot guilds:', error);
      throw new HttpException(
        'Failed to fetch bot guilds from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getGuildChannels(botToken: string, guildId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/guilds/${guildId}/channels`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        timeout: 10000,
      });

      return response.data.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parent_id: channel.parent_id,
      }));
    } catch (error) {
      console.error('Error fetching guild channels:', error);
      throw new HttpException(
        'Failed to fetch guild channels from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getGuildRoles(botToken: string, guildId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/guilds/${guildId}/roles`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        timeout: 10000,
      });

      return response.data.map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions,
        managed: role.managed,
        mentionable: role.mentionable,
      }));
    } catch (error) {
      console.error('Error fetching guild roles:', error);
      throw new HttpException(
        'Failed to fetch guild roles from Discord',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
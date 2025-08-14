import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-discord';

import { AuthService } from '../auth.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.get('DISCORD_CLIENT_ID'),
      clientSecret: configService.get('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.get('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const discordUser = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
    };

    return await this.authService.validateDiscordUser(discordUser);
  }
}
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

import { UsersService } from '../users/users.service';

interface DiscordUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiry?: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async validateDiscordUser(discordUser: DiscordUser): Promise<User> {
    let user = await this.usersService.findByDiscordId(discordUser.id);

    if (!user) {
      user = await this.usersService.create({
        discordId: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar,
      });
    } else {
      // Update user info if changed
      user = await this.usersService.update(user.id, {
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar,
      });
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      discordId: user.discordId,
      username: user.username,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        credits: user.credits,
      },
    };
  }

  async validateJwtPayload(payload: any): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }
}
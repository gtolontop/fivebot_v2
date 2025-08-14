import { Controller, Get, Post, UseGuards, Req, Res, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('discord')
  async discordAuth(@Res() res: Response) {
    const clientId = this.configService.get('DISCORD_CLIENT_ID');
    const redirectUri = this.configService.get('DISCORD_CALLBACK_URL');
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?response_type=code&client_id=${clientId}&scope=identify%20email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    res.redirect(discordAuthUrl);
  }

  @Get('discord/callback')
  async discordCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      console.log('Discord callback - code received:', !!code);
      
      if (!code) {
        throw new Error('No code provided by Discord');
      }

      // Exchange code for Discord access token
      const discordTokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.configService.get('DISCORD_CLIENT_ID'),
          client_secret: this.configService.get('DISCORD_CLIENT_SECRET'),
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.configService.get('DISCORD_CALLBACK_URL'),
        }),
      });

      const discordTokens = await discordTokenResponse.json();
      console.log('Discord tokens received:', !!discordTokens.access_token);

      if (!discordTokens.access_token) {
        throw new Error('Failed to get Discord access token');
      }

      // Get Discord user info
      const discordUserResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${discordTokens.access_token}`,
        },
      });

      const discordUser = await discordUserResponse.json();
      console.log('Discord user received:', discordUser.username);

      // Validate and create/update user in our database
      const user = await this.authService.validateDiscordUser({
        id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar,
      });

      // Generate our JWT token
      const result = await this.authService.login(user);
      console.log('JWT token generated:', !!result.access_token);
      
      // Redirect to frontend with token
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/api/auth/discord/callback?token=${result.access_token}`);
    } catch (error) {
      console.error('Discord callback error:', error);
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/api/auth/discord/callback?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res() res: Response) {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: any) {
    return {
      user: {
        id: req.user.id,
        discordId: req.user.discordId,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        credits: req.user.credits,
      },
    };
  }
}
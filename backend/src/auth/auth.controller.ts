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
    
    console.log('Discord Auth - Client ID:', clientId);
    console.log('Discord Auth - Redirect URI:', redirectUri);
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?response_type=code&client_id=${clientId}&scope=identify%20email%20guilds&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('Discord Auth URL:', discordAuthUrl);
    res.redirect(discordAuthUrl);
  }

  @Get('discord/callback')
  async discordCallback(@Query('code') code: string, @Query('error') error: string, @Query('error_description') errorDescription: string, @Res() res: Response) {
    try {
      console.log('Discord callback - code received:', !!code);
      console.log('Discord callback - error:', error);
      
      if (error) {
        console.error('Discord OAuth error:', error, errorDescription);
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/auth/discord/callback?error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        console.error('No code provided by Discord');
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/auth/discord/callback?error=${encodeURIComponent('authorization_failed')}`);
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

      // Calculate token expiry (Discord tokens expire in seconds)
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + discordTokens.expires_in);

      // Validate and create/update user in our database
      const user = await this.authService.validateDiscordUser({
        id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar,
        discordAccessToken: discordTokens.access_token,
        discordRefreshToken: discordTokens.refresh_token,
        discordTokenExpiry: tokenExpiry,
      });

      // Generate our JWT token
      const result = await this.authService.login(user);
      console.log('JWT token generated:', !!result.access_token);
      
      // Redirect to frontend with token
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/discord/callback?token=${result.access_token}`);
    } catch (error) {
      console.error('Discord callback error:', error);
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/discord/callback?error=${encodeURIComponent('authentication_failed')}`);
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

  @Get('debug/set-token')
  async setDebugToken(@Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTRlNzFmNi03ZmY2LTQyMjMtYTZkOS0xYWJkNGZjYjRjOWIiLCJkaXNjb3JkSWQiOiI3NDY3MDA5MDcyNDg0ODQzOTMiLCJ1c2VybmFtZSI6Imd0b2wiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1NTI5OTc4MiwiZXhwIjoxNzU1OTA0NTgyfQ.jkxsIjwGyfKdgAdiSu4KTzacvXFk6LYAkMDpPNtf1MI";
    res.redirect(`${frontendUrl}/auth/discord/callback?token=${token}`);
  }
}
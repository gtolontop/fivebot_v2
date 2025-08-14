import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
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
  @UseGuards(AuthGuard('discord'))
  async discordAuth() {
    // Initiates Discord OAuth2 flow
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.login(req.user);
    
    // Redirect to frontend with token
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
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
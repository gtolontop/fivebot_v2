import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole, CreditType } from '@prisma/client';

import { CreditsService } from './credits.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

interface AddCreditsDto {
  amount: number;
  reason: string;
  type?: CreditType;
  metadata?: any;
}

@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('me')
  async getMyBalance(@Req() req: any) {
    return this.creditsService.getUserBalance(req.user.id);
  }

  @Get('me/history')
  async getMyHistory(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.creditsService.getUserCreditsHistory(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getStats() {
    return this.creditsService.getCreditStats();
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getAllHistory(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.creditsService.getAllCreditsHistory(
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('users/:userId/history')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getUserHistory(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.creditsService.getUserCreditsHistory(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('users/:userId/add')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async addCreditsToUser(
    @Param('userId') userId: string,
    @Body() data: AddCreditsDto,
  ) {
    return this.creditsService.addCreditsToUser(
      userId,
      data.amount,
      data.reason,
      data.type || CreditType.ADMIN_ADJUSTMENT,
      data.metadata,
    );
  }

  @Get('users/:userId/balance')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getUserBalance(@Param('userId') userId: string) {
    return this.creditsService.getUserBalance(userId);
  }
}
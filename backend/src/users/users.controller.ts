import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: UserRole;
}

interface AddCreditsDto {
  amount: number;
  reason: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() updateData: UpdateUserDto) {
    // Users can only update their own username and email
    const allowedFields = { username: updateData.username, email: updateData.email };
    return this.usersService.update(req.user.id, allowedFields);
  }

  @Get('me/guilds')
  async getMyGuilds(@Req() req: any) {
    return this.usersService.getUserGuilds(req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async update(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
    return this.usersService.update(id, updateData);
  }

  @Post(':id/credits')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async addCredits(@Param('id') id: string, @Body() data: AddCreditsDto) {
    return this.usersService.addCredits(id, data.amount, data.reason);
  }
}
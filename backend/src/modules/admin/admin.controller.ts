import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ==================== USERS ====================

  @Get('users')
  async getAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllUsers({
      search,
      role,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.adminService.updateUserRole(id, role);
  }

  @Post('users/:id/credits')
  async adjustUserCredits(
    @Request() req,
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.adjustUserCredits(id, amount, reason, req.user.id);
  }

  // ==================== BOTS ====================

  @Get('bots')
  async getAllBots(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllBots({
      search,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('bots/:id')
  async getBotById(@Param('id') id: string) {
    return this.adminService.getBotById(id);
  }

  // ==================== MODULES ====================

  @Get('modules')
  async getAllModules() {
    return this.adminService.getAllModulesAdmin();
  }

  @Post('modules')
  async createModule(@Body() data: any) {
    return this.adminService.createModule(data);
  }

  @Patch('modules/:id')
  async updateModule(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateModule(id, data);
  }

  @Patch('modules/:id/toggle')
  async toggleModule(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.toggleModuleActive(id, isActive);
  }

  // ==================== TRANSACTIONS ====================

  @Get('transactions')
  async getAllTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllTransactions({
      userId,
      type,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}

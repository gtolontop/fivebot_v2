import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ModulesService } from './modules.service';
import { ModuleCategory } from '@prisma/client';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  // ==================== PUBLIC ROUTES ====================

  @Get()
  async getAllModules(
    @Query('category') category?: ModuleCategory,
    @Query('search') search?: string,
    @Query('isCore') isCore?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
  ) {
    return this.modulesService.findAll({
      category,
      search,
      isCore: isCore === 'true' ? true : isCore === 'false' ? false : undefined,
      priceMin: priceMin ? parseInt(priceMin) : undefined,
      priceMax: priceMax ? parseInt(priceMax) : undefined,
    });
  }

  @Get(':slug')
  async getModuleBySlug(@Param('slug') slug: string) {
    return this.modulesService.findBySlug(slug);
  }

  // ==================== USER MODULE ROUTES (AUTHENTICATED) ====================

  @UseGuards(AuthGuard('jwt'))
  @Get('user/owned')
  async getUserModules(@Request() req) {
    return this.modulesService.getUserModules(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/purchase')
  async purchaseModule(@Request() req, @Param('id') moduleId: string) {
    return this.modulesService.purchaseModule(req.user.id, moduleId);
  }

  // ==================== BOT MODULE ROUTES (AUTHENTICATED) ====================

  @UseGuards(AuthGuard('jwt'))
  @Get('bots/:botId')
  async getBotModules(@Param('botId') botId: string) {
    return this.modulesService.getBotModules(botId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('bots/:botId/:moduleId')
  async getBotModule(@Param('botId') botId: string, @Param('moduleId') moduleId: string) {
    return this.modulesService.getBotModule(botId, moduleId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('bots/:botId/:moduleId/install')
  async installModule(
    @Request() req,
    @Param('botId') botId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.modulesService.installModuleOnBot(req.user.id, botId, moduleId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('bots/:botId/:moduleId')
  async uninstallModule(
    @Request() req,
    @Param('botId') botId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.modulesService.uninstallModuleFromBot(req.user.id, botId, moduleId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('bots/:botId/:moduleId/toggle')
  async toggleModule(
    @Request() req,
    @Param('botId') botId: string,
    @Param('moduleId') moduleId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.modulesService.toggleModuleOnBot(req.user.id, botId, moduleId, enabled);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('bots/:botId/:moduleId/config')
  async updateModuleConfig(
    @Request() req,
    @Param('botId') botId: string,
    @Param('moduleId') moduleId: string,
    @Body('config') config: any,
  ) {
    return this.modulesService.updateBotModuleConfig(req.user.id, botId, moduleId, config);
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReactionRolesService } from './reaction-roles.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('reaction-roles')
@UseGuards(JwtAuthGuard)
export class ReactionRolesController {
  constructor(private readonly reactionRolesService: ReactionRolesService) {}

  @Get('config/:guildId')
  async getConfig(@Param('guildId') guildId: string, @Query('botId') botId: string) {
    return this.reactionRolesService.getConfig(guildId, botId);
  }

  @Put('config/:guildId')
  async updateConfig(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: { enabled?: boolean; dmOnRole?: boolean; logChannelId?: string }
  ) {
    return this.reactionRolesService.updateConfig(guildId, botId, dto);
  }

  @Post('panels/:guildId')
  async createPanel(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: any
  ) {
    return this.reactionRolesService.createPanel(guildId, botId, dto);
  }

  @Get('panels/:panelId')
  async getPanel(@Param('panelId') panelId: string) {
    return this.reactionRolesService.getPanel(panelId);
  }

  @Get('panels/message/:messageId')
  async getPanelByMessage(@Param('messageId') messageId: string) {
    return this.reactionRolesService.getPanelByMessage(messageId);
  }

  @Put('panels/:panelId')
  async updatePanel(@Param('panelId') panelId: string, @Body() dto: any) {
    return this.reactionRolesService.updatePanel(panelId, dto);
  }

  @Delete('panels/:panelId')
  async deletePanel(@Param('panelId') panelId: string) {
    return this.reactionRolesService.deletePanel(panelId);
  }

  @Post('panels/:panelId/roles')
  async addRole(@Param('panelId') panelId: string, @Body() dto: any) {
    return this.reactionRolesService.addRole(panelId, dto);
  }

  @Put('roles/:roleId')
  async updateRole(@Param('roleId') roleId: string, @Body() dto: any) {
    return this.reactionRolesService.updateRole(roleId, dto);
  }

  @Delete('roles/:roleId')
  async removeRole(@Param('roleId') roleId: string) {
    return this.reactionRolesService.removeRole(roleId);
  }

  @Get('stats/:guildId')
  async getStats(@Param('guildId') guildId: string) {
    return this.reactionRolesService.getStats(guildId);
  }
}

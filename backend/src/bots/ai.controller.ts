import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIService } from './ai.service';
import { AuthenticatedRequest, AIConfigDto, AIDocumentDto } from '../common/types';

@Controller('bots/:botId/ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('config')
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.getConfig(botId, req.user.id, guildId);
  }

  @Post('config')
  async createConfig(
    @Param('botId') botId: string,
    @Body() data: AIConfigDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.createConfig(botId, req.user.id, data);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Body() data: Partial<AIConfigDto>,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.updateConfig(botId, req.user.id, data);
  }

  @Delete('config')
  async deleteConfig(@Param('botId') botId: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.deleteConfig(botId, req.user.id);
  }

  @Get('usage/stats')
  async getUsageStats(
    @Param('botId') botId: string,
    @Query('days') days: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.getUsageStats(botId, req.user.id, parseInt(days) || 30);
  }

  @Get('usage')
  async getUsage(
    @Param('botId') botId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.getUsage(
      botId,
      req.user.id,
      parseInt(limit) || 50,
      parseInt(offset) || 0
    );
  }

  @Get('conversations')
  async getConversations(
    @Param('botId') botId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Query('channelId') channelId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.getConversations(
      botId,
      req.user.id,
      parseInt(limit) || 50,
      parseInt(offset) || 0,
      channelId
    );
  }

  @Get('documents')
  async getDocuments(@Param('botId') botId: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getDocuments(botId, req.user.id);
  }

  @Post('documents')
  async createDocument(
    @Param('botId') botId: string,
    @Body() data: AIDocumentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.createDocument(botId, req.user.id, data);
  }

  @Put('documents/:docId')
  async updateDocument(
    @Param('botId') botId: string,
    @Param('docId') docId: string,
    @Body() data: Partial<AIDocumentDto>,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.updateDocument(botId, req.user.id, docId, data);
  }

  @Delete('documents/:docId')
  async deleteDocument(
    @Param('botId') botId: string,
    @Param('docId') docId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.deleteDocument(botId, req.user.id, docId);
  }

  @Post('test')
  async testConfig(
    @Param('botId') botId: string,
    @Body() data: { message: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.aiService.testConfiguration(botId, req.user.id, data);
  }
}

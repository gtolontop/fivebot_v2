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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuggestionsService } from './suggestions.service';
import {
  UpdateSuggestionConfigDto,
  CreateSuggestionDto,
  UpdateSuggestionStatusDto,
  AddVoteDto,
  RemoveVoteDto,
  AddCommentDto,
  AddStaffResponseDto,
} from './dto';
import { SuggestionStatus } from '@prisma/client';

@Controller('bots/:botId/suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  // ==================== CONFIG ====================

  @Get('config')
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.suggestionsService.getOrCreateConfig(guildId, botId);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateDto: UpdateSuggestionConfigDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.suggestionsService.updateConfig(guildId, botId, updateDto);
  }

  // ==================== SUGGESTIONS ====================

  @Get()
  async getSuggestions(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: SuggestionStatus,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.suggestionsService.getSuggestions(guildId, page, limit, status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSuggestion(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('authorId') authorId: string,
    @Body() createDto: CreateSuggestionDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    if (!authorId) {
      return { error: 'authorId query parameter is required' };
    }

    return this.suggestionsService.createSuggestion(
      guildId,
      botId,
      authorId,
      createDto.content,
      createDto.title,
      createDto.attachments,
      createDto.isAnonymous,
    );
  }

  @Get(':id')
  async getSuggestion(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    return this.suggestionsService.getSuggestion(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateSuggestionStatusDto,
  ) {
    return this.suggestionsService.updateStatus(
      id,
      updateDto.status,
      updateDto.reason,
      updateDto.staffId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSuggestion(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    await this.suggestionsService.deleteSuggestion(id);
  }

  // ==================== VOTES ====================

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  async addVote(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() voteDto: AddVoteDto,
  ) {
    return this.suggestionsService.addVote(id, voteDto.userId, voteDto.isUpvote);
  }

  @Delete(':id/vote')
  @HttpCode(HttpStatus.OK)
  async removeVote(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() voteDto: RemoveVoteDto,
  ) {
    return this.suggestionsService.removeVote(id, voteDto.userId);
  }

  // ==================== COMMENTS ====================

  @Get(':id/comments')
  async getComments(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    return this.suggestionsService.getComments(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('authorId') authorId: string,
    @Body() commentDto: AddCommentDto,
  ) {
    if (!authorId) {
      return { error: 'authorId query parameter is required' };
    }
    return this.suggestionsService.addComment(
      id,
      authorId,
      commentDto.content,
      commentDto.isStaff,
    );
  }

  // ==================== STAFF RESPONSE ====================

  @Post(':id/response')
  @HttpCode(HttpStatus.OK)
  async addStaffResponse(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() responseDto: AddStaffResponseDto,
  ) {
    return this.suggestionsService.addStaffResponse(
      id,
      responseDto.staffId,
      responseDto.response,
    );
  }

  // ==================== STATISTICS ====================

  @Get('statistics/overview')
  async getStatistics(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.suggestionsService.getStatistics(guildId);
  }

  // ==================== USER SUGGESTIONS ====================

  @Get('user/:userId')
  async getUserSuggestions(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.suggestionsService.getUserSuggestions(guildId, userId, page, limit);
  }
}

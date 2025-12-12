import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { UpdatePollConfigDto } from './dto/update-config.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { RemoveVoteDto } from './dto/remove-vote.dto';

@ApiTags('Polls')
@Controller('bots/:botId/polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get poll configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.pollsService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update poll configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdatePollConfigDto,
  ) {
    return this.pollsService.updateConfig(guildId, botId, updateConfigDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get polls (active or ended)' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'status',
    description: 'Poll status (active or ended)',
    required: false,
    enum: ['active', 'ended'],
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (for ended polls)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (for ended polls)',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Polls retrieved' })
  async getPolls(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (status === 'ended') {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      return this.pollsService.getEndedPolls(guildId, pageNum, limitNum);
    }

    return this.pollsService.getActivePolls(guildId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new poll' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'creatorId', description: 'Creator User ID', required: true })
  @ApiResponse({ status: 201, description: 'Poll created' })
  @HttpCode(HttpStatus.CREATED)
  async createPoll(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('creatorId') creatorId: string,
    @Body() createPollDto: CreatePollDto,
  ) {
    return this.pollsService.createPoll(
      guildId,
      botId,
      creatorId,
      createPollDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get poll by ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll retrieved' })
  async getPoll(@Param('botId') botId: string, @Param('id') pollId: string) {
    return this.pollsService.getPoll(pollId);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  async vote(
    @Param('botId') botId: string,
    @Param('id') pollId: string,
    @Query('userId') userId: string,
    @Body() voteDto: VoteDto,
  ) {
    return this.pollsService.vote(pollId, userId, voteDto.optionIndex);
  }

  @Delete(':id/vote')
  @ApiOperation({ summary: 'Remove vote from a poll' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Vote removed' })
  async removeVote(
    @Param('botId') botId: string,
    @Param('id') pollId: string,
    @Query('userId') userId: string,
    @Body() removeVoteDto: RemoveVoteDto,
  ) {
    return this.pollsService.removeVote(
      pollId,
      userId,
      removeVoteDto.optionIndex,
    );
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a poll' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll ended' })
  async endPoll(@Param('botId') botId: string, @Param('id') pollId: string) {
    return this.pollsService.endPoll(pollId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a poll' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll cancelled' })
  async cancelPoll(
    @Param('botId') botId: string,
    @Param('id') pollId: string,
  ) {
    return this.pollsService.cancelPoll(pollId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get poll results' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Results retrieved' })
  async getResults(
    @Param('botId') botId: string,
    @Param('id') pollId: string,
  ) {
    return this.pollsService.getResults(pollId);
  }

  @Get(':id/voters')
  @ApiOperation({ summary: 'Get poll voters' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Poll ID' })
  @ApiQuery({
    name: 'optionIndex',
    description: 'Filter by option index',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Voters retrieved' })
  async getVoters(
    @Param('botId') botId: string,
    @Param('id') pollId: string,
    @Query('optionIndex') optionIndex?: string,
  ) {
    const index = optionIndex ? parseInt(optionIndex, 10) : undefined;
    return this.pollsService.getVoters(pollId, index);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get polls created by a user' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'User polls retrieved' })
  async getUserPolls(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.pollsService.getUserPolls(guildId, userId);
  }
}

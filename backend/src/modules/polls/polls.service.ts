import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollConfigDto } from './dto/update-config.dto';
import { PollStatus } from '@prisma/client';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get poll configuration for a guild
   */
  async getConfig(guildId: string) {
    const config = await this.prisma.pollConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Poll configuration not found');
    }

    return config;
  }

  /**
   * Update poll configuration for a guild
   */
  async updateConfig(
    guildId: string,
    botId: string,
    data: UpdatePollConfigDto,
  ) {
    return this.prisma.pollConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        botId,
        ...data,
      },
    });
  }

  /**
   * Create a new poll
   */
  async createPoll(
    guildId: string,
    botId: string,
    creatorId: string,
    data: CreatePollDto,
  ) {
    // Get or create config
    let config = await this.prisma.pollConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.pollConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    if (!config.enabled) {
      throw new ForbiddenException('Polls are disabled for this guild');
    }

    // Check max options
    if (data.options.length > config.maxOptions) {
      throw new BadRequestException(
        `Maximum ${config.maxOptions} options allowed`,
      );
    }

    // Check active polls per user
    const activePolls = await this.prisma.poll.count({
      where: {
        guildId,
        creatorId,
        status: PollStatus.ACTIVE,
      },
    });

    if (activePolls >= config.maxActivePollsPerUser) {
      throw new BadRequestException(
        `Maximum ${config.maxActivePollsPerUser} active polls per user`,
      );
    }

    // Calculate end time
    const duration = data.duration || config.defaultDuration;
    const endAt = new Date(Date.now() + duration * 1000);

    // Create poll
    const poll = await this.prisma.poll.create({
      data: {
        configId: config.id,
        guildId,
        channelId: data.channelId,
        creatorId,
        question: data.question,
        description: data.description,
        options: JSON.stringify(data.options),
        allowMultipleVotes:
          data.allowMultipleVotes ?? config.allowMultipleVotes,
        anonymous: data.anonymous ?? false,
        showResultsLive: data.showResultsLive ?? true,
        endAt,
        status: PollStatus.ACTIVE,
      },
      include: {
        votes: true,
      },
    });

    return this.formatPoll(poll);
  }

  /**
   * Get a poll by ID
   */
  async getPoll(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        votes: true,
        config: true,
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return this.formatPoll(poll);
  }

  /**
   * Get all active polls for a guild
   */
  async getActivePolls(guildId: string) {
    const polls = await this.prisma.poll.findMany({
      where: {
        guildId,
        status: PollStatus.ACTIVE,
      },
      include: {
        votes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return polls.map((poll) => this.formatPoll(poll));
  }

  /**
   * Get ended polls for a guild with pagination
   */
  async getEndedPolls(guildId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [polls, total] = await Promise.all([
      this.prisma.poll.findMany({
        where: {
          guildId,
          status: {
            in: [PollStatus.ENDED, PollStatus.CANCELLED],
          },
        },
        include: {
          votes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.poll.count({
        where: {
          guildId,
          status: {
            in: [PollStatus.ENDED, PollStatus.CANCELLED],
          },
        },
      }),
    ]);

    return {
      polls: polls.map((poll) => this.formatPoll(poll)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Vote on a poll
   */
  async vote(pollId: string, userId: string, optionIndex: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        votes: {
          where: { userId },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    if (poll.endAt && new Date() > poll.endAt) {
      throw new BadRequestException('Poll has ended');
    }

    const options = JSON.parse(poll.options);
    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new BadRequestException('Invalid option index');
    }

    // Check if user already voted
    const existingVote = poll.votes.find((v) => v.optionIndex === optionIndex);
    if (existingVote) {
      throw new BadRequestException('You already voted for this option');
    }

    // Check multiple votes
    if (!poll.allowMultipleVotes && poll.votes.length > 0) {
      throw new BadRequestException(
        'Multiple votes not allowed for this poll',
      );
    }

    // Create vote
    const vote = await this.prisma.pollVote.create({
      data: {
        pollId,
        userId,
        optionIndex,
      },
    });

    // Update total votes
    await this.prisma.poll.update({
      where: { id: pollId },
      data: {
        totalVotes: {
          increment: 1,
        },
      },
    });

    return vote;
  }

  /**
   * Remove vote(s) from a poll
   */
  async removeVote(pollId: string, userId: string, optionIndex?: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    // Build where clause
    const where: any = {
      pollId,
      userId,
    };

    if (optionIndex !== undefined) {
      where.optionIndex = optionIndex;
    }

    // Delete votes
    const result = await this.prisma.pollVote.deleteMany({
      where,
    });

    if (result.count === 0) {
      throw new NotFoundException('No votes found to remove');
    }

    // Update total votes
    await this.prisma.poll.update({
      where: { id: pollId },
      data: {
        totalVotes: {
          decrement: result.count,
        },
      },
    });

    return { removed: result.count };
  }

  /**
   * End a poll
   */
  async endPoll(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    return this.prisma.poll.update({
      where: { id: pollId },
      data: {
        status: PollStatus.ENDED,
        endAt: new Date(),
      },
      include: {
        votes: true,
      },
    });
  }

  /**
   * Cancel a poll
   */
  async cancelPoll(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    return this.prisma.poll.update({
      where: { id: pollId },
      data: {
        status: PollStatus.CANCELLED,
      },
      include: {
        votes: true,
      },
    });
  }

  /**
   * Get poll results with vote counts and percentages
   */
  async getResults(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        votes: true,
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const options = JSON.parse(poll.options);
    const voteCounts: { [key: number]: number } = {};

    // Count votes per option
    poll.votes.forEach((vote) => {
      voteCounts[vote.optionIndex] = (voteCounts[vote.optionIndex] || 0) + 1;
    });

    // Calculate percentages
    const results = options.map((option: string, index: number) => {
      const votes = voteCounts[index] || 0;
      const percentage =
        poll.totalVotes > 0 ? (votes / poll.totalVotes) * 100 : 0;

      return {
        index,
        option,
        votes,
        percentage: Math.round(percentage * 100) / 100,
      };
    });

    return {
      pollId: poll.id,
      question: poll.question,
      status: poll.status,
      totalVotes: poll.totalVotes,
      results,
    };
  }

  /**
   * Get list of voters for a poll or specific option
   */
  async getVoters(pollId: string, optionIndex?: number) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        config: true,
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.anonymous) {
      throw new ForbiddenException('This poll is anonymous');
    }

    if (!poll.config.showVotersList) {
      throw new ForbiddenException('Voters list is not enabled');
    }

    const where: any = {
      pollId,
    };

    if (optionIndex !== undefined) {
      where.optionIndex = optionIndex;
    }

    const votes = await this.prisma.pollVote.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });

    const options = JSON.parse(poll.options);

    // Group votes by option
    const votersByOption: { [key: number]: any[] } = {};

    votes.forEach((vote) => {
      if (!votersByOption[vote.optionIndex]) {
        votersByOption[vote.optionIndex] = [];
      }
      votersByOption[vote.optionIndex].push({
        userId: vote.userId,
        votedAt: vote.createdAt,
      });
    });

    return {
      pollId: poll.id,
      question: poll.question,
      voters: Object.keys(votersByOption).map((key) => {
        const index = parseInt(key);
        return {
          optionIndex: index,
          option: options[index],
          voters: votersByOption[index],
        };
      }),
    };
  }

  /**
   * Process expired polls (for cron job)
   */
  async processExpiredPolls() {
    const now = new Date();

    const expiredPolls = await this.prisma.poll.findMany({
      where: {
        status: PollStatus.ACTIVE,
        endAt: {
          lte: now,
        },
      },
    });

    const results = await Promise.all(
      expiredPolls.map(async (poll) => {
        return this.prisma.poll.update({
          where: { id: poll.id },
          data: {
            status: PollStatus.ENDED,
          },
        });
      }),
    );

    return {
      processed: results.length,
      polls: results,
    };
  }

  /**
   * Get all polls created by a user in a guild
   */
  async getUserPolls(guildId: string, userId: string) {
    const polls = await this.prisma.poll.findMany({
      where: {
        guildId,
        creatorId: userId,
      },
      include: {
        votes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return polls.map((poll) => this.formatPoll(poll));
  }

  /**
   * Format poll data with parsed options
   */
  private formatPoll(poll: any) {
    return {
      ...poll,
      options: JSON.parse(poll.options),
    };
  }
}

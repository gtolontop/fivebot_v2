import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SuggestionStatus } from '@prisma/client';
import { UpdateSuggestionConfigDto } from './dto';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get suggestion configuration for a guild
   */
  async getConfig(guildId: string) {
    const config = await this.prisma.suggestionConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Suggestion configuration not found for this guild');
    }

    return config;
  }

  /**
   * Get or create suggestion configuration
   */
  async getOrCreateConfig(guildId: string, botId: string) {
    let config = await this.prisma.suggestionConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.suggestionConfig.create({
        data: {
          guildId,
          botId,
          channelId: '', // Should be set by user
          enabled: false, // Disabled until channel is configured
        },
      });
    }

    return config;
  }

  /**
   * Update suggestion configuration
   */
  async updateConfig(guildId: string, botId: string, data: UpdateSuggestionConfigDto) {
    // Get or create config first
    await this.getOrCreateConfig(guildId, botId);

    const config = await this.prisma.suggestionConfig.update({
      where: { guildId },
      data: {
        ...data,
        botId,
      },
    });

    return config;
  }

  /**
   * Create a new suggestion
   */
  async createSuggestion(
    guildId: string,
    botId: string,
    authorId: string,
    content: string,
    title?: string,
    attachments?: string,
    isAnonymous = false,
  ) {
    // Get config
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Suggestions are not enabled for this guild');
    }

    if (!config.channelId) {
      throw new BadRequestException('Suggestion channel is not configured');
    }

    // Get the next suggestion number
    const lastSuggestion = await this.prisma.suggestion.findFirst({
      where: { configId: config.id },
      orderBy: { suggestionNumber: 'desc' },
    });

    const suggestionNumber = lastSuggestion ? lastSuggestion.suggestionNumber + 1 : 1;

    // Create the suggestion
    const suggestion = await this.prisma.suggestion.create({
      data: {
        configId: config.id,
        guildId,
        suggestionNumber,
        authorId,
        content,
        title,
        attachments,
        isAnonymous,
        channelId: config.channelId,
        status: config.requireApproval ? SuggestionStatus.PENDING : SuggestionStatus.APPROVED,
      },
      include: {
        config: true,
        comments: true,
      },
    });

    return suggestion;
  }

  /**
   * Get a single suggestion by ID
   */
  async getSuggestion(suggestionId: string) {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        config: true,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    return suggestion;
  }

  /**
   * Get suggestions with pagination and optional status filter
   */
  async getSuggestions(
    guildId: string,
    page = 1,
    limit = 10,
    status?: SuggestionStatus,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      guildId,
      ...(status && { status }),
    };

    const [suggestions, total] = await Promise.all([
      this.prisma.suggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          config: true,
          comments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.suggestion.count({ where }),
    ]);

    return {
      suggestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update suggestion status
   */
  async updateStatus(
    suggestionId: string,
    status: SuggestionStatus,
    reason?: string,
    staffId?: string,
  ) {
    const suggestion = await this.getSuggestion(suggestionId);

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status,
        statusReason: reason,
        statusChangedBy: staffId,
        statusChangedAt: new Date(),
      },
      include: {
        config: true,
        comments: true,
      },
    });

    return updated;
  }

  /**
   * Add a vote to a suggestion
   */
  async addVote(suggestionId: string, userId: string, isUpvote: boolean) {
    const suggestion = await this.getSuggestion(suggestionId);

    // Parse existing voters
    let voters: Record<string, boolean> = {};
    if (suggestion.voters) {
      try {
        voters = JSON.parse(suggestion.voters);
      } catch (e) {
        voters = {};
      }
    }

    // Check if user already voted
    const existingVote = voters[userId];

    // If same vote, remove it (toggle off)
    if (existingVote === isUpvote) {
      delete voters[userId];
    } else {
      // Add or change vote
      voters[userId] = isUpvote;
    }

    // Count votes
    let upvotes = 0;
    let downvotes = 0;
    for (const vote of Object.values(voters)) {
      if (vote) upvotes++;
      else downvotes++;
    }

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        voters: JSON.stringify(voters),
        upvotes,
        downvotes,
      },
      include: {
        config: true,
        comments: true,
      },
    });

    return updated;
  }

  /**
   * Remove a user's vote from a suggestion
   */
  async removeVote(suggestionId: string, userId: string) {
    const suggestion = await this.getSuggestion(suggestionId);

    // Parse existing voters
    let voters: Record<string, boolean> = {};
    if (suggestion.voters) {
      try {
        voters = JSON.parse(suggestion.voters);
      } catch (e) {
        voters = {};
      }
    }

    // Remove user's vote
    delete voters[userId];

    // Count votes
    let upvotes = 0;
    let downvotes = 0;
    for (const vote of Object.values(voters)) {
      if (vote) upvotes++;
      else downvotes++;
    }

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        voters: JSON.stringify(voters),
        upvotes,
        downvotes,
      },
      include: {
        config: true,
        comments: true,
      },
    });

    return updated;
  }

  /**
   * Add a comment to a suggestion
   */
  async addComment(
    suggestionId: string,
    authorId: string,
    content: string,
    isStaff = false,
  ) {
    // Verify suggestion exists
    await this.getSuggestion(suggestionId);

    const comment = await this.prisma.suggestionComment.create({
      data: {
        suggestionId,
        authorId,
        content,
        isStaff,
      },
    });

    return comment;
  }

  /**
   * Get all comments for a suggestion
   */
  async getComments(suggestionId: string) {
    // Verify suggestion exists
    await this.getSuggestion(suggestionId);

    const comments = await this.prisma.suggestionComment.findMany({
      where: { suggestionId },
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  }

  /**
   * Add staff response to a suggestion
   */
  async addStaffResponse(suggestionId: string, staffId: string, response: string) {
    const suggestion = await this.getSuggestion(suggestionId);

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        staffResponse: response,
        staffResponderId: staffId,
      },
      include: {
        config: true,
        comments: true,
      },
    });

    return updated;
  }

  /**
   * Delete a suggestion
   */
  async deleteSuggestion(suggestionId: string) {
    // Verify suggestion exists
    await this.getSuggestion(suggestionId);

    await this.prisma.suggestion.delete({
      where: { id: suggestionId },
    });

    return { success: true, message: 'Suggestion deleted successfully' };
  }

  /**
   * Get statistics for suggestions in a guild
   */
  async getStatistics(guildId: string) {
    const [
      total,
      pending,
      approved,
      denied,
      considering,
      implemented,
      archived,
    ] = await Promise.all([
      this.prisma.suggestion.count({ where: { guildId } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.PENDING } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.APPROVED } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.DENIED } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.CONSIDERING } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.IMPLEMENTED } }),
      this.prisma.suggestion.count({ where: { guildId, status: SuggestionStatus.ARCHIVED } }),
    ]);

    // Get top suggestions by upvotes
    const topSuggestions = await this.prisma.suggestion.findMany({
      where: { guildId },
      orderBy: { upvotes: 'desc' },
      take: 5,
      include: {
        config: true,
      },
    });

    // Get recent suggestions
    const recentSuggestions = await this.prisma.suggestion.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        config: true,
      },
    });

    return {
      total,
      byStatus: {
        pending,
        approved,
        denied,
        considering,
        implemented,
        archived,
      },
      topSuggestions,
      recentSuggestions,
    };
  }

  /**
   * Get all suggestions from a specific user in a guild
   */
  async getUserSuggestions(guildId: string, userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where = {
      guildId,
      authorId: userId,
    };

    const [suggestions, total] = await Promise.all([
      this.prisma.suggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          config: true,
          comments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.suggestion.count({ where }),
    ]);

    return {
      suggestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

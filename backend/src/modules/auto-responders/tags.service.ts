import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTagDto, UpdateTagDto, UpdateTagConfigDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create tag configuration for a guild
   */
  async getConfig(guildId: string) {
    let config = await this.prisma.tagConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      // Auto-create config if it doesn't exist
      config = await this.prisma.tagConfig.create({
        data: {
          guildId,
          botId: '', // Will be set when updated
        },
      });
    }

    return config;
  }

  /**
   * Update tag configuration
   */
  async updateConfig(guildId: string, botId: string, data: UpdateTagConfigDto) {
    const config = await this.getConfig(guildId);

    return this.prisma.tagConfig.update({
      where: { id: config.id },
      data: {
        ...data,
        botId,
      },
    });
  }

  /**
   * Get all tags for a guild
   */
  async getTags(guildId: string) {
    return this.prisma.tag.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific tag by name
   */
  async getTag(guildId: string, name: string) {
    const config = await this.getConfig(guildId);

    const tag = await this.prisma.tag.findFirst({
      where: {
        configId: config.id,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag '${name}' not found`);
    }

    return tag;
  }

  /**
   * Get a tag by ID
   */
  async getTagById(tagId: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    return tag;
  }

  /**
   * Create a new tag
   */
  async createTag(
    guildId: string,
    botId: string,
    creatorId: string,
    data: CreateTagDto,
  ) {
    // Get or create config
    const config = await this.getConfig(guildId);

    // Update botId if not set
    if (!config.botId || config.botId === '') {
      await this.prisma.tagConfig.update({
        where: { id: config.id },
        data: { botId },
      });
    }

    // Check if tag with this name already exists
    const existing = await this.prisma.tag.findFirst({
      where: {
        configId: config.id,
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag '${data.name}' already exists`);
    }

    // Check if any alias conflicts with existing tags
    if (data.aliases && data.aliases.length > 0) {
      for (const alias of data.aliases) {
        const conflicting = await this.prisma.tag.findFirst({
          where: {
            configId: config.id,
            OR: [
              {
                name: {
                  equals: alias,
                  mode: 'insensitive',
                },
              },
              {
                aliases: {
                  contains: alias,
                },
              },
            ],
          },
        });

        if (conflicting) {
          throw new ConflictException(`Alias '${alias}' conflicts with existing tag '${conflicting.name}'`);
        }
      }
    }

    // Create tag
    const createData: Prisma.TagCreateInput = {
      name: data.name,
      content: data.content,
      embedJson: data.embedJson,
      aliases: data.aliases ? JSON.stringify(data.aliases) : null,
      creatorId,
      isGlobal: data.isGlobal ?? false,
      guildId,
      config: {
        connect: { id: config.id },
      },
    };

    return this.prisma.tag.create({
      data: createData,
    });
  }

  /**
   * Update an existing tag
   */
  async updateTag(tagId: string, data: UpdateTagDto) {
    const tag = await this.getTagById(tagId);

    // If name is being changed, check for conflicts
    if (data.name && data.name !== tag.name) {
      const existing = await this.prisma.tag.findFirst({
        where: {
          configId: tag.configId,
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
          id: {
            not: tagId,
          },
        },
      });

      if (existing) {
        throw new ConflictException(`Tag '${data.name}' already exists`);
      }
    }

    // Check alias conflicts
    if (data.aliases && data.aliases.length > 0) {
      for (const alias of data.aliases) {
        const conflicting = await this.prisma.tag.findFirst({
          where: {
            configId: tag.configId,
            id: {
              not: tagId,
            },
            OR: [
              {
                name: {
                  equals: alias,
                  mode: 'insensitive',
                },
              },
              {
                aliases: {
                  contains: alias,
                },
              },
            ],
          },
        });

        if (conflicting) {
          throw new ConflictException(`Alias '${alias}' conflicts with existing tag '${conflicting.name}'`);
        }
      }
    }

    // Prepare update data
    const updateData: any = {
      ...data,
    };

    if (data.aliases !== undefined) {
      updateData.aliases = data.aliases.length > 0 ? JSON.stringify(data.aliases) : null;
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: updateData,
    });
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string) {
    await this.getTagById(tagId);

    await this.prisma.tag.delete({
      where: { id: tagId },
    });

    return { success: true, message: 'Tag deleted successfully' };
  }

  /**
   * Increment use count for a tag
   */
  async useTag(tagId: string) {
    return this.prisma.tag.update({
      where: { id: tagId },
      data: {
        uses: { increment: 1 },
        lastUsed: new Date(),
      },
    });
  }

  /**
   * Search tags by name or content
   */
  async searchTags(guildId: string, query: string) {
    const config = await this.getConfig(guildId);

    const tags = await this.prisma.tag.findMany({
      where: {
        configId: config.id,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            aliases: {
              contains: query,
            },
          },
        ],
      },
      orderBy: { uses: 'desc' },
    });

    return tags;
  }

  /**
   * Get tag by alias
   */
  async getTagByAlias(guildId: string, alias: string) {
    const config = await this.getConfig(guildId);

    // First try to find by name
    let tag = await this.prisma.tag.findFirst({
      where: {
        configId: config.id,
        name: {
          equals: alias,
          mode: 'insensitive',
        },
      },
    });

    if (tag) {
      return tag;
    }

    // Then search in aliases
    const tags = await this.prisma.tag.findMany({
      where: {
        configId: config.id,
        aliases: {
          not: null,
        },
      },
    });

    for (const t of tags) {
      if (t.aliases) {
        try {
          const aliases = JSON.parse(t.aliases);
          if (Array.isArray(aliases)) {
            const found = aliases.some(
              (a) => a.toLowerCase() === alias.toLowerCase(),
            );
            if (found) {
              return t;
            }
          }
        } catch (error) {
          this.logger.error(`Error parsing aliases for tag ${t.id}: ${error.message}`);
        }
      }
    }

    throw new NotFoundException(`Tag or alias '${alias}' not found`);
  }

  /**
   * Get all tags created by a specific user
   */
  async getUserTags(guildId: string, userId: string) {
    return this.prisma.tag.findMany({
      where: {
        guildId,
        creatorId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get tag statistics for a guild
   */
  async getStatistics(guildId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { guildId },
      select: {
        id: true,
        name: true,
        uses: true,
        lastUsed: true,
        creatorId: true,
        isGlobal: true,
        createdAt: true,
      },
      orderBy: { uses: 'desc' },
    });

    const totalUses = tags.reduce((sum, t) => sum + t.uses, 0);
    const globalCount = tags.filter((t) => t.isGlobal).length;
    const userCount = tags.filter((t) => !t.isGlobal).length;

    return {
      totalTags: tags.length,
      globalTags: globalCount,
      userTags: userCount,
      totalUses,
      tags,
    };
  }
}

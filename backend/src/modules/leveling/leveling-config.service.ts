import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateRewardDto } from './dto/create-reward.dto';

@Injectable()
export class LevelingConfigService {
  private readonly logger = new Logger(LevelingConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get leveling configuration for a guild
   * @param guildId - Guild ID
   */
  async getConfig(guildId: string): Promise<any> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
        include: {
          rewards: {
            orderBy: { level: 'asc' },
          },
        },
      });

      if (!config) {
        throw new NotFoundException('Leveling config not found');
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update leveling configuration
   * @param guildId - Guild ID
   * @param data - Update data
   */
  async updateConfig(
    guildId: string,
    data: UpdateConfigDto,
  ): Promise<any> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Leveling config not found');
      }

      return await this.prisma.levelingConfig.update({
        where: { guildId },
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update config: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all rewards for a guild
   * @param guildId - Guild ID
   */
  async getRewards(guildId: string): Promise<any> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Leveling config not found');
      }

      return await this.prisma.levelReward.findMany({
        where: { configId: config.id },
        orderBy: { level: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get rewards: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Add a new reward
   * @param guildId - Guild ID
   * @param level - Level for the reward
   * @param type - Reward type
   * @param data - Reward data
   */
  async addReward(
    guildId: string,
    level: number,
    type: string,
    data: CreateRewardDto,
  ): Promise<any> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Leveling config not found');
      }

      return await this.prisma.levelReward.create({
        data: {
          configId: config.id,
          level,
          type: type as any,
          roleId: data.roleId,
          removeRoleId: data.removeRoleId,
          message: data.message,
          credits: data.credits,
          badgeId: data.badgeId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to add reward: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a reward
   * @param rewardId - Reward ID
   */
  async removeReward(rewardId: string): Promise<any> {
    try {
      return await this.prisma.levelReward.delete({
        where: { id: rewardId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove reward: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get channel multiplier
   * @param guildId - Guild ID
   * @param channelId - Channel ID
   */
  async getChannelMultiplier(
    guildId: string,
    channelId: string,
  ): Promise<number> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.channelMultipliers) {
        return 1.0;
      }

      const multipliers = JSON.parse(config.channelMultipliers);
      return multipliers[channelId] || 1.0;
    } catch (error) {
      this.logger.error(
        `Failed to get channel multiplier: ${error.message}`,
        error.stack,
      );
      return 1.0;
    }
  }

  /**
   * Get role multiplier (highest multiplier from user's roles)
   * @param guildId - Guild ID
   * @param roleIds - User's role IDs
   */
  async getRoleMultiplier(
    guildId: string,
    roleIds: string[],
  ): Promise<number> {
    try {
      const config = await this.prisma.levelingConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.roleMultipliers || roleIds.length === 0) {
        return 1.0;
      }

      const multipliers = JSON.parse(config.roleMultipliers);
      let highest = 1.0;

      for (const roleId of roleIds) {
        const multiplier = multipliers[roleId];
        if (multiplier && multiplier > highest) {
          highest = multiplier;
        }
      }

      return highest;
    } catch (error) {
      this.logger.error(
        `Failed to get role multiplier: ${error.message}`,
        error.stack,
      );
      return 1.0;
    }
  }
}

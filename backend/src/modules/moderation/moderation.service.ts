import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ModerationType,
  AppealStatus,
  ModerationCase,
  Prisma,
} from '@prisma/client';
import {
  CreateWarnDto,
  CreateMuteDto,
  CreateKickDto,
  CreateBanDto,
  AppealCaseDto,
  ReviewAppealDto,
  EditCaseDto,
  RemovePunishmentDto,
} from './dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a warning for a user
   */
  async createWarn(
    botId: string,
    dto: CreateWarnDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Creating warning for user ${dto.targetId} in guild ${dto.guildId}`,
      );

      const caseNumber = await this.getNextCaseNumber(dto.guildId);

      const moderationCase = await this.prisma.moderationCase.create({
        data: {
          guildId: dto.guildId,
          botId,
          caseNumber,
          type: ModerationType.WARN,
          targetId: dto.targetId,
          targetUsername: dto.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'No reason provided',
          channelId: dto.channelId,
          messageId: dto.messageId,
          active: true,
        },
      });

      this.logger.log(
        `Warning created successfully: case #${caseNumber} for user ${dto.targetId}`,
      );

      return moderationCase;
    } catch (error) {
      this.logger.error(`Failed to create warning: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create warning');
    }
  }

  /**
   * Create a mute for a user
   */
  async createMute(
    botId: string,
    dto: CreateMuteDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Creating mute for user ${dto.targetId} in guild ${dto.guildId} for ${dto.duration}s`,
      );

      // Check if user already has an active mute
      const existingMute = await this.prisma.moderationCase.findFirst({
        where: {
          guildId: dto.guildId,
          targetId: dto.targetId,
          type: ModerationType.MUTE,
          active: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingMute) {
        throw new BadRequestException('User already has an active mute');
      }

      const caseNumber = await this.getNextCaseNumber(dto.guildId);
      const expiresAt = new Date(Date.now() + dto.duration * 1000);

      const moderationCase = await this.prisma.moderationCase.create({
        data: {
          guildId: dto.guildId,
          botId,
          caseNumber,
          type: ModerationType.MUTE,
          targetId: dto.targetId,
          targetUsername: dto.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'No reason provided',
          duration: dto.duration,
          expiresAt,
          channelId: dto.channelId,
          messageId: dto.messageId,
          active: true,
        },
      });

      this.logger.log(
        `Mute created successfully: case #${caseNumber} for user ${dto.targetId}`,
      );

      return moderationCase;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create mute: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create mute');
    }
  }

  /**
   * Create a kick for a user
   */
  async createKick(
    botId: string,
    dto: CreateKickDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Creating kick for user ${dto.targetId} in guild ${dto.guildId}`,
      );

      const caseNumber = await this.getNextCaseNumber(dto.guildId);

      const moderationCase = await this.prisma.moderationCase.create({
        data: {
          guildId: dto.guildId,
          botId,
          caseNumber,
          type: ModerationType.KICK,
          targetId: dto.targetId,
          targetUsername: dto.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'No reason provided',
          channelId: dto.channelId,
          messageId: dto.messageId,
          active: true,
        },
      });

      this.logger.log(
        `Kick created successfully: case #${caseNumber} for user ${dto.targetId}`,
      );

      return moderationCase;
    } catch (error) {
      this.logger.error(`Failed to create kick: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create kick');
    }
  }

  /**
   * Create a ban for a user
   */
  async createBan(
    botId: string,
    dto: CreateBanDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Creating ban for user ${dto.targetId} in guild ${dto.guildId}`,
      );

      // Check if user already has an active ban
      const existingBan = await this.prisma.moderationCase.findFirst({
        where: {
          guildId: dto.guildId,
          targetId: dto.targetId,
          type: { in: [ModerationType.BAN, ModerationType.TEMPBAN] },
          active: true,
        },
      });

      if (existingBan) {
        throw new BadRequestException('User already has an active ban');
      }

      const caseNumber = await this.getNextCaseNumber(dto.guildId);
      const type = dto.duration ? ModerationType.TEMPBAN : ModerationType.BAN;
      const expiresAt = dto.duration
        ? new Date(Date.now() + dto.duration * 1000)
        : null;

      const moderationCase = await this.prisma.moderationCase.create({
        data: {
          guildId: dto.guildId,
          botId,
          caseNumber,
          type,
          targetId: dto.targetId,
          targetUsername: dto.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'No reason provided',
          duration: dto.duration,
          expiresAt,
          channelId: dto.channelId,
          messageId: dto.messageId,
          active: true,
        },
      });

      this.logger.log(
        `Ban created successfully: case #${caseNumber} for user ${dto.targetId}`,
      );

      return moderationCase;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create ban: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create ban');
    }
  }

  /**
   * Remove a mute from a user
   */
  async removeMute(
    botId: string,
    guildId: string,
    targetId: string,
    dto: RemovePunishmentDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Removing mute for user ${targetId} in guild ${guildId}`,
      );

      // Find active mute
      const activeMute = await this.prisma.moderationCase.findFirst({
        where: {
          guildId,
          targetId,
          type: ModerationType.MUTE,
          active: true,
        },
      });

      if (!activeMute) {
        throw new NotFoundException('No active mute found for this user');
      }

      // Deactivate the mute
      await this.prisma.moderationCase.update({
        where: { id: activeMute.id },
        data: { active: false },
      });

      // Create unmute case
      const caseNumber = await this.getNextCaseNumber(guildId);
      const unmute = await this.prisma.moderationCase.create({
        data: {
          guildId,
          botId,
          caseNumber,
          type: ModerationType.UNMUTE,
          targetId,
          targetUsername: activeMute.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'Mute removed',
          active: true,
        },
      });

      this.logger.log(
        `Mute removed successfully: case #${caseNumber} for user ${targetId}`,
      );

      return unmute;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove mute: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to remove mute');
    }
  }

  /**
   * Remove a ban from a user
   */
  async removeBan(
    botId: string,
    guildId: string,
    targetId: string,
    dto: RemovePunishmentDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(`Removing ban for user ${targetId} in guild ${guildId}`);

      // Find active ban
      const activeBan = await this.prisma.moderationCase.findFirst({
        where: {
          guildId,
          targetId,
          type: { in: [ModerationType.BAN, ModerationType.TEMPBAN] },
          active: true,
        },
      });

      if (!activeBan) {
        throw new NotFoundException('No active ban found for this user');
      }

      // Deactivate the ban
      await this.prisma.moderationCase.update({
        where: { id: activeBan.id },
        data: { active: false },
      });

      // Create unban case
      const caseNumber = await this.getNextCaseNumber(guildId);
      const unban = await this.prisma.moderationCase.create({
        data: {
          guildId,
          botId,
          caseNumber,
          type: ModerationType.UNBAN,
          targetId,
          targetUsername: activeBan.targetUsername,
          moderatorId: dto.moderatorId,
          moderatorName: dto.moderatorName,
          reason: dto.reason || 'Ban removed',
          active: true,
        },
      });

      this.logger.log(
        `Ban removed successfully: case #${caseNumber} for user ${targetId}`,
      );

      return unban;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove ban: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to remove ban');
    }
  }

  /**
   * Get all cases for a user
   */
  async getUserCases(guildId: string, targetId: string): Promise<ModerationCase[]> {
    try {
      this.logger.log(
        `Fetching cases for user ${targetId} in guild ${guildId}`,
      );

      const cases = await this.prisma.moderationCase.findMany({
        where: {
          guildId,
          targetId,
        },
        orderBy: {
          caseNumber: 'desc',
        },
      });

      return cases;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user cases: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch user cases');
    }
  }

  /**
   * Get a specific case by case number
   */
  async getCase(guildId: string, caseNumber: number): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Fetching case #${caseNumber} for guild ${guildId}`,
      );

      const moderationCase = await this.prisma.moderationCase.findUnique({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
      });

      if (!moderationCase) {
        throw new NotFoundException(`Case #${caseNumber} not found`);
      }

      return moderationCase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch case: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch case');
    }
  }

  /**
   * Edit a case's reason
   */
  async editCase(
    guildId: string,
    caseNumber: number,
    dto: EditCaseDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Editing case #${caseNumber} for guild ${guildId}`,
      );

      const existingCase = await this.getCase(guildId, caseNumber);

      const updatedCase = await this.prisma.moderationCase.update({
        where: { id: existingCase.id },
        data: {
          reason: dto.reason,
        },
      });

      this.logger.log(
        `Case #${caseNumber} updated successfully`,
      );

      return updatedCase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to edit case: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to edit case');
    }
  }

  /**
   * Delete a case
   */
  async deleteCase(guildId: string, caseNumber: number): Promise<void> {
    try {
      this.logger.log(
        `Deleting case #${caseNumber} for guild ${guildId}`,
      );

      const existingCase = await this.getCase(guildId, caseNumber);

      await this.prisma.moderationCase.delete({
        where: { id: existingCase.id },
      });

      this.logger.log(
        `Case #${caseNumber} deleted successfully`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete case: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete case');
    }
  }

  /**
   * Get the total number of cases in a guild
   */
  async getCaseCount(guildId: string): Promise<number> {
    try {
      const count = await this.prisma.moderationCase.count({
        where: { guildId },
      });

      return count;
    } catch (error) {
      this.logger.error(
        `Failed to get case count: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get case count');
    }
  }

  /**
   * Get active punishments for a user
   */
  async getActivePunishments(
    guildId: string,
    targetId: string,
  ): Promise<ModerationCase[]> {
    try {
      this.logger.log(
        `Fetching active punishments for user ${targetId} in guild ${guildId}`,
      );

      const activePunishments = await this.prisma.moderationCase.findMany({
        where: {
          guildId,
          targetId,
          active: true,
          type: {
            in: [ModerationType.MUTE, ModerationType.BAN, ModerationType.TEMPBAN],
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return activePunishments;
    } catch (error) {
      this.logger.error(
        `Failed to fetch active punishments: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch active punishments');
    }
  }

  /**
   * Appeal a case
   */
  async appealCase(
    guildId: string,
    caseNumber: number,
    dto: AppealCaseDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Creating appeal for case #${caseNumber} in guild ${guildId}`,
      );

      const existingCase = await this.getCase(guildId, caseNumber);

      if (existingCase.appealed) {
        throw new BadRequestException('This case has already been appealed');
      }

      const updatedCase = await this.prisma.moderationCase.update({
        where: { id: existingCase.id },
        data: {
          appealed: true,
          appealReason: dto.reason,
          appealStatus: AppealStatus.PENDING,
          appealedAt: new Date(),
        },
      });

      this.logger.log(
        `Appeal created successfully for case #${caseNumber}`,
      );

      return updatedCase;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to appeal case: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to appeal case');
    }
  }

  /**
   * Review an appeal
   */
  async reviewAppeal(
    guildId: string,
    caseNumber: number,
    dto: ReviewAppealDto,
  ): Promise<ModerationCase> {
    try {
      this.logger.log(
        `Reviewing appeal for case #${caseNumber} in guild ${guildId}`,
      );

      const existingCase = await this.getCase(guildId, caseNumber);

      if (!existingCase.appealed) {
        throw new BadRequestException('This case has not been appealed');
      }

      if (existingCase.appealStatus !== AppealStatus.PENDING) {
        throw new BadRequestException('This appeal has already been reviewed');
      }

      const updateData: Prisma.ModerationCaseUpdateInput = {
        appealStatus: dto.approved ? AppealStatus.APPROVED : AppealStatus.DENIED,
        appealReviewedBy: dto.reviewerId,
      };

      // If appeal is approved and it's an active punishment, deactivate it
      if (dto.approved && existingCase.active) {
        updateData.active = false;
      }

      const updatedCase = await this.prisma.moderationCase.update({
        where: { id: existingCase.id },
        data: updateData,
      });

      this.logger.log(
        `Appeal reviewed successfully for case #${caseNumber}: ${dto.approved ? 'APPROVED' : 'DENIED'}`,
      );

      return updatedCase;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to review appeal: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to review appeal');
    }
  }

  /**
   * Get cases with pagination and filtering
   */
  async getCases(
    guildId: string,
    options: {
      page?: number;
      limit?: number;
      targetId?: string;
      moderatorId?: string;
      type?: ModerationType;
      active?: boolean;
    } = {},
  ): Promise<{ cases: ModerationCase[]; total: number; page: number; limit: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;

      const where: Prisma.ModerationCaseWhereInput = {
        guildId,
      };

      if (options.targetId) {
        where.targetId = options.targetId;
      }

      if (options.moderatorId) {
        where.moderatorId = options.moderatorId;
      }

      if (options.type) {
        where.type = options.type;
      }

      if (options.active !== undefined) {
        where.active = options.active;
      }

      const [cases, total] = await Promise.all([
        this.prisma.moderationCase.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            caseNumber: 'desc',
          },
        }),
        this.prisma.moderationCase.count({ where }),
      ]);

      return {
        cases,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch cases: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch cases');
    }
  }

  /**
   * Get the next case number for a guild
   */
  private async getNextCaseNumber(guildId: string): Promise<number> {
    const lastCase = await this.prisma.moderationCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });

    return lastCase ? lastCase.caseNumber + 1 : 1;
  }

  /**
   * Check and expire old punishments
   */
  async expireOldPunishments(): Promise<number> {
    try {
      this.logger.log('Checking for expired punishments...');

      const result = await this.prisma.moderationCase.updateMany({
        where: {
          active: true,
          expiresAt: {
            lte: new Date(),
          },
          type: {
            in: [ModerationType.MUTE, ModerationType.TEMPBAN],
          },
        },
        data: {
          active: false,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} old punishments`);
      }

      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to expire old punishments: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}

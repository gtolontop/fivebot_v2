import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateConfigDto, VerificationType } from './dto/update-config.dto';
import { CaptchaService } from './captcha.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly captchaService: CaptchaService,
  ) {}

  // ==================== CONFIG ====================

  /**
   * Get verification configuration for a guild
   */
  async getConfig(guildId: string) {
    const config = await this.prisma.verificationConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Verification config not found for this guild');
    }

    return this.formatConfig(config);
  }

  /**
   * Update verification configuration for a guild
   */
  async updateConfig(guildId: string, botId: string, data: UpdateConfigDto) {
    // Prepare the update data
    const updateData: any = { ...data };

    // Convert questions array to JSON string if provided
    if (data.questions) {
      updateData.questions = JSON.stringify(data.questions);
    }

    // Upsert the configuration
    const config = await this.prisma.verificationConfig.upsert({
      where: { guildId },
      update: updateData,
      create: {
        guildId,
        botId,
        ...updateData,
      },
    });

    this.logger.log(`Updated verification config for guild ${guildId}`);

    return this.formatConfig(config);
  }

  // ==================== VERIFICATION HANDLERS ====================

  /**
   * Handle button verification
   */
  async handleButtonVerification(guildId: string, userId: string) {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Verification is disabled for this guild');
    }

    if (config.type !== VerificationType.BUTTON) {
      throw new BadRequestException('Button verification is not enabled');
    }

    // Check account age
    const accountAgeCheck = await this.checkAccountAge(userId, config.minAccountAge);
    if (!accountAgeCheck.success) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'BUTTON',
        success: false,
        failReason: accountAgeCheck.reason,
      });

      return {
        success: false,
        reason: accountAgeCheck.reason,
        shouldKick: config.kickOnFail,
      };
    }

    // Verify the user
    const result = await this.verifyUser(guildId, userId, config);

    // Log the verification
    await this.logVerification({
      guildId,
      botId: config.botId,
      userId,
      type: 'BUTTON',
      success: true,
    });

    return {
      success: true,
      config: {
        verifiedRoleId: config.verifiedRoleId,
        unverifiedRoleId: config.unverifiedRoleId,
        dmOnVerify: config.dmOnVerify,
        welcomeAfterVerify: config.welcomeAfterVerify,
        successMessage: config.successMessage,
      },
    };
  }

  /**
   * Handle captcha verification
   */
  async handleCaptchaVerification(guildId: string, userId: string, answer: string, sessionId?: string) {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Verification is disabled for this guild');
    }

    if (config.type !== VerificationType.CAPTCHA) {
      throw new BadRequestException('Captcha verification is not enabled');
    }

    if (!sessionId) {
      throw new BadRequestException('Session ID is required for captcha verification');
    }

    // Verify the captcha
    const captchaResult = this.captchaService.verifyCaptcha(
      sessionId,
      answer,
      config.captchaAttempts,
    );

    if (!captchaResult.success) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'CAPTCHA',
        success: false,
        failReason: captchaResult.reason,
      });

      return {
        success: false,
        reason: captchaResult.reason,
        shouldKick: config.kickOnFail && captchaResult.reason === 'Too many attempts',
      };
    }

    // Check account age
    const accountAgeCheck = await this.checkAccountAge(userId, config.minAccountAge);
    if (!accountAgeCheck.success) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'CAPTCHA',
        success: false,
        failReason: accountAgeCheck.reason,
      });

      return {
        success: false,
        reason: accountAgeCheck.reason,
        shouldKick: config.kickOnFail,
      };
    }

    // Verify the user
    await this.verifyUser(guildId, userId, config);

    // Log the verification
    await this.logVerification({
      guildId,
      botId: config.botId,
      userId,
      type: 'CAPTCHA',
      success: true,
    });

    return {
      success: true,
      config: {
        verifiedRoleId: config.verifiedRoleId,
        unverifiedRoleId: config.unverifiedRoleId,
        dmOnVerify: config.dmOnVerify,
        welcomeAfterVerify: config.welcomeAfterVerify,
        successMessage: config.successMessage,
      },
    };
  }

  /**
   * Handle reaction verification
   */
  async handleReactionVerification(guildId: string, userId: string, emoji: string) {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Verification is disabled for this guild');
    }

    if (config.type !== VerificationType.REACTION) {
      throw new BadRequestException('Reaction verification is not enabled');
    }

    // Check if the emoji matches
    if (config.reactionEmoji && emoji !== config.reactionEmoji) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'REACTION',
        success: false,
        failReason: 'Invalid emoji',
      });

      return {
        success: false,
        reason: 'Invalid emoji',
      };
    }

    // Check account age
    const accountAgeCheck = await this.checkAccountAge(userId, config.minAccountAge);
    if (!accountAgeCheck.success) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'REACTION',
        success: false,
        failReason: accountAgeCheck.reason,
      });

      return {
        success: false,
        reason: accountAgeCheck.reason,
        shouldKick: config.kickOnFail,
      };
    }

    // Verify the user
    await this.verifyUser(guildId, userId, config);

    // Log the verification
    await this.logVerification({
      guildId,
      botId: config.botId,
      userId,
      type: 'REACTION',
      success: true,
    });

    return {
      success: true,
      config: {
        verifiedRoleId: config.verifiedRoleId,
        unverifiedRoleId: config.unverifiedRoleId,
        dmOnVerify: config.dmOnVerify,
        welcomeAfterVerify: config.welcomeAfterVerify,
        successMessage: config.successMessage,
      },
    };
  }

  /**
   * Handle questions verification
   */
  async handleQuestionsVerification(guildId: string, userId: string, answers: string[]) {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Verification is disabled for this guild');
    }

    if (config.type !== VerificationType.QUESTIONS) {
      throw new BadRequestException('Questions verification is not enabled');
    }

    // Parse questions
    const questions = config.questions ? JSON.parse(config.questions) : [];

    if (questions.length === 0) {
      throw new BadRequestException('No questions configured');
    }

    if (answers.length !== questions.length) {
      throw new BadRequestException('Invalid number of answers');
    }

    // Check answers
    let correctAnswers = 0;
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      const correctAnswer = question.answer;
      const caseSensitive = question.caseSensitive || false;

      const match = caseSensitive
        ? userAnswer === correctAnswer
        : userAnswer.toLowerCase() === correctAnswer.toLowerCase();

      if (match) {
        correctAnswers++;
      }
    }

    // All answers must be correct
    if (correctAnswers !== questions.length) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'QUESTIONS',
        success: false,
        failReason: `Only ${correctAnswers}/${questions.length} answers were correct`,
      });

      return {
        success: false,
        reason: `Only ${correctAnswers}/${questions.length} answers were correct`,
        shouldKick: config.kickOnFail,
      };
    }

    // Check account age
    const accountAgeCheck = await this.checkAccountAge(userId, config.minAccountAge);
    if (!accountAgeCheck.success) {
      await this.logVerification({
        guildId,
        botId: config.botId,
        userId,
        type: 'QUESTIONS',
        success: false,
        failReason: accountAgeCheck.reason,
      });

      return {
        success: false,
        reason: accountAgeCheck.reason,
        shouldKick: config.kickOnFail,
      };
    }

    // Verify the user
    await this.verifyUser(guildId, userId, config);

    // Log the verification
    await this.logVerification({
      guildId,
      botId: config.botId,
      userId,
      type: 'QUESTIONS',
      success: true,
    });

    return {
      success: true,
      config: {
        verifiedRoleId: config.verifiedRoleId,
        unverifiedRoleId: config.unverifiedRoleId,
        dmOnVerify: config.dmOnVerify,
        welcomeAfterVerify: config.welcomeAfterVerify,
        successMessage: config.successMessage,
      },
    };
  }

  // ==================== CAPTCHA ====================

  /**
   * Generate a captcha image
   */
  async generateCaptcha(guildId: string, userId: string) {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      throw new BadRequestException('Verification is disabled for this guild');
    }

    if (config.type !== VerificationType.CAPTCHA) {
      throw new BadRequestException('Captcha verification is not enabled');
    }

    const captcha = await this.captchaService.generateCaptcha(
      config.captchaLength,
      userId,
      guildId,
    );

    return {
      image: captcha.image.toString('base64'),
      sessionId: captcha.sessionId,
      timeout: config.captchaTimeout,
      attempts: config.captchaAttempts,
    };
  }

  // ==================== HELPERS ====================

  /**
   * Verify a user (add verified role, remove unverified role)
   */
  private async verifyUser(guildId: string, userId: string, config: any) {
    this.logger.log(`Verified user ${userId} in guild ${guildId}`);

    return {
      verifiedRoleId: config.verifiedRoleId,
      unverifiedRoleId: config.unverifiedRoleId,
    };
  }

  /**
   * Log a verification attempt
   */
  async logVerification(data: {
    guildId: string;
    botId: string;
    userId: string;
    type: string;
    success: boolean;
    attempts?: number;
    failReason?: string;
  }) {
    await this.prisma.verificationLog.create({
      data: {
        guildId: data.guildId,
        botId: data.botId,
        userId: data.userId,
        type: data.type,
        success: data.success,
        attempts: data.attempts || 1,
        failReason: data.failReason,
      },
    });

    this.logger.log(
      `Logged verification for user ${data.userId} in guild ${data.guildId}: ${data.success ? 'SUCCESS' : 'FAILED'}`,
    );
  }

  /**
   * Check if user's account meets minimum age requirement
   */
  async checkAccountAge(userId: string, minAge: number): Promise<{
    success: boolean;
    reason?: string;
  }> {
    if (minAge === 0) {
      return { success: true };
    }

    try {
      // Extract timestamp from Discord snowflake
      const snowflake = BigInt(userId);
      const timestamp = Number(snowflake >> 22n) + 1420070400000;
      const accountCreatedAt = new Date(timestamp);
      const accountAgeInDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (accountAgeInDays < minAge) {
        return {
          success: false,
          reason: `Account must be at least ${minAge} days old. Your account is ${accountAgeInDays} days old.`,
        };
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to check account age for user ${userId}:`, error);
      return { success: true }; // Allow verification if we can't check age
    }
  }

  /**
   * Get verification logs for a guild
   */
  async getLogs(guildId: string, limit: number = 100, offset: number = 0) {
    const logs = await this.prisma.verificationLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.verificationLog.count({
      where: { guildId },
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get verification logs for a specific user
   */
  async getUserLogs(guildId: string, userId: string) {
    const logs = await this.prisma.verificationLog.findMany({
      where: {
        guildId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  /**
   * Get verification statistics for a guild
   */
  async getStats(guildId: string) {
    const logs = await this.prisma.verificationLog.findMany({
      where: { guildId },
    });

    const stats = {
      total: logs.length,
      successful: logs.filter((log) => log.success).length,
      failed: logs.filter((log) => !log.success).length,
      byType: {
        BUTTON: logs.filter((log) => log.type === 'BUTTON').length,
        CAPTCHA: logs.filter((log) => log.type === 'CAPTCHA').length,
        REACTION: logs.filter((log) => log.type === 'REACTION').length,
        QUESTIONS: logs.filter((log) => log.type === 'QUESTIONS').length,
      },
    };

    return stats;
  }

  // ==================== FORMATTING ====================

  /**
   * Format config for API response
   */
  private formatConfig(config: any) {
    return {
      ...config,
      questions: config.questions ? JSON.parse(config.questions) : null,
    };
  }
}

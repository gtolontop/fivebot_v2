import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { VerificationService } from './verification.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import {
  VerifyButtonDto,
  VerifyCaptchaDto,
  VerifyReactionDto,
  VerifyQuestionsDto,
  GenerateCaptchaDto,
} from './dto/verify.dto';

@ApiTags('Verification')
@Controller('bots/:botId/verification')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ==================== CONFIG ====================

  @Get('config')
  @ApiOperation({ summary: 'Get verification configuration for a guild' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig(@Query('guildId') guildId: string) {
    return this.verificationService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update verification configuration for a guild' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.verificationService.updateConfig(guildId, botId, updateConfigDto);
  }

  // ==================== VERIFICATION ACTIONS ====================

  @Post('verify/button')
  @ApiOperation({ summary: 'Handle button verification' })
  @ApiResponse({ status: 200, description: 'Button verification processed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async verifyButton(@Body() verifyButtonDto: VerifyButtonDto) {
    return this.verificationService.handleButtonVerification(
      verifyButtonDto.guildId,
      verifyButtonDto.userId,
    );
  }

  @Post('verify/captcha')
  @ApiOperation({ summary: 'Handle captcha verification' })
  @ApiResponse({ status: 200, description: 'Captcha verification processed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async verifyCaptcha(@Body() verifyCaptchaDto: VerifyCaptchaDto) {
    return this.verificationService.handleCaptchaVerification(
      verifyCaptchaDto.guildId,
      verifyCaptchaDto.userId,
      verifyCaptchaDto.answer,
      verifyCaptchaDto.sessionId,
    );
  }

  @Post('verify/reaction')
  @ApiOperation({ summary: 'Handle reaction verification' })
  @ApiResponse({ status: 200, description: 'Reaction verification processed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async verifyReaction(@Body() verifyReactionDto: VerifyReactionDto) {
    return this.verificationService.handleReactionVerification(
      verifyReactionDto.guildId,
      verifyReactionDto.userId,
      verifyReactionDto.emoji,
    );
  }

  @Post('verify/questions')
  @ApiOperation({ summary: 'Handle questions verification' })
  @ApiResponse({ status: 200, description: 'Questions verification processed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async verifyQuestions(@Body() verifyQuestionsDto: VerifyQuestionsDto) {
    return this.verificationService.handleQuestionsVerification(
      verifyQuestionsDto.guildId,
      verifyQuestionsDto.userId,
      verifyQuestionsDto.answers,
    );
  }

  // ==================== CAPTCHA ====================

  @Post('captcha/generate')
  @ApiOperation({ summary: 'Generate a captcha image' })
  @ApiResponse({ status: 200, description: 'Captcha generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async generateCaptcha(@Body() generateCaptchaDto: GenerateCaptchaDto) {
    return this.verificationService.generateCaptcha(
      generateCaptchaDto.guildId,
      generateCaptchaDto.userId,
    );
  }

  @Get('captcha/image/:sessionId')
  @ApiOperation({ summary: 'Get captcha image by session ID' })
  @ApiResponse({ status: 200, description: 'Captcha image retrieved' })
  async getCaptchaImage(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    // This endpoint would return the captcha image directly
    // In practice, the generate endpoint returns base64 which is better for APIs
    res.status(HttpStatus.NOT_IMPLEMENTED).json({
      message: 'Use the generate endpoint instead',
    });
  }

  // ==================== LOGS & STATS ====================

  @Get('logs')
  @ApiOperation({ summary: 'Get verification logs for a guild' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Query('guildId') guildId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.verificationService.getLogs(guildId, limitNum, offsetNum);
  }

  @Get('logs/user/:userId')
  @ApiOperation({ summary: 'Get verification logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User logs retrieved successfully' })
  async getUserLogs(
    @Query('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.verificationService.getUserLogs(guildId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get verification statistics for a guild' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('guildId') guildId: string) {
    return this.verificationService.getStats(guildId);
  }
}

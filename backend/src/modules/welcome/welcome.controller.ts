import {
  Controller,
  Get,
  Put,
  Post,
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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WelcomeService } from './welcome.service';
import { UpdateWelcomeConfigDto } from './dto/update-welcome-config.dto';

@ApiTags('Welcome')
@Controller('bots/:botId/welcome')
export class WelcomeController {
  constructor(private readonly welcomeService: WelcomeService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get welcome/leave configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.welcomeService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update welcome/leave configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateWelcomeConfigDto,
  ) {
    return this.welcomeService.updateConfig(guildId, updateConfigDto);
  }

  @Post('test/join')
  @ApiOperation({ summary: 'Test welcome message with sample data' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Test message sent' })
  @HttpCode(HttpStatus.OK)
  async testJoin(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { member: any; guild: any },
  ) {
    return this.welcomeService.handleMemberJoin(
      guildId,
      body.member,
      body.guild,
    );
  }

  @Post('test/leave')
  @ApiOperation({ summary: 'Test leave message with sample data' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Test message sent' })
  @HttpCode(HttpStatus.OK)
  async testLeave(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { member: any; guild: any },
  ) {
    return this.welcomeService.handleMemberLeave(
      guildId,
      body.member,
      body.guild,
    );
  }

  @Post('image/welcome')
  @ApiOperation({ summary: 'Generate welcome image preview' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Welcome image generated',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async generateWelcomeImage(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { member: any; guild: any },
  ) {
    const config = await this.welcomeService.getConfig(guildId);
    const imageBuffer = await this.welcomeService.generateWelcomeImage(
      body.member,
      body.guild,
      config,
    );

    return {
      success: true,
      image: imageBuffer.toString('base64'),
      contentType: 'image/png',
    };
  }

  @Post('image/leave')
  @ApiOperation({ summary: 'Generate leave image preview' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Leave image generated',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async generateLeaveImage(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { member: any; guild: any },
  ) {
    const config = await this.welcomeService.getConfig(guildId);
    const imageBuffer = await this.welcomeService.generateLeaveImage(
      body.member,
      body.guild,
      config,
    );

    return {
      success: true,
      image: imageBuffer.toString('base64'),
      contentType: 'image/png',
    };
  }
}

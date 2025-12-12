import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduledMessageStatus } from '@prisma/client';

export class UpdateScheduledMessageDto {
  @ApiPropertyOptional({ description: 'Channel ID where to send the message' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Message content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Embed JSON (as string)' })
  @IsOptional()
  @IsString()
  embedJson?: string;

  @ApiPropertyOptional({
    description: 'When to send the message (for one-time messages)',
  })
  @IsOptional()
  @IsDateString()
  sendAt?: string;

  @ApiPropertyOptional({ description: 'Cron expression for recurring messages' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Whether the message is recurring' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of runs' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRuns?: number;

  @ApiPropertyOptional({ description: 'Message status' })
  @IsOptional()
  @IsEnum(ScheduledMessageStatus)
  status?: ScheduledMessageStatus;
}

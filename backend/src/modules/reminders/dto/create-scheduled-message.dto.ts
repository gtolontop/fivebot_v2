import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduledMessageDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'Channel ID where to send the message' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ description: 'Creator user ID' })
  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @ApiPropertyOptional({ description: 'Message content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Embed JSON (as string)',
    example: '{"title":"Hello","description":"World"}',
  })
  @IsOptional()
  @IsString()
  embedJson?: string;

  @ApiPropertyOptional({
    description: 'When to send the message (for one-time messages)',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => !o.cronExpression)
  sendAt?: string;

  @ApiPropertyOptional({
    description: 'Cron expression for recurring messages',
    example: '0 9 * * *',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.sendAt)
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Whether the message is recurring' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of runs (null = infinite)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRuns?: number;
}

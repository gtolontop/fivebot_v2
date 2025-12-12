import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty({ description: 'User ID who created the reminder' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Reminder content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'When to send the reminder' })
  @IsDateString()
  remindAt: string;

  @ApiPropertyOptional({ description: 'Guild ID (optional for DM reminders)' })
  @IsOptional()
  @IsString()
  guildId?: string;

  @ApiPropertyOptional({ description: 'Channel ID where to send reminder' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Whether the reminder is recurring' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Interval in seconds for recurring reminders',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of times to repeat (null = infinite)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  repeatCount?: number;

  @ApiPropertyOptional({ description: 'Message URL reference' })
  @IsOptional()
  @IsString()
  messageUrl?: string;
}

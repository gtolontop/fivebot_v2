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
import { ReminderStatus } from '@prisma/client';

export class UpdateReminderDto {
  @ApiPropertyOptional({ description: 'Reminder content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'When to send the reminder' })
  @IsOptional()
  @IsDateString()
  remindAt?: string;

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

  @ApiPropertyOptional({ description: 'Reminder status' })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;
}

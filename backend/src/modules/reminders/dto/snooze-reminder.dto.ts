import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SnoozeReminderDto {
  @ApiProperty({
    description: 'Duration in minutes to snooze the reminder',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationMinutes: number;
}

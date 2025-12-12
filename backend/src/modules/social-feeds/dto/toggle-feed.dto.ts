import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleFeedDto {
  @ApiProperty({ description: 'Active state of the feed' })
  @IsBoolean()
  isActive: boolean;
}

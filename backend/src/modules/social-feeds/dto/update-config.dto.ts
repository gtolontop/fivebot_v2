import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ required: false, description: 'Enable or disable social feeds' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ required: false, description: 'Enable or disable invite tracking' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, description: 'Channel ID for invite notifications' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ required: false, description: 'Message template for member joins' })
  @IsOptional()
  @IsString()
  joinMessage?: string;

  @ApiProperty({ required: false, description: 'Message template for member leaves' })
  @IsOptional()
  @IsString()
  leaveMessage?: string;

  @ApiProperty({ required: false, description: 'Track vanity URL invites' })
  @IsOptional()
  @IsBoolean()
  trackVanity?: boolean;

  @ApiProperty({ required: false, description: 'Track unknown invite sources' })
  @IsOptional()
  @IsBoolean()
  trackUnknown?: boolean;
}

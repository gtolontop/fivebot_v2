import {
  IsString,
  IsBoolean,
  IsOptional,
  IsHexColor,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeedDto {
  @ApiProperty({ required: false, description: 'Display name of the account' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ required: false, description: 'URL to the account profile' })
  @IsOptional()
  @IsUrl()
  accountUrl?: string;

  @ApiProperty({ required: false, description: 'Discord channel ID for notifications' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ required: false, description: 'Role ID to mention in notifications' })
  @IsOptional()
  @IsString()
  roleToMention?: string;

  @ApiProperty({ required: false, description: 'Custom message template' })
  @IsOptional()
  @IsString()
  customMessage?: string;

  @ApiProperty({ required: false, description: 'Enable embed notifications' })
  @IsOptional()
  @IsBoolean()
  embedEnabled?: boolean;

  @ApiProperty({ required: false, description: 'Embed color in hex format' })
  @IsOptional()
  @IsHexColor()
  embedColor?: string;

  @ApiProperty({ required: false, description: 'Filter keywords (comma-separated)' })
  @IsOptional()
  @IsString()
  filterKeywords?: string;

  @ApiProperty({ required: false, description: 'Exclude keywords (comma-separated)' })
  @IsOptional()
  @IsString()
  excludeKeywords?: string;

  @ApiProperty({ required: false, description: 'Enable or disable the feed' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

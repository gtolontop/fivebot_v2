import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsHexColor,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class CreateFeedDto {
  @ApiProperty({ enum: SocialPlatform, description: 'Social media platform' })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty({ description: 'Account ID or username to monitor' })
  @IsString()
  accountId: string;

  @ApiProperty({ description: 'Display name of the account' })
  @IsString()
  accountName: string;

  @ApiProperty({ required: false, description: 'URL to the account profile' })
  @IsOptional()
  @IsUrl()
  accountUrl?: string;

  @ApiProperty({ description: 'Discord channel ID for notifications' })
  @IsString()
  channelId: string;

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
}

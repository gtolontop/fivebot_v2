import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ required: false, description: 'Enable or disable starboard' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, description: 'Starboard channel ID' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ required: false, description: 'Emoji for starring', default: '⭐' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ required: false, description: 'Star threshold for posting', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  threshold?: number;

  @ApiProperty({ required: false, description: 'Embed color in hex format' })
  @IsOptional()
  @IsString()
  embedColor?: string;

  @ApiProperty({ required: false, description: 'Show jump to message button', default: true })
  @IsOptional()
  @IsBoolean()
  showJumpButton?: boolean;

  @ApiProperty({ required: false, description: 'Comma-separated list of ignored channel IDs' })
  @IsOptional()
  @IsString()
  ignoredChannels?: string;

  @ApiProperty({ required: false, description: 'Allow users to star their own messages', default: false })
  @IsOptional()
  @IsBoolean()
  selfStarAllowed?: boolean;

  @ApiProperty({ required: false, description: 'Allow starring bot messages', default: false })
  @IsOptional()
  @IsBoolean()
  botStarAllowed?: boolean;

  @ApiProperty({ required: false, description: 'Allow starring NSFW content', default: false })
  @IsOptional()
  @IsBoolean()
  nsfwAllowed?: boolean;
}

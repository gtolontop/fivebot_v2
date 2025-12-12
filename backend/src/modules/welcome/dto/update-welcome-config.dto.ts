import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWelcomeConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // Welcome Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  welcomeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeChannelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeEmbed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  welcomeDM?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeDMMessage?: string;

  // Welcome Image
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  welcomeImageEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeImageBg?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeImageColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeImageFont?: string;

  // Auto Role
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoRoleEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  autoRoles?: string;

  // Leave Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  leaveEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leaveChannelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leaveMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leaveEmbed?: string;

  // Leave Image
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  leaveImageEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leaveImageBg?: string;
}

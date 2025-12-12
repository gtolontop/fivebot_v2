import { IsBoolean, IsInt, IsOptional, IsString, IsEnum, Min, Max, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VerificationType {
  BUTTON = 'BUTTON',
  CAPTCHA = 'CAPTCHA',
  REACTION = 'REACTION',
  QUESTIONS = 'QUESTIONS',
}

export enum ButtonStyle {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  SUCCESS = 'SUCCESS',
  DANGER = 'DANGER',
}

export class UpdateConfigDto {
  @ApiProperty({ description: 'Enable or disable verification system', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Verification type', enum: VerificationType, required: false })
  @IsOptional()
  @IsEnum(VerificationType)
  type?: VerificationType;

  // Channels & Roles
  @ApiProperty({ description: 'Verification channel ID', required: false })
  @IsOptional()
  @IsString()
  verificationChannelId?: string;

  @ApiProperty({ description: 'Verified role ID', required: false })
  @IsOptional()
  @IsString()
  verifiedRoleId?: string;

  @ApiProperty({ description: 'Unverified role ID', required: false })
  @IsOptional()
  @IsString()
  unverifiedRoleId?: string;

  @ApiProperty({ description: 'Log channel ID', required: false })
  @IsOptional()
  @IsString()
  logChannelId?: string;

  // Button Verification
  @ApiProperty({ description: 'Button label text', required: false })
  @IsOptional()
  @IsString()
  buttonLabel?: string;

  @ApiProperty({ description: 'Button emoji', required: false })
  @IsOptional()
  @IsString()
  buttonEmoji?: string;

  @ApiProperty({ description: 'Button style', enum: ButtonStyle, required: false })
  @IsOptional()
  @IsEnum(ButtonStyle)
  buttonStyle?: ButtonStyle;

  // Captcha Settings
  @ApiProperty({ description: 'Captcha length (4-8 characters)', required: false })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(8)
  captchaLength?: number;

  @ApiProperty({ description: 'Captcha timeout in seconds', required: false })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  captchaTimeout?: number;

  @ApiProperty({ description: 'Maximum captcha attempts', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  captchaAttempts?: number;

  // Reaction Verification
  @ApiProperty({ description: 'Reaction emoji', required: false })
  @IsOptional()
  @IsString()
  reactionEmoji?: string;

  @ApiProperty({ description: 'Reaction message', required: false })
  @IsOptional()
  @IsString()
  reactionMessage?: string;

  // Questions Verification
  @ApiProperty({ description: 'Array of verification questions', required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  questions?: Array<{
    question: string;
    answer: string;
    caseSensitive?: boolean;
  }>;

  // Anti-Bot Settings
  @ApiProperty({ description: 'Minimum account age in days', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  minAccountAge?: number;

  @ApiProperty({ description: 'Kick user on failed verification', required: false })
  @IsOptional()
  @IsBoolean()
  kickOnFail?: boolean;

  @ApiProperty({ description: 'Send DM on successful verification', required: false })
  @IsOptional()
  @IsBoolean()
  dmOnVerify?: boolean;

  @ApiProperty({ description: 'Send welcome message after verification', required: false })
  @IsOptional()
  @IsBoolean()
  welcomeAfterVerify?: boolean;

  // Custom Messages
  @ApiProperty({ description: 'Verification message', required: false })
  @IsOptional()
  @IsString()
  verifyMessage?: string;

  @ApiProperty({ description: 'Success message', required: false })
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiProperty({ description: 'Fail message', required: false })
  @IsOptional()
  @IsString()
  failMessage?: string;
}

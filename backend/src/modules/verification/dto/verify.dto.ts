import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyButtonDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class VerifyCaptchaDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Captcha answer' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({ description: 'Session ID for captcha', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class VerifyReactionDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Reaction emoji' })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class VerifyQuestionsDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Array of answers to verification questions' })
  @IsArray()
  @IsString({ each: true })
  answers: string[];
}

export class GenerateCaptchaDto {
  @ApiProperty({ description: 'Guild ID' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMuteDto {
  @ApiProperty({
    description: 'ID of the guild where the mute is issued',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({
    description: 'ID of the user being muted',
    example: '987654321098765432',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Username of the user being muted',
    example: 'BadUser#1234',
  })
  @IsString()
  @IsNotEmpty()
  targetUsername: string;

  @ApiProperty({
    description: 'ID of the moderator issuing the mute',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  moderatorId: string;

  @ApiProperty({
    description: 'Name of the moderator issuing the mute',
    example: 'ModUser#5678',
  })
  @IsString()
  @IsNotEmpty()
  moderatorName: string;

  @ApiProperty({
    description: 'Duration of the mute in seconds',
    example: 3600,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({
    description: 'Reason for the mute',
    example: 'Repeated spam after warning',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Channel ID where the mute occurred',
    example: '222222222222222222',
  })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Message ID related to the mute',
    example: '333333333333333333',
  })
  @IsString()
  @IsOptional()
  messageId?: string;
}

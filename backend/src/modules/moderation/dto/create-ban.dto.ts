import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBanDto {
  @ApiProperty({
    description: 'ID of the guild where the ban is issued',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({
    description: 'ID of the user being banned',
    example: '987654321098765432',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Username of the user being banned',
    example: 'BadUser#1234',
  })
  @IsString()
  @IsNotEmpty()
  targetUsername: string;

  @ApiProperty({
    description: 'ID of the moderator issuing the ban',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  moderatorId: string;

  @ApiProperty({
    description: 'Name of the moderator issuing the ban',
    example: 'ModUser#5678',
  })
  @IsString()
  @IsNotEmpty()
  moderatorName: string;

  @ApiPropertyOptional({
    description: 'Duration of the ban in seconds (if temporary)',
    example: 86400,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Reason for the ban',
    example: 'Severe rule violations',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Channel ID where the ban occurred',
    example: '222222222222222222',
  })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Message ID related to the ban',
    example: '333333333333333333',
  })
  @IsString()
  @IsOptional()
  messageId?: string;

  @ApiPropertyOptional({
    description: 'Number of days of messages to delete',
    example: 7,
    minimum: 0,
    maximum: 7,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deleteMessageDays?: number;
}

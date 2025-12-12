import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKickDto {
  @ApiProperty({
    description: 'ID of the guild where the kick is issued',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({
    description: 'ID of the user being kicked',
    example: '987654321098765432',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Username of the user being kicked',
    example: 'BadUser#1234',
  })
  @IsString()
  @IsNotEmpty()
  targetUsername: string;

  @ApiProperty({
    description: 'ID of the moderator issuing the kick',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  moderatorId: string;

  @ApiProperty({
    description: 'Name of the moderator issuing the kick',
    example: 'ModUser#5678',
  })
  @IsString()
  @IsNotEmpty()
  moderatorName: string;

  @ApiPropertyOptional({
    description: 'Reason for the kick',
    example: 'Disruptive behavior',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Channel ID where the kick occurred',
    example: '222222222222222222',
  })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Message ID related to the kick',
    example: '333333333333333333',
  })
  @IsString()
  @IsOptional()
  messageId?: string;
}

import { IsString, IsNotEmpty, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppealCaseDto {
  @ApiProperty({
    description: 'Reason for the appeal',
    example: 'I believe the punishment was too harsh and I have learned from my mistake',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;
}

export class ReviewAppealDto {
  @ApiProperty({
    description: 'Whether the appeal is approved',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  approved: boolean;

  @ApiProperty({
    description: 'ID of the reviewer',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  reviewerId: string;

  @ApiProperty({
    description: 'Name of the reviewer',
    example: 'AdminUser#1234',
  })
  @IsString()
  @IsNotEmpty()
  reviewerName: string;

  @ApiPropertyOptional({
    description: 'Review notes or reason',
    example: 'Appeal granted due to good behavior since incident',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reviewNotes?: string;
}

export class EditCaseDto {
  @ApiProperty({
    description: 'New reason for the case',
    example: 'Updated reason with more details',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiProperty({
    description: 'ID of the moderator editing the case',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  moderatorId: string;
}

export class RemovePunishmentDto {
  @ApiProperty({
    description: 'ID of the moderator removing the punishment',
    example: '111111111111111111',
  })
  @IsString()
  @IsNotEmpty()
  moderatorId: string;

  @ApiProperty({
    description: 'Name of the moderator removing the punishment',
    example: 'ModUser#5678',
  })
  @IsString()
  @IsNotEmpty()
  moderatorName: string;

  @ApiPropertyOptional({
    description: 'Reason for removing the punishment',
    example: 'Punishment lifted early due to appeal',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}

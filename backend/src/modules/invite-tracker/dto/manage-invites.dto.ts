import { IsInt, IsNotEmpty, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBonusInvitesDto {
  @ApiProperty({ description: 'Number of bonus invites to add', example: 5 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;
}

export class RemoveBonusInvitesDto {
  @ApiProperty({ description: 'Number of bonus invites to remove', example: 3 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;
}

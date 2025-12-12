import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RewardType {
  ROLE_ADD = 'ROLE_ADD',
  ROLE_REMOVE = 'ROLE_REMOVE',
  MESSAGE = 'MESSAGE',
  CREDITS = 'CREDITS',
  BADGE = 'BADGE',
}

export class CreateRewardDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === RewardType.ROLE_ADD)
  @IsString()
  roleId?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === RewardType.ROLE_REMOVE)
  @IsString()
  removeRoleId?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === RewardType.MESSAGE)
  @IsString()
  message?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === RewardType.CREDITS)
  @IsInt()
  @Min(1)
  credits?: number;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.type === RewardType.BADGE)
  @IsString()
  badgeId?: string;
}

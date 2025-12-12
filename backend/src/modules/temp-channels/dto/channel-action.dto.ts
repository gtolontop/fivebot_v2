import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetChannelNameDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;
}

export class SetChannelLimitDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  limit: number;
}

export class LockChannelDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;
}

export class UnlockChannelDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;
}

export class PermitUserDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsString()
  userId: string;
}

export class RejectUserDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsString()
  userId: string;
}

export class ClaimChannelDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  newOwnerId: string;
}

export class TransferOwnershipDto {
  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsString()
  newOwnerId: string;
}

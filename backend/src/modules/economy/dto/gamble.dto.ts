import { IsInt, Min, IsEnum, IsOptional, IsString } from 'class-validator';

export enum GambleType {
  SLOTS = 'SLOTS',
  COINFLIP = 'COINFLIP',
  DICE = 'DICE',
}

export class GambleDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(GambleType)
  type: GambleType;

  @IsOptional()
  @IsString()
  choice?: string; // For coinflip (heads/tails) or dice (number)
}

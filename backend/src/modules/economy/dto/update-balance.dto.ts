import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';

export enum BalanceUpdateType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  SET = 'SET',
}

export class UpdateBalanceDto {
  @IsInt()
  amount: number;

  @IsEnum(BalanceUpdateType)
  type: BalanceUpdateType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

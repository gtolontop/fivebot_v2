import { IsOptional, IsString, IsBoolean, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEconomyConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // Currency Settings
  @IsOptional()
  @IsString()
  currencyName?: string;

  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @IsOptional()
  @IsString()
  currencyEmoji?: string;

  // Starting Balance
  @IsOptional()
  @IsInt()
  @Min(0)
  startingBalance?: number;

  // Daily/Work Settings
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyCooldown?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  workMinAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  workMaxAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  workCooldown?: number;

  @IsOptional()
  @IsArray()
  workResponses?: string[];

  // Crime Settings
  @IsOptional()
  @IsInt()
  @Min(0)
  crimeMinAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  crimeMaxAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  crimeCooldown?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  crimeSuccessRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  crimeFinePercent?: number;

  @IsOptional()
  @IsArray()
  crimeResponses?: string[];

  // Rob Settings
  @IsOptional()
  @IsBoolean()
  robEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  robMinAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  robMaxPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  robCooldown?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  robSuccessRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  robFinePercent?: number;

  // Bank Settings
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBankBalance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  interestRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  interestInterval?: number;

  // Gambling Settings
  @IsOptional()
  @IsBoolean()
  gamblingEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamblingMinBet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamblingMaxBet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gamblingCooldown?: number;
}

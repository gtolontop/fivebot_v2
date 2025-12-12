import { IsString, IsInt, IsOptional, IsEnum, Min, IsBoolean } from 'class-validator';
import { ShopItemType } from '@prisma/client';

export class CreateShopItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ShopItemType)
  type: ShopItemType;

  // Item Properties
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxOwned?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;

  // Requirements
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredLevel?: number;

  @IsOptional()
  @IsString()
  requiredRoleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  tradeable?: boolean;

  @IsOptional()
  @IsBoolean()
  refundable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  refundPercent?: number;
}

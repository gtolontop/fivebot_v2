import { IsInt, Min, IsOptional } from 'class-validator';

export class BuyItemDto {
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number; // Maximum price willing to pay (for safety)
}

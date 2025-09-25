import { IsInt, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  stockQty!: number;
}

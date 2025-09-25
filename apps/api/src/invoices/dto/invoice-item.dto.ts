import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class InvoiceItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MaxLength(255)
  description!: string;

  @IsNumber()
  @IsPositive()
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lineDiscount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  taxCode?: string;
}

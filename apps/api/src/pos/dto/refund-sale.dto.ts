import { IsOptional, IsString } from 'class-validator';

export class RefundSaleDto {
  @IsString()
  saleId!: string;

  @IsOptional()
  @IsString()
  saleItemId?: string;

  @IsString()
  reason!: string;
}

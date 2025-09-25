import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PrintDeviceDto {
  @IsIn(['network', 'usb'])
  type!: 'network' | 'usb';

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsNumber()
  vendorId?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;
}

export class PrintSaleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PrintDeviceDto)
  device?: PrintDeviceDto;
}

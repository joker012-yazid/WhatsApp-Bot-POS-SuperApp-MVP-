import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../../common/constants/prisma.enums';

export class RecordPaymentDto {
  @IsEnum(PaymentMethod)
  method!: (typeof PaymentMethod)[keyof typeof PaymentMethod];

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

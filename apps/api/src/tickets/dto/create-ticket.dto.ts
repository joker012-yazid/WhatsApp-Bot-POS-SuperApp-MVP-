import { IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { TicketStatus } from '../../common/constants/prisma.enums';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  waSessionId?: string;

  @IsString()
  subject!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}

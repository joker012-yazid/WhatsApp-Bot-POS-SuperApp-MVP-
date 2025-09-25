import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { TicketStatus } from '../../common/constants/prisma.enums';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptQuoteDto {
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  invoiceNotes?: string;
}

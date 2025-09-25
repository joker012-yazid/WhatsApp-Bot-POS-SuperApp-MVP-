import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { CreditNoteItemDto } from './credit-note-item.dto';

export class CreateCreditNoteDto {
  @IsString()
  invoiceId!: string;

  @IsString()
  reason!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items!: CreditNoteItemDto[];
}

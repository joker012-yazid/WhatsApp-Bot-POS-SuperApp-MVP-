import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';

export class WebhookDto {
  @ValidateNested({ each: true })
  @Type(() => CreateMessageDto)
  @ArrayMinSize(1)
  messages!: CreateMessageDto[];
}

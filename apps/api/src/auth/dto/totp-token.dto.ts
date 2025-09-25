import { IsString, Length } from 'class-validator';

export class TotpTokenDto {
  @IsString()
  @Length(6, 6)
  token!: string;
}

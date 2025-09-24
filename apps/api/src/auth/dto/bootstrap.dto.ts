import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class BootstrapDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/)
  password!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  totpCode?: string;
}

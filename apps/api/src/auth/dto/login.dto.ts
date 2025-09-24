import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/)
  password!: string;

  @IsOptional()
  @IsString()
  totpCode?: string;

  @IsString()
  @IsNotEmpty()
  recaptchaToken!: string;
}

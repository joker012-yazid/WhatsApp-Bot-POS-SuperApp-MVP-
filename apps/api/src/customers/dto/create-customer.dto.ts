import { IsArray, IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  fullName!: string;

  @IsPhoneNumber('MY')
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

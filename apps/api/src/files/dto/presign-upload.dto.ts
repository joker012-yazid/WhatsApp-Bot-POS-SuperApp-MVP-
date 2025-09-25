import { IsMimeType, IsOptional, IsString } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  key!: string;

  @IsMimeType()
  mimeType!: string;

  @IsOptional()
  @IsString()
  expiresInSeconds?: string;
}

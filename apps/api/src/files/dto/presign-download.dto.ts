import { IsOptional, IsString } from 'class-validator';

export class PresignDownloadDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  expiresInSeconds?: string;
}

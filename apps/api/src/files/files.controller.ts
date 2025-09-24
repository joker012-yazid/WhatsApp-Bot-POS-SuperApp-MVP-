import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { PresignDownloadDto } from './dto/presign-download.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @Post('presign/upload')
  presignUpload(@Body() dto: PresignUploadDto) {
    const expires = dto.expiresInSeconds ? Number(dto.expiresInSeconds) : undefined;
    return this.filesService.presignUpload(dto.key, dto.mimeType, expires);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @Post('presign/download')
  presignDownload(@Body() dto: PresignDownloadDto) {
    const expires = dto.expiresInSeconds ? Number(dto.expiresInSeconds) : undefined;
    return this.filesService.presignDownload(dto.key, expires);
  }
}

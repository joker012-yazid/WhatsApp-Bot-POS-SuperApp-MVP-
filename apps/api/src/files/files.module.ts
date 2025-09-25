import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, RolesGuard, PrismaService],
  exports: [FilesService]
})
export class FilesModule {}

import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [FilesController],
  providers: [FilesService, RolesGuard],
  exports: [FilesService]
})
export class FilesModule {}

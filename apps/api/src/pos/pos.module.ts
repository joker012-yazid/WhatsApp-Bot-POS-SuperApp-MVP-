import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { PrismaService } from '../common/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { CacheService } from '../common/cache.service';

@Module({
  controllers: [PosController],
  providers: [PosService, PrismaService, RolesGuard, CacheService],
  exports: [PosService]
})
export class PosModule {}

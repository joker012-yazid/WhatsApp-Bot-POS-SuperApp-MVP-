import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../common/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService, RolesGuard],
  exports: [TicketsService]
})
export class TicketsModule {}

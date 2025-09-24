import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaService } from '../common/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, PrismaService, RolesGuard],
  exports: [CustomersService]
})
export class CustomersModule {}

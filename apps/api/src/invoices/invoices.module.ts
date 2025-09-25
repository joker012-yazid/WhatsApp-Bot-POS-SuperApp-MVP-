import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../common/prisma.service';
import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { InvoiceStatusGuard } from './invoices-status.guard';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    PrismaService,
    MathService,
    NumberingService,
    RolesGuard,
    InvoiceStatusGuard
  ],
  exports: [InvoicesService]
})
export class InvoicesModule {}

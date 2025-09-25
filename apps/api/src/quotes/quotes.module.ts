import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaService } from '../common/prisma.service';
import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { QuoteStatusGuard } from './quotes-status.guard';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, PrismaService, MathService, NumberingService, RolesGuard, QuoteStatusGuard],
  exports: [QuotesService]
})
export class QuotesModule {}

import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { PrismaService } from '../common/prisma.service';
import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { CreditNoteStatusGuard } from './credit-notes-status.guard';

@Module({
  controllers: [CreditNotesController],
  providers: [CreditNotesService, PrismaService, MathService, NumberingService, CreditNoteStatusGuard]
})
export class CreditNotesModule {}

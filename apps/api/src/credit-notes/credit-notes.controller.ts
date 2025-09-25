import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import type { Response } from 'express';
import { CreditNotesService } from './credit-notes.service';
import {
  CreditNoteStatus as CreditNoteStatusValue,
  Role
} from '../common/constants/prisma.enums';
import type { CreditNoteStatus as CreditNoteStatusType } from '../common/constants/prisma.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCreditNoteStatus } from './credit-note-status.decorator';
import { CreditNoteStatusGuard } from './credit-notes-status.guard';

@UseGuards(JwtAuthGuard, RolesGuard, CreditNoteStatusGuard)
@Controller('credit-notes')
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Get()
  list(@Query('branchId') branchId?: string, @Query('status') status?: string) {
    let normalizedStatus: CreditNoteStatusType | undefined;
    if (status) {
      if (!Object.values(CreditNoteStatusValue).includes(status as CreditNoteStatusType)) {
        throw new BadRequestException('Invalid credit note status');
      }
      normalizedStatus = status as CreditNoteStatusType;
    }
    return this.creditNotesService.list(branchId, normalizedStatus);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.creditNotesService.get(id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCreditNoteDto, @CurrentUser() user: any) {
    return this.creditNotesService.create(dto, user?.id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireCreditNoteStatus(CreditNoteStatusValue.ISSUED)
  @Post(':id/void')
  void(@Param('id') id: string, @CurrentUser() user: any) {
    return this.creditNotesService.void(id, user?.id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.creditNotesService.getPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="credit-note-${id}.pdf"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  }
}

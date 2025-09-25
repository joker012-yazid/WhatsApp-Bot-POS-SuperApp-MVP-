import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoiceStatus, Role } from '../common/constants/prisma.enums';
import type { InvoiceStatus as InvoiceStatusType } from '../common/constants/prisma.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RequireInvoiceStatus } from './invoice-status.decorator';
import { InvoiceStatusGuard } from './invoices-status.guard';

@UseGuards(JwtAuthGuard, RolesGuard, InvoiceStatusGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(@Query('branchId') branchId?: string, @Query('status') status?: string) {
    let normalizedStatus: InvoiceStatusType | undefined;
    if (status) {
      if (!Object.values(InvoiceStatus).includes(status as InvoiceStatusType)) {
        throw new BadRequestException('Invalid invoice status');
      }
      normalizedStatus = status as InvoiceStatusType;
    }
    return this.invoicesService.list(branchId, normalizedStatus);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.invoicesService.get(id);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @RequireInvoiceStatus(InvoiceStatus.DRAFT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireInvoiceStatus(InvoiceStatus.DRAFT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @RequireInvoiceStatus(InvoiceStatus.DRAFT)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.invoicesService.send(id);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @RequireInvoiceStatus(
    InvoiceStatus.DRAFT,
    InvoiceStatus.SENT,
    InvoiceStatus.PARTIALLY_PAID
  )
  @Post(':id/record-payment')
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.invoicesService.recordPayment(id, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireInvoiceStatus(
    InvoiceStatus.DRAFT,
    InvoiceStatus.SENT,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID
  )
  @Post(':id/void')
  void(@Param('id') id: string) {
    return this.invoicesService.void(id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.invoicesService.getPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
  }
}

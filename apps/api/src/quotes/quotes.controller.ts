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
  UseGuards
} from '@nestjs/common';
import { QuoteStatus as QuoteStatusValue } from '../common/constants/prisma.enums';
import type { QuoteStatus as QuoteStatusType } from '../common/constants/prisma.enums';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { AcceptQuoteDto } from './dto/accept-quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/prisma.enums';
import { RequireQuoteStatus } from './quote-status.decorator';
import { QuoteStatusGuard } from './quotes-status.guard';

@UseGuards(JwtAuthGuard, RolesGuard, QuoteStatusGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  list(@Query('branchId') branchId?: string, @Query('status') status?: string) {
    let normalizedStatus: QuoteStatusType | undefined;
    if (status) {
      if (!Object.values(QuoteStatusValue).includes(status as QuoteStatusType)) {
        throw new BadRequestException('Invalid quote status');
      }
      normalizedStatus = status as QuoteStatusType;
    }
    return this.quotesService.list(branchId, normalizedStatus);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.quotesService.get(id);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }

  @Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.quotesService.send(id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT, QuoteStatusValue.SENT)
  @Post(':id/accept')
  accept(@Param('id') id: string, @Body() dto: AcceptQuoteDto) {
    return this.quotesService.accept(id, dto);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT, QuoteStatusValue.SENT)
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.quotesService.cancel(id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @RequireQuoteStatus(QuoteStatusValue.DRAFT, QuoteStatusValue.SENT)
  @Post(':id/expire')
  expire(@Param('id') id: string) {
    return this.quotesService.expire(id);
  }
}

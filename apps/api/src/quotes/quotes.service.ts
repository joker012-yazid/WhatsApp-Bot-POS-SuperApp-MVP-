import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../common/prisma.service';
import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteEntity } from './entities/quote.entity';
import { QuoteItemDto } from './dto/quote-item.dto';
import { AcceptQuoteDto } from './dto/accept-quote.dto';
import { InvoiceStatus, QuoteStatus as QuoteStatusValue } from '../common/constants/prisma.enums';
import type { QuoteStatus as QuoteStatusType } from '../common/constants/prisma.enums';

const quoteInclude = {
  items: true,
  branch: true,
  customer: true
};

type QuoteItemRecord = {
  id: string;
  productId: string | null;
  description: string;
  qty: number | string;
  unitPrice: number | string;
  lineDiscount: number | string;
  lineTotal: number | string;
  taxCode: string | null;
};

type QuoteWithRelations = {
  id: string;
  quoteNo: string;
  branchId: string;
  customerId: string | null;
  itemsTotal: number | string;
  discountTotal: number | string;
  taxableSubtotal: number | string;
  sst: number | string;
  grandTotal: number | string;
  currency: string;
  status: QuoteStatusType;
  validUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: { id: string; name: string; code: string } | null;
  customer?: { id: string; fullName: string; phone: string; email: string | null } | null;
  items: QuoteItemRecord[];
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly math: MathService,
    private readonly numbering: NumberingService
  ) {}

  async list(branchId?: string, status?: QuoteStatusType) {
    const quotes = (await this.prisma.quote.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {})
      },
      include: quoteInclude,
      orderBy: { createdAt: 'desc' }
    })) as QuoteWithRelations[];
    return quotes.map((quote) => this.toEntity(quote));
  }

  async get(id: string) {
    const quote = await this.findQuoteOrThrow(id);
    return this.toEntity(quote);
  }

  async create(dto: CreateQuoteDto) {
    const totals = this.math.calculateQuoteTotals(
      dto.items.map((item) => ({
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount
      }))
    );

    const result = await this.prisma.$transaction(async (tx: any) => {
      await this.validateProducts(dto.branchId, dto.items, tx);
      const quoteNo = await this.numbering.generateQuoteNumber(dto.branchId, tx);
      const quote = await tx.quote.create({
        data: {
          quoteNo,
          branchId: dto.branchId,
          customerId: dto.customerId ?? null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          notes: dto.notes ?? null,
          itemsTotal: this.toDecimal(totals.itemsTotal),
          discountTotal: this.toDecimal(totals.discountTotal),
          taxableSubtotal: this.toDecimal(totals.taxableSubtotal),
          sst: this.toDecimal(totals.sst),
          grandTotal: this.toDecimal(totals.grandTotal),
          items: {
            create: dto.items.map((item, index) => ({
              productId: item.productId ?? null,
              description: item.description,
              qty: this.toDecimal(totals.items[index].qty),
              unitPrice: this.toDecimal(totals.items[index].unitPrice),
              lineDiscount: this.toDecimal(totals.items[index].lineDiscount),
              lineTotal: this.toDecimal(totals.items[index].lineTotal),
              taxCode: item.taxCode ?? null
            }))
          }
        },
        include: quoteInclude
      });
      return quote as QuoteWithRelations;
    });

    return this.toEntity(result as QuoteWithRelations);
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const result = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findQuoteOrThrow(id, tx);
      if (existing.status !== QuoteStatusValue.DRAFT) {
        throw new BadRequestException('Only draft quotes can be updated');
      }

      const sourceItems = dto.items
        ? dto.items.map((item) => ({
            productId: item.productId ?? null,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            lineDiscount: item.lineDiscount ?? 0,
            taxCode: item.taxCode ?? null
          }))
        : existing.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            lineDiscount: Number(item.lineDiscount),
            taxCode: item.taxCode
          }));

      if (dto.items) {
        await this.validateProducts(existing.branchId, dto.items, tx);
      }

      const totals = this.math.calculateQuoteTotals(
        sourceItems.map((item) => ({
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount
        }))
      );

      const data: any = {
        customerId: dto.customerId ?? undefined,
        validUntil:
          dto.validUntil !== undefined
            ? dto.validUntil
              ? new Date(dto.validUntil)
              : null
            : undefined,
        notes: dto.notes ?? undefined,
        itemsTotal: this.toDecimal(totals.itemsTotal),
        discountTotal: this.toDecimal(totals.discountTotal),
        taxableSubtotal: this.toDecimal(totals.taxableSubtotal),
        sst: this.toDecimal(totals.sst),
        grandTotal: this.toDecimal(totals.grandTotal)
      };

      if (dto.items) {
        data.items = {
          deleteMany: {},
          create: sourceItems.map((item, index) => ({
            productId: item.productId,
            description: item.description,
            qty: this.toDecimal(totals.items[index].qty),
            unitPrice: this.toDecimal(totals.items[index].unitPrice),
            lineDiscount: this.toDecimal(totals.items[index].lineDiscount),
            lineTotal: this.toDecimal(totals.items[index].lineTotal),
            taxCode: item.taxCode ?? null
          }))
        };
      }

      const updated = await tx.quote.update({
        where: { id },
        data,
        include: quoteInclude
      }) as QuoteWithRelations;

      return updated;
    });

    return this.toEntity(result as QuoteWithRelations);
  }

  async remove(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    if (quote.status !== QuoteStatusValue.DRAFT) {
      throw new BadRequestException('Only draft quotes can be deleted');
    }
    await this.prisma.quote.delete({ where: { id } });
  }

  async send(id: string) {
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findQuoteOrThrow(id, tx);
      if (existing.status !== QuoteStatusValue.DRAFT) {
        throw new BadRequestException('Only draft quotes can be sent');
      }
      return tx.quote.update({
        where: { id },
        data: { status: QuoteStatusValue.SENT },
        include: quoteInclude
      }) as QuoteWithRelations;
    });

    return this.toEntity(updated as QuoteWithRelations);
  }

  async cancel(id: string) {
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findQuoteOrThrow(id, tx);
      if (!([QuoteStatusValue.DRAFT, QuoteStatusValue.SENT] as string[]).includes(existing.status)) {
        throw new BadRequestException('Quote cannot be cancelled in current status');
      }
      return tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatusValue.CANCELLED,
          validUntil: new Date()
        },
        include: quoteInclude
      }) as QuoteWithRelations;
    });

    return this.toEntity(updated as QuoteWithRelations);
  }

  async expire(id: string) {
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findQuoteOrThrow(id, tx);
      if (!([QuoteStatusValue.DRAFT, QuoteStatusValue.SENT] as string[]).includes(existing.status)) {
        throw new BadRequestException('Quote cannot be expired in current status');
      }
      return tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatusValue.EXPIRED,
          validUntil: new Date()
        },
        include: quoteInclude
      }) as QuoteWithRelations;
    });

    return this.toEntity(updated as QuoteWithRelations);
  }

  async accept(id: string, dto: AcceptQuoteDto) {
    const result = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findQuoteOrThrow(id, tx);
      if (!([QuoteStatusValue.DRAFT, QuoteStatusValue.SENT] as string[]).includes(existing.status)) {
        throw new BadRequestException('Quote cannot be accepted in current status');
      }

      const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : DateTime.fromJSDate(issueDate).plus({ days: 30 }).toJSDate();

      const invoiceNo = await this.numbering.generateInvoiceNumber(existing.branchId, tx);

      const invoice = await tx.invoice.create({
        data: {
          branchId: existing.branchId,
          customerId: existing.customerId,
          quoteId: existing.id,
          invoiceNo,
          issueDate,
          dueDate,
          itemsTotal: existing.itemsTotal,
          discountTotal: existing.discountTotal,
          taxableSubtotal: existing.taxableSubtotal,
          sst: existing.sst,
          grandTotal: existing.grandTotal,
          paidTotal: '0.00',
          balanceDue: existing.grandTotal,
          currency: existing.currency,
          status: InvoiceStatus.SENT,
          notes: dto.invoiceNotes ?? existing.notes ?? null,
          items: {
            create: existing.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
              lineDiscount: item.lineDiscount,
              lineTotal: item.lineTotal,
              taxCode: item.taxCode ?? null
            }))
          }
        }
      });

      const updated = (await tx.quote.update({
        where: { id },
        data: { status: QuoteStatusValue.ACCEPTED },
        include: quoteInclude
      })) as QuoteWithRelations;

      return { quote: updated, invoice };
    });

    return {
      quote: this.toEntity(result.quote),
      invoiceId: result.invoice.id,
      invoiceNo: result.invoice.invoiceNo
    };
  }

  private async findQuoteOrThrow(id: string, tx?: any) {
    const client = tx ?? this.prisma;
    const quote = await client.quote.findUnique({
      where: { id },
      include: quoteInclude
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote as QuoteWithRelations;
  }

  private toEntity(quote: QuoteWithRelations): QuoteEntity {
    return new QuoteEntity({
      id: quote.id,
      quoteNo: quote.quoteNo,
      branchId: quote.branchId,
      customerId: quote.customerId,
      itemsTotal: Number(quote.itemsTotal),
      discountTotal: Number(quote.discountTotal),
      taxableSubtotal: Number(quote.taxableSubtotal),
      sst: Number(quote.sst),
      grandTotal: Number(quote.grandTotal),
      currency: quote.currency,
      status: quote.status,
      validUntil: quote.validUntil,
      notes: quote.notes,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      branch: quote.branch
        ? { id: quote.branch.id, name: quote.branch.name, code: quote.branch.code }
        : undefined,
      customer: quote.customer
        ? {
            id: quote.customer.id,
            fullName: quote.customer.fullName,
            phone: quote.customer.phone,
            email: quote.customer.email ?? null
          }
        : null,
      items: quote.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        lineDiscount: Number(item.lineDiscount),
        lineTotal: Number(item.lineTotal),
        taxCode: item.taxCode ?? null
      }))
    });
  }

  private toDecimal(value: number) {
    return value.toFixed(2);
  }

  private async validateProducts(branchId: string, items: QuoteItemDto[], tx: any) {
    const productIds = Array.from(
      new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))
    );
    if (!productIds.length) {
      return;
    }
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        branchId
      },
      select: { id: true }
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products do not belong to the branch');
    }
  }
}

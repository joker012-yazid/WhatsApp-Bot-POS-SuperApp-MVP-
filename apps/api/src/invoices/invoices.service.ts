import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MathService } from '../common/math/math.service';
import { PrismaService } from '../common/prisma.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceStatus, PaymentMethod } from '../common/constants/prisma.enums';
import { renderInvoicePdf } from './templates/invoice-pdf.template';

const invoiceInclude = {
  items: true,
  payments: { orderBy: { paidAt: 'asc' } },
  branch: true,
  customer: true,
  quote: true
};

type InvoiceItemRecord = {
  id: string;
  productId: string | null;
  description: string;
  qty: Prisma.Decimal | number | string;
  unitPrice: Prisma.Decimal | number | string;
  lineDiscount: Prisma.Decimal | number | string;
  lineTotal: Prisma.Decimal | number | string;
  taxCode: string | null;
};

type InvoicePaymentRecord = {
  id: string;
  method: (typeof PaymentMethod)[keyof typeof PaymentMethod];
  amount: Prisma.Decimal | number | string;
  reference: string | null;
  paidAt: Date;
};

type InvoiceWithRelations = {
  id: string;
  invoiceNo: string;
  branchId: string;
  customerId: string | null;
  quoteId: string | null;
  issueDate: Date;
  dueDate: Date | null;
  itemsTotal: Prisma.Decimal | number | string;
  discountTotal: Prisma.Decimal | number | string;
  taxableSubtotal: Prisma.Decimal | number | string;
  sst: Prisma.Decimal | number | string;
  grandTotal: Prisma.Decimal | number | string;
  paidTotal: Prisma.Decimal | number | string;
  balanceDue: Prisma.Decimal | number | string;
  currency: string;
  status: (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
  posSaleId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: { id: string; name: string; code: string } | null;
  customer?: { id: string; fullName: string; phone: string; email: string | null } | null;
  quote?: { id: string; quoteNo: string } | null;
  items: InvoiceItemRecord[];
  payments: InvoicePaymentRecord[];
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly math: MathService,
    private readonly numbering: NumberingService
  ) {}

  async list(branchId?: string, status?: (typeof InvoiceStatus)[keyof typeof InvoiceStatus]) {
    const invoices = (await this.prisma.invoice.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {})
      },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' }
    })) as InvoiceWithRelations[];
    return invoices.map((invoice) => this.toEntity(invoice));
  }

  async get(id: string) {
    const invoice = await this.findInvoiceOrThrow(id);
    return this.toEntity(invoice);
  }

  async create(dto: CreateInvoiceDto) {
    const totals = this.calculateTotals(dto.items.map((item) => ({
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount ?? 0
    })));

    const result = await this.prisma.$transaction(async (tx: any) => {
      await this.validateProducts(dto.branchId, dto.items, tx);
      const invoiceNo = await this.numbering.generateInvoiceNumber(dto.branchId, tx);
      const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      const invoice = await tx.invoice.create({
        data: {
          invoiceNo,
          branchId: dto.branchId,
          customerId: dto.customerId ?? null,
          quoteId: dto.quoteId ?? null,
          issueDate,
          dueDate,
          itemsTotal: this.toDecimal(totals.itemsTotal),
          discountTotal: this.toDecimal(totals.discountTotal),
          taxableSubtotal: this.toDecimal(totals.taxableSubtotal),
          sst: this.toDecimal(totals.sst),
          grandTotal: this.toDecimal(totals.grandTotal),
          paidTotal: this.toDecimal(0),
          balanceDue: this.toDecimal(totals.grandTotal),
          currency: dto.currency ?? 'MYR',
          status: InvoiceStatus.DRAFT,
          posSaleId: dto.posSaleId ?? null,
          notes: dto.notes ?? null,
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
        include: invoiceInclude
      });

      return invoice as InvoiceWithRelations;
    });

    return this.toEntity(result);
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const result = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findInvoiceOrThrow(id, tx);
      if (existing.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException('Only draft invoices can be updated');
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
            taxCode: item.taxCode ?? null
          }));

      if (dto.items) {
        await this.validateProducts(existing.branchId, dto.items, tx);
      }

      const totals = this.calculateTotals(
        sourceItems.map((item) => ({
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount
        }))
      );

      const paidSoFar = this.round(Number(existing.paidTotal));

      const data: Prisma.InvoiceUpdateInput = {
        customerId: dto.customerId ?? undefined,
        notes: dto.notes ?? undefined,
        issueDate:
          dto.issueDate !== undefined
            ? dto.issueDate
              ? new Date(dto.issueDate)
              : existing.issueDate
            : undefined,
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? new Date(dto.dueDate)
              : null
            : undefined,
        currency: dto.currency ?? undefined,
        posSaleId: dto.posSaleId ?? undefined,
        itemsTotal: this.toDecimal(totals.itemsTotal),
        discountTotal: this.toDecimal(totals.discountTotal),
        taxableSubtotal: this.toDecimal(totals.taxableSubtotal),
        sst: this.toDecimal(totals.sst),
        grandTotal: this.toDecimal(totals.grandTotal),
        balanceDue: this.toDecimal(Math.max(totals.grandTotal - paidSoFar, 0)),
        items: dto.items
          ? {
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
            }
          : undefined
      };

      const updated = (await tx.invoice.update({
        where: { id },
        data,
        include: invoiceInclude
      })) as InvoiceWithRelations;

      return updated;
    });

    return this.toEntity(result);
  }

  async remove(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be deleted');
    }
    await this.prisma.invoice.delete({ where: { id } });
  }

  async send(id: string) {
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findInvoiceOrThrow(id, tx);
      if (existing.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException('Only draft invoices can be sent');
      }
      return (await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.SENT },
        include: invoiceInclude
      })) as InvoiceWithRelations;
    });

    return this.toEntity(updated);
  }

  async recordPayment(id: string, dto: RecordPaymentDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findInvoiceOrThrow(id, tx);
      if (existing.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Cannot record payment for a void invoice');
      }

      const amount = this.round(dto.amount);
      const paidSoFar = this.round(Number(existing.paidTotal));
      const grandTotal = this.round(Number(existing.grandTotal));
      const newPaid = this.round(paidSoFar + amount);
      if (newPaid - grandTotal > 0.01) {
        throw new BadRequestException('Payment exceeds outstanding balance');
      }

      await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          method: dto.method,
          amount: this.toDecimal(amount),
          reference: dto.reference ?? null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date()
        }
      });

      const status = newPaid >= grandTotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      const balanceDue = this.round(Math.max(grandTotal - newPaid, 0));

      const updated = (await tx.invoice.update({
        where: { id },
        data: {
          paidTotal: this.toDecimal(newPaid),
          balanceDue: this.toDecimal(balanceDue),
          status
        },
        include: invoiceInclude
      })) as InvoiceWithRelations;

      return updated;
    });

    return this.toEntity(result);
  }

  async void(id: string) {
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const existing = await this.findInvoiceOrThrow(id, tx);
      if (existing.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Invoice is already void');
      }
      return (await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.VOID },
        include: invoiceInclude
      })) as InvoiceWithRelations;
    });

    return this.toEntity(updated);
  }

  async getPdf(id: string) {
    const invoice = await this.findInvoiceOrThrow(id);
    const entity = this.toEntity(invoice);
    return renderInvoicePdf(entity);
  }

  private async findInvoiceOrThrow(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const invoice = await client.invoice.findUnique({
      where: { id },
      include: invoiceInclude
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice as InvoiceWithRelations;
  }

  private calculateTotals(items: { qty: number; unitPrice: number; lineDiscount?: number }[]) {
    return this.math.calculateQuoteTotals(
      items.map((item) => ({
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount ?? 0
      }))
    );
  }

  private toEntity(invoice: InvoiceWithRelations): InvoiceEntity {
    return new InvoiceEntity({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      branchId: invoice.branchId,
      customerId: invoice.customerId,
      quoteId: invoice.quoteId,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      itemsTotal: Number(invoice.itemsTotal),
      discountTotal: Number(invoice.discountTotal),
      taxableSubtotal: Number(invoice.taxableSubtotal),
      sst: Number(invoice.sst),
      grandTotal: Number(invoice.grandTotal),
      paidTotal: Number(invoice.paidTotal),
      balanceDue: Number(invoice.balanceDue),
      currency: invoice.currency,
      status: invoice.status,
      posSaleId: invoice.posSaleId,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      branch: invoice.branch
        ? { id: invoice.branch.id, name: invoice.branch.name, code: invoice.branch.code }
        : undefined,
      customer: invoice.customer
        ? {
            id: invoice.customer.id,
            fullName: invoice.customer.fullName,
            phone: invoice.customer.phone,
            email: invoice.customer.email
          }
        : null,
      quote: invoice.quote ? { id: invoice.quote.id, quoteNo: invoice.quote.quoteNo } : null,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        lineDiscount: Number(item.lineDiscount),
        lineTotal: Number(item.lineTotal),
        taxCode: item.taxCode
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: Number(payment.amount),
        reference: payment.reference,
        paidAt: payment.paidAt
      }))
    });
  }

  private toDecimal(value: number) {
    return value.toFixed(2);
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async validateProducts(
    branchId: string,
    items: { productId?: string }[],
    tx: Prisma.TransactionClient
  ) {
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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma.service';
import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreditNoteEntity } from './entities/credit-note.entity';
import { CreditNoteStatus, InvoiceStatus } from '../common/constants/prisma.enums';
import { renderCreditNotePdf } from './templates/credit-note-pdf.template';

const creditNoteInclude = {
  items: true,
  branch: true,
  invoice: {
    include: {
      customer: true
    }
  }
};

type DecimalLike = Decimal | number | string;

type CreditNoteItemRecord = {
  id: string;
  invoiceItemId: string | null;
  productId: string | null;
  description: string;
  qty: DecimalLike;
  unitPrice: DecimalLike;
  lineDiscount: DecimalLike;
  lineTotal: DecimalLike;
  taxCode: string | null;
};

type CreditNoteWithRelations = {
  id: string;
  creditNoteNo: string;
  branchId: string;
  invoiceId: string;
  reason: string;
  itemsTotal: DecimalLike;
  discountTotal: DecimalLike;
  taxableSubtotal: DecimalLike;
  sst: DecimalLike;
  grandTotal: DecimalLike;
  currency: string;
  status: (typeof CreditNoteStatus)[keyof typeof CreditNoteStatus];
  createdAt: Date;
  updatedAt: Date;
  items: CreditNoteItemRecord[];
  branch?: { id: string; name: string; code: string } | null;
  invoice?: {
    id: string;
    invoiceNo: string;
    status: (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
    balanceDue: DecimalLike;
    grandTotal: DecimalLike;
    paidTotal: DecimalLike;
    customer?: { id: string; fullName: string; phone: string; email: string | null } | null;
  } | null;
};

type InvoiceItemRecord = {
  id: string;
  productId: string | null;
  description: string;
  qty: DecimalLike;
  unitPrice: DecimalLike;
  lineDiscount: DecimalLike;
  lineTotal: DecimalLike;
  taxCode: string | null;
};

type InvoiceWithItems = {
  id: string;
  branchId: string;
  balanceDue: DecimalLike;
  grandTotal: DecimalLike;
  paidTotal: DecimalLike;
  currency: string;
  status: (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
  branch?: { id: string; name: string; code: string } | null;
  customer?: { id: string; fullName: string; phone: string; email: string | null } | null;
  items: InvoiceItemRecord[];
};

type ResolvedItem = {
  invoiceItemId: string | null;
  productId: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  taxCode: string | null;
};

@Injectable()
export class CreditNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly math: MathService,
    private readonly numbering: NumberingService
  ) {}

  async list(branchId?: string, status?: (typeof CreditNoteStatus)[keyof typeof CreditNoteStatus]) {
    const creditNotes = (await this.prisma.creditNote.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {})
      },
      include: creditNoteInclude,
      orderBy: { createdAt: 'desc' }
    })) as CreditNoteWithRelations[];
    return creditNotes.map((creditNote) => this.toEntity(creditNote));
  }

  async get(id: string) {
    const creditNote = await this.findCreditNoteOrThrow(id);
    return this.toEntity(creditNote);
  }

  async create(dto: CreateCreditNoteDto, actorId?: string) {
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const invoice = await this.ensureInvoice(dto.invoiceId, tx);
      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Cannot issue a credit note for a void invoice');
      }

      const resolvedItems = this.resolveItems(invoice, dto.items);
      const totals = this.calculateTotals(resolvedItems);

      const invoiceBalance = this.round(Number(invoice.balanceDue));
      if (totals.grandTotal > invoiceBalance + 1e-6) {
        throw new BadRequestException('Credit note amount exceeds the outstanding invoice balance');
      }

      await this.validateProducts(invoice.branchId, resolvedItems, tx);

      const creditNoteNo = await this.numbering.generateCreditNoteNumber(invoice.branchId, tx);

      const created = await tx.creditNote.create({
        data: {
          creditNoteNo,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          reason: dto.reason,
          itemsTotal: this.toDecimal(totals.itemsTotal),
          discountTotal: this.toDecimal(totals.discountTotal),
          taxableSubtotal: this.toDecimal(totals.taxableSubtotal),
          sst: this.toDecimal(totals.sst),
          grandTotal: this.toDecimal(totals.grandTotal),
          currency: invoice.currency,
          items: {
            create: resolvedItems.map((item, index) => ({
              invoiceItemId: item.invoiceItemId,
              productId: item.productId,
              description: item.description,
              qty: this.toDecimal(totals.items[index].qty),
              unitPrice: this.toDecimal(totals.items[index].unitPrice),
              lineDiscount: this.toDecimal(totals.items[index].lineDiscount),
              lineTotal: this.toDecimal(totals.items[index].lineTotal),
              taxCode: item.taxCode
            }))
          }
        },
        include: creditNoteInclude
      });

      await this.adjustInvoice(invoice, totals.grandTotal, tx);

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'CREDIT_NOTE_CREATED',
          details: {
            creditNoteId: created.id,
            creditNoteNo,
            invoiceId: invoice.id,
            amount: totals.grandTotal
          }
        }
      });

      const refreshed = await tx.creditNote.findUnique({
        where: { id: created.id },
        include: creditNoteInclude
      });

      if (!refreshed) {
        throw new NotFoundException('Credit note not found after creation');
      }

      return refreshed as CreditNoteWithRelations;
    });

    return this.toEntity(result);
  }

  async void(id: string, actorId?: string) {
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const creditNote = await this.findCreditNoteOrThrow(id, tx);
      if (creditNote.status !== CreditNoteStatus.ISSUED) {
        throw new BadRequestException('Only issued credit notes can be voided');
      }

      if (!creditNote.invoice) {
        throw new BadRequestException('Credit note is missing related invoice information');
      }

      await this.adjustInvoice(creditNote.invoice, -Number(creditNote.grandTotal), tx);

      const updated = await tx.creditNote.update({
        where: { id },
        data: { status: CreditNoteStatus.VOID },
        include: creditNoteInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'CREDIT_NOTE_VOIDED',
          details: {
            creditNoteId: id,
            invoiceId: creditNote.invoice.id,
            amount: Number(creditNote.grandTotal)
          }
        }
      });

      return updated as CreditNoteWithRelations;
    });

    return this.toEntity(result);
  }

  async getPdf(id: string) {
    const creditNote = await this.findCreditNoteOrThrow(id);
    const entity = this.toEntity(creditNote);
    return renderCreditNotePdf(entity);
  }

  private async ensureInvoice(id: string, tx: Prisma.TransactionClient) {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        branch: true,
        customer: true
      }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice as InvoiceWithItems;
  }

  private calculateTotals(items: ResolvedItem[]) {
    return this.math.calculateQuoteTotals(
      items.map((item) => ({
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount
      }))
    );
  }

  private resolveItems(invoice: InvoiceWithItems, items: CreateCreditNoteDto['items']) {
    if (!items.length) {
      throw new BadRequestException('At least one credit note item is required');
    }

    return items.map((item) => {
      const invoiceItem = item.invoiceItemId
        ? invoice.items.find((line) => line.id === item.invoiceItemId)
        : undefined;

      if (item.invoiceItemId && !invoiceItem) {
        throw new BadRequestException('Invoice item does not belong to the selected invoice');
      }

      const description = item.description ?? invoiceItem?.description;
      if (!description) {
        throw new BadRequestException('Description is required for credit note items');
      }

      const qty =
        item.qty ?? (invoiceItem ? Number(invoiceItem.qty) : undefined);
      if (typeof qty !== 'number' || !Number.isFinite(qty)) {
        throw new BadRequestException('Quantity is required for credit note items');
      }

      const unitPrice =
        item.unitPrice ?? (invoiceItem ? Number(invoiceItem.unitPrice) : undefined);
      if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) {
        throw new BadRequestException('Unit price is required for credit note items');
      }

      const lineDiscount =
        item.lineDiscount ?? (invoiceItem ? Number(invoiceItem.lineDiscount) : 0);
      if (lineDiscount < 0) {
        throw new BadRequestException('Line discount cannot be negative');
      }

      const taxCode = item.taxCode ?? invoiceItem?.taxCode ?? null;
      const productId = item.productId ?? invoiceItem?.productId ?? null;

      return {
        invoiceItemId: item.invoiceItemId ?? null,
        productId,
        description,
        qty,
        unitPrice,
        lineDiscount,
        taxCode
      } as ResolvedItem;
    });
  }

  private async validateProducts(
    branchId: string,
    items: ResolvedItem[],
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
      throw new BadRequestException('One or more products do not belong to the invoice branch');
    }
  }

  private async adjustInvoice(
    invoice: InvoiceWithItems | CreditNoteWithRelations['invoice'],
    adjustment: number,
    tx: Prisma.TransactionClient
  ) {
    if (!invoice) {
      throw new BadRequestException('Invoice context is required');
    }

    const currentBalance = this.round(Number(invoice.balanceDue));
    const currentGrandTotal = this.round(Number(invoice.grandTotal));
    const paidTotal = this.round(Number(invoice.paidTotal));
    const normalizedAdjustment = this.round(adjustment);

    const newBalance = this.round(currentBalance - normalizedAdjustment);
    const newGrandTotal = this.round(currentGrandTotal - normalizedAdjustment);

    if (newBalance < -1e-6) {
      throw new BadRequestException('Invoice balance cannot become negative');
    }

    const status = this.resolveInvoiceStatus(invoice.status, paidTotal, newBalance);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        balanceDue: this.toDecimal(Math.max(newBalance, 0)),
        grandTotal: this.toDecimal(Math.max(newGrandTotal, 0)),
        status
      }
    });
  }

  private resolveInvoiceStatus(
    currentStatus: (typeof InvoiceStatus)[keyof typeof InvoiceStatus],
    paidTotal: number,
    balanceDue: number
  ) {
    if (currentStatus === InvoiceStatus.VOID) {
      return InvoiceStatus.VOID;
    }

    if (balanceDue <= 0.0001) {
      return InvoiceStatus.PAID;
    }

    if (paidTotal > 0) {
      return InvoiceStatus.PARTIALLY_PAID;
    }

    if (currentStatus === InvoiceStatus.DRAFT) {
      return InvoiceStatus.DRAFT;
    }

    return InvoiceStatus.SENT;
  }

  private async findCreditNoteOrThrow(id: string, tx?: Prisma.TransactionClient) {
    const executor = tx ?? this.prisma;
    const creditNote = await executor.creditNote.findUnique({
      where: { id },
      include: creditNoteInclude
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    return creditNote as CreditNoteWithRelations;
  }

  private toEntity(creditNote: CreditNoteWithRelations) {
    return new CreditNoteEntity({
      id: creditNote.id,
      creditNoteNo: creditNote.creditNoteNo,
      branchId: creditNote.branchId,
      invoiceId: creditNote.invoiceId,
      reason: creditNote.reason,
      itemsTotal: Number(creditNote.itemsTotal),
      discountTotal: Number(creditNote.discountTotal),
      taxableSubtotal: Number(creditNote.taxableSubtotal),
      sst: Number(creditNote.sst),
      grandTotal: Number(creditNote.grandTotal),
      currency: creditNote.currency,
      status: creditNote.status,
      createdAt: creditNote.createdAt,
      updatedAt: creditNote.updatedAt,
      branch: creditNote.branch
        ? { id: creditNote.branch.id, name: creditNote.branch.name, code: creditNote.branch.code }
        : undefined,
      invoice: creditNote.invoice
        ? {
            id: creditNote.invoice.id,
            invoiceNo: creditNote.invoice.invoiceNo,
            status: creditNote.invoice.status,
            balanceDue: Number(creditNote.invoice.balanceDue),
            grandTotal: Number(creditNote.invoice.grandTotal),
            paidTotal: Number(creditNote.invoice.paidTotal),
            customer: creditNote.invoice.customer
              ? {
                  id: creditNote.invoice.customer.id,
                  fullName: creditNote.invoice.customer.fullName,
                  phone: creditNote.invoice.customer.phone,
                  email: creditNote.invoice.customer.email
                }
              : null
          }
        : undefined,
      items: creditNote.items.map((item) => ({
        id: item.id,
        invoiceItemId: item.invoiceItemId,
        productId: item.productId,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        lineDiscount: Number(item.lineDiscount),
        lineTotal: Number(item.lineTotal),
        taxCode: item.taxCode
      }))
    });
  }

  private toDecimal(value: number) {
    return value.toFixed(2);
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

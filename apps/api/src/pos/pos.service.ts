import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, SaleItem } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSaleDto, SaleItemDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { PrintSaleDto } from './dto/print-sale.dto';
import { DateTime } from 'luxon';

const SST_RATE = 0.06;
const TIMEZONE = 'Asia/Kuala_Lumpur';

function computeLineTotal(item: SaleItemDto) {
  const gross = item.unitPriceCents * item.quantity;
  const discount = item.discountCents ?? 0;
  if (discount > gross) {
    throw new BadRequestException('Discount cannot exceed line total');
  }
  return gross - discount;
}

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  listProducts(branchId?: string) {
    return this.prisma.product.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' }
    });
  }

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.ensureProduct(id);
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } }
      });
      if (existing) {
        throw new BadRequestException('SKU already exists');
      }
    }
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async deleteProduct(id: string) {
    await this.ensureProduct(id);
    return this.prisma.product.delete({ where: { id } });
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private buildReceiptUrl(saleId: string) {
    const base =
      process.env.RECEIPT_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, '') ||
      process.env.CORS_ORIGIN ||
      `https://${process.env.DOMAIN ?? 'whatsappbot.laptoppro.my'}`;
    return `${base?.replace(/\/$/, '')}/receipts/${saleId}`;
  }

  private calculateTotals(items: SaleItemDto[]) {
    const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    const discountCents = items.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
    if (discountCents > subtotalCents) {
      throw new BadRequestException('Discount exceeds subtotal');
    }
    const netCents = subtotalCents - discountCents;
    const taxCents = Math.round(netCents * SST_RATE + Number.EPSILON);
    const totalCents = netCents + taxCents;
    return { subtotalCents, discountCents, taxCents, totalCents };
  }

  async printSale(saleId: string, dto: PrintSaleDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        branch: true,
        customer: true,
        items: { include: { product: true } }
      }
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (!dto.device) {
      throw new BadRequestException('Printer device configuration is required');
    }

    if (dto.device.type === 'network' && !dto.device.host) {
      throw new BadRequestException('Network printer host is required');
    }

    const receiptUrl = this.buildReceiptUrl(sale.id);
    const payload = {
      saleId: sale.id,
      receiptNo: sale.receiptNo,
      createdAt: sale.createdAt.toISOString(),
      paymentMethod: sale.paymentMethod,
      branch: {
        id: sale.branch?.id,
        code: sale.branch?.code,
        name: sale.branch?.name,
        address: sale.branch?.address,
        phone: sale.branch?.phone
      },
      customer: sale.customer
        ? {
            id: sale.customer.id,
            name: sale.customer.fullName,
            phone: sale.customer.phone
          }
        : undefined,
      totals: {
        subtotalCents: sale.subtotalCents,
        discountCents: sale.discountCents,
        taxCents: sale.taxCents,
        totalCents: sale.totalCents
      },
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.product?.name ?? item.productId,
        sku: item.product?.sku,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice,
        discountCents: item.discountCents,
        totalCents: item.totalCents
      })),
      receiptUrl,
      device: dto.device
    };

    const baseUrl = (process.env.PRINT_SERVER_URL || 'http://print-server:4010').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/print/direct`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'receipt', payload })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Print server error (${response.status}): ${errorText || 'unknown error'}`
      );
    }

    return response.json();
  }

  private async generateReceiptNo(tx: Prisma.TransactionClient, branchId: string) {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    const now = DateTime.now().setZone(TIMEZONE);
    const start = now.startOf('day').toJSDate();
    const end = now.endOf('day').toJSDate();
    const count = await tx.sale.count({
      where: {
        branchId,
        createdAt: {
          gte: start,
          lt: end
        }
      }
    });
    const seq = String(count + 1).padStart(4, '0');
    const date = now.toFormat('yyyyLLdd');
    return `BR${branch.code}-${date}-${seq}`;
  }

  async createSale(dto: CreateSaleDto, actorId?: string) {
    dto.items.forEach((item) => computeLineTotal(item));
    const totals = this.calculateTotals(dto.items);

    return this.prisma.$transaction(async (tx) => {
      const receiptNo = await this.generateReceiptNo(tx, dto.branchId);
      const sale = await tx.sale.create({
        data: {
          branchId: dto.branchId,
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          receiptNo,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPriceCents,
              discountCents: item.discountCents ?? 0,
              totalCents: computeLineTotal(item)
            }))
          }
        }
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          saleId: sale.id,
          action: 'SALE_CREATED',
          details: {
            receiptNo: sale.receiptNo,
            paymentMethod: sale.paymentMethod,
            totalCents: sale.totalCents
          }
        }
      });

      return sale;
    });
  }

  async refundSale(dto: RefundSaleDto, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: dto.saleId },
        include: { items: true }
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const itemsToRefund = dto.saleItemId
        ? [this.findItemOrThrow(sale.items, dto.saleItemId)]
        : sale.items;

      const refundItems = itemsToRefund.map((item) => ({
        productId: item.productId,
        quantity: -item.quantity,
        unitPrice: item.unitPrice,
        discountCents: item.discountCents ? -item.discountCents : 0,
        totalCents: -item.totalCents
      }));

      const subtotalCents = itemsToRefund.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const discountCents = itemsToRefund.reduce(
        (sum, item) => sum + item.discountCents,
        0
      );
      const netCents = subtotalCents - discountCents;
      const taxCents = Math.round(netCents * SST_RATE + Number.EPSILON);
      const totalCents = netCents + taxCents;

      const receiptNo = `${sale.receiptNo}-R`;
      const refund = await tx.sale.create({
        data: {
          branchId: sale.branchId,
          customerId: sale.customerId,
          paymentMethod: sale.paymentMethod,
          receiptNo,
          subtotalCents: -subtotalCents,
          discountCents: -discountCents,
          taxCents: -taxCents,
          totalCents: -totalCents,
          items: {
            create: refundItems
          }
        }
      });

      for (const item of itemsToRefund) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          saleId: sale.id,
          action: 'SALE_REFUND',
          details: {
            refundSaleId: refund.id,
            reason: dto.reason,
            refundedItems: itemsToRefund.map((item) => item.id)
          }
        }
      });

      return refund;
    });
  }

  private findItemOrThrow(items: SaleItem[], id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) {
      throw new NotFoundException('Sale item not found');
    }
    return item;
  }
}

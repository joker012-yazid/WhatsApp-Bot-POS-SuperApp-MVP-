import { BadRequestException, Injectable } from '@nestjs/common';

type LineInput = {
  description?: string;
  qty: number;
  unitPrice: number;
  lineDiscount?: number;
};

export type CalculatedLine = {
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  gross: number;
};

export type QuoteTotals = {
  items: CalculatedLine[];
  itemsTotal: number;
  discountTotal: number;
  taxableSubtotal: number;
  sst: number;
  grandTotal: number;
};

const SST_RATE = 0.06;

@Injectable()
export class MathService {
  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private sanitizeNumber(value: number, field: string) {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${field} must be a finite number`);
    }
    return this.round(value);
  }

  calculateLine(item: LineInput): CalculatedLine {
    const qty = this.sanitizeNumber(item.qty, 'Quantity');
    if (qty <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    const unitPrice = this.sanitizeNumber(item.unitPrice, 'Unit price');
    if (unitPrice < 0) {
      throw new BadRequestException('Unit price cannot be negative');
    }
    const gross = this.round(qty * unitPrice);
    const lineDiscount = this.sanitizeNumber(item.lineDiscount ?? 0, 'Line discount');
    if (lineDiscount < 0) {
      throw new BadRequestException('Line discount cannot be negative');
    }
    if (lineDiscount > gross) {
      throw new BadRequestException('Line discount cannot exceed gross amount');
    }
    const lineTotal = this.round(gross - lineDiscount);
    return { qty, unitPrice, lineDiscount, lineTotal, gross };
  }

  calculateQuoteTotals(items: LineInput[]): QuoteTotals {
    if (!items.length) {
      throw new BadRequestException('At least one line item is required');
    }
    const calculated = items.map((item) => this.calculateLine(item));
    const itemsTotal = this.round(calculated.reduce((sum, item) => sum + item.gross, 0));
    const discountTotal = this.round(
      calculated.reduce((sum, item) => sum + item.lineDiscount, 0)
    );
    if (discountTotal > itemsTotal) {
      throw new BadRequestException('Total discount cannot exceed items total');
    }
    const taxableSubtotal = this.round(itemsTotal - discountTotal);
    const sst = this.round(taxableSubtotal * SST_RATE);
    const grandTotal = this.round(taxableSubtotal + sst);
    return { items: calculated, itemsTotal, discountTotal, taxableSubtotal, sst, grandTotal };
  }
}

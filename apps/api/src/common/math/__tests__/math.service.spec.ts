import { BadRequestException } from '@nestjs/common';
import { MathService } from '../math.service';

describe('MathService', () => {
  let service: MathService;

  beforeEach(() => {
    service = new MathService();
  });

  it('rounds monetary values half-up to two decimals', () => {
    const line = service.calculateLine({ qty: 1, unitPrice: 1.005, lineDiscount: 0.005 });

    expect(line.unitPrice).toBe(1.01);
    expect(line.lineDiscount).toBe(0.01);
    expect(line.gross).toBe(1.01);
    expect(line.lineTotal).toBe(1);
  });

  it('applies discount before SST and produces consistent totals', () => {
    const totals = service.calculateQuoteTotals([
      { qty: 2, unitPrice: 49.955, lineDiscount: 0.005 },
      { qty: 1, unitPrice: 100.005, lineDiscount: 10.005 }
    ]);

    expect(totals.itemsTotal).toBe(199.93);
    expect(totals.discountTotal).toBe(10.02);
    expect(totals.taxableSubtotal).toBe(189.91);
    expect(totals.sst).toBe(11.39);
    expect(totals.grandTotal).toBe(201.3);
  });

  it('throws when a line discount exceeds the gross amount', () => {
    expect(() => service.calculateLine({ qty: 1, unitPrice: 5, lineDiscount: 6 })).toThrow(
      BadRequestException
    );
  });

  it('throws when overall discount is greater than the items total', () => {
    expect(() =>
      service.calculateQuoteTotals([
        { qty: 1, unitPrice: 50, lineDiscount: 25 },
        { qty: 1, unitPrice: 25, lineDiscount: 30 }
      ])
    ).toThrow(BadRequestException);
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma.service';

type TxClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class NumberingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuoteNumber(branchId: string, tx?: Prisma.TransactionClient) {
    return this.generateDocumentNumber(
      'Q',
      branchId,
      (client, range) =>
        client.quote.count({
          where: {
            branchId,
            createdAt: {
              gte: range.start,
              lt: range.end
            }
          }
        }),
      tx
    );
  }

  async generateInvoiceNumber(branchId: string, tx?: Prisma.TransactionClient) {
    return this.generateDocumentNumber(
      'INV',
      branchId,
      (client, range) =>
        client.invoice.count({
          where: {
            branchId,
            createdAt: {
              gte: range.start,
              lt: range.end
            }
          }
        }),
      tx
    );
  }

  async generateCreditNoteNumber(branchId: string, tx?: Prisma.TransactionClient) {
    return this.generateDocumentNumber(
      'CN',
      branchId,
      (client, range) =>
        client.creditNote.count({
          where: {
            branchId,
            createdAt: {
              gte: range.start,
              lt: range.end
            }
          }
        }),
      tx
    );
  }

  private async generateDocumentNumber(
    prefix: string,
    branchId: string,
    counter: (client: TxClient, range: { start: Date; end: Date }) => Promise<number>,
    tx?: Prisma.TransactionClient
  ) {
    const executor = tx ?? this.prisma;
    const branch = await executor.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    const timezone = branch.timezone ?? 'Asia/Kuala_Lumpur';
    const now = DateTime.now().setZone(timezone);
    const range = {
      start: now.startOf('day').toJSDate(),
      end: now.endOf('day').toJSDate()
    };
    const datePart = now.toFormat('yyyyLLdd');

    const sequence = await this.withTransaction(tx, async (client) => {
      const count = await counter(client, range);
      return count + 1;
    });

    const padded = sequence.toString().padStart(3, '0');
    return `${prefix}${branch.code}-${datePart}-${padded}`;
  }

  private async withTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    callback: (client: Prisma.TransactionClient) => Promise<T>
  ) {
    if (tx) {
      return callback(tx);
    }
    const isolation = (Prisma as any)?.TransactionIsolationLevel?.Serializable;
    if (isolation) {
      return this.prisma.$transaction(
        (client: any) => callback(client),
        { isolationLevel: isolation }
      );
    }

    return this.prisma.$transaction((client: any) => callback(client));
  }
}

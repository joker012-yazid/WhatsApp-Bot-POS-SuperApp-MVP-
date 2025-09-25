import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  declare $transaction: (...args: any[]) => Promise<any>;
  declare branch: any;
  declare quote: any;
  declare invoice: any;
  declare creditNote: any;
  declare invoicePayment: any;
  declare product: any;
  declare ticket: any;
  declare auditLog: any;

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}

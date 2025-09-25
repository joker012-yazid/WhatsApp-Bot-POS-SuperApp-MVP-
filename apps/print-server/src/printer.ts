import escpos from 'escpos';
import escposUsb from 'escpos-usb';
import escposNetwork from 'escpos-network';
import pino from 'pino';
import { renderReceipt } from './template';

escpos.USB = escposUsb;
escpos.Network = escposNetwork;

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export type PrintDevice =
  | {
      type: 'network';
      host: string;
      port?: number;
    }
  | {
      type: 'usb';
      vendorId?: number;
      productId?: number;
    };

export type ReceiptItem = {
  id?: string;
  sku?: string | null;
  name: string;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number | null;
  totalCents: number;
};

export type ReceiptPayload = {
  saleId: string;
  receiptNo: string;
  createdAt: string;
  paymentMethod: string;
  branch?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  customer?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  };
  totals: {
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    totalCents: number;
  };
  items: ReceiptItem[];
  receiptUrl: string;
  device?: PrintDevice;
};

export type PrintJob = {
  jobId: string;
  type: 'receipt';
  payload: ReceiptPayload;
};

function createDevice(config?: PrintDevice) {
  if (!config) {
    throw new Error('Printer device configuration is required');
  }

  if (config.type === 'network') {
    if (!config.host) {
      throw new Error('Network printer host is required');
    }
    return new escpos.Network(config.host, config.port ?? 9100);
  }

  return new escpos.USB(config.vendorId, config.productId);
}

function openDevice(device: any) {
  return new Promise<void>((resolve, reject) => {
    device.open((error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function dispatchToPrinter(job: PrintJob) {
  const device = createDevice(job.payload.device);
  const printer = new escpos.Printer(device, { encoding: 'GB18030' });

  try {
    await openDevice(device);
    await renderReceipt(printer, job.payload);
    printer.cut();
    printer.close();
    logger.info({ event: 'printer.dispatch.success', jobId: job.jobId });
    return {
      ok: true,
      dispatchedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error({ event: 'printer.dispatch.failed', jobId: job.jobId, error });
    throw error;
  }
}

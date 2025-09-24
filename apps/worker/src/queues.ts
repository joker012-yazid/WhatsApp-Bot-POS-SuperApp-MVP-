import { QueueNames as Names } from '@spec/config/queues';

export const QueueNames = Names;

export type TemplateType =
  | 'ACK'
  | 'QUOTE'
  | 'IN_PROGRESS'
  | 'READY'
  | 'NO_FIX'
  | 'REVIEW';

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export type ChatInboundJob = {
  sessionId: string;
  message: Record<string, unknown>;
  receivedAt?: string;
  customerPhone?: string;
  sessionLabel?: string;
};

export type SendTemplateJob = {
  sessionId: string;
  to: string;
  template: TemplateType;
  variables?: Record<string, string>;
  ticketId?: string;
  referenceId?: string;
};

export type ReminderJob = {
  ticketId: string;
  stage: 'R1' | 'R2' | 'R3';
  dueSince: string;
};

export type MediaProcessJob = {
  sourceBucket: string;
  objectName: string;
  targetBucket?: string;
  contentType?: string;
};

export type PdfInvoiceJob = {
  saleId: string;
  receiptNo?: string;
  targetBucket?: string;
};

export type BackupJob = {
  requestedAt: string;
  targetBucket?: string;
};

export type PrintJob = {
  saleId: string;
  receiptNo: string;
  device: {
    type: 'network' | 'usb';
    host?: string;
    port?: number;
    vendorId?: number;
    productId?: number;
  };
};

export type QueuePayload<T extends QueueName = QueueName> = T extends typeof QueueNames.CHAT_INBOUND
  ? ChatInboundJob
  : T extends typeof QueueNames.SEND_TEMPLATE
    ? SendTemplateJob
    : T extends typeof QueueNames.REMINDER_R1 | typeof QueueNames.REMINDER_R2 | typeof QueueNames.REMINDER_R3
      ? ReminderJob
      : T extends typeof QueueNames.MEDIA_PROCESS
        ? MediaProcessJob
        : T extends typeof QueueNames.PDF_INVOICE
          ? PdfInvoiceJob
          : T extends typeof QueueNames.BACKUP_DAILY
            ? BackupJob
            : T extends typeof QueueNames.PRINT_JOB
              ? PrintJob
              : Record<string, unknown>;

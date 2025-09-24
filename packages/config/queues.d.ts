export declare const QueueNames: {
  readonly CHAT_INBOUND: 'CHAT_INBOUND';
  readonly SEND_TEMPLATE: 'SEND_TEMPLATE';
  readonly REMINDER_R1: 'REMINDER_R1';
  readonly REMINDER_R2: 'REMINDER_R2';
  readonly REMINDER_R3: 'REMINDER_R3';
  readonly MEDIA_PROCESS: 'MEDIA_PROCESS';
  readonly PDF_INVOICE: 'PDF_INVOICE';
  readonly BACKUP_DAILY: 'BACKUP_DAILY';
  readonly PRINT_JOB: 'PRINT_JOB';
};

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export declare const QueueList: QueueName[];

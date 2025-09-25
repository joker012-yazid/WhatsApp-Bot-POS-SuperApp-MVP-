import { Queue, Worker, QueueEvents, JobsOptions, Job } from 'bullmq';
import {
  QueueNames,
  ChatInboundJob,
  SendTemplateJob,
  ReminderJob,
  MediaProcessJob,
  PdfInvoiceJob,
  BackupJob,
  TemplateType,
  EinvoiceSubmitJob,
  EinvoiceStatusPollJob
} from './queues';
import { QueueList } from '@spec/config/queues';
import IORedis from 'ioredis';
import pino from 'pino';
import cron from 'node-cron';
import {
  PrismaClient,
  Prisma,
  TicketStatus,
  WaMessageDirection,
  EinvoiceSubmissionStatus,
  EinvoiceProvider as PrismaEinvoiceProvider
} from '@prisma/client';
import {
  createEinvoiceProvider,
  EinvoicePayload,
  EinvoiceSubmitResult,
  EinvoiceStatusResult
} from './einvoice/provider';
import { Client as MinioClient } from 'minio';
import PDFDocument from 'pdfkit';
import { readFileSync } from 'fs';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined
});

const prisma = new PrismaClient();

function parseEndpoint(endpoint: string) {
  if (endpoint.includes('://')) {
    const url = new URL(endpoint);
    return {
      endPoint: url.hostname,
      port: Number(url.port) || 9000,
      useSSL: url.protocol === 'https:'
    };
  }
  const [host, rawPort] = endpoint.split(':');
  return { endPoint: host, port: Number(rawPort || 9000), useSSL: false };
}

const minioEndpoint = parseEndpoint(process.env.MINIO_ENDPOINT || 'minio:9000');
const minio = new MinioClient({
  endPoint: minioEndpoint.endPoint,
  port: minioEndpoint.port,
  useSSL: process.env.MINIO_USE_SSL === 'true' || minioEndpoint.useSSL,
  accessKey: readSecret('MINIO_ACCESS_KEY', 'specminio'),
  secretKey: readSecret('MINIO_SECRET_KEY', 'specminiosecret')
});

const defaultBucket = process.env.MINIO_BUCKET || 'uploads';

const DEFAULT_EINVOICE_PROVIDER = parseEinvoiceProvider(process.env.EINVOICE_PROVIDER);
const EINVOICE_TIMEOUT_HOURS = Number(process.env.EINVOICE_TIMEOUT_HOURS ?? 24);
const EINVOICE_MAX_ATTEMPTS = Number(process.env.EINVOICE_MAX_ATTEMPTS ?? 5);
const EINVOICE_BASE_POLL_SECONDS = Number(process.env.EINVOICE_POLL_SECONDS ?? 600);
const EINVOICE_MAX_POLL_SECONDS = Number(process.env.EINVOICE_POLL_MAX_SECONDS ?? 3600);

async function ensureBucket(bucket: string) {
  try {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, '');
      logger.info({ event: 'minio.bucket.created', bucket });
    }
  } catch (error) {
    logger.error({ event: 'minio.bucket.error', bucket, error });
    throw error;
  }
}

const queues = QueueList.reduce<Record<string, Queue>>((acc, name) => {
  acc[name] = new Queue(name, { connection });
  return acc;
}, {});

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: { branch: true; customer: true; items: true; payments: true };
}>;

function parseEinvoiceProvider(value?: string): PrismaEinvoiceProvider {
  switch ((value ?? '').toUpperCase()) {
    case 'MYINVOIS':
      return PrismaEinvoiceProvider.MYINVOIS;
    case 'PEPPOL':
      return PrismaEinvoiceProvider.PEPPOL;
    case 'MOCK':
    default:
      return PrismaEinvoiceProvider.MOCK;
  }
}

function getEinvoiceProviderOptions() {
  return {
    endpoint: process.env.EINVOICE_ENDPOINT,
    apiKey: process.env.EINVOICE_API_KEY,
    environment: process.env.EINVOICE_ENV
  };
}

function calculateEinvoicePollDelay(attempt: number) {
  const base = Math.max(30, EINVOICE_BASE_POLL_SECONDS);
  const max = Math.max(base, EINVOICE_MAX_POLL_SECONDS);
  const delaySeconds = Math.min(base * 2 ** attempt, max);
  const jitter = Math.floor(Math.random() * 1000);
  return delaySeconds * 1000 + jitter;
}

function buildEinvoicePayload(invoice: InvoiceWithRelations): EinvoicePayload {
  const taxRate = Number(invoice.taxableSubtotal) > 0 ? Number(invoice.sst) / Number(invoice.taxableSubtotal) : 0.06;
  const items = invoice.items.map((item) => {
    const quantity = Number(item.qty);
    const unitPrice = Number(item.unitPrice);
    const discount = Number(item.lineDiscount ?? 0);
    const lineTotal = Number(item.lineTotal);
    const taxableAmount = lineTotal;
    const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
    return {
      description: item.description,
      quantity,
      unitPrice,
      discount,
      taxCode: item.taxCode,
      taxRate: Number((taxRate * 100).toFixed(2)),
      taxableAmount,
      taxAmount,
      lineTotal
    };
  });

  const payments = invoice.payments.map((payment) => ({
    method: payment.method,
    amount: Number(payment.amount),
    paidAt: payment.paidAt.toISOString(),
    reference: payment.reference
  }));

  return {
    supplier: {
      name: invoice.branch.name,
      registrationNumber: invoice.branch.code,
      address: null
    },
    buyer: invoice.customer
      ? {
          name: invoice.customer.fullName,
          email: invoice.customer.email,
          phone: invoice.customer.phone,
          address: null
        }
      : null,
    invoice: {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      branchCode: invoice.branch.code,
      currency: invoice.currency,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      itemsTotal: Number(invoice.itemsTotal),
      discountTotal: Number(invoice.discountTotal),
      taxableSubtotal: Number(invoice.taxableSubtotal),
      taxAmount: Number(invoice.sst),
      grandTotal: Number(invoice.grandTotal)
    },
    items,
    payments,
    summary: {
      taxableAmount: Number(invoice.taxableSubtotal),
      taxAmount: Number(invoice.sst),
      total: Number(invoice.grandTotal)
    }
  };
}

async function scheduleEinvoicePoll(
  data: { submissionId: string; remoteSubmissionId: string; provider: PrismaEinvoiceProvider; attempt: number }
) {
  if (data.attempt >= EINVOICE_MAX_ATTEMPTS) {
    return;
  }
  const delay = calculateEinvoicePollDelay(data.attempt);
  await queues[QueueNames.EINVOICE_STATUS_POLL].add(
    data.submissionId,
    {
      submissionId: data.submissionId,
      remoteSubmissionId: data.remoteSubmissionId,
      provider: data.provider,
      attempt: data.attempt
    },
    {
      delay,
      removeOnComplete: 1000,
      removeOnFail: 1000
    }
  );
}

function logMetrics(name: string, job: Job) {
  logger.info({
    event: 'queue.metric',
    queue: name,
    jobId: job.id,
    attemptsMade: job.attemptsMade
  });
}

function normaliseInbound(data: ChatInboundJob) {
  const raw = data.message ?? {};
  const content = (raw.message as Record<string, any>) || {};
  const conversation =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    '';
  const timestamp = raw.messageTimestamp
    ? new Date(Number(raw.messageTimestamp) * 1000)
    : data.receivedAt
      ? new Date(data.receivedAt)
      : new Date();
  const remoteJid = raw.key?.remoteJid ?? data.customerPhone ?? 'unknown';

  return {
    conversation,
    timestamp,
    remoteJid,
    fromMe: Boolean(raw.key?.fromMe)
  };
}

async function upsertSession(sessionId: string, label?: string) {
  return prisma.waSession.upsert({
    where: { id: sessionId },
    update: {
      status: 'ACTIVE',
      lastConnectedAt: new Date()
    },
    create: {
      id: sessionId,
      label: label || sessionId,
      status: 'ACTIVE'
    }
  });
}

async function handleChatInbound(job: Job<ChatInboundJob>) {
  const payload = normaliseInbound(job.data);
  const session = await upsertSession(job.data.sessionId, job.data.sessionLabel);
  const record = await prisma.waMessage.create({
    data: {
      sessionId: session.id,
      direction: payload.fromMe ? WaMessageDirection.OUTBOUND : WaMessageDirection.INBOUND,
      payload: job.data.message,
      createdAt: payload.timestamp
    }
  });

  await prisma.crmInteraction.create({
    data: {
      channel: 'whatsapp',
      summary: payload.conversation?.slice(0, 140) || 'Inbound WhatsApp message',
      payload: {
        jobId: job.id,
        sessionId: job.data.sessionId,
        remoteJid: payload.remoteJid
      }
    }
  }).catch((error) => logger.warn({ event: 'crm.log_failed', error }));

  logger.info({
    event: 'chat.inbound.stored',
    sessionId: job.data.sessionId,
    waMessageId: record.id,
    preview: payload.conversation
  });

  // Auto-reply stub
  logger.info({
    event: 'chat.auto_reply.stub',
    rule: 'default_ack',
    note: 'Implement rule engine to respond contextually.'
  });

  return { waMessageId: record.id };
}

const allowedTemplates: TemplateType[] = ['ACK', 'QUOTE', 'IN_PROGRESS', 'READY', 'NO_FIX', 'REVIEW'];

async function handleSendTemplate(job: Job<SendTemplateJob>) {
  if (!allowedTemplates.includes(job.data.template)) {
    throw new Error(`Unsupported template: ${job.data.template}`);
  }

  const session = await upsertSession(job.data.sessionId);
  const waMessage = await prisma.waMessage.create({
    data: {
      sessionId: session.id,
      direction: WaMessageDirection.OUTBOUND,
      payload: {
        template: job.data.template,
        to: job.data.to,
        variables: job.data.variables,
        referenceId: job.data.referenceId
      }
    }
  });

  logger.info({
    event: 'chat.template.sent.stub',
    template: job.data.template,
    to: job.data.to,
    ticketId: job.data.ticketId,
    waMessageId: waMessage.id
  });

  return { waMessageId: waMessage.id };
}

type ReminderStage = {
  queue: string;
  stage: ReminderJob['stage'];
  hours: number;
};

const reminderStages: ReminderStage[] = [
  { queue: QueueNames.REMINDER_R1, stage: 'R1', hours: Number(process.env.REMINDER_R1_HOURS ?? 1) },
  { queue: QueueNames.REMINDER_R2, stage: 'R2', hours: Number(process.env.REMINDER_R2_HOURS ?? 20) },
  { queue: QueueNames.REMINDER_R3, stage: 'R3', hours: Number(process.env.REMINDER_R3_HOURS ?? 30) }
];

async function scheduleReminders(stage: ReminderStage) {
  const cutoff = new Date(Date.now() - stage.hours * 60 * 60 * 1000);
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
      updatedAt: { lte: cutoff }
    },
    select: { id: true, updatedAt: true }
  });

  if (!tickets.length) {
    return;
  }

  await Promise.all(
    tickets.map(async (ticket) => {
      const jobId = `${stage.queue}:${ticket.id}`;
      const jobOptions: JobsOptions = {
        jobId,
        removeOnComplete: 500,
        removeOnFail: 500
      };
      try {
        await queues[stage.queue].add(
          stage.queue,
          {
            ticketId: ticket.id,
            stage: stage.stage,
            dueSince: ticket.updatedAt.toISOString()
          },
          jobOptions
        );
        logger.info({
          event: 'ticket.reminder.scheduled',
          queue: stage.queue,
          ticketId: ticket.id,
          cutoff: cutoff.toISOString()
        });
      } catch (error) {
        if (!(error as Error).message.includes('JobId')) {
          logger.error({ event: 'ticket.reminder.schedule_failed', queue: stage.queue, ticketId: ticket.id, error });
        }
      }
    })
  );
}

async function handleReminder(job: Job<ReminderJob>) {
  logger.info({ event: 'ticket.reminder.dispatch', ...job.data });
  await prisma.auditLog
    .create({
      data: {
        ticketId: job.data.ticketId,
        action: `TICKET_REMINDER_${job.data.stage}`,
        details: job.data
      }
    })
    .catch((error) => logger.warn({ event: 'audit.reminder_failed', error }));
  return { acknowledged: true };
}

async function handleMedia(job: Job<MediaProcessJob>) {
  const targetBucket = job.data.targetBucket || defaultBucket;
  await ensureBucket(targetBucket);
  const thumbName = `${job.data.objectName.replace(/\.[^/.]+$/, '')}-thumb.txt`;
  const content = Buffer.from(
    JSON.stringify({
      stub: true,
      sourceBucket: job.data.sourceBucket,
      objectName: job.data.objectName,
      processedAt: new Date().toISOString()
    })
  );
  await minio.putObject(targetBucket, thumbName, content, {
    'Content-Type': 'application/json'
  });
  logger.info({ event: 'media.thumbnail.stub', targetBucket, thumbName });
  return { objectName: thumbName, bucket: targetBucket };
}

async function generateInvoiceBuffer(job: Job<PdfInvoiceJob>) {
  const sale = await prisma.sale.findUnique({
    where: { id: job.data.saleId },
    include: {
      items: { include: { product: true } },
      branch: true,
      customer: true
    }
  });

  if (!sale) {
    throw new Error(`Sale not found: ${job.data.saleId}`);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('SPEC-1 Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt No: ${sale.receiptNo}`);
    doc.text(`Branch: ${sale.branch?.name ?? 'N/A'} (${sale.branch?.code ?? '-'})`);
    doc.text(`Customer: ${sale.customer?.fullName ?? 'Walk-in'}`);
    doc.text(`Payment Method: ${sale.paymentMethod}`);
    doc.text(`Created At: ${sale.createdAt.toISOString()}`);
    doc.moveDown();
    doc.text('Items:', { underline: true });
    sale.items.forEach((item) => {
      doc.text(
        `${item.quantity} x ${item.product?.name ?? item.productId} @ RM ${(item.unitPrice / 100).toFixed(2)} - Total RM ${(item.totalCents / 100).toFixed(2)}`
      );
    });
    doc.moveDown();
    doc.text(`Subtotal: RM ${(sale.subtotalCents / 100).toFixed(2)}`);
    doc.text(`Discount: RM ${(sale.discountCents / 100).toFixed(2)}`);
    doc.text(`SST (6%): RM ${(sale.taxCents / 100).toFixed(2)}`);
    doc.text(`Total: RM ${(sale.totalCents / 100).toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(10).text('Thank you for shopping with us.', { align: 'center' });

    doc.end();
  });
}

async function handlePdfInvoice(job: Job<PdfInvoiceJob>) {
  const targetBucket = job.data.targetBucket || defaultBucket;
  await ensureBucket(targetBucket);
  const buffer = await generateInvoiceBuffer(job);
  const objectName = job.data.receiptNo
    ? `invoices/${job.data.receiptNo}.pdf`
    : `invoices/${job.data.saleId}.pdf`;
  await minio.putObject(targetBucket, objectName, buffer, {
    'Content-Type': 'application/pdf'
  });
  logger.info({ event: 'invoice.pdf.generated', objectName, bucket: targetBucket });
  return { objectName, bucket: targetBucket };
}

async function handleBackup(job: Job<BackupJob>) {
  const targetBucket = job.data.targetBucket || defaultBucket;
  await ensureBucket(targetBucket);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectName = `backups/backup-${timestamp}.sql`; // stub dump file
  const dump = `-- pg_dump stub for ${job.data.requestedAt}\n-- Include actual database dump command here.`;
  await minio.putObject(targetBucket, objectName, Buffer.from(dump), {
    'Content-Type': 'application/sql'
  });
  logger.info({ event: 'backup.stub.uploaded', objectName, bucket: targetBucket });
  return { objectName, bucket: targetBucket };
}

async function handleEinvoiceSubmit(job: Job<EinvoiceSubmitJob>) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: job.data.invoiceId },
    include: { branch: true, customer: true, items: true, payments: true }
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${job.data.invoiceId}`);
  }

  const provider = job.data.provider ?? DEFAULT_EINVOICE_PROVIDER;
  const payload = buildEinvoicePayload(invoice as InvoiceWithRelations);
  const adapter = createEinvoiceProvider(provider, getEinvoiceProviderOptions());
  const submitResult: EinvoiceSubmitResult = await adapter.submit(payload);
  const timeoutAt = new Date(Date.now() + EINVOICE_TIMEOUT_HOURS * 60 * 60 * 1000);

  const submission = await prisma.einvoiceSubmission.create({
    data: {
      invoiceId: invoice.id,
      provider,
      payload,
      submissionId: submitResult.submissionId,
      status: submitResult.status,
      lastError:
        submitResult.status === EinvoiceSubmissionStatus.REJECTED || submitResult.status === EinvoiceSubmissionStatus.FAILED
          ? submitResult.message ?? 'Submission rejected by provider.'
          : null,
      attempts: 1,
      timeoutAt
    }
  });

  logger.info({
    event: 'einvoice.submission.created',
    invoiceId: invoice.id,
    submissionId: submission.id,
    provider,
    status: submission.status
  });

  if (
    submitResult.status === EinvoiceSubmissionStatus.PENDING ||
    submitResult.status === EinvoiceSubmissionStatus.SENT
  ) {
    await scheduleEinvoicePoll({
      submissionId: submission.id,
      remoteSubmissionId: submitResult.submissionId,
      provider,
      attempt: 0
    });
  }

  return {
    submissionId: submission.id,
    status: submission.status,
    provider,
    remoteSubmissionId: submitResult.submissionId
  };
}

async function handleEinvoiceStatusPoll(job: Job<EinvoiceStatusPollJob>) {
  const submission = await prisma.einvoiceSubmission.findUnique({
    where: { id: job.data.submissionId },
    include: { invoice: { include: { branch: true } } }
  });

  if (!submission) {
    logger.warn({ event: 'einvoice.poll.missing', submissionId: job.data.submissionId });
    return null;
  }

  if (
    submission.status === EinvoiceSubmissionStatus.ACCEPTED ||
    submission.status === EinvoiceSubmissionStatus.REJECTED ||
    submission.status === EinvoiceSubmissionStatus.FAILED
  ) {
    return { status: submission.status, terminal: true };
  }

  const now = new Date();
  if (submission.timeoutAt && submission.timeoutAt.getTime() <= now.getTime()) {
    const timedOut = await prisma.einvoiceSubmission.update({
      where: { id: submission.id },
      data: {
        status: EinvoiceSubmissionStatus.FAILED,
        lastError: 'Submission timed out waiting for provider response.',
        lastPolledAt: now
      }
    });
    return { status: timedOut.status, timedOut: true };
  }

  const provider = job.data.provider ?? submission.provider ?? DEFAULT_EINVOICE_PROVIDER;
  const adapter = createEinvoiceProvider(provider, getEinvoiceProviderOptions());
  const statusResult: EinvoiceStatusResult = await adapter.status(job.data.remoteSubmissionId);
  const currentAttempt = job.data.attempt ?? 0;
  const nextAttempt = currentAttempt + 1;

  let statusToPersist = statusResult.status;
  let lastError: string | null = null;

  if (
    statusResult.status === EinvoiceSubmissionStatus.REJECTED ||
    statusResult.status === EinvoiceSubmissionStatus.FAILED
  ) {
    lastError = statusResult.message ?? 'Submission rejected by provider.';
  } else if (
    statusResult.status === EinvoiceSubmissionStatus.PENDING ||
    statusResult.status === EinvoiceSubmissionStatus.SENT
  ) {
    if (nextAttempt >= EINVOICE_MAX_ATTEMPTS) {
      statusToPersist = EinvoiceSubmissionStatus.FAILED;
      lastError = 'Maximum polling attempts reached.';
    }
  }

  const updated = await prisma.einvoiceSubmission.update({
    where: { id: submission.id },
    data: {
      status: statusToPersist,
      lastError,
      attempts: { increment: 1 },
      lastPolledAt: now
    }
  });

  logger.info({
    event: 'einvoice.poll.complete',
    submissionId: submission.id,
    provider,
    status: updated.status,
    attempt: currentAttempt
  });

  if (
    statusToPersist === EinvoiceSubmissionStatus.PENDING ||
    statusToPersist === EinvoiceSubmissionStatus.SENT
  ) {
    await scheduleEinvoicePoll({
      submissionId: submission.id,
      remoteSubmissionId: job.data.remoteSubmissionId,
      provider,
      attempt: nextAttempt
    });
  }

  return { status: updated.status, provider };
}

async function dispatchJob(name: string, job: Job) {
  logMetrics(name, job);
  switch (name) {
    case QueueNames.CHAT_INBOUND:
      return handleChatInbound(job as Job<ChatInboundJob>);
    case QueueNames.SEND_TEMPLATE:
      return handleSendTemplate(job as Job<SendTemplateJob>);
    case QueueNames.REMINDER_R1:
    case QueueNames.REMINDER_R2:
    case QueueNames.REMINDER_R3:
      return handleReminder(job as Job<ReminderJob>);
    case QueueNames.MEDIA_PROCESS:
      return handleMedia(job as Job<MediaProcessJob>);
    case QueueNames.PDF_INVOICE:
      return handlePdfInvoice(job as Job<PdfInvoiceJob>);
    case QueueNames.BACKUP_DAILY:
      return handleBackup(job as Job<BackupJob>);
    case QueueNames.EINVOICE_SUBMIT:
      return handleEinvoiceSubmit(job as Job<EinvoiceSubmitJob>);
    case QueueNames.EINVOICE_STATUS_POLL:
      return handleEinvoiceStatusPoll(job as Job<EinvoiceStatusPollJob>);
    default:
      logger.warn({ event: 'queue.unhandled', queue: name, job: job.data });
      return null;
  }
}

function createWorker(name: string) {
  const worker = new Worker(name, (job) => dispatchJob(name, job), { connection });

  worker.on('completed', (job, result) =>
    logger.info({ event: 'job.completed', queue: name, id: job.id, result })
  );
  worker.on('failed', (job, err) =>
    logger.error({ event: 'job.failed', queue: name, id: job?.id, error: err.message })
  );

  const events = new QueueEvents(name, { connection });
  events.on('waiting', async () => {
    const waiting = await queues[name].getJobCountByTypes('waiting');
    logger.info({ event: 'queue.waiting', queue: name, waiting });
  });
}

async function bootstrap() {
  await ensureBucket(defaultBucket).catch((error) => {
    logger.error({ event: 'minio.bootstrap_failed', error });
    process.exit(1);
  });

  QueueList.forEach((name) => {
    if (name === QueueNames.PRINT_JOB) {
      logger.info({ event: 'queue.delegated', queue: name, note: 'Handled by print-server' });
      return;
    }
    createWorker(name);
  });

  const reminderCron = process.env.REMINDER_SWEEP_CRON || '0 * * * *';
  cron.schedule(reminderCron, async () => {
    logger.info({ event: 'reminder.sweep.start', cron: reminderCron });
    for (const stage of reminderStages) {
      await scheduleReminders(stage);
    }
  });

  const backupCron = process.env.BACKUP_TIME || '0 2 * * *';
  cron.schedule(backupCron, async () => {
    await queues[QueueNames.BACKUP_DAILY].add(
      'daily-backup',
      { requestedAt: new Date().toISOString(), targetBucket: defaultBucket },
      { removeOnComplete: 100, removeOnFail: 100 }
    );
    logger.info({ event: 'backup.scheduled', cron: backupCron });
  });

  logger.info({ msg: 'Worker service started', queues: QueueList });
}

bootstrap().catch((error) => {
  logger.error({ event: 'worker.bootstrap_failed', error });
  process.exit(1);
});

async function shutdown() {
  logger.info({ msg: 'Worker shutting down' });
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  await connection.quit();
  await prisma.$disconnect();
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});
function readSecret(name: string, fallback: string) {
  const fileKey = process.env[`${name}_FILE`];
  if (fileKey) {
    try {
      const value = readFileSync(fileKey, 'utf-8').trim();
      if (value) {
        return value;
      }
    } catch (error) {
      logger.warn({ event: 'secret.read.error', name, error: (error as Error).message });
    }
  }
  const envValue = process.env[name];
  if (envValue && envValue.length > 0) {
    return envValue;
  }
  return fallback;
}

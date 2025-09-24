import express from 'express';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { dispatchToPrinter, type PrintJob } from './printer';
import { QueueNames } from '@spec/config/queues';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json({ limit: '1mb' }));

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined
});

const printQueue = new Queue(QueueNames.PRINT_JOB, { connection });

const worker = new Worker(
  QueueNames.PRINT_JOB,
  async (job) => {
    const result = await dispatchToPrinter(job.data as PrintJob);
    return result;
  },
  { connection }
);

worker.on('completed', (job, result) =>
  logger.info({ event: 'print.job.completed', jobId: job.id, result })
);
worker.on('failed', (job, err) =>
  logger.error({ event: 'print.job.failed', jobId: job?.id, error: err?.message })
);

app.post('/print', async (req, res) => {
  const job: PrintJob = {
    jobId: randomUUID(),
    type: 'receipt',
    payload: req.body?.payload
  };

  if (!job.payload || !job.payload.receiptNo) {
    return res.status(400).json({ error: 'payload with receipt data is required' });
  }

  if (!job.payload.device) {
    return res.status(400).json({ error: 'device configuration is required' });
  }

  await printQueue.add('escpos-job', job, { jobId: job.jobId });
  logger.info({ event: 'print.queued', jobId: job.jobId });
  res.status(202).json({ queued: true, jobId: job.jobId });
});

app.post('/print/direct', async (req, res) => {
  const job: PrintJob = {
    jobId: randomUUID(),
    type: 'receipt',
    payload: req.body?.payload
  };

  if (!job.payload || !job.payload.receiptNo) {
    return res.status(400).json({ error: 'payload with receipt data is required' });
  }

  if (!job.payload.device) {
    return res.status(400).json({ error: 'device configuration is required' });
  }

  try {
    const result = await dispatchToPrinter(job);
    res.json({ ...result, jobId: job.jobId });
  } catch (error) {
    logger.error({ event: 'print.direct.failed', jobId: job.jobId, error });
    res.status(502).json({ error: (error as Error).message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', gitSha: process.env.GIT_SHA || 'local', service: 'print-server' });
});

const port = Number(process.env.PRINT_SERVER_PORT || 4010);
app.listen(port, '0.0.0.0', () => {
  logger.info({ msg: 'Print server listening', port });
});

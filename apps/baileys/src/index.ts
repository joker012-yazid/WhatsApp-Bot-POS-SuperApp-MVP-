import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { SessionManager, SessionStatus } from './session-manager';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json({ limit: '5mb' }));

const httpServer = createServer(app);
const wsServer = new WebSocketServer({ noServer: true });

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redis = new IORedis(redisUrl);

const inboundQueue = new Queue('CHAT_INBOUND', { connection: redis });
const sessionDir = process.env.BAILEYS_DATA_DIR || '/app/sessions';
const apiBaseUrl = process.env.API_BASE_URL || 'http://api:3001';
const manager = new SessionManager(sessionDir, redis, inboundQueue);

const metricsWindow: number[] = [];

function broadcast(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

wsServer.on('connection', (socket) => {
  const connectionId = randomUUID();
  socket.send(
    JSON.stringify({
      type: 'hello',
      payload: {
        id: connectionId,
        connectedAt: new Date().toISOString(),
        apiBaseUrl
      }
    })
  );
  manager.listSessions().forEach((status) => {
    socket.send(JSON.stringify({ type: 'status', payload: status }));
  });
});

manager.on('qr', (status: SessionStatus) => broadcast('qr', status));
manager.on('status', (status: SessionStatus) => broadcast('status', status));

app.post('/sessions/:id/connect', async (req, res) => {
  const { id } = req.params;
  logger.info({ msg: 'Connect requested', sessionId: id });
  await manager.ensureSession(id);
  res.json({ sessionId: id, status: 'connecting' });
});

app.get('/sessions', (_req, res) => {
  res.json(manager.listSessions());
});

app.get('/sessions/:id', (req, res) => {
  const { id } = req.params;
  const status = manager.listSessions().find((session) => session.sessionId === id);
  if (!status) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(status);
});

app.post('/sessions/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { jid, message } = req.body as { jid: string; message: unknown };

  if (!jid || !message) {
    res.status(400).json({ error: 'jid and message are required' });
    return;
  }

  try {
    await manager.sendMessage(id, jid, message);
    metricsWindow.push(Date.now());
    logger.info({ msg: 'Message dispatched', sessionId: id, jid });
    res.json({ ok: true });
  } catch (error) {
    const err = error as Error;
    const statusCode = err.message.includes('Rate limit') ? 429 : 409;
    logger.warn({ msg: 'Failed to send message', sessionId: id, jid, error: err.message });
    res.status(statusCode).json({ error: err.message });
  }
});

app.get('/metrics', async (_req, res) => {
  const now = Date.now();
  while (metricsWindow.length && now - metricsWindow[0] > 60000) {
    metricsWindow.shift();
  }
  const queueDepth = await inboundQueue.getWaitingCount();
  res.json({
    send_rate_per_minute: metricsWindow.length,
    queue_depth: queueDepth
  });
});

const httpPort = Number(process.env.BAILEYS_HTTP_PORT || process.env.PORT || 4001);
const wsPort = Number(process.env.BAILEYS_WS_PORT || 4002);

httpServer.listen(httpPort, '0.0.0.0', () => {
  logger.info({ msg: 'Baileys REST listening', port: httpPort, redisUrl, apiBaseUrl });
});

const wsHttpServer = createServer();
wsHttpServer.on('upgrade', (req, socket, head) => {
  wsServer.handleUpgrade(req, socket as any, head, (ws) => {
    wsServer.emit('connection', ws, req);
  });
});
wsHttpServer.listen(wsPort, '0.0.0.0', () => {
  logger.info({ msg: 'Baileys WebSocket bridge ready', port: wsPort });
});

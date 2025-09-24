import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import pino from 'pino';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import { TokenBucket } from './tokenBucket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface SessionStatus {
  sessionId: string;
  connection: ConnectionState['connection'];
  paused: boolean;
  reason?: string;
  qr?: string;
}

type SessionState = {
  connection: ConnectionState['connection'];
  paused: boolean;
  lastQr?: string;
};

function isFatalDisconnect(code?: number) {
  return (
    code === DisconnectReason.loggedOut ||
    code === DisconnectReason.badSession ||
    code === DisconnectReason.connectionReplaced
  );
}

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, Awaited<ReturnType<typeof makeWASocket>>>();
  private buckets = new Map<string, TokenBucket>();
  private state = new Map<string, SessionState>();

  override on(event: 'status', listener: (status: SessionStatus) => void): this;
  override on(event: 'qr', listener: (status: SessionStatus) => void): this;
  override on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  override emit(event: 'status', status: SessionStatus): boolean;
  override emit(event: 'qr', status: SessionStatus): boolean;
  override emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  constructor(
    private readonly sessionDir: string,
    private readonly redis: IORedis.Redis,
    private readonly inboundQueue: Queue
  ) {
    super();
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
  }

  async ensureSession(id: string, qrCallback?: (qr: string) => void) {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!;
    }

    logger.info({ msg: 'Initialising session', sessionId: id });
    const { version } = await fetchLatestBaileysVersion();
    const authDir = join(this.sessionDir, id);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const sock = makeWASocket({
      logger,
      printQRInTerminal: false,
      browser: ['SPEC-1', 'Chrome', '1.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      version
    });

    this.state.set(id, { connection: 'connecting', paused: false });
    this.emitStatus(id);

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
      const current = this.state.get(id) ?? { connection: 'close', paused: true };
      const next: SessionState = { ...current };
      if (update.connection) {
        next.connection = update.connection;
      }
      if (update.qr) {
        next.lastQr = update.qr;
      }

      const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

      if (update.connection === 'open') {
        next.paused = false;
        logger.info({ msg: 'Session connected', sessionId: id, version });
      }

      if (update.connection === 'close') {
        if (isFatalDisconnect(statusCode)) {
          next.paused = true;
          logger.warn({
            msg: 'Session paused due to fatal disconnect',
            sessionId: id,
            statusCode
          });
          this.sessions.delete(id);
        } else {
          logger.warn({ msg: 'Session closed, attempting reconnect', sessionId: id, statusCode });
          this.reconnect(id, qrCallback).catch((err) =>
            logger.error({ msg: 'Reconnection failed', sessionId: id, err })
          );
        }
      }

      this.state.set(id, next);
      if (update.qr) {
        this.emit('qr', {
          sessionId: id,
          connection: next.connection,
          paused: next.paused,
          qr: update.qr
        } satisfies SessionStatus);
        if (qrCallback) {
          qrCallback(update.qr);
        }
      }

      this.emitStatus(id, statusCode && isFatalDisconnect(statusCode) ? `disconnect:${statusCode}` : undefined);
    });

    sock.ev.on('messages.upsert', async (payload) => {
      logger.debug({ msg: 'messages.upsert received', sessionId: id, count: payload.messages.length });
      const jobs = payload.messages.map((message) => ({
        name: 'wa-message',
        data: {
          sessionId: id,
          message
        }
      }));
      await this.inboundQueue.addBulk(jobs);
    });

    this.sessions.set(id, sock);
    this.buckets.set(id, new TokenBucket(this.redis, `baileys:bucket:${id}`, 1, 5, 50));
    return sock;
  }

  private async reconnect(id: string, qrCallback?: (qr: string) => void) {
    this.sessions.delete(id);
    await this.ensureSession(id, qrCallback);
  }

  private emitStatus(id: string, reason?: string) {
    const state = this.state.get(id);
    if (!state) {
      return;
    }
    const payload: SessionStatus = {
      sessionId: id,
      connection: state.connection,
      paused: state.paused,
      qr: state.lastQr,
      reason
    };
    this.emit('status', payload);
  }

  async sendMessage(sessionId: string, jid: string, content: unknown) {
    const state = this.state.get(sessionId);
    if (state?.paused) {
      throw new Error('Session paused due to connection issues');
    }
    const sock = await this.ensureSession(sessionId);
    const bucket = this.buckets.get(sessionId);
    await bucket?.consume(1);
    await sock.sendMessage(jid, content);
  }

  listSessions(): SessionStatus[] {
    return Array.from(this.state.entries()).map(([sessionId, sessionState]) => ({
      sessionId,
      connection: sessionState.connection,
      paused: sessionState.paused,
      qr: sessionState.lastQr
    }));
  }
}

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const DEFAULT_TTL_SECONDS = 60;

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    const tls = parsed.protocol === 'rediss:' ? {} : undefined;
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls
    };
  } catch (error) {
    Logger.warn(`Invalid REDIS_URL provided: ${(error as Error).message}`);
    return {};
  }
}

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    const options = url.startsWith('redis://') || url.startsWith('rediss://') ? parseRedisUrl(url) : {};
    this.client = new Redis({
      lazyConnect: true,
      enableAutoPipelining: true,
      ...options
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis cache');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(`Failed to read cache key ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS) {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}: ${(error as Error).message}`);
    }
  }

  async del(...keys: string[]) {
    if (!keys.length) {
      return;
    }
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete cache keys ${keys.join(', ')}: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

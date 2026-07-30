import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { REDIS_TTL } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private disabled = false;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      this.logger.warn(
        'Upstash Redis credentials (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) missing. Upstash caching disabled.',
      );
      this.disabled = true;
      return;
    }

    try {
      this.client = new Redis({ url, token });
      this.logger.log('✅ Initialized Upstash Redis REST client successfully');
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize Upstash Redis: ${error?.message ?? error}`,
      );
      this.disabled = true;
    }
  }

  isReady(): boolean {
    return !this.disabled && this.client !== null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      this.logger.log(`[UPSTASH CACHE MISS] ${key}`);
      return null;
    }

    try {
      const value = await this.client!.get<any>(key);

      if (value === null || value === undefined) {
        this.logger.log(`[UPSTASH CACHE MISS] ${key}`);
        return null;
      }

      this.logger.log(`[UPSTASH CACHE HIT] ${key}`);

      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }

      return value as T;
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] getJson failed for "${key}": ${error?.message ?? error}`,
      );
      this.logger.log(`[UPSTASH CACHE MISS] ${key}`);
      return null;
    }
  }

  /**
   * Batch-fetch multiple keys in a single Upstash REST HTTP call (MGET).
   * Dramatically reduces network round-trips compared to N individual getJson calls.
   */
  async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isReady() || keys.length === 0) return keys.map(() => null);

    try {
      const results = await this.client!.mget<any[]>(...keys);
      return results.map((value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
        }
        return value as T;
      });
    } catch (error: any) {
      this.logger.warn(`[UPSTASH ERROR] mgetJson failed: ${error?.message ?? error}`);
      return keys.map(() => null);
    }
  }


  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number = REDIS_TTL.MEDIUM,
  ): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds !== undefined && ttlSeconds !== null && ttlSeconds > 0) {
        await this.client!.set(key, serialized, { ex: ttlSeconds });
      } else {
        await this.client!.set(key, serialized);
      }
      this.logger.log(`[UPSTASH CACHE WRITE] ${key}`);
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] setJson failed for "${key}": ${error?.message ?? error}`,
      );
    }
  }

  async setnx(
    key: string,
    value: string,
    ttlSeconds: number = REDIS_TTL.MEDIUM,
  ): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.client!.set(key, value, {
        nx: true,
        ex: ttlSeconds,
      });
      return result === 'OK';
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] setnx failed for "${key}": ${error?.message ?? error}`,
      );
      return false;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.del(key);
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] del failed for "${key}": ${error?.message ?? error}`,
      );
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      const matchedKeys = await this.keys(pattern);
      if (matchedKeys && matchedKeys.length > 0) {
        await this.client!.del(...matchedKeys);
      }
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] delPattern failed for "${pattern}": ${error?.message ?? error}`,
      );
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const found = await this.client!.keys(pattern);
      return found || [];
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] keys failed for "${pattern}": ${error?.message ?? error}`,
      );
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const count = await this.client!.exists(key);
      return count > 0;
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] exists failed for "${key}": ${error?.message ?? error}`,
      );
      return false;
    }
  }

  async rename(source: string, destination: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.rename(source, destination);
    } catch (error: any) {
      this.logger.debug(
        `[UPSTASH DEBUG] rename failed from "${source}" to "${destination}": ${error?.message ?? error}`,
      );
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -2;
    }

    try {
      return await this.client!.ttl(key);
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] ttl failed for "${key}": ${error?.message ?? error}`,
      );
      return -2;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.expire(key, ttlSeconds);
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] expire failed for "${key}": ${error?.message ?? error}`,
      );
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.flushdb();
      this.logger.log('✅ Flushed all keys in Upstash Redis DB');
    } catch (error: any) {
      this.logger.warn(
        `[UPSTASH ERROR] flushAll failed: ${error?.message ?? error}`,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { REDIS_TTL } from './redis.constants';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private disabled = false;

  // ── Circuit Breaker & Fallback State ──
  private circuitState: CircuitState = 'CLOSED';
  private lastCircuitTripTime = 0;
  private circuitCooldownMs = 60_000; // 1 minute default, 10 minutes for quota exceeded
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;

  // ── In-Memory Fallback L1 Cache ──
  private readonly memoryStore = new Map<
    string,
    { value: any; expiresAt: number }
  >();

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

  /**
   * Evaluates if Redis is currently ready for calls.
   * If circuit breaker is OPEN, checks if cooldown has expired to transition to HALF_OPEN.
   */
  isReady(): boolean {
    if (this.disabled || !this.client) {
      return false;
    }

    if (this.circuitState === 'OPEN') {
      const now = Date.now();
      if (now - this.lastCircuitTripTime >= this.circuitCooldownMs) {
        this.circuitState = 'HALF_OPEN';
        this.logger.log(
          '[UPSTASH CIRCUIT] Cooldown expired. Testing Redis connection (HALF_OPEN)...',
        );
        return true;
      }
      return false;
    }

    return true;
  }

  private handleSuccess() {
    if (this.circuitState === 'HALF_OPEN' || this.consecutiveErrors > 0) {
      this.circuitState = 'CLOSED';
      this.consecutiveErrors = 0;
      this.logger.log('✅ Upstash Redis circuit breaker restored to CLOSED');
    }
  }

  private handleError(method: string, keyOrDesc: string, error: any) {
    const errorMsg = error?.message ?? String(error);
    const isQuotaError =
      /limit exceeded|max requests|quota|rate limit/i.test(errorMsg);

    if (isQuotaError) {
      this.circuitState = 'OPEN';
      this.lastCircuitTripTime = Date.now();
      this.circuitCooldownMs = 10 * 60 * 1000; // 10 minutes cooldown for quota limits
      this.logger.error(
        `[UPSTASH QUOTA EXCEEDED] ${errorMsg}. Circuit breaker OPEN for 10m. Falling back to in-memory/database operations.`,
      );
      return;
    }

    this.consecutiveErrors++;
    this.logger.warn(
      `[UPSTASH ERROR] ${method} failed for "${keyOrDesc}" (${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}): ${errorMsg}`,
    );

    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      this.circuitState = 'OPEN';
      this.lastCircuitTripTime = Date.now();
      this.circuitCooldownMs = 60_000; // 1 minute cooldown for temporary network errors
      this.logger.error(
        `[UPSTASH CIRCUIT TRIPPED] ${this.consecutiveErrors} consecutive errors. Circuit breaker OPEN for 60s.`,
      );
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // Check in-memory fallback cache first if available
    const memHit = this.memoryStore.get(key);
    if (memHit) {
      if (memHit.expiresAt > now) {
        return memHit.value as T;
      }
      this.memoryStore.delete(key);
    }

    if (!this.isReady()) {
      return null;
    }

    try {
      const value = await this.client!.get<any>(key);
      this.handleSuccess();

      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }

      return value as T;
    } catch (error: any) {
      this.handleError('getJson', key, error);
      return null;
    }
  }

  /**
   * Batch-fetch multiple keys in a single Upstash REST HTTP call (MGET).
   * Dramatically reduces network round-trips compared to N individual getJson calls.
   */
  async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    if (!this.isReady()) {
      // Return any in-memory cached entries or null
      const now = Date.now();
      return keys.map((key) => {
        const mem = this.memoryStore.get(key);
        if (mem && mem.expiresAt > now) return mem.value as T;
        return null;
      });
    }

    try {
      const results = await this.client!.mget<any[]>(...keys);
      this.handleSuccess();

      return results.map((value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as unknown as T;
          }
        }
        return value as T;
      });
    } catch (error: any) {
      this.handleError('mgetJson', `${keys.length} keys`, error);
      return keys.map(() => null);
    }
  }

  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number = REDIS_TTL.MEDIUM,
  ): Promise<void> {
    const ttlMs =
      ttlSeconds && ttlSeconds > 0
        ? ttlSeconds * 1000
        : REDIS_TTL.MEDIUM * 1000;
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + Math.min(ttlMs, 10 * 60 * 1000), // In-memory max 10 mins
    });

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
      this.handleSuccess();
    } catch (error: any) {
      this.handleError('setJson', key, error);
    }
  }

  /**
   * Batch-write many keys via a single Upstash REST pipeline call per chunk.
   */
  async pipelineSetJson(
    operations: { key: string; value: unknown; ttlSeconds?: number }[],
  ): Promise<{ ok: number; failed: number; failedKeys: string[] }> {
    const result = { ok: 0, failed: 0, failedKeys: [] as string[] };

    if (operations.length === 0) {
      return result;
    }

    // Always cache in memory fallback
    for (const op of operations) {
      const ttl = op.ttlSeconds ?? REDIS_TTL.MEDIUM;
      this.memoryStore.set(op.key, {
        value: op.value,
        expiresAt: Date.now() + Math.min(ttl * 1000, 10 * 60 * 1000),
      });
    }

    if (!this.isReady()) {
      result.failed = operations.length;
      result.failedKeys = operations.map((op) => op.key);
      return result;
    }

    const CHUNK_SIZE = 100;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      try {
        const pipe = this.client!.pipeline();
        for (const op of chunk) {
          const ttl = op.ttlSeconds ?? REDIS_TTL.MEDIUM;
          pipe.setex(op.key, ttl, op.value as any);
        }
        const responses = await pipe.exec({ keepErrors: true });
        this.handleSuccess();

        responses.forEach((res, idx) => {
          if (res.error) {
            result.failed += 1;
            result.failedKeys.push(chunk[idx].key);
          } else {
            result.ok += 1;
          }
        });
      } catch (error: any) {
        this.handleError(
          'pipelineSetJson',
          `chunk of ${chunk.length} keys`,
          error,
        );
        result.failed += chunk.length;
        result.failedKeys.push(...chunk.map((op) => op.key));
        break; // Stop further chunks if circuit breaker tripped
      }
    }

    return result;
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
      this.handleSuccess();
      return result === 'OK';
    } catch (error: any) {
      this.handleError('setnx', key, error);
      return false;
    }
  }

  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);

    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.del(key);
      this.handleSuccess();
    } catch (error: any) {
      this.handleError('del', key, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    // Delete from memory store
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryStore.keys()) {
      if (regex.test(key)) {
        this.memoryStore.delete(key);
      }
    }

    if (!this.isReady()) {
      return;
    }

    try {
      const matchedKeys = await this.keys(pattern);
      if (matchedKeys && matchedKeys.length > 0) {
        await this.client!.del(...matchedKeys);
        this.handleSuccess();
      }
    } catch (error: any) {
      this.handleError('delPattern', pattern, error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isReady()) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(this.memoryStore.keys()).filter((k) => regex.test(k));
    }

    try {
      const found = await this.client!.keys(pattern);
      this.handleSuccess();
      return found || [];
    } catch (error: any) {
      this.handleError('keys', pattern, error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    const now = Date.now();
    const mem = this.memoryStore.get(key);
    if (mem && mem.expiresAt > now) return true;

    if (!this.isReady()) {
      return false;
    }

    try {
      const count = await this.client!.exists(key);
      this.handleSuccess();
      return count > 0;
    } catch (error: any) {
      this.handleError('exists', key, error);
      return false;
    }
  }

  async rename(source: string, destination: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.rename(source, destination);
      this.handleSuccess();
    } catch (error: any) {
      this.handleError('rename', `${source} -> ${destination}`, error);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -2;
    }

    try {
      const result = await this.client!.ttl(key);
      this.handleSuccess();
      return result;
    } catch (error: any) {
      this.handleError('ttl', key, error);
      return -2;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.expire(key, ttlSeconds);
      this.handleSuccess();
    } catch (error: any) {
      this.handleError('expire', key, error);
    }
  }

  async flushAll(): Promise<void> {
    this.memoryStore.clear();

    if (!this.isReady()) {
      return;
    }

    try {
      await this.client!.flushdb();
      this.handleSuccess();
      this.logger.log('✅ Flushed all keys in Upstash Redis DB');
    } catch (error: any) {
      this.handleError('flushAll', 'all', error);
    }
  }
}

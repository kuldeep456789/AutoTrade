import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { RedisService } from '../redis/redis.service';
import { CJ_CONFIG } from '../../config/cj.config';

export interface CjProduct {
  pid: string;
  name: string;
  title: string;
  productName: string;
  price: number;
  images: string[];
  categoryId: string;
  categoryName: string;
  subcategoryName?: string;
  collectionType?: string;
  category: string;
  tags: string[];
  numReviews: number;
  averageRating: number;
  reviews: any[];
  variants?: CjVariant[];
  colors?: string[];
  sizes?: string[];
  [key: string]: any;
}

export interface WarehouseProduct extends CjProduct {
  _parentCategory?: string;
  _category?: string;
  _collectionType?: string;
}

export interface CjVariant {
  color: string;
  size: string;
  stock: number;
  variantImage: string;
  image: string;
  price: number;
  vid: string;
  variantKey: string;
}

export interface SearchResult {
  products: WarehouseProduct[];
  total: number;
  warehouseHit: boolean;
}

export interface SyncMetrics {
  currentCategory: string;
  currentPage: number;
  productsSynced: number;
  duplicatesRemoved: number;
  updatedProducts: number;
  apiCallsUsed: number;
  elapsedTimeSec: number;
  estimatedRemainingTimeSec: number;
  redisWriteStatus: string;
}

@Injectable()
export class CjClient {
  private readonly logger = new Logger(CjClient.name);
  private readonly baseUrl =
    process.env.CJ_API_BASE_URL ??
    'https://developers.cjdropshipping.com/api2.0';
  private readonly accessTokenCacheKey = 'cj:access_token';
  private accessTokenCache: { token: string; expiresAt: number } | null = null;
  private requestQueue: Promise<void> = Promise.resolve();
  public apiCallsThisSync = 0;

  constructor(private readonly redisService: RedisService) {}

  async getAccessToken() {
    const apiKey = process.env.CJ_API_KEY;
    const email = process.env.CJ_EMAIL;

    if (!apiKey) {
      throw new InternalServerErrorException('CJ_API_KEY is not configured');
    }
    if (!email) {
      throw new InternalServerErrorException('CJ_EMAIL is not configured');
    }

    this.logger.log('[CJ Client] POST /v1/authentication/getAccessToken');
    return this.scheduleRequest('/v1/authentication/getAccessToken', {
      method: 'POST',
      data: { email, apiKey },
    });
  }

  async authHeaders() {
    const configuredToken = process.env.CJ_ACCESS_TOKEN;
    const token = configuredToken ?? (await this.getCachedAccessToken());
    return { 'CJ-Access-Token': token };
  }

  private async getCachedAccessToken() {
    const now = Date.now();

    if (this.accessTokenCache && this.accessTokenCache.expiresAt > now) {
      return this.accessTokenCache.token;
    }

    const cached = await this.redisService.getJson<{
      token: string;
      expiresAt: number;
    }>(this.accessTokenCacheKey);

    if (cached && cached.token && cached.expiresAt > now) {
      this.accessTokenCache = cached;
      return cached.token;
    }

    const token = await this.resolveAccessToken();
    const tokenCache = {
      token,
      expiresAt: now + CJ_CONFIG.ACCESS_TOKEN_TTL_SECONDS * 1000,
    };
    this.accessTokenCache = tokenCache;
    await this.redisService.setJson(
      this.accessTokenCacheKey,
      tokenCache,
      CJ_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
    );
    return token;
  }

  private async resolveAccessToken() {
    const response = await this.getAccessToken();
    const token =
      response?.data?.accessToken ??
      response?.data?.access_token ??
      response?.accessToken ??
      response?.access_token;

    if (!token) {
      throw new InternalServerErrorException('CJ auth api not returned');
    }
    return token;
  }

  async clearCachedAccessToken() {
    this.accessTokenCache = null;
    await this.redisService.del(this.accessTokenCacheKey);
    this.logger.log('[CJ Client] Cleared cached access token');
  }

  // ── Robust queue — errors propagate to the caller, but the queue itself
  // never becomes a rejected promise and never stalls after a failure ──
  async scheduleRequest(path: string, init: AxiosRequestConfig): Promise<any> {
    const run = async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, CJ_CONFIG.REQUEST_DELAY_MS),
      );
      try {
        return await this.request(path, init);
      } catch (err: any) {
        this.logger.error(
          `[CJ Client] Queue request failed: ${err?.message ?? err}`,
        );
        throw err;
      }
    };

    // Chain this job after whatever's currently in the queue.
    const jobPromise = this.requestQueue.then(run);

    // Keep the internal queue pointer alive for the NEXT request regardless
    // of whether this job succeeds or fails, and make sure the pointer
    // itself can never become an unhandled rejection or stall the queue.
    this.requestQueue = jobPromise.then(
      () => undefined,
      () => undefined,
    );

    // Return the job's own promise so callers still see the real
    // success/failure and can catch it normally.
    return jobPromise;
  }

  private async request(
    path: string,
    init: AxiosRequestConfig,
    attempt = 0,
  ): Promise<any> {
    // ── API call counter with milestone logging ──
    this.apiCallsThisSync++;
    if (this.apiCallsThisSync % 100 === 0) {
      this.logger.log(
        `[CJ Client] Total API calls this sync: ${this.apiCallsThisSync}`,
      );
    }

    try {
      // ── Measure request time ──
      const start = Date.now();
      this.logger.log(
        `[CJ Client] ${String(init.method || 'GET').toUpperCase()} ${path}`,
      );

      // ── 10s axios timeout ──
      const response = await axios.request({
        baseURL: this.baseUrl,
        url: path,
        timeout: 10000,
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      this.logger.log(
        `[CJ Client] ${path} completed in ${Date.now() - start}ms`,
      );

      const data = response.data;
      if (data && data.result === false) {
        if ((data.code === 401 || data.code === '401') && attempt < 2) {
          this.logger.warn(
            '[CJ Client] Access token unauthorized (401 code) — clearing token and retrying...',
          );
          await this.clearCachedAccessToken();
          const headers = await this.authHeaders();
          return this.request(path, { ...init, headers }, attempt + 1);
        }
        throw new InternalServerErrorException(
          data.message || 'CJ Dropshipping API returned result: false',
        );
      }
      return data;
    } catch (error: any) {
      const status = error?.response?.status;

      // ── Handle timeout separately ──
      if (error?.code === 'ECONNABORTED') {
        this.logger.error(
          `[CJ Client] Request timeout after 10 seconds: ${path}`,
        );
      }

      // 401 Unauthorized Retry
      if (status === 401 && attempt < 2) {
        this.logger.warn('[CJ Client] Access token unauthorized (HTTP 401)');
        await this.clearCachedAccessToken();
        const headers = await this.authHeaders();
        return this.request(path, { ...init, headers }, attempt + 1);
      }

      // Retryable errors: 429, 500, 502, 503, 504
      const isRetryableStatus = [429, 500, 502, 503, 504].includes(status);
      if (isRetryableStatus && attempt < CJ_CONFIG.MAX_RETRIES) {
        const baseDelay = CJ_CONFIG.BACKOFF_FACTOR * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 1000);
        const retryDelay = baseDelay + jitter;
        // ── Better retry logging ──
        this.logger.warn(
          `[CJ Client] HTTP ${status} | Retry ${attempt + 1}/${CJ_CONFIG.MAX_RETRIES} | Waiting ${retryDelay}ms | ${path}`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return this.request(path, init, attempt + 1);
      }

      // ── Structured final error log ──
      this.logger.error(
        [
          '[CJ Client] REQUEST FAILED',
          `Path: ${path}`,
          `HTTP: ${status ?? 'Unknown'}`,
          `Code: ${error?.code ?? 'Unknown'}`,
          `Message: ${error?.message ?? 'Unknown'}`,
          `Response: ${JSON.stringify(error?.response?.data ?? {})}`,
        ].join(' | '),
      );
      throw new InternalServerErrorException({
        message: `CJ Dropshipping API request failed: ${error?.message}`,
        status,
        response: error?.response?.data ?? null,
      });
    }
  }
}

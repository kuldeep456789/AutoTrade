import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { Order } from '../orders/schemas/order.schema';
import { Automobiles, getAllSyncTargets, getCategoryInfoById, getCategoryInfoBySubname } from './collections';
import { CjCreateOrderDto, CjOrderProductItem } from './dto/cj-order.dto';

const WAREHOUSE_KEY_ALL = 'products:all';
const WAREHOUSE_NEXT_ALL = 'products:next:all';

const categoryKey = (parentCat: string, subCat: string) =>
  `products:${parentCat.toLowerCase().replace(/[\s_'&-]+/g, '')}:${subCat.toLowerCase().replace(/[\s_'&-]+/g, '')}`;
const categoryNextKey = (parentCat: string, subCat: string) =>
  `products:next:${parentCat.toLowerCase().replace(/[\s_'&-]+/g, '')}:${subCat.toLowerCase().replace(/[\s_'&-]+/g, '')}`;

const SYNC_METRICS_KEY = 'cj:sync:metrics';

// TTL removed for zero-downtime persistent cache

const PRODUCT_COUNT_CACHE_KEY = 'cj:product_count';
const PRODUCT_COUNT_TTL = 60 * 60 * 24;

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];
const DEFAULT_COLORS = ['Black'];

@Injectable()
export class CjService {
  private readonly logger = new Logger(CjService.name);
  private readonly baseUrl =
    process.env.CJ_API_BASE_URL ??
    'https://developers.cjdropshipping.com/api2.0';
  private readonly accessTokenCacheKey = 'cj:access_token';
  private readonly accessTokenTtlSeconds = 60 * 60 * 23;
  private readonly requestDelayMs = 1500;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;
  private requestQueue: Promise<void> = Promise.resolve();
  private apiCallsThisSync = 0;

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(Order.name) private readonly orderModel?: Model<Order>,
  ) { }

  async getAccessToken() {
    const apiKey = process.env.CJ_API_KEY;
    const email = process.env.CJ_EMAIL;

    if (!apiKey)
      throw new InternalServerErrorException('CJ_API_KEY is not configured');
    if (!email)
      throw new InternalServerErrorException('CJ_EMAIL is not configured');

    this.logger.log('[CJ] POST /v1/authentication/getAccessToken');
    return this.scheduleRequest('/v1/authentication/getAccessToken', {
      method: 'POST',
      data: { email, api_key: apiKey },
    });
  }

  async createOrderV2(payload: CjCreateOrderDto) {
    this.logger.log(
      `[CJ] POST /v1/shopping/order/createOrderV2 for order #${payload.orderNumber}`,
    );
    const headers = await this.authHeaders();
    const body = {
      platform: 'Api',
      logisticName: 'CJPacket',
      fromCountryCode: 'CN',
      ...payload,
    };
    try {
      return await this.scheduleRequest('/v1/shopping/order/createOrderV2', {
        method: 'POST',
        headers,
        data: body,
      });
    } catch (err: any) {
      this.logger.warn(
        `[CJ] createOrderV2 failed, attempting fallback to POST /v1/shopping/order/createOrder...`,
      );
      return await this.scheduleRequest('/v1/shopping/order/createOrder', {
        method: 'POST',
        headers,
        data: body,
      });
    }
  }

  async syncOrderToCj(order: any): Promise<boolean> {
    const orderNumber = order._id
      ? order._id.toString()
      : order.id || String(Date.now());
    const shipping = order.shippingDetails || {};

    const mappedProducts: CjOrderProductItem[] = [];
    for (const item of order.items || []) {
      let vid = item.vid;
      if (!vid && item.productId) {
        try {
          const prod = await this.getProductById(item.productId);
          vid =
            prod?.variants?.[0]?.vid ||
            prod?.variants?.[0]?.variantId ||
            prod?.vid;
        } catch (err: any) {
          this.logger.warn(
            `[CJ] Could not fetch product details to resolve vid for ${item.productId}`,
          );
        }
      }
      mappedProducts.push({
        vid: vid || item.productId,
        quantity: item.quantity || 1,
      });
    }

    const payload: CjCreateOrderDto = {
      orderNumber,
      shippingCustomerName: shipping.customerName || 'Customer',
      shippingAddress: shipping.address || 'Address line 1',
      shippingCity: shipping.city || 'City',
      shippingProvince: shipping.province || 'State',
      shippingCountryCode: shipping.countryCode || 'IN',
      shippingCountry: shipping.country || 'India',
      shippingZip: shipping.zip || '000000',
      shippingPhone: shipping.phone || '0000000000',
      logisticName: order.logisticName || 'CJPacket',
      fromCountryCode: order.fromCountryCode || 'CN',
      platform: 'Api',
      products: mappedProducts,
    };

    try {
      this.logger.log(
        `[CJ] Syncing order ${orderNumber} to CJ Dropshipping... Payload: ${JSON.stringify(payload)}`,
      );
      const response = await this.createOrderV2(payload);

      const cjOrderId =
        response?.data?.cjOrderId ||
        response?.data?.orderId ||
        response?.data ||
        response?.cjOrderId;

      if (response?.result !== false && cjOrderId) {
        order.cjOrderId = String(cjOrderId);
        order.status = 'processing';
        if (typeof order.save === 'function') {
          await order.save();
        }
        this.logger.log(
          `[CJ] Order ${orderNumber} successfully created on CJ! CJ Order ID: ${cjOrderId}`,
        );
        return true;
      } else {
        this.logger.error(
          `[CJ] Order ${orderNumber} sync failed with message: ${response?.message || 'Unknown error'}. Retaining status 'confirmed'.`,
          JSON.stringify(payload),
        );
        return false;
      }
    } catch (err: any) {
      this.logger.error(
        `[CJ] Exception syncing order ${orderNumber} to CJ Dropshipping: ${err?.message ?? err}. Retaining status 'confirmed'.`,
        JSON.stringify({
          payload,
          errorResponse: err?.response ?? err?.data ?? null,
        }),
      );
      return false;
    }
  }

  async syncOrderById(
    orderId: string,
  ): Promise<{ success: boolean; message: string; cjOrderId?: string }> {
    if (!this.orderModel) {
      throw new InternalServerErrorException(
        'OrderModel is not injected in CjService',
      );
    }
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found in database`);
    }

    const success = await this.syncOrderToCj(order);
    if (success) {
      return {
        success: true,
        message: `Order #${orderId} successfully synced to CJ Dropshipping!`,
        cjOrderId: order.cjOrderId,
      };
    } else {
      return {
        success: false,
        message: `Failed to sync Order #${orderId} to CJ Dropshipping. Check server logs for details.`,
      };
    }
  }

  async getCategories() {
    const cacheKey = 'categories';
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    this.logger.log('[CJ] GET /v1/product/getCategory');
    const response = await this.scheduleRequest('/v1/product/getCategory', {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    const normalized = this.normalizeCategoryResponse(response);
    await this.redisService.setJson(cacheKey, normalized, 60 * 60 * 24 * 7);
    return normalized;
  }

  async getProductById(pid: string) {
    if (!pid) throw new BadRequestException('product id is required');

    const cacheKey = `product:${pid}`;
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    const url = `/v1/product/list?pid=${pid}`;
    this.logger.log(`[CJ] GET ${url}`);
    const response = await this.scheduleRequest(url, {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    if (response?.result === false) {
      throw new NotFoundException(
        `CJ API Error: ${response?.message || 'Product not found'}`,
      );
    }

    const normalized = this.normalizeProductResponse(response);
    const product = normalized?.products?.[0] ?? null;

    if (!product) throw new NotFoundException('Product not found');

    try {
      const enriched = await this.enrichWithVariants(product, pid);
      await this.redisService.setJson(cacheKey, enriched, 60 * 60 * 24);
      return enriched;
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Variant enrichment failed for ${pid}: ${err?.message ?? err}`,
      );
    }

    await this.redisService.setJson(cacheKey, product, 60 * 60 * 24);
    return product;
  }

  async getProducts(query: Record<string, string | undefined> = {}) {
    const cacheKey = `cj:products:list:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    const cjQuery = { ...query };
    if (!cjQuery.categoryId && cjQuery.subcategoryName) {
      const info = getCategoryInfoBySubname(cjQuery.subcategoryName);
      if (info?.categoryId) {
        cjQuery.categoryId = info.categoryId;
      }
    }

    const url = `/v1/product/list${this.buildSearch(cjQuery)}`;
    this.logger.log(`[CJ] GET ${url}`);
    const response = await this.scheduleRequest(url, {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    const normalized = this.normalizeProductResponse(response, query);
    await this.redisService.setJson(cacheKey, normalized, 60 * 60 * 24);
    return normalized;
  }

  async getProductsByCategory(
    categoryId: string,
    pid?: string,
    query: Record<string, string | undefined> = {},
  ) {
    if (!categoryId)
      throw new BadRequestException('categoryId query parameter is required');

    const cacheKey = `cj:products:cat:${categoryId}:pid:${pid || 'none'}:q:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    const cjQuery = this.filterCjParams(query);
    const url = `/v1/product/list${this.buildSearch({ ...cjQuery, categoryId, ...(pid ? { pid } : {}) })}`;
    this.logger.log(`[CJ] GET ${url}`);
    const response = await this.scheduleRequest(url, {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    const normalized = this.normalizeProductResponse(response, query);
    await this.redisService.setJson(cacheKey, normalized, 60 * 60 * 6);
    return normalized;
  }



  async getAllProducts(categoryId?: string) {
    const categories = categoryId
      ? [categoryId]
      : ((await this.getCategories())?.categories
        ?.map((c: any) => c.id)
        .filter(Boolean) ?? []);
    const allProducts: any[] = [];

    for (const catId of categories) {
      let pageNum = 1;
      while (true) {
        try {
          const pageSize = 40;
          const url = `/v1/product/list${this.buildSearch({ categoryId: catId, pageNum: String(pageNum), pageSize: String(pageSize) })}`;
          this.logger.log(`[CJ] GET ${url}`);
          const response = await this.scheduleRequest(url, {
            method: 'GET',
            headers: await this.authHeaders(),
          });
          const products = this.extractList(response);
          const normalized = this.normalizeProductResponse(response);
          allProducts.push(...(normalized.products || []));
          if (products.length < pageSize) break;
          if (pageNum >= 800) break;
          pageNum++;
        } catch (e: any) {
          this.logger.warn(
            `[CJ] Failed to fetch category ${catId} page ${pageNum}: ${e.message}`,
          );
          break;
        }
      }
      if (allProducts.length >= 20000) break;
    }

    await this.saveProductCount(allProducts.length);
    return allProducts;
  }

  async searchProducts(
    keyword: string,
    pageNum = 1,
    pageSize = 200,
    hint?: any,
  ) {
    const query: Record<string, string> = {
      pageNum: String(pageNum),
      pageSize: String(pageSize),
      keyword,
      ...hint,
    };
    return this.getProducts(query);
  }

  //warehouse
  async getWarehouseProducts(
    pageNum = 1,
    pageSize = 160,
    categoryId?: string,
    subcategoryName?: string,
    collectionType?: string,
  ): Promise<{ products: any[]; total: number; warehouseHit: true } | null> {
    // 1. Direct Subcategory Key Lookup
    if (subcategoryName) {
      let parentCat = 'auto';
      for (const [parent, items] of Object.entries(Automobiles)) {
        if (
          items.some((i) => i.name.toLowerCase() === subcategoryName.toLowerCase())
        ) {
          parentCat = parent;
          break;
        }
      }
      const catKey = categoryKey(parentCat, subcategoryName);
      const catData = await this.redisService.getJson<any[]>(catKey);

      if (catData && Array.isArray(catData) && catData.length > 0) {
        const total = catData.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = catData.slice(start, start + effectivePageSize);
        this.logger.log(
          `[CJ] Warehouse cat-key HIT ${catKey} → ${products.length}/${total}`,
        );
        return { products, total, warehouseHit: true };
      }
    }

    // 2. Direct Collection Type Keys Lookup
    if (collectionType) {
      const collSlug = collectionType.toLowerCase().replace(/[\s_'&-]+/g, '');
      const catKeys = await this.redisService.keys('products:*');
      const collProducts: any[] = [];

      if (catKeys && catKeys.length > 0) {
        for (const key of catKeys) {
          const parts = key.split(':');
          if (
            parts.length === 3 &&
            !key.includes('related') &&
            !key.includes('next')
          ) {
            const keyParentSlug = parts[1];
            if (
              keyParentSlug.includes(collSlug) ||
              collSlug.includes(keyParentSlug)
            ) {
              const items = await this.redisService.getJson<any[]>(key);
              if (Array.isArray(items)) {
                collProducts.push(...items);
              }
            }
          }
        }
      }

      if (collProducts.length > 0) {
        let pool = this.interleaveByCategory(collProducts);
        if (subcategoryName) {
          const normSub = subcategoryName.trim().toLowerCase();
          const subFiltered = pool.filter((p) => {
            const val = String(
              p.subcategoryName ?? p._category ?? p.category ?? p.categoryName ?? '',
            )
              .trim()
              .toLowerCase();
            return (
              val === normSub || val.includes(normSub) || normSub.includes(val)
            );
          });
          if (subFiltered.length > 0) {
            pool = subFiltered;
          } else {
            return { products: [], total: 0, warehouseHit: true };
          }
        }

        const total = pool.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = pool.slice(start, start + effectivePageSize);

        this.logger.log(
          `[CJ] Warehouse collection-keys HIT "${collectionType}" → ${products.length}/${total}`,
        );
        return { products, total, warehouseHit: true };
      }
    }

    // 3. Main Global Warehouse Key or Fallback Pool
    let warehouse = await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL);

    if (!warehouse || !Array.isArray(warehouse) || warehouse.length === 0) {
      const catKeys = await this.redisService.keys('products:*');
      const allFromCats: any[] = [];
      if (catKeys && catKeys.length > 0) {
        for (const key of catKeys) {
          const parts = key.split(':');
          if (
            parts.length === 3 &&
            !key.includes('related') &&
            !key.includes('next')
          ) {
            const catProducts = await this.redisService.getJson<any[]>(key);
            if (Array.isArray(catProducts)) {
              allFromCats.push(...catProducts);
            }
          }
        }
      }

      if (allFromCats.length > 0) {
        warehouse = this.interleaveByCategory(allFromCats);
        this.logger.log(
          `[Warehouse] Assembled ${warehouse.length} products from category sub-keys`,
        );
      } else {
        const productDetailKeys = await this.redisService.keys('product:*');
        const allFromDetails: any[] = [];
        if (productDetailKeys && productDetailKeys.length > 0) {
          for (const key of productDetailKeys) {
            if (key.split(':').length === 2) {
              const p = await this.redisService.getJson<any>(key);
              if (p && typeof p === 'object' && (p.pid || p._id || p.id)) {
                allFromDetails.push(p);
              }
            }
          }
        }

        if (allFromDetails.length > 0) {
          warehouse = allFromDetails;
          this.logger.warn(
            `[Warehouse] products:all empty — serving ${warehouse.length} products from individual detail cache (sync pending)`,
          );
        } else {
          return null;
        }
      }
    }

    let pool = warehouse;

    if (categoryId) {
      const filtered = pool.filter(
        (p) => String(p.categoryId ?? p.category ?? '') === categoryId,
      );
      if (filtered.length > 0) pool = filtered;
    }

    if (subcategoryName) {
      const norm = subcategoryName.trim().toLowerCase();
      const filtered = pool.filter((p) => {
        const val = String(p.subcategoryName ?? p._category ?? p.category ?? p.categoryName ?? '')
          .trim()
          .toLowerCase();
        return val === norm || val.includes(norm) || norm.includes(val);
      });
      if (filtered.length > 0) {
        pool = filtered;
      } else {
        return { products: [], total: 0, warehouseHit: true };
      }
    }

    if (collectionType) {
      const normColl = collectionType.trim().toLowerCase();
      const filtered = pool.filter((p) => {
        const val = String(
          p._parentCategory ??
            p._collectionType ??
            p.collectionType ??
            p.parentCategory ??
            p.categoryName ??
            '',
        )
          .trim()
          .toLowerCase();
        return (
          val === normColl || val.includes(normColl) || normColl.includes(val)
        );
      });

      if (filtered.length > 0) {
        pool = filtered;
      } else {
        // Return 0 products for this collection so live CJ API fallback handles it
        return { products: [], total: 0, warehouseHit: true };
      }
    }

    // ── Strip zero / sub-1-rupee priced products from the final pool ─────────
    pool = pool.filter((p) => {
      const inrPrice = Number(p.price ?? 0);
      return inrPrice > 1;
    });

    const total = pool.length;
    const effectivePageSize = Math.min(pageSize, 250);
    const start = (pageNum - 1) * effectivePageSize;
    const products = pool.slice(start, start + effectivePageSize);

    this.logger.log(
      `[CJ] Warehouse READ page=${pageNum} size=${effectivePageSize} → ${products.length}/${total}`,
    );
    return { products, total, warehouseHit: true };
  }

  //timer and locked if failed the data load, try in three atemp , one is , 0 sec  , 30 sec and 2 minute
  async runCatalogSync(): Promise<{ success: boolean; count: number }> {
    const lockKey = 'cj:sync:lock';
    const locked = await this.redisService.setnx(lockKey, '1', 3600);
    if (!locked) {
      this.logger.warn('[Cron] Sync is already running (locked). Skipping.');
      return { success: false, count: 0 };
    }

    try {
      const syncStart = Date.now();
      this.apiCallsThisSync = 0;

      this.logger.log('[Cron] Sync Started');

      const RETRY_DELAYS = [0, 30_000, 120_000]; // timer 0 sec , 30 sec , and 2 min
      let lastError = '';
      let allProducts: any[] | null = null;

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
          this.logger.warn(
            `[Cron] ⏳ Retrying sync in ${RETRY_DELAYS[attempt] / 1000}s (attempt ${attempt + 1})...`,
          );
          await this.delay(RETRY_DELAYS[attempt]);
        }

        try {
          allProducts = await this.fetchCatalog();
          break; // success — exit retry loop
        } catch (e: any) {
          lastError = e?.message ?? String(e);
          this.logger.error(
            `[Cron]  Sync attempt ${attempt + 1} failed: ${lastError}`,
          );
        }
      }

      // ── All retries failed — keep existing cache ────────────────────────────
      if (!allProducts) {
        this.logger.error(
          '[Cron]  All sync attempts failed. Existing warehouse cache preserved.',
        );
        return { success: false, count: 0 };
      }

      if (allProducts.length < 500) {
        this.logger.warn(
          `[Cron]  Fetch returned only ${allProducts.length} products — too few to be valid. Keeping existing cache.`,
        );
        return { success: false, count: allProducts.length };
      }

      /// here is one task running on the background, then start second part is called buffering ,
      // not burden on first task , and load properly and render/reflect on frontend

      const balancedAll = this.interleaveByCategory(allProducts);

      this.logger.log(
        `[Cron] Products Fetched & Interleaved — Total: ${allProducts.length}`,
      );

      // Write directly to the live key — no temp buffer needed
      await this.redisService.setJson(WAREHOUSE_KEY_ALL, balancedAll);
      this.logger.log(`[Cron] Wrote ${balancedAll.length} products → ${WAREHOUSE_KEY_ALL}`);

      // Write per-category keys directly
      const categoryGroups = this.groupByCategory(allProducts);
      const catWriteOps: Promise<void>[] = [];
      for (const [catKey, catProducts] of Object.entries(categoryGroups)) {
        catWriteOps.push(
          this.redisService.setJson(`products:${catKey}`, catProducts),
        );
      }
      await Promise.all(catWriteOps);

      // Automatically invalidate stale API response cache keys so GET /api/products returns fresh 137k warehouse data immediately
      await this.clearApiCache();

      const durationMs = Date.now() - syncStart;
      this.logger.log(`[Cron]  Redis Updated & API Cache Cleared`);
      this.logger.log(
        `[Cron]  Execution Time: ${(durationMs / 1000).toFixed(1)}s`,
      );
      this.logger.log(`[Cron]  API Calls Used: ~${this.apiCallsThisSync}`);
      this.logger.log(`[Cron]  Sync Completed Successfully`);

      await this.saveProductCount(allProducts.length);

      return { success: true, count: allProducts.length };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /** Also expose the old name for backward compat (cj.controller.ts) */
  async crawlAllByKeywords() {
    const result = await this.runCatalogSync();
    return { length: result.count };
  }

  async getProductCount(): Promise<number> {
    const cached = await this.redisService.getJson<number>(
      PRODUCT_COUNT_CACHE_KEY,
    );
    return cached ?? 0;
  }

  async clearApiCache(): Promise<{ cleared: number }> {
    const keys = await this.redisService.keys('api:products:*');
    if (keys && keys.length > 0) {
      await this.redisService.delPattern('api:products:*');
      this.logger.log(
        `[CJ] Cleared ${keys.length} stale API response cache keys`,
      );
    }
    return { cleared: keys.length };
  }

  // ─── Private: catalog fetch logic ─────────────────────────────────────────

  private async fetchCatalog(): Promise<any[]> {
    const allProducts: any[] = [];
    const globalSeenPids = new Set<string>();

    // Build sync targets from Automobiles categories (skip empty categoryIds)
    const uniqueTargets = getAllSyncTargets();

    this.logger.log(
      `[CJ] Starting full catalog sync across ${uniqueTargets.length} automobile categories (processing ONE at a time)...`,
    );

    let totalPagesSyncedAll = 0;

    // 2. Process ONE CATEGORY AT A TIME sequentially
    for (const entry of uniqueTargets) {
      const { categoryId, parentCategory, name: categoryName } = entry;
      const catKey = categoryKey(parentCategory, categoryName);
      const catStart = Date.now();

      // Read existing products from Redis for safe merge (NEVER CLEAR keys)
      const existingCatProducts =
        (await this.redisService.getJson<any[]>(catKey)) || [];
      const productsBefore = existingCatProducts.length;

      // Product Map indexed by PID for deduplication, merge & updates
      const productMap = new Map<string, any>();
      for (const p of existingCatProducts) {
        const pid = String(p.pid || p.id || '');
        if (pid) productMap.set(pid, p);
      }

      let pageNum = 1;
      const pageSize = 40; // 40 products per request
      const maxPagesPerCategory = 800; // Increased limit to 800 pages per category
      let pagesSynced = 0;
      let newProductsCount = 0;
      let updatedProductsCount = 0;
      let duplicatesRemovedCount = 0;
      let catApiCalls = 0;

      // Multi-page fetch loop: continue fetching pages until supplier has no more products or maxPages reached
      while (pageNum <= maxPagesPerCategory) {
        const url = `/v1/product/list?categoryId=${categoryId}&pageNum=${pageNum}&pageSize=${pageSize}`;
        let response: any = null;

        try {
          response = await this.scheduleRequest(url, {
            method: 'GET',
            headers: await this.authHeaders(),
          });
          this.apiCallsThisSync++;
          catApiCalls++;
        } catch (err: any) {
          this.logger.warn(
            `[CJ] Failed to fetch page ${pageNum} for category "${categoryName}" (${categoryId}): ${err?.message ?? err}`,
          );
          // Exponential backoff delay & retry up to 3 times for page
          let retrySuccess = false;
          for (let retry = 1; retry <= 3; retry++) {
            const backoffDelay = 3000 * Math.pow(2, retry);
            this.logger.warn(
              `[CJ] Retrying page ${pageNum} in ${backoffDelay}ms (retry ${retry})...`,
            );
            await this.delay(backoffDelay);
            try {
              response = await this.scheduleRequest(url, {
                method: 'GET',
                headers: await this.authHeaders(),
              });
              this.apiCallsThisSync++;
              catApiCalls++;
              retrySuccess = true;
              break;
            } catch (rErr: any) {
              this.logger.warn(
                `[CJ] Retry ${retry} failed for page ${pageNum}: ${rErr?.message ?? rErr}`,
              );
            }
          }
          if (!retrySuccess) {
            this.logger.error(
              `[CJ] Skipping remaining pages for category "${categoryName}" due to repeated API failures.`,
            );
            break;
          }
        }

        const normalized = this.normalizeProductResponse(response, {
          categoryId,
        });
        const products: any[] = normalized?.products ?? [];

        if (products.length === 0) {
          break; // Supplier has no more products for this category
        }

        pagesSynced++;
        totalPagesSyncedAll++;

        for (const product of products) {
          const pid = String(product?.pid || product?.id || '');
          if (!pid) continue;

          // ── Skip zero / sub-1-rupee priced products ─────────────────────
          const productPrice = Number(product?.price ?? product?.sellPrice ?? 0) || 0;
          const inrPrice = productPrice > 1 ? productPrice : Number((productPrice * 93.45).toFixed(2));
          if (inrPrice <= 1) continue;

          if (productMap.has(pid)) {
            // Update changed fields (price, stock, images, variants, title, etc.)
            const existing = productMap.get(pid);
            const isChanged =
              existing.price !== product.price ||
              existing.discountPrice !== product.discountPrice ||
              existing.name !== product.name ||
              existing.title !== product.title ||
              JSON.stringify(existing.productImageSet ?? []) !==
              JSON.stringify(product.productImageSet ?? []);

            if (isChanged) {
              productMap.set(pid, {
                ...existing,
                ...product,
                _parentCategory: parentCategory,
                _category: categoryName,
                _collectionType: parentCategory,
              });
              updatedProductsCount++;;
            } else {
              duplicatesRemovedCount++;
            }
          } else {
            // New product discovered
            productMap.set(pid, {
              ...product,
              _parentCategory: parentCategory,
              _category: categoryName,
              _collectionType: parentCategory,
            });
            newProductsCount++;
          }
        }

        // Stop conditions: CJ reports last page OR returned count < pageSize
        if (products.length < pageSize) {
          break;
        }

        pageNum++;
        // Small delay between page requests to minimize CJ API rate limits
        await this.delay(200);
      }

      const mergedCatProducts = Array.from(productMap.values());
      const productsAfter = mergedCatProducts.length;

      // Safely update Redis category key ONLY if we fetched items or had existing items
      if (productsAfter > 0) {
        await this.redisService.setJson(catKey, mergedCatProducts);
      }

      const catDurationSec = ((Date.now() - catStart) / 1000).toFixed(1);
      this.logger.log(
        `[CJ] Category "${categoryName}" (${parentCategory}): ${productsAfter} items (${newProductsCount} new, ${updatedProductsCount} updated) in ${catDurationSec}s`,
      );

      // Append to global product pool
      for (const p of mergedCatProducts) {
        const pid = String(p.pid || p.id || '');
        if (pid && !globalSeenPids.has(pid)) {
          globalSeenPids.add(pid);
          allProducts.push(p);
        }
      }

      // Small delay before starting next category
      await this.delay(300);
    }

    this.logger.log(`Fetch -> Unique Products: ${allProducts.length}`);

    return allProducts;
  }

  // ─── Private: group products by category → Redis key segment ──────────────

  private groupByCategory(products: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    for (const p of products) {
      const parent = String(p._parentCategory ?? p._collectionType ?? 'auto').toLowerCase();
      const catName = String(
        p._category ?? p.subcategoryName ?? p.category ?? 'other',
      );
      const key = `${parent.replace(/[\s_'&-]+/g, '')}:${catName.toLowerCase().replace(/[\s_'&-]+/g, '')}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    return groups;
  }

  private interleaveByCategory(products: any[]): any[] {
    if (!products || products.length === 0) return [];
    const groups = new Map<string, any[]>();
    for (const p of products) {
      const cat = String(p._category ?? p.subcategoryName ?? 'other')
        .trim()
        .toLowerCase();
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    const result: any[] = [];
    let added = true;
    let idx = 0;
    const catArrays = Array.from(groups.values());
    while (added) {
      added = false;
      for (const arr of catArrays) {
        if (idx < arr.length) {
          result.push(arr[idx]);
          added = true;
        }
      }
      idx++;
    }
    return result;
  }

  private async saveProductCount(count: number): Promise<void> {
    await this.redisService.setJson(
      PRODUCT_COUNT_CACHE_KEY,
      count,
      PRODUCT_COUNT_TTL,
    );
  }

  // ─── Private: HTTP helpers ────────────────────────────────────────────────

  private async authHeaders() {
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
      expiresAt: now + this.accessTokenTtlSeconds * 1000,
    };
    this.accessTokenCache = tokenCache;
    await this.redisService.setJson(
      this.accessTokenCacheKey,
      tokenCache,
      this.accessTokenTtlSeconds,
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

    if (!token)
      throw new InternalServerErrorException('CJ auth api not returned');
    return token;
  }

  private async scheduleRequest(path: string, init: AxiosRequestConfig) {
    const run = async () => {
      await this.delay(this.requestDelayMs);
      return this.request(path, init);
    };

    const next = this.requestQueue.then(run, run);
    this.requestQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async clearCachedAccessToken() {
    this.accessTokenCache = null;
    await this.redisService.del(this.accessTokenCacheKey);
    this.logger.log('[CJ] Cleared cached access token');
  }

  private async request(
    path: string,
    init: AxiosRequestConfig,
    attempt = 0,
  ): Promise<any> {
    try {
      this.logger.log(
        `[CJ] AXIOS ${String(init.method || 'GET').toUpperCase()} ${this.baseUrl}${path}`,
      );
      const response = await axios.request({
        baseURL: this.baseUrl,
        url: path,
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      });
      const data = response.data;
      if (data && data.result === false) {
        if ((data.code === 401 || data.code === '401') && attempt < 2) {
          this.logger.warn(
            '[CJ] Access token unauthorized (401 code) — clearing token and retrying...',
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

      if (status === 401 && attempt < 2) {
        this.logger.warn('[CJ] Access token unauthorized (HTTP 401)');
        await this.clearCachedAccessToken();
        const headers = await this.authHeaders();
        return this.request(path, { ...init, headers }, attempt + 1);
      }

      if (status === 429 && attempt < 5) {
        const baseDelay = 2000 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 1000);
        const retryDelay = baseDelay + jitter;
        this.logger.warn(
          `[CJ] Rate limited — retrying in ${retryDelay}ms (attempt ${attempt + 1})`,
        );
        await this.delay(retryDelay);
        return this.request(path, init, attempt + 1);
      }

      this.logger.error(
        `[CJ] AXIOS ERROR ${this.baseUrl}${path} → HTTP ${status}`,
      );
      throw new InternalServerErrorException({
        message: 'CJ Dropshipping API request failed',
        status,
        response: error?.response?.data ?? null,
      });
    }
  }

  // ─── Private: normalisation helpers ──────────────────────────────────────

  private normalizeProductResponse(response: any, query?: Record<string, any>) {
    const products = this.extractList(response)
      .map((p: any) => this.normalizeProduct(p, query))
      .filter(Boolean);
    return { ...response, products };
  }

  private normalizeCategoryResponse(response: any) {
    const raw = this.extractList(response);
    const categories = this.flattenCategories(raw);
    return { ...response, categories };
  }

  // when blocked

  private flattenCategories(items: any[]): any[] {
    const results: any[] = [];

    const visit = (item: any, group: string, depth: number) => {
      if (!item || typeof item !== 'object') return;

      const catName = String(
        item.categoryName ||
        item.categoryThirdName ||
        item.categorySecondName ||
        item.categoryFirstName ||
        '',
      ).toLowerCase();

      // if (catName && this.isBlocked(catName)) return;

      const childArrayKey = Object.keys(item).find(
        (key) =>
          Array.isArray(item[key]) &&
          item[key].length > 0 &&
          typeof item[key][0] === 'object',
      );

      if (childArrayKey) {
        const branchId = item?.categorySecondId ?? item?.categoryFirstId;
        const branchName = item?.categorySecondName ?? item?.categoryFirstName;
        const nextGroup = group || item?.categoryFirstName || '';

        if (branchId && branchName) {
          results.push(
            this.normalizeCategory(
              { categoryId: branchId, categoryName: branchName },
              nextGroup,
            ),
          );
        }

        for (const child of item[childArrayKey])
          visit(child, nextGroup, depth + 1);
        return;
      }

      if (catName) {
        results.push(this.normalizeCategory(item, group));
      }
    };

    for (const item of items) visit(item, '', 0);
    return results;
  }

  private normalizeCategory(category: any, group = '') {
    const id =
      category?.categoryId ??
      category?.categoryThirdId ??
      category?.categorySecondId ??
      category?.categoryFirstId ??
      category?._id ??
      category?.id ??
      '';
    const name =
      category?.categoryName ??
      category?.categoryThirdName ??
      category?.categorySecondName ??
      category?.categoryFirstName ??
      category?.name ??
      '';
    return { ...category, _id: id, id, name, group };
  }

  private extractList(response: any) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return (
      response?.data?.list ??
      response?.data?.products ??
      response?.data?.records ??
      response?.data?.result ??
      response?.data?.data ??
      response?.products ??
      response?.records ??
      response?.list ??
      []
    );
  }

  private normalizeProduct(product: any, query?: Record<string, any>) {
    const categoryId = String(product?.categoryId ?? product?.category ?? '');
    // if (EXCLUDED_CATEGORY_IDS.has(categoryId)) return null;

    const pid = String(
      product?.pid ??
      product?.id ??
      product?.productId ??
      product?.productPid ??
      product?.product_id ??
      product?.productCode ??
      '',
    );
    // if (EXCLUDED_PRODUCT_PIDS.has(pid)) return null;

    const subcategoryName = product._category || query?._category;
    const collectionType = product._collectionType || query?._collectionType;

    const images = [
      product?.productImage,
      product?.image,
      product?.img,
      product?.primaryImage,
      product?.mainImageUrl,
      product?.mainImage,
      product?.coverImage,
      product?.bigImage,
      product?.thumbnail,
      product?.thumbnailUrl,
      product?.imageUrl,
      ...(Array.isArray(product?.productImages) ? product.productImages : []),
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(Array.isArray(product?.imageList) ? product.imageList : []),
      ...(Array.isArray(product?.imgList) ? product.imgList : []),
      ...(Array.isArray(product?.variantImages) ? product.variantImages : []),
      ...(Array.isArray(product?.productImageSet)
        ? product.productImageSet
        : []),
      ...(Array.isArray(product?.extraImages) ? product.extraImages : []),
    ]
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item.url || item.image || item.src || '';
      })
      .filter(Boolean);

    const uniqueImages = Array.from(new Set(images));
    const name =
      product?.productNameEn ??
      product?.productName ??
      product?.nameEn ??
      product?.name ??
      '';
    const rawPrice = Number(product?.sellPrice ?? product?.price ?? 0) || 0;
    const price = Number((rawPrice * 93.45).toFixed(2));

    const categoryName =
      product?.categoryName ??
      product?.categoryThirdName ??
      product?.categorySecondName ??
      product?.categoryFirstName ??
      '';

    return {
      ...product,
      pid,
      name,
      title: name,
      productName: name,
      price,
      images: uniqueImages,
      categoryId,
      categoryName,
      subcategoryName,
      category: categoryName || categoryId,
      collectionType: product?.collectionType ?? collectionType,
      tags: Array.isArray(product?.tags) ? product.tags : [],
      // sizes,
      // colors,
      // variants,
      numReviews: 0,
      averageRating: 0,
      reviews: [],
    };
  }

  private async enrichWithVariants(product: any, pid: string): Promise<any> {
    const variantUrl = `/v1/product/variant/query?pid=${pid}`;
    this.logger.log(`[CJ] GET ${variantUrl}`);
    const variantResponse = await this.scheduleRequest(variantUrl, {
      method: 'GET',
      headers: await this.authHeaders(),
    });

    const rawVariants = Array.isArray(variantResponse?.data)
      ? variantResponse.data
      : Array.isArray(variantResponse)
        ? variantResponse
        : [];

    if (rawVariants.length === 0) return product;

    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    const variantImages: string[] = [];
    const enrichedVariants: any[] = [];

    for (const v of rawVariants) {
      const parsed = this.parseVariantKey(v.variantKey || '');
      const color = parsed.color || v.variantNameEn || 'Default';
      const size = parsed.size || 'One Size';

      colorSet.add(color);
      sizeSet.add(size);
      if (v.variantImage) variantImages.push(v.variantImage);

      enrichedVariants.push({
        color,
        size,
        stock: v.inventories?.[0]?.totalInventory ?? v.stock ?? 999,
        variantImage: v.variantImage || '',
        image: v.variantImage || '',
        price: v.variantSellPrice
          ? Number((Number(v.variantSellPrice) * 93.45).toFixed(2))
          : product.price,
        vid: v.vid || '',
        variantKey: v.variantKey || '',
      });
    }

    const colors = Array.from(colorSet).filter(Boolean);
    const sizes = Array.from(sizeSet).filter(Boolean);
    const mergedImages = [
      ...new Set([...variantImages, ...(product.images || [])]),
    ];

    return {
      ...product,
      colors: colors.length > 0 ? colors : product.colors,
      sizes: sizes.length > 0 ? sizes : product.sizes,
      variants:
        enrichedVariants.length > 0 ? enrichedVariants : product.variants,
      images: mergedImages,
    };
  }

  private readonly CJ_IGNORE_PARAMS = new Set([
    'minPrice',
    'maxPrice',
    'minRating',
    'sort',
    'colors',
    'sizes',
    'q',
    'collectionType',
    'subcategoryName',
  ]);

  private filterCjParams(
    query: Record<string, string | undefined>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value && !this.CJ_IGNORE_PARAMS.has(key)) result[key] = value;
    }
    return result;
  }

  private buildSearch(query: Record<string, string | undefined>) {
    const cjParams = this.filterCjParams(query);
    const search = new URLSearchParams(cjParams).toString();
    return search ? `?${search}` : '';
  }

  private parseVariantKey(variantKey: string): { color: string; size: string } {
    if (!variantKey) return { color: '', size: '' };
    const parts = variantKey.split('-');
    const sizePattern = /^(xs|s|m|l|xl|xxl|xxxl|\d{2,3})$/i;
    if (parts.length >= 2 && sizePattern.test(parts[parts.length - 1])) {
      const size = parts.pop()!;
      return { color: parts.join('-'), size: size.toUpperCase() };
    }
    if (parts.length === 2)
      return { color: parts[0], size: parts[1].toUpperCase() };
    return { color: variantKey, size: '' };
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

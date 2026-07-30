import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { Order } from '../orders/schemas/order.schema';
import { Automobiles, getAllSyncTargets, getCategoryInfoBySubname } from './collections';
import { CjCreateOrderDto, CjOrderProductItem } from './dto/cj-order.dto';
import { CJ_CONFIG } from '../../config/cj.config';
import {
  CjClient,
  CjProduct,
  WarehouseProduct,
  CjVariant,
  SyncMetrics,
} from './cj.client';

// Define cache keys using configured names/patterns
const WAREHOUSE_KEY_ALL = 'warehouse:all';
const WAREHOUSE_LEGACY_ALL = 'products:all'; // Keep legacy key for backward compatibility
const PRODUCT_COUNT_CACHE_KEY = 'cj:product_count';

// Helpers to reduce redundant string operations (slugify & normalizeKey)
function slugify(val: string): string {
  return val.toLowerCase().replace(/[\s_'&-]+/g, '');
}

function normalizeKey(val: string): string {
  return val.trim().toLowerCase();
}

const categoryKey = (parentCat: string, subCat: string) =>
  `warehouse:subcategory:${slugify(subCat)}`;

const legacyCategoryKey = (parentCat: string, subCat: string) =>
  `products:${slugify(parentCat)}:${slugify(subCat)}`;

@Injectable()
export class CjService {
  private readonly logger = new Logger(CjService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly cjClient: CjClient,
    @InjectModel(Order.name) private readonly orderModel?: Model<Order>,
  ) {}

  /**
   * Resolve and get CJ Dropping Access Token.
   * Backward compatibility fallback for controller.
   */
  async getAccessToken() {
    return this.cjClient.getAccessToken();
  }

  /**
   * Create order in CJ Dropshipping system.
   * Backward compatibility for order synchronization.
   */
  async createOrderV2(payload: CjCreateOrderDto) {
    this.logger.log(
      `[CJ] POST /v1/shopping/order/createOrderV2 for order #${payload.orderNumber}`,
    );
    const headers = await this.cjClient.authHeaders();
    const body = {
      platform: 'Api',
      logisticName: 'CJPacket',
      fromCountryCode: 'CN',
      ...payload,
    };
    try {
      return await this.cjClient.scheduleRequest('/v1/shopping/order/createOrderV2', {
        method: 'POST',
        headers,
        data: body,
      });
    } catch (err: any) {
      this.logger.warn(
        `[CJ] createOrderV2 failed, attempting fallback to POST /v1/shopping/order/createOrder...`,
      );
      return await this.cjClient.scheduleRequest('/v1/shopping/order/createOrder', {
        method: 'POST',
        headers,
        data: body,
      });
    }
  }

  /**
   * Sync Order details to CJ Dropshipping.
   */
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

  /**
   * Sync Order in Database by its MongoDB ID.
   */
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

  /**
   * Retrieve categories with local Redis caching.
   */
  async getCategories() {
    const cacheKey = 'categories';
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    this.logger.log('[CJ] GET /v1/product/getCategory');
    const response = await this.cjClient.scheduleRequest('/v1/product/getCategory', {
      method: 'GET',
      headers: await this.cjClient.authHeaders(),
    });

    const normalized = this.normalizeCategoryResponse(response);
    await this.redisService.setJson(cacheKey, normalized, CJ_CONFIG.CACHE_TTL.CATEGORIES);
    return normalized;
  }

  /**
   * Retrieve product by PID from Redis index/cache, falling back to CJ Dropshipping API if missing.
   */
  async getProductById(pid: string) {
    if (!pid) throw new BadRequestException('product id is required');

    // 1. Check direct warehouse key first (optimal Redis usage)
    const warehouseKey = `warehouse:product:${pid}`;
    let product = await this.redisService.getJson<any>(warehouseKey);
    if (product) return product;

    // 2. Check legacy cache key for backward compatibility
    const legacyCacheKey = `product:${pid}`;
    product = await this.redisService.getJson<any>(legacyCacheKey);
    if (product) return product;

    // 3. Fast Warehouse Catalog Search (avoids 3-5s CJ API remote latency)
    const warehouse =
      (await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL)) ||
      (await this.redisService.getJson<any[]>(WAREHOUSE_LEGACY_ALL));

    if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
      const cleanPid = decodeURIComponent(pid).trim();
      const matched = warehouse.find(
        (p: any) =>
          String(p.pid || p.id || p._id) === pid ||
          String(p.pid || p.id || p._id) === cleanPid ||
          p.sku === pid ||
          p.sku === cleanPid ||
          p.name === pid ||
          p.name === cleanPid
      );

      if (matched) {
        this.logger.log(`[CJ] Warehouse catalog HIT for product detail ${pid}`);
        await this.redisService.setJson(warehouseKey, matched, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
        await this.redisService.setJson(legacyCacheKey, matched, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
        return matched;
      }
    }

    // 3. Fallback to API if not indexed
    const url = `/v1/product/list?pid=${pid}`;
    this.logger.log(`[CJ] GET ${url}`);
    const response = await this.cjClient.scheduleRequest(url, {
      method: 'GET',
      headers: await this.cjClient.authHeaders(),
    });

    if (response?.result === false) {
      throw new NotFoundException(
        `CJ API Error: ${response?.message || 'Product not found'}`,
      );
    }

    const normalized = this.normalizeProductResponse(response);
    const matchedProduct = normalized?.products?.[0] ?? null;

    if (!matchedProduct) throw new NotFoundException('Product not found');

    try {
      const enriched = await this.enrichWithVariants(matchedProduct, pid);
      await this.redisService.setJson(legacyCacheKey, enriched, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
      await this.redisService.setJson(warehouseKey, enriched, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
      return enriched;
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Variant enrichment failed for ${pid}: ${err?.message ?? err}`,
      );
    }

    await this.redisService.setJson(legacyCacheKey, matchedProduct, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
    await this.redisService.setJson(warehouseKey, matchedProduct, CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL);
    return matchedProduct;
  }

  /**
   * Retrieve products list with optional keyword, category filters.
   * Leverages the Redis search index to return results under 500ms without scanning arrays.
   */
  /**
   * Retrieve products list with optional keyword, category filters.
   * Leverages the Redis search index & local warehouse catalog to return results under 20ms without remote API calls.
   */
  async getProducts(query: Record<string, string | undefined> = {}) {
    const keyword = query.keyword ? normalizeKey(query.keyword) : '';

    // 1. If keyword is present, resolve using tokenized search index & fast Redis warehouse catalog search
    if (keyword) {
      const tokens = keyword
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => slugify(t))
        .filter((t) => t.length > 1);

      const pidSet = new Set<string>();

      if (tokens.length > 0) {
        // Fetch all keyword index buckets in a SINGLE mget HTTP call
        const indexKeys = tokens.map((t) => `warehouse:index:keyword:${t}`);
        const pidLists = await this.redisService.mgetJson<string[]>(indexKeys);

        for (const list of pidLists) {
          if (list && Array.isArray(list)) {
            for (const pid of list) {
              pidSet.add(pid);
            }
          }
        }
      }

      // Fast Memory Substring & Prefix Search on Redis Warehouse Catalog
      const warehouse =
        (await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL)) ||
        (await this.redisService.getJson<any[]>(WAREHOUSE_LEGACY_ALL));

      if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
        const rawKw = keyword.toLowerCase();
        const matchedInCatalog = warehouse.filter((p: any) => {
          const name = (p.name || p.title || '').toLowerCase();
          const category = (p.categoryName || p._category || p.subcategoryName || '').toLowerCase();
          const kwStr = Array.isArray(p.keywords) ? p.keywords.join(' ').toLowerCase() : '';
          return (
            name.includes(rawKw) ||
            category.includes(rawKw) ||
            kwStr.includes(rawKw) ||
            tokens.some((t) => t.length >= 2 && name.includes(t))
          );
        });

        for (const p of matchedInCatalog) {
          pidSet.add(String(p.pid || p.id || p._id));
        }
      }

      const matchingPids = Array.from(pidSet);

      if (matchingPids.length > 0) {
        const page = Number(query.pageNum || 1);
        const limit = Number(query.pageSize || CJ_CONFIG.PAGE_SIZE);
        const CANDIDATE_CAP = 150;
        const candidatePids = matchingPids.slice(0, CANDIDATE_CAP);

        const productKeys = candidatePids.map((pid) => `warehouse:product:${pid}`);
        const productResults = await this.redisService.mgetJson<any>(productKeys);
        let filteredProducts = productResults.filter(Boolean);

        if (filteredProducts.length === 0 && warehouse && Array.isArray(warehouse)) {
          filteredProducts = warehouse.filter((p: any) =>
            matchingPids.includes(String(p.pid || p.id || p._id)),
          );
        }

        return {
          result: true,
          message: 'Success',
          data: {
            list: filteredProducts,
            pageNum: page,
            pageSize: limit,
            total: matchingPids.length,
          },
          products: filteredProducts,
        };
      }

      // Keyword was searched, but 0 matches exist in our catalog — return empty result immediately!
      return {
        result: true,
        message: 'Success',
        data: {
          list: [],
          pageNum: 1,
          pageSize: Number(query.pageSize || CJ_CONFIG.PAGE_SIZE),
          total: 0,
        },
        products: [],
      };
    }

    // 2. Serving Category & Catalog listings directly from Redis warehouse cache
    const warehouse =
      (await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL)) ||
      (await this.redisService.getJson<any[]>(WAREHOUSE_LEGACY_ALL));

    if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
      let filtered = warehouse;

      if (query.subcategoryName) {
        const sub = query.subcategoryName.toLowerCase();
        filtered = filtered.filter((p: any) =>
          (p._category || p.subcategoryName || p.categoryName || '').toLowerCase().includes(sub),
        );
      }

      const page = Number(query.pageNum || 1);
      const limit = Number(query.pageSize || CJ_CONFIG.PAGE_SIZE);
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      return {
        result: true,
        message: 'Success',
        data: {
          list: paginated,
          pageNum: page,
          pageSize: limit,
          total: filtered.length,
        },
        products: paginated,
      };
    }

    // 3. Fallback if warehouse catalog is not yet populated in Redis
    const cjQuery = { ...query };
    if (cjQuery.pageSize) {
      const ps = Number(cjQuery.pageSize);
      if (!isNaN(ps)) {
        cjQuery.pageSize = String(Math.min(ps, 200));
      }
    } else {
      cjQuery.pageSize = String(CJ_CONFIG.PAGE_SIZE);
    }

    if (!cjQuery.categoryId && cjQuery.subcategoryName) {
      const info = getCategoryInfoBySubname(cjQuery.subcategoryName);
      if (info?.categoryId) {
        cjQuery.categoryId = info.categoryId;
      }
    }

    if (!cjQuery.categoryId) {
      cjQuery.categoryId = '255A489E-8518-4E31-AC84-A2E8EB645C78';
    }

    const cacheKey = `cj:products:list:${JSON.stringify(cjQuery)}`;
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    const url = `/v1/product/list${this.buildSearch(cjQuery)}`;
    this.logger.log(`[CJ] GET ${url}`);
    const response = await this.cjClient.scheduleRequest(url, {
      method: 'GET',
      headers: await this.cjClient.authHeaders(),
    });

    const normalized = this.normalizeProductResponse(response, cjQuery);
    await this.redisService.setJson(cacheKey, normalized, CJ_CONFIG.CACHE_TTL.PRODUCT_LIST);
    return normalized;
  }

  /**
   * Fetch products filtered by category with caching.
   */
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
    const response = await this.cjClient.scheduleRequest(url, {
      method: 'GET',
      headers: await this.cjClient.authHeaders(),
    });

    const normalized = this.normalizeProductResponse(response, query);
    await this.redisService.setJson(cacheKey, normalized, CJ_CONFIG.CACHE_TTL.PRODUCT_CATEGORY);
    return normalized;
  }

  /**
   * Fetch all products across categories recursively.
   */
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
          const pageSize = CJ_CONFIG.PAGE_SIZE;
          const url = `/v1/product/list${this.buildSearch({ categoryId: catId, pageNum: String(pageNum), pageSize: String(pageSize) })}`;
          this.logger.log(`[CJ] GET ${url}`);
          const response = await this.cjClient.scheduleRequest(url, {
            method: 'GET',
            headers: await this.cjClient.authHeaders(),
          });
          const products = this.extractList(response);
          const normalized = this.normalizeProductResponse(response);
          allProducts.push(...(normalized.products || []));
          if (products.length < pageSize) break;
          if (pageNum >= CJ_CONFIG.MAX_PAGES_PER_CATEGORY) break;
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

  /**
   * Search CJ catalog by keyword.
   */
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

  /**
   * Optimize warehouse retrieval: fetches indexed records from Redis (sub-500ms).
   */
  async getWarehouseProducts(
    pageNum = 1,
    pageSize = 160,
    categoryId?: string,
    subcategoryName?: string,
    collectionType?: string,
  ): Promise<{ products: any[]; total: number; warehouseHit: true } | null> {
    // 1. Direct Subcategory Key Lookup
    if (subcategoryName) {
      const catKey = `warehouse:subcategory:${slugify(subcategoryName)}`;
      const catData = await this.redisService.getJson<any[]>(catKey);

      if (catData && Array.isArray(catData) && catData.length > 0) {
        const total = catData.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = catData.slice(start, start + effectivePageSize);
        this.logger.log(
          `[CJ] Warehouse subcategory HIT ${catKey} → ${products.length}/${total}`,
        );
        return { products, total, warehouseHit: true };
      }

      // Legacy fallback
      let parentCat = 'auto';
      for (const [parent, items] of Object.entries(Automobiles)) {
        if (
          items.some((i) => i.name.toLowerCase() === subcategoryName.toLowerCase())
        ) {
          parentCat = parent;
          break;
        }
      }
      const legacyCatKey = legacyCategoryKey(parentCat, subcategoryName);
      const legacyCatData = await this.redisService.getJson<any[]>(legacyCatKey);
      if (legacyCatData && Array.isArray(legacyCatData) && legacyCatData.length > 0) {
        const total = legacyCatData.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = legacyCatData.slice(start, start + effectivePageSize);
        return { products, total, warehouseHit: true };
      }
    }

    // 2. Direct Category Lookup
    if (categoryId) {
      const catKey = `warehouse:category:${categoryId}`;
      const catData = await this.redisService.getJson<any[]>(catKey);
      if (catData && Array.isArray(catData) && catData.length > 0) {
        const total = catData.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = catData.slice(start, start + effectivePageSize);
        this.logger.log(
          `[CJ] Warehouse category HIT ${catKey} → ${products.length}/${total}`,
        );
        return { products, total, warehouseHit: true };
      }
    }

    // 3. Direct Collection Type Lookup
    if (collectionType) {
      const collSlug = slugify(collectionType);
      const collKey = `warehouse:brand:${collSlug}`; // Reuse brand segment for collection matching
      const collData = await this.redisService.getJson<any[]>(collKey);
      if (collData && Array.isArray(collData) && collData.length > 0) {
        const total = collData.length;
        const effectivePageSize = Math.min(pageSize, 250);
        const start = (pageNum - 1) * effectivePageSize;
        const products = collData.slice(start, start + effectivePageSize);
        return { products, total, warehouseHit: true };
      }
    }

    // 4. Main Global Warehouse Key
    let warehouse = await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL);
    if (!warehouse || !Array.isArray(warehouse) || warehouse.length === 0) {
      warehouse = await this.redisService.getJson<any[]>(WAREHOUSE_LEGACY_ALL);
    }

    if (!warehouse || !Array.isArray(warehouse) || warehouse.length === 0) {
      return null;
    }

    let pool = warehouse;

    if (categoryId) {
      pool = pool.filter(
        (p) => String(p.categoryId ?? p.category ?? '') === categoryId,
      );
    }

    if (subcategoryName) {
      const norm = normalizeKey(subcategoryName);
      pool = pool.filter((p) => {
        const val = normalizeKey(p.subcategoryName ?? p._category ?? p.category ?? p.categoryName ?? '');
        return val === norm || val.includes(norm) || norm.includes(val);
      });
    }

    if (collectionType) {
      const normColl = normalizeKey(collectionType);
      pool = pool.filter((p) => {
        const val = normalizeKey(
          p._parentCategory ??
            p._collectionType ??
            p.collectionType ??
            p.parentCategory ??
            p.categoryName ??
            '',
        );
        return val === normColl || val.includes(normColl) || normColl.includes(val);
      });
    }

    // Strip zero/sub-1-rupee priced products
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

  /**
   * Run full catalog sync with automated retry sequence, pipeline/batch writes, index updates, and API cache flushing.
   */
  async runCatalogSync(): Promise<{ success: boolean; count: number }> {
    const lockKey = 'cj:sync:lock';
    const locked = await this.redisService.setnx(lockKey, '1', 3600);
    if (!locked) {
      this.logger.warn('[Cron] Sync is already running (locked). Skipping.');
      return { success: false, count: 0 };
    }

    try {
      const syncStart = Date.now();
      this.cjClient.apiCallsThisSync = 0;

      this.logger.log('[Cron] Sync Started');

      const RETRY_DELAYS = [0, 30_000, 120_000];
      let lastError = '';
      let allProducts: any[] | null = null;

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
          this.logger.warn(
            `[Cron] Retrying sync in ${RETRY_DELAYS[attempt] / 1000}s (attempt ${attempt + 1})...`,
          );
          await this.delay(RETRY_DELAYS[attempt]);
        }

        try {
          allProducts = await this.fetchCatalog();
          break; // success
        } catch (e: any) {
          lastError = e?.message ?? String(e);
          this.logger.error(
            `[Cron] Sync attempt ${attempt + 1} failed: ${lastError}`,
          );
        }
      }

      if (!allProducts) {
        this.logger.error(
          '[Cron] All sync attempts failed. Existing warehouse cache preserved.',
        );
        return { success: false, count: 0 };
      }

      if (allProducts.length < 500) {
        this.logger.warn(
          `[Cron] Fetch returned only ${allProducts.length} products — too few to be valid. Keeping existing cache.`,
        );
        return { success: false, count: allProducts.length };
      }

      const balancedAll = this.interleaveByCategory(allProducts);

      this.logger.log(
        `[Cron] Products Fetched & Interleaved — Total: ${allProducts.length}`,
      );

      // --- Batch Write to Redis & Update Warehouse Indexing ---
      const writeOps: { key: string; value: any; ttl?: number }[] = [];

      // 1. Global warehouse lists
      writeOps.push({ key: WAREHOUSE_KEY_ALL, value: balancedAll });
      writeOps.push({ key: WAREHOUSE_LEGACY_ALL, value: balancedAll }); // Keep legacy products:all updated

      // 2. Individual product details and keyword/search indexing maps
      const keywordMap = new Map<string, string[]>();
      const categoryGroups = this.groupByCategory(allProducts);
      const subcategoryGroups = new Map<string, any[]>();
      const collectionGroups = new Map<string, any[]>();

      for (const product of allProducts) {
        const pid = String(product.pid || product.id || '');
        if (!pid) continue;

        // Individual product detail cache
        writeOps.push({ key: `warehouse:product:${pid}`, value: product });
        writeOps.push({ key: `product:${pid}`, value: product }); // Legacy individual cache key

        // Group by subcategory
        const subCat = product.subcategoryName || product._category || '';
        if (subCat) {
          const subKey = slugify(subCat);
          if (!subcategoryGroups.has(subKey)) subcategoryGroups.set(subKey, []);
          subcategoryGroups.get(subKey)!.push(product);
        }

        // Group by collection/parentCategory
        const parent = product._parentCategory || product.collectionType || '';
        if (parent) {
          const parentKey = slugify(parent);
          if (!collectionGroups.has(parentKey)) collectionGroups.set(parentKey, []);
          collectionGroups.get(parentKey)!.push(product);
        }

        // Build tokenized search index: Name, SKU, Category keywords
        const tokens: string[] = [];
        if (product.name) tokens.push(...product.name.split(/\s+/));
        if (product.sku) tokens.push(product.sku);
        if (product.categoryName) tokens.push(...product.categoryName.split(/\s+/));
        if (product.subcategoryName) tokens.push(...product.subcategoryName.split(/\s+/));

        for (const token of tokens) {
          const cleanToken = slugify(token);
          if (cleanToken && cleanToken.length > 1) {
            if (!keywordMap.has(cleanToken)) keywordMap.set(cleanToken, []);
            keywordMap.get(cleanToken)!.push(pid);
          }
        }
      }

      // Write subcategory groups
      for (const [subKey, products] of subcategoryGroups.entries()) {
        writeOps.push({ key: `warehouse:subcategory:${subKey}`, value: products });
      }

      // Write collection/brand groups
      for (const [collKey, products] of collectionGroups.entries()) {
        writeOps.push({ key: `warehouse:brand:${collKey}`, value: products });
      }

      // Write per-category groups (legacy support)
      for (const [catKey, catProducts] of Object.entries(categoryGroups)) {
        writeOps.push({ key: `products:${catKey}`, value: catProducts });
      }

      // Write keyword search indexes
      for (const [token, pids] of keywordMap.entries()) {
        writeOps.push({ key: `warehouse:index:keyword:${token}`, value: Array.from(new Set(pids)) });
      }

      this.logger.log(`[Cron] Preparing batch writes of ${writeOps.length} keys to Redis...`);
      await this.batchWriteToRedis(writeOps);
      this.logger.log(`[Cron] Batch Redis writes completed.`);

      // Automatically invalidate stale API response cache keys
      await this.clearApiCache();

      const durationMs = Date.now() - syncStart;
      this.logger.log(`[Cron] Redis Updated & API Cache Cleared`);
      this.logger.log(
        `[Cron] Execution Time: ${(durationMs / 1000).toFixed(1)}s`,
      );
      this.logger.log(`[Cron] API Calls Used: ~${this.cjClient.apiCallsThisSync}`);
      this.logger.log(`[Cron] Sync Completed Successfully`);

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

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async fetchCatalog(): Promise<any[]> {
    const allProducts: any[] = [];
    const globalSeenPids = new Set<string>();
    const uniqueTargets = getAllSyncTargets();

    this.logger.log(
      `[CJ] Starting full catalog sync across ${uniqueTargets.length} categories...`,
    );

    const syncStartAll = Date.now();

    for (const entry of uniqueTargets) {
      const { categoryId, parentCategory, name: categoryName } = entry;
      const catKey = legacyCategoryKey(parentCategory, categoryName);
      const catStart = Date.now();

      const existingCatProducts =
        (await this.redisService.getJson<any[]>(catKey)) || [];

      const productMap = new Map<string, any>();
      for (const p of existingCatProducts) {
        const pid = String(p.pid || p.id || '');
        if (pid) productMap.set(pid, p);
      }

      let pageNum = 1;
      const pageSize = CJ_CONFIG.PAGE_SIZE;
      let newProductsCount = 0;
      let updatedProductsCount = 0;
      let duplicatesRemovedCount = 0;
      let catApiCalls = 0;

      while (pageNum <= CJ_CONFIG.MAX_PAGES_PER_CATEGORY) {
        const url = `/v1/product/list?categoryId=${categoryId}&pageNum=${pageNum}&pageSize=${pageSize}`;
        let response: any = null;

        try {
          response = await this.cjClient.scheduleRequest(url, {
            method: 'GET',
            headers: await this.cjClient.authHeaders(),
          });
          this.cjClient.apiCallsThisSync++;
          catApiCalls++;
        } catch (err: any) {
          this.logger.warn(
            `[CJ] Failed to fetch page ${pageNum} for category "${categoryName}" (${categoryId}): ${err?.message ?? err}`,
          );
          break;
        }

        const normalized = this.normalizeProductResponse(response, {
          categoryId,
        });
        const products: any[] = normalized?.products ?? [];

        if (products.length === 0) {
          break;
        }

        for (const product of products) {
          const pid = String(product?.pid || product?.id || '');
          if (!pid) continue;

          // Strip zero / sub-1-rupee priced products
          const productPrice = Number(product?.price ?? product?.sellPrice ?? 0) || 0;
          const inrPrice = productPrice > 1 ? productPrice : Number((productPrice * CJ_CONFIG.CURRENCY_EXCHANGE_RATE).toFixed(2));
          if (inrPrice <= 1) continue;

          if (productMap.has(pid)) {
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
              updatedProductsCount++;
            } else {
              duplicatesRemovedCount++;
            }
          } else {
            productMap.set(pid, {
              ...product,
              _parentCategory: parentCategory,
              _category: categoryName,
              _collectionType: parentCategory,
            });
            newProductsCount++;
          }
        }

        if (products.length < pageSize) {
          break;
        }

        pageNum++;
        await this.delay(200);
      }

      const mergedCatProducts = Array.from(productMap.values());

      if (mergedCatProducts.length > 0) {
        await this.redisService.setJson(catKey, mergedCatProducts);
      }

      const catDurationSec = ((Date.now() - catStart) / 1000).toFixed(1);
      
      // Calculate sync metrics and log details
      const elapsedTotalSec = (Date.now() - syncStartAll) / 1000;
      const progressRatio = (allProducts.length + mergedCatProducts.length) / 50000; // rough estimation
      const estRemainingSec = progressRatio > 0 ? (elapsedTotalSec / progressRatio) - elapsedTotalSec : 0;

      this.logger.log(
        `[Sync Status] Cat: "${categoryName}" | Page: ${pageNum} | Synced: ${mergedCatProducts.length} | New: ${newProductsCount} | Updated: ${updatedProductsCount} | Dups Removed: ${duplicatesRemovedCount} | API Calls: ${catApiCalls} | Duration: ${catDurationSec}s | Est. Remaining: ${estRemainingSec.toFixed(0)}s`
      );

      for (const p of mergedCatProducts) {
        const pid = String(p.pid || p.id || '');
        if (pid && !globalSeenPids.has(pid)) {
          globalSeenPids.add(pid);
          allProducts.push(p);
        }
      }

      await this.delay(300);
    }

    this.logger.log(`Fetch -> Unique Products: ${allProducts.length}`);
    return allProducts;
  }

  private async batchWriteToRedis(operations: { key: string; value: any; ttl?: number }[]) {
    const CHUNK_SIZE = 150;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(op => this.redisService.setJson(op.key, op.value, op.ttl))
      );
    }
  }

  private groupByCategory(products: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    for (const p of products) {
      const parent = String(p._parentCategory ?? p._collectionType ?? 'auto');
      const catName = String(
        p._category ?? p.subcategoryName ?? p.category ?? 'other',
      );
      const key = `${slugify(parent)}:${slugify(catName)}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    return groups;
  }

  private interleaveByCategory(products: any[]): any[] {
    if (!products || products.length === 0) return [];
    const groups = new Map<string, any[]>();
    for (const p of products) {
      const cat = normalizeKey(p._category ?? p.subcategoryName ?? 'other');
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
      CJ_CONFIG.CACHE_TTL.PRODUCT_COUNT,
    );
  }

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

  private flattenCategories(items: any[]): any[] {
    const results: any[] = [];

    const visit = (item: any, group: string, depth: number) => {
      if (!item || typeof item !== 'object') return;

      const catName = normalizeKey(
        item.categoryName ||
        item.categoryThirdName ||
        item.categorySecondName ||
        item.categoryFirstName ||
        '',
      );

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
    const pid = String(
      product?.pid ??
      product?.id ??
      product?.productId ??
      product?.productPid ??
      product?.product_id ??
      product?.productCode ??
      '',
    );

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
    const price = Number((rawPrice * CJ_CONFIG.CURRENCY_EXCHANGE_RATE).toFixed(2));

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
      numReviews: 0,
      averageRating: 0,
      reviews: [],
    };
  }

  private async enrichWithVariants(product: any, pid: string): Promise<any> {
    const variantUrl = `/v1/product/variant/query?pid=${pid}`;
    this.logger.log(`[CJ] GET ${variantUrl}`);
    const variantResponse = await this.cjClient.scheduleRequest(variantUrl, {
      method: 'GET',
      headers: await this.cjClient.authHeaders(),
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
          ? Number((Number(v.variantSellPrice) * CJ_CONFIG.CURRENCY_EXCHANGE_RATE).toFixed(2))
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
      if (value && !this.CJ_IGNORE_PARAMS.has(key)) {
        if (key === 'pageSize') {
          const num = Number(value);
          result[key] = !isNaN(num) && num > 0 ? String(Math.min(num, 200)) : value;
        } else {
          result[key] = value;
        }
      }
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

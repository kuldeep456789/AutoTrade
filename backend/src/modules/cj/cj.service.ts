import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { REDIS_TTL } from '../redis/redis.constants';
import { Order } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Automobiles,
  getAllSyncTargets,
  getCategoryInfoBySubname,
} from './collections';
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
  return val
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

const categoryKey = (parentCat: string, subCat: string) =>
  `warehouse:subcategory:${slugify(subCat)}`;

const legacyCategoryKey = (parentCat: string, subCat: string) =>
  `products:${slugify(parentCat)}:${slugify(subCat)}`;

import { SearchIndexService } from '../search/search-index.service';

@Injectable()
export class CjService implements OnModuleInit {
  private readonly logger = new Logger(CjService.name);

  // ── In-memory warehouse cache: avoids repeated Upstash HTTP requests ──
  private warehouseCache: any[] = [];
  private warehouseLoadedAt = 0;
  private static readonly WAREHOUSE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly redisService: RedisService,
    private readonly cjClient: CjClient,
    private readonly searchIndexService?: SearchIndexService,
    @InjectModel(Order.name) private readonly orderModel?: Model<Order>,
    @InjectModel(Product.name)
    private readonly productModel?: Model<ProductDocument>,
  ) { }

  async onModuleInit() {
    this.logger.log('[CJ] Warming in-memory catalog cache on startup...');
    this.getWarehouseCache()
      .then((catalog) => {
        this.logger.log(`[CJ] Catalog warmed successfully: ${catalog.length} products available.`);
      })
      .catch((err) => {
        this.logger.warn(`[CJ] Catalog warming error: ${err?.message ?? err}`);
      });
  }

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
      fromCountryCode: 'CN',
      ...payload,
    };
    try {
      return await this.cjClient.scheduleRequest(
        '/v1/shopping/order/createOrderV2',
        {
          method: 'POST',
          headers,
          data: body,
        },
      );
    } catch (err: any) {
      this.logger.warn(
        `[CJ] createOrderV2 failed, attempting fallback to POST /v1/shopping/order/createOrder...`,
      );
      return await this.cjClient.scheduleRequest(
        '/v1/shopping/order/createOrder',
        {
          method: 'POST',
          headers,
          data: body,
        },
      );
    }
  }

  /**
   * Resolve the CJ variant id (vid) for an order item.
   *
   * 1. If the order item already carries a vid, validate it against the
   *    product's variants (never trust it blindly — stale warehouse data can
   *    contain removed vids).
   * 2. Otherwise resolve by color/size, then by first variant.
   * 3. If nothing matches, force-refresh the single product from the CJ API
   *    (bypassing the stale warehouse cache) and retry once.
   * 4. NEVER fall back to the product pid as a vid — CJ rejects that with
   *    "Invalid products".
   */
  private async resolveOrderItemVid(item: any): Promise<string> {
    const pid = item.productId;
    if (!pid) {
      throw new Error('Missing productId in order item');
    }

    const product = await this.getProductById(pid);
    const variants: any[] = Array.isArray(product?.variants)
      ? product.variants
      : [];

    const tryMatch = (): string | null => {
      if (!variants.length) return null;

      // Exact vid match (order item already snapshotted a vid).
      if (item.vid != null && item.vid !== '') {
        const match = variants.find(
          (v: any) =>
            String(v.vid) === String(item.vid) ||
            String(v.variantId) === String(item.vid) ||
            String(v.variantKey) === String(item.vid),
        );
        if (match?.vid) return String(match.vid);
      }

      if (item.color || item.size) {
        const isGenericColor = !item.color || ['default', 'one size', 'standard'].includes(String(item.color).toLowerCase());
        const isGenericSize = !item.size || ['default', 'one size', 'standard'].includes(String(item.size).toLowerCase());

        const match = variants.find((v: any) => {
          const colorOk =
            isGenericColor ||
            String(v.color).toLowerCase() === String(item.color).toLowerCase();
          const sizeOk =
            isGenericSize ||
            String(v.size).toLowerCase() === String(item.size).toLowerCase();
          return colorOk && sizeOk;
        });
        if (match?.vid) return String(match.vid);
      }

      if (variants.length > 0 && (variants[0]?.vid || variants[0]?.variantId)) {
        return String(variants[0].vid || variants[0].variantId);
      }

      return null;
    };

    const direct = tryMatch();
    if (direct) return direct;

    // Stale cache: force-refresh this single product from the CJ API and retry.
    try {
      const freshProduct = await this.forceRefreshProduct(pid);
      const freshVariants: any[] = Array.isArray(freshProduct?.variants)
        ? freshProduct.variants
        : [];

      if (item.vid != null && item.vid !== '') {
        const match = freshVariants.find(
          (v: any) =>
            String(v.vid) === String(item.vid) ||
            String(v.variantId) === String(item.vid) ||
            String(v.variantKey) === String(item.vid),
        );
        if (match?.vid) return String(match.vid);
      }

      if (item.color || item.size) {
        const isGenericColor = !item.color || ['default', 'one size', 'standard'].includes(String(item.color).toLowerCase());
        const isGenericSize = !item.size || ['default', 'one size', 'standard'].includes(String(item.size).toLowerCase());

        const match = freshVariants.find((v: any) => {
          const colorOk =
            isGenericColor ||
            String(v.color).toLowerCase() === String(item.color).toLowerCase();
          const sizeOk =
            isGenericSize ||
            String(v.size).toLowerCase() === String(item.size).toLowerCase();
          return colorOk && sizeOk;
        });
        if (match?.vid) return String(match.vid);
      }

      if (freshVariants.length > 0 && (freshVariants[0]?.vid || freshVariants[0]?.variantId)) {
        return String(freshVariants[0].vid || freshVariants[0].variantId);
      }
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Force-refresh for product ${pid} failed during vid resolution: ${err?.message ?? err}`,
      );
    }

    throw new Error(
      `Invalid products: no matching variant found for product ${pid}`,
    );
  }

  /**
   * Bypass all cache layers and re-fetch a single product (and its variants)
   * from the CJ API, then rewrite both cache keys.
   */
  private async forceRefreshProduct(pid: string): Promise<any> {
    const warehouseKey = `warehouse:product:${pid}`;
    const legacyCacheKey = `product:${pid}`;

    await this.redisService.del(warehouseKey);
    await this.redisService.del(legacyCacheKey);

    // Reset the in-memory warehouse cache so it doesn't serve the stale entry.
    if (Array.isArray(this.warehouseCache)) {
      this.warehouseCache = this.warehouseCache.filter(
        (p: any) => String(p.pid || p.id || p._id) !== pid && p.sku !== pid,
      );
    }

    const url = `/v1/product/list?pid=${pid}`;
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
      await this.redisService.setJson(
        legacyCacheKey,
        enriched,
        CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL,
      );
      await this.redisService.setJson(
        warehouseKey,
        enriched,
        CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL,
      );
      return enriched;
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Variant enrichment failed for ${pid} during refresh: ${err?.message ?? err}`,
      );
      return matchedProduct;
    }
  }

  /**
   * Sync Order details to CJ Dropshipping.
   *
   * Instead of hardcoding a logisticName, we first call the CJ Freight
   * Calculate API to discover which logistics methods are actually available
   * for this order (products + destination country), then pick one. If CJ
   * reports the products cannot ship together (code 100230), we split them
   * into separate CJ orders.
   */
  async syncOrderToCj(order: any): Promise<boolean> {
    const orderNumber = order._id
      ? order._id.toString()
      : order.id || String(Date.now());
    const shipping = order.shippingDetails || {};

    const mappedProducts: CjOrderProductItem[] = [];
    const resolutionErrors: string[] = [];

    for (const item of order.items || []) {
      try {
        const vid = await this.resolveOrderItemVid(item);
        mappedProducts.push({
          vid,
          quantity: item.quantity || 1,
        });
      } catch (err: any) {
        resolutionErrors.push(err?.message ?? String(err));
        this.logger.error(
          `[CJ] Could not resolve vid for order ${orderNumber}, product ${item.productId}: ${err?.message ?? err}`,
        );
      }
    }

    if (mappedProducts.length === 0) {
      const message = `CJ order sync rejected: no valid products. ${resolutionErrors.join('; ')}`;
      order.cjSyncError = message;
      if (typeof order.save === 'function') {
        await order.save().catch(() => undefined);
      }
      this.logger.error(`[CJ] Order ${orderNumber} sync blocked. ${message}`);
      return false;
    }

    if (resolutionErrors.length > 0) {
      order.cjSyncError = resolutionErrors.join('; ');
      if (typeof order.save === 'function') {
        await order.save().catch(() => undefined);
      }
    }

    const base = this.buildOrderBase(order, shipping);

    try {
      this.logger.log(
        `[CJ] Syncing order ${orderNumber} to CJ Dropshipping... Products: ${JSON.stringify(mappedProducts)}`,
      );
      const cjOrderId = await this.createCjOrder(
        order,
        orderNumber,
        base,
        mappedProducts,
      );

      order.cjOrderId = cjOrderId;
      order.cjOrderIds = [cjOrderId];
      order.status = 'processing';
      if (typeof order.save === 'function') {
        await order.save();
      }
      this.logger.log(
        `[CJ] Order ${orderNumber} successfully created on CJ! CJ Order ID: ${cjOrderId}`,
      );
      return true;
    } catch (err: any) {
      if (this.isProductsConflictError(err)) {
        this.logger.warn(
          `[CJ] Order ${orderNumber} products cannot ship together — splitting into per-product CJ orders.`,
        );
        return this.createSplitOrders(order, orderNumber, base, mappedProducts);
      }

      const errorMsg = err?.message ?? String(err);
      this.logger.error(
        `[CJ] Exception syncing order ${orderNumber} to CJ Dropshipping: ${errorMsg}. Retaining status 'confirmed'.`,
        JSON.stringify({
          payload: { ...base, products: mappedProducts },
          errorResponse: err?.response ?? err?.data ?? null,
        }),
      );
      order.cjSyncError = errorMsg;
      if (typeof order.save === 'function') {
        await order.save().catch(() => undefined);
      }
      return false;
    }
  }

  /** Build the common order base (shipping fields) with sane fallbacks. */
  private buildOrderBase(order: any, shipping: any) {
    return {
      shippingCustomerName: shipping.customerName || 'Customer',
      shippingAddress: this.cleanAddress(shipping.address),
      shippingCity: this.cleanSegment(shipping.city),
      shippingProvince: this.cleanSegment(shipping.province),
      shippingCountryCode: shipping.countryCode || 'IN',
      shippingCountry: shipping.country || 'India',
      shippingZip: shipping.zip || shipping.postalCode || '000000',
      shippingPhone: shipping.phone || '0000000000',
      fromCountryCode: order.fromCountryCode || 'CN',
      platform: 'Api',
    };
  }

  /** Collapse a free-text field into a single trimmed token (no newlines). */
  private cleanSegment(val: any): string {
    if (!val) return '';
    return String(val).trim().replace(/\s+/g, ' ');
  }

  /** De-duplicate comma/line separated location fragments in the address. */
  private cleanAddress(raw: any): string {
    const text = String(raw || 'Address line 1').replace(/\s+/g, ' ');
    const parts = text
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const part of parts) {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(part);
      }
    }
    return deduped.join(', ');
  }

  /** Create one CJ order for a product group, picking real logistics via freight calculate. */
  private async createCjOrder(
    order: any,
    orderNumber: string,
    base: Record<string, any>,
    products: CjOrderProductItem[],
  ): Promise<string> {
    const logistics = await this.calculateFreight(
      products,
      base.shippingCountryCode,
      base.shippingZip,
    );
    const logisticName = this.pickLogisticName(logistics, order.logisticName);

    if (!logisticName) {
      throw new Error(
        `No valid logistics found for order ${orderNumber} to ${base.shippingCountryCode}`,
      );
    }

    const payload: CjCreateOrderDto = {
      orderNumber,
      shippingCustomerName: base.shippingCustomerName,
      shippingAddress: base.shippingAddress,
      shippingCity: base.shippingCity,
      shippingProvince: base.shippingProvince,
      shippingCountryCode: base.shippingCountryCode,
      shippingCountry: base.shippingCountry,
      shippingZip: base.shippingZip,
      shippingPhone: base.shippingPhone,
      logisticName,
      fromCountryCode: base.fromCountryCode,
      platform: 'Api',
      products,
    };

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
      return String(cjOrderId);
    }

    const errorMsg = response?.message || 'Unknown error from CJ Dropshipping';
    this.logger.error(
      `[CJ] Order ${orderNumber} sync failed with message: ${errorMsg}.`,
      JSON.stringify(payload),
    );
    throw new Error(errorMsg);
  }

  /** Split an incompatible product set into per-product CJ orders. */
  private async createSplitOrders(
    order: any,
    orderNumber: string,
    base: Record<string, any>,
    products: CjOrderProductItem[],
  ): Promise<boolean> {
    const groups = this.groupProductsPerVid(products);
    const createdIds: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < groups.length; i++) {
      const subOrderNumber = `${orderNumber}-${i + 1}`.slice(0, 40);
      try {
        const cjOrderId = await this.createCjOrder(
          order,
          subOrderNumber,
          base,
          groups[i],
        );
        createdIds.push(cjOrderId);
      } catch (err: any) {
        failures.push(
          `${groups[i].map((g) => g.vid).join(',')}: ${err?.message ?? String(err)}`,
        );
      }
    }

    if (createdIds.length > 0) {
      order.cjOrderId = createdIds[0];
      order.cjOrderIds = createdIds;
      if (failures.length === 0) {
        order.status = 'processing';
        delete order.cjSyncError;
      } else {
        order.cjSyncError = failures.join('; ');
      }
      if (typeof order.save === 'function') {
        await order.save().catch(() => undefined);
      }
      this.logger.log(
        `[CJ] Order ${orderNumber} split into ${createdIds.length}/${groups.length} CJ orders: ${createdIds.join(', ')}`,
      );
      return failures.length === 0;
    }

    order.cjSyncError = failures.join('; ') || 'CJ split order creation failed';
    if (typeof order.save === 'function') {
      await order.save().catch(() => undefined);
    }
    return false;
  }

  /** Group products into per-vid batches so incompatible vids never mix. */
  private groupProductsPerVid(
    products: CjOrderProductItem[],
  ): CjOrderProductItem[][] {
    const byVid = new Map<string, CjOrderProductItem>();
    for (const item of products) {
      const key = String(item.vid);
      const existing = byVid.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        byVid.set(key, { vid: item.vid, quantity: item.quantity });
      }
    }
    return Array.from(byVid.values()).map((item) => [item]);
  }

  /** Detect CJ's "these products cannot be together" rejection (code 100230). */
  private isProductsConflictError(err: any): boolean {
    const haystack = [
      err?.message,
      err?.response?.message,
      err?.data?.message,
      err?.errorResponse?.message,
    ]
      .filter(Boolean)
      .join(' | ');
    return (
      haystack.includes('100230') ||
      /cannot be together|can't be together|not be together/i.test(haystack)
    );
  }

  /**
   * Call the CJ Freight Calculate API for a set of products to a destination
   * and return the available logistics options.
   */
  private async calculateFreight(
    products: CjOrderProductItem[],
    endCountryCode: string,
    zip?: string,
  ): Promise<Array<{ logisticName: string; logisticPrice: number; logisticAging: string }>> {
    if (!products.length) return [];
    const headers = await this.cjClient.authHeaders();
    const body: Record<string, any> = {
      startCountryCode: 'CN',
      endCountryCode,
      products: products.map((p) => ({ vid: p.vid, quantity: p.quantity })),
    };
    if (zip && /^[A-Za-z0-9 -]{3,10}$/.test(zip)) {
      body.zip = zip;
    }
    try {
      const response = await this.cjClient.scheduleRequest(
        '/v1/logistic/freightCalculate',
        { method: 'POST', headers, data: body },
      );
      if (response?.result === false) {
        this.logger.warn(
          `[CJ] Freight calculate rejected: ${response?.message ?? 'unknown'}`,
        );
        return [];
      }
      return Array.isArray(response?.data) ? response.data : [];
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Freight calculate failed: ${err?.message ?? err}`,
      );
      return [];
    }
  }

  /**
   * Pick the logistics method for the order. Prefers the stored order
   * logisticName when it's actually available, otherwise falls back to a
   * CJPacket carrier if offered, otherwise the cheapest option.
   */
  private pickLogisticName(
    options: Array<{ logisticName: string; logisticPrice: number }>,
    preferred?: string,
  ): string | null {
    if (!options.length) return null;

    if (preferred) {
      const exact = options.find(
        (o) => String(o.logisticName).toLowerCase() === preferred.toLowerCase(),
      );
      if (exact) return exact.logisticName;
    }

    const cjPacket = options.find((o) =>
      /cjpacket/i.test(String(o.logisticName)),
    );
    if (cjPacket) return cjPacket.logisticName;

    return [...options].sort(
      (a, b) => (Number(a.logisticPrice) || 0) - (Number(b.logisticPrice) || 0),
    )[0]?.logisticName ?? null;
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
    const response = await this.cjClient.scheduleRequest(
      '/v1/product/getCategory',
      {
        method: 'GET',
        headers: await this.cjClient.authHeaders(),
      },
    );

    const normalized = this.normalizeCategoryResponse(response);
    await this.redisService.setJson(
      cacheKey,
      normalized,
      CJ_CONFIG.CACHE_TTL.CATEGORIES,
    );
    return normalized;
  }

  /**
   * Retrieve product by PID from Redis index/cache, falling back to CJ Dropshipping API if missing.
   *
   * Write policy: only warehouse:product:{pid} is written on an individual miss.
   * The legacy product:{pid} key is still read for backward compatibility but is
   * NOT written here — the catalog sync writes both keys in bulk via batchWriteToRedis.
   */
  async getProductById(pid: string) {
    if (!pid) throw new BadRequestException('product id is required');

    // 1. Check primary warehouse key
    const warehouseKey = `warehouse:product:${pid}`;
    let product = await this.redisService.getJson<any>(warehouseKey);
    if (product) {
      this.logger.log(`[Product] Cache HIT warehouse:product:${pid}`);
      return product;
    }

    // 2. Legacy read fallback for backward compatibility (no write to this key from this path)
    const legacyCacheKey = `product:${pid}`;
    product = await this.redisService.getJson<any>(legacyCacheKey);
    if (product) {
      this.logger.log(`[Product] Legacy cache HIT product:${pid}`);
      return product;
    }

    // 3. Fast Warehouse Catalog Search — uses the in-memory 5-minute cache
    // instead of re-fetching the full 14k+ product array from Upstash on
    // every miss (that direct Redis fetch was adding 30-45s of latency).
    const warehouse = await this.getWarehouseCache();

    if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
      const cleanPid = decodeURIComponent(pid).trim();
      const matched = warehouse.find(
        (p: any) =>
          String(p.pid || p.id || p._id) === pid ||
          String(p.pid || p.id || p._id) === cleanPid ||
          p.sku === pid ||
          p.sku === cleanPid ||
          p.name === pid ||
          p.name === cleanPid,
      );

      if (matched) {
        this.logger.log(`[Product] Warehouse in-memory HIT for product:${pid}`);
        // Write only to the primary warehouse key. Legacy key is written by catalog sync.
        await this.redisService.setJson(
          warehouseKey,
          matched,
          CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL,
        );
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
      // Write only to the primary warehouse key.
      await this.redisService.setJson(
        warehouseKey,
        enriched,
        CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL,
      );
      this.logger.log(`[Product] Cache WRITE warehouse:product:${pid}`);
      return enriched;
    } catch (err: any) {
      this.logger.warn(
        `[CJ] Variant enrichment failed for ${pid}: ${err?.message ?? err}`,
      );
    }

    // Enrichment failed — still write the base product to the primary key only.
    await this.redisService.setJson(
      warehouseKey,
      matchedProduct,
      CJ_CONFIG.CACHE_TTL.PRODUCT_DETAIL,
    );
    this.logger.log(`[Product] Cache WRITE warehouse:product:${pid} (base, no variants)`);
    return matchedProduct;
  }

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
        .filter((t) => t.length >= 1);

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
      // — uses the in-memory 5-minute cache instead of a raw Upstash fetch.
      const warehouse = await this.getWarehouseCache();

      if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
        /**
         * Word-token prefix matcher for the candidate pre-filter.
         * Splits text on non-alphanumeric chars and checks if any token
         * starts with `term`. This means "men" matches tokens ["men", "mens"]
         * but NOT "women" (since "women".startsWith("men") is false).
         */
        const tokenPrefixMatch = (term: string, text: string): boolean => {
          const toks = text
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(Boolean);
          return toks.some((tok) => tok === term || tok.startsWith(term));
        };

        const matchedInCatalog = warehouse.filter((p: any) => {
          const name = (p.name || p.title || '').toLowerCase();
          const category = (
            p.categoryName ||
            p._category ||
            p.subcategoryName ||
            ''
          ).toLowerCase();
          const kwStr = Array.isArray(p.keywords)
            ? p.keywords.join(' ').toLowerCase()
            : '';

          // A product is a candidate if EVERY query token matches at least one field
          return tokens.every(
            (t) =>
              tokenPrefixMatch(t, name) ||
              tokenPrefixMatch(t, category) ||
              tokenPrefixMatch(t, kwStr),
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

        const productKeys = candidatePids.map(
          (pid) => `warehouse:product:${pid}`,
        );
        const productResults =
          await this.redisService.mgetJson<any>(productKeys);
        let filteredProducts = productResults.filter(Boolean);

        if (
          filteredProducts.length === 0 &&
          warehouse &&
          Array.isArray(warehouse)
        ) {
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

    // 2. Serving Category & Catalog listings directly from the in-memory
    // warehouse cache instead of a raw Upstash fetch.
    const warehouse = await this.getWarehouseCache();

    if (warehouse && Array.isArray(warehouse) && warehouse.length > 0) {
      let filtered = warehouse;

      // if (query.subcategoryName) {
      //   const sub = query.subcategoryName.toLowerCase();
      //   filtered = filtered.filter((p: any) =>
      //     (p._category || p.subcategoryName || p.categoryName || '')
      //       .toLowerCase()
      //       .includes(sub),
      //   );
      // }
      if (query.subcategoryName) {
        const sub = normalizeKey(query.subcategoryName);
        filtered = filtered.filter((p: any) =>
          normalizeKey(
            p._category || p.subcategoryName || p.categoryName || '',
          ).includes(sub),
        );
      }

      if (query.collectionType) {
        const cType = normalizeKey(query.collectionType);
        filtered = filtered.filter((p: any) =>
          normalizeKey(
            p._parentCategory ||
            p._collectionType ||
            p.collectionType ||
            p.parentCategory ||
            '',
          ).includes(cType),
        );
      }

      const STOPWORDS = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'for']);

      const tokens = keyword
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => slugify(t))
        .filter((t) => t.length >= 1 && !STOPWORDS.has(t));

      // const category = normalizeKey(
      //   p.categoryName || p._category || p.subcategoryName || '',
      // );
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
    await this.redisService.setJson(
      cacheKey,
      normalized,
      CJ_CONFIG.CACHE_TTL.PRODUCT_LIST,
    );
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
    await this.redisService.setJson(
      cacheKey,
      normalized,
      CJ_CONFIG.CACHE_TTL.PRODUCT_CATEGORY,
    );
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
   * Get warehouse products — always reads from warehouse:all (single Redis GET),
   * filters in memory, and paginates. Uses a 5-minute in-memory cache so
   * Upstash is only contacted once per TTL window instead of on every request.
   */
  async getWarehouseProducts(
    pageNum = 1,
    pageSize = 24,
    categoryId?: string,
    subcategoryName?: string,
    collectionType?: string,
  ): Promise<{ products: any[]; total: number; warehouseHit: true } | null> {
    const warehouse = await this.getWarehouseCache();
    if (!warehouse.length) return null;

    let pool = warehouse;

    if (subcategoryName) {
      const norm = normalizeKey(subcategoryName);
      pool = pool.filter((p) => {
        const val = normalizeKey(
          p.subcategoryName ??
          p._category ??
          p.category ??
          p.categoryName ??
          '',
        );
        return val === norm || val.includes(norm) || norm.includes(val);
      });
    }

    if (categoryId) {
      pool = pool.filter(
        (p) => String(p.categoryId ?? p.category ?? '') === categoryId,
      );
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
        return (
          val === normColl || val.includes(normColl) || normColl.includes(val)
        );
      });
    }

    // Strip sub-₹1 priced products
    pool = pool.filter((p) => Number(p.price ?? 0) > 1);

    const total = pool.length;
    const effectivePageSize = Math.min(pageSize, 500);
    const start = (pageNum - 1) * effectivePageSize;
    const products = pool.slice(start, start + effectivePageSize);

    this.logger.log(
      `[CJ] Warehouse READ page=${pageNum} size=${effectivePageSize} → ${products.length}/${total}`,
    );
    return { products, total, warehouseHit: true };
  }

  /**
   * In-memory warehouse cache — returns the full catalog array.
   * Hits Redis warehouse:all first; if missing or empty, loads from local MongoDB store.
   * Uses a 10-minute in-memory cache so reads are instant (< 5ms) without hitting Upstash or CJ.
   */
  private async getWarehouseCache(): Promise<any[]> {
    const now = Date.now();
    if (
      this.warehouseCache.length > 0 &&
      now - this.warehouseLoadedAt < CjService.WAREHOUSE_CACHE_TTL_MS
    ) {
      return this.warehouseCache;
    }

    let warehouse =
      (await this.redisService.getJson<any[]>(WAREHOUSE_KEY_ALL)) ??
      (await this.redisService.getJson<any[]>(WAREHOUSE_LEGACY_ALL)) ??
      [];

    // If Redis does not have the catalog, load directly from local MongoDB store
    if ((!warehouse || warehouse.length === 0) && this.productModel) {
      try {
        this.logger.log(
          '[CJ] Warehouse key missing in Redis — loading catalog from MongoDB store...',
        );
        const mongoProducts = await this.productModel.find().lean().exec();
        if (mongoProducts && mongoProducts.length > 0) {
          warehouse = mongoProducts;
          this.logger.log(
            `[CJ] Loaded ${warehouse.length} products from MongoDB into warehouse cache`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `[CJ] Failed to load warehouse from MongoDB: ${err?.message ?? err}`,
        );
      }
    }

    if (Array.isArray(warehouse) && warehouse.length > 0) {
      this.warehouseCache = warehouse;
      this.warehouseLoadedAt = now;
      this.logger.log(
        `[CJ] In-memory warehouse cache refreshed: ${warehouse.length} products`,
      );
    }

    return this.warehouseCache;
  }

  /**
   * Run full catalog sync with automated retry sequence, pipeline/batch writes, index updates, and API cache flushing.
   */
  async runCatalogSync(): Promise<{
    success: boolean;
    count: number;
    skipped?: boolean;
  }> {
    const lockKey = 'cj:sync:lock';
    const locked = await this.redisService.setnx(lockKey, '1', 3600);
    if (!locked) {
      this.logger.warn('[Cron] Sync is already running (locked). Skipping.');
      return { success: false, count: 0, skipped: true };
    }

    try {
      const syncStart = Date.now();
      this.cjClient.apiCallsThisSync = 0;

      this.logger.log('[Cron] Sync Started');

      const RETRY_DELAYS = [0, 30_000, 120_000];
      let lastError = '';
      let syncData: {
        products: any[];
        changedPids: Set<string>;
        deletedPids: Set<string>;
      } | null = null;

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
          this.logger.warn(
            `[Cron] Retrying sync in ${RETRY_DELAYS[attempt] / 1000}s (attempt ${attempt + 1})...`,
          );
          await this.delay(RETRY_DELAYS[attempt]);
        }

        try {
          syncData = await this.fetchCatalog();
          break; // success
        } catch (e: any) {
          lastError = e?.message ?? String(e);
          this.logger.error(
            `[Cron] Sync attempt ${attempt + 1} failed: ${lastError}`,
          );
        }
      }

      if (!syncData) {
        this.logger.error(
          '[Cron] All sync attempts failed. Existing warehouse cache preserved.',
        );
        return { success: false, count: 0 };
      }

      const { products: allProducts, changedPids, deletedPids } = syncData;

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

      // 1. Global warehouse list — warehouse:all is the single source of truth.
      // The legacy products:all key is still read as a fallback in getWarehouseCache
      // for any data that was cached before this change, but we no longer write it
      // here. It will expire naturally (TTL: WEEKLY).
      writeOps.push({ key: WAREHOUSE_KEY_ALL, value: balancedAll });

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
          if (!collectionGroups.has(parentKey))
            collectionGroups.set(parentKey, []);
          collectionGroups.get(parentKey)!.push(product);
        }

        // Build tokenized search index: Name, SKU, Category keywords
        const tokens: string[] = [];
        if (product.name) tokens.push(...product.name.split(/\s+/));
        if (product.sku) tokens.push(product.sku);
        if (product.categoryName)
          tokens.push(...product.categoryName.split(/\s+/));
        if (product.subcategoryName)
          tokens.push(...product.subcategoryName.split(/\s+/));

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
        writeOps.push({
          key: `warehouse:subcategory:${subKey}`,
          value: products,
        });
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
        writeOps.push({
          key: `warehouse:index:keyword:${token}`,
          value: Array.from(new Set(pids)),
        });
      }

      this.logger.log(
        `[Cron] Preparing batch writes of ${writeOps.length} keys to Redis...`,
      );
      await this.batchWriteToRedis(writeOps);
      this.logger.log(`[Cron] Batch Redis writes completed.`);

      // Verify per-product keys actually landed, and report any gaps.
      await this.verifyWarehouseIntegrity(allProducts);

      // Automatically invalidate stale API response cache keys
      await this.clearApiCache();

      // Build/refresh the search index + persist to MongoDB (non-fatal failures)
      await this.maintainSearchAndStore(allProducts, changedPids, deletedPids);

      const durationMs = Date.now() - syncStart;
      this.logger.log(`[Cron] Redis Updated & API Cache Cleared`);
      this.logger.log(
        `[Cron] Execution Time: ${(durationMs / 1000).toFixed(1)}s`,
      );
      this.logger.log(
        `[Cron] API Calls Used: ~${this.cjClient.apiCallsThisSync}`,
      );
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

  private async maintainSearchAndStore(
    allProducts: any[],
    changedPids: Set<string>,
    deletedPids: Set<string>,
  ): Promise<void> {
    const globalPids = new Set(
      allProducts.map((p: any) => String(p.pid || p.id || p._id || '')),
    );

    // A pid removed from one category may still exist in another.
    const trulyDeleted = new Set(
      Array.from(deletedPids).filter((pid) => pid && !globalPids.has(pid)),
    );

    // 1. Search index (full build when missing, incremental otherwise)
    if (this.searchIndexService) {
      try {
        const stats = await this.searchIndexService.getStats();
        if (!stats) {
          this.logger.log(
            '[Sync] Search index stats missing — building full inverted index...',
          );
          await this.clearSearchIndexKeys();
          await this.searchIndexService.buildFullIndex(allProducts);
        } else {
          const productMap = new Map<string, any>();
          for (const p of allProducts) {
            productMap.set(String(p.pid || p.id || p._id || ''), p);
          }

          const changed = Array.from(changedPids);
          const CHUNK = 20;
          for (let i = 0; i < changed.length; i += CHUNK) {
            await Promise.all(
              changed.slice(i, i + CHUNK).map(async (pid) => {
                const p = productMap.get(pid);
                if (p) {
                  await this.searchIndexService!.indexProduct(p);
                }
              }),
            );
          }

          const deleted = Array.from(trulyDeleted);
          for (let i = 0; i < deleted.length; i += CHUNK) {
            await Promise.all(
              deleted.slice(i, i + CHUNK).map(async (pid) => {
                await this.searchIndexService!.removeProduct(pid);
              }),
            );
          }

          this.logger.log(
            `[Sync] Search index incremental update: ${changed.length} changed, ${deleted.length} removed`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `[Sync] Search index maintenance failed: ${err?.message ?? err}`,
        );
      }
    }

    // 2. MongoDB durable persistence
    if (this.productModel) {
      try {
        // Full backfill on first run (empty collection), incremental upsert after.
        let docs: any[] = [];
        if (changedPids.size > 0) {
          const productMap = new Map<string, any>();
          for (const p of allProducts) {
            productMap.set(String(p.pid || p.id || p._id || ''), p);
          }
          docs = Array.from(changedPids)
            .map((pid) => productMap.get(pid))
            .filter(Boolean)
            .map((p: any) => this.toProductDoc(p));
        }

        const existingCount =
          (await this.productModel.estimatedDocumentCount().catch(() => 0)) ??
          0;
        if (existingCount === 0 && allProducts.length > 0) {
          docs = allProducts.map((p: any) => this.toProductDoc(p));
          this.logger.log(
            `[Sync] MongoDB empty — backfilling all ${docs.length} products`,
          );
        }

        if (docs.length > 0) {
          const ops = docs.map((doc) => ({
            updateOne: {
              filter: { pid: doc.pid },
              update: { $set: doc },
              upsert: true,
            },
          }));

          for (let i = 0; i < ops.length; i += 500) {
            await this.productModel.bulkWrite(ops.slice(i, i + 500), {
              ordered: false,
            });
          }
          this.logger.log(`[Sync] MongoDB upserted ${docs.length} products`);
        }

        if (trulyDeleted.size > 0) {
          const deletedArr = Array.from(trulyDeleted);
          await this.productModel.deleteMany({ pid: { $in: deletedArr } });
          this.logger.log(
            `[Sync] MongoDB deleted ${deletedArr.length} removed products`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `[Sync] MongoDB persistence failed: ${err?.message ?? err}`,
        );
      }
    }

    // 3. Drop per-product cache keys for truly deleted products
    if (trulyDeleted.size > 0) {
      const deletedArr = Array.from(trulyDeleted);
      for (let i = 0; i < deletedArr.length; i += 50) {
        await Promise.all(
          deletedArr.slice(i, i + 50).map(async (pid) => {
            await this.redisService.del(`warehouse:product:${pid}`);
            await this.redisService.del(`product:${pid}`);
            await this.redisService.del(`search:product_tokens:${pid}`);
          }),
        );
      }
      this.logger.log(
        `[Sync] Removed ${deletedArr.length} stale per-product cache keys`,
      );
    }
  }

  /**
   * Delete every Redis key that makes up the inverted index so a full rebuild
   * starts from a clean slate (no stale token/PID entries).
   */
  private async clearSearchIndexKeys(): Promise<void> {
    const patterns = [
      'search:index:*',
      'search:prefix:*',
      'search:product_tokens:*',
    ];
    for (const pattern of patterns) {
      const keys = await this.redisService.keys(pattern);
      if (keys && keys.length > 0) {
        for (let i = 0; i < keys.length; i += 200) {
          await Promise.all(
            keys.slice(i, i + 200).map((k) => this.redisService.del(k)),
          );
        }
        this.logger.log(
          `[Sync] Cleared ${keys.length} stale "${pattern}" keys before index rebuild`,
        );
      }
    }
  }

  /**
   * Map a normalized CJ product into the durable MongoDB Product document shape.
   */
  private toProductDoc(p: any) {
    const pid = String(p.pid || p.id || p._id || '');
    const name = p.name || p.productName || p.title || '';
    return {
      pid,
      name,
      title: p.title || p.productName || name,
      productName: p.productName || name,
      brand: p.brand || p.productBrand || '',
      collectionType: p._collectionType || p.collectionType || '',
      categoryId: p.categoryId || '',
      categoryName: p.categoryName || p._category || '',
      subcategoryName: p.subcategoryName || p._category || p.categoryName || '',
      subcategoryId: p.subcategoryId || '',
      price: Number(p.price || p.sellPrice || 0),
      discountPrice: Number(p.discountPrice || 0),
      images: Array.isArray(p.images) ? p.images : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      description: p.description || '',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async fetchCatalog(): Promise<{
    products: any[];
    changedPids: Set<string>;
    deletedPids: Set<string>;
  }> {
    const allProducts: any[] = [];
    const globalSeenPids = new Set<string>();
    const changedPids = new Set<string>();
    const deletedPids = new Set<string>();
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

      // CJ API hard limit: pageNum * pageSize cannot exceed offset 6000
      const maxPage = Math.floor(6000 / pageSize) + 1;

      let newProductsCount = 0;
      let updatedProductsCount = 0;
      let duplicatesRemovedCount = 0;
      let catApiCalls = 0;

      // Whether we saw every product in this category. Only set to true when
      // pagination ends naturally (a short/empty page). Offset-capped or errored
      // categories are treated as incomplete so we never delete products that
      // simply weren't fetched this cycle.
      let catComplete = false;

      while (pageNum <= Math.min(CJ_CONFIG.MAX_PAGES_PER_CATEGORY, maxPage)) {
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
          const msg = err?.response?.response?.message || err?.message || '';

          if (msg.includes('max offset')) {
            this.logger.warn(
              `[CJ] Maximum offset reached for "${categoryName}". Pagination stopped.`,
            );
            break;
          }

          this.logger.warn(
            `[CJ] Failed to fetch page ${pageNum} for category "${categoryName}" (${categoryId}): ${msg}`,
          );
          break;
        }

        // Handle case where API returns an error object instead of throwing
        if (
          response?.code === 1600300 ||
          response?.message?.includes('max offset')
        ) {
          this.logger.warn(
            `[CJ] Maximum offset reached for ${categoryName}. Stopping pagination.`,
          );
          break;
        }

        const normalized = this.normalizeProductResponse(response, {
          categoryId,
        });
        const products: any[] = normalized?.products ?? [];

        if (products.length === 0) {
          // Empty page only counts as "complete" if we already fetched data —
          // an empty FIRST page could be a transient API response.
          if (pageNum > 1) {
            catComplete = true;
          }
          break;
        }

        for (const product of products) {
          const pid = String(product?.pid || product?.id || '');
          if (!pid) continue;

          // Strip zero / sub-1-rupee priced products
          const productPrice =
            Number(product?.price ?? product?.sellPrice ?? 0) || 0;
          const inrPrice =
            productPrice > 1
              ? productPrice
              : Number(
                (productPrice * CJ_CONFIG.CURRENCY_EXCHANGE_RATE).toFixed(2),
              );
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
              changedPids.add(pid);
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
            changedPids.add(pid);
            newProductsCount++;
          }
        }

        if (products.length < pageSize) {
          catComplete = true;
          break;
        }

        pageNum++;
        await this.delay(200);
      }

      // Safe delete sweep: only when this category's pagination completed and
      // a previously-known product is no longer present.
      if (catComplete) {
        const presentPids = new Set(productMap.keys());
        for (const prev of existingCatProducts) {
          const prevPid = String(prev.pid || prev.id || '');
          if (prevPid && !presentPids.has(prevPid)) {
            deletedPids.add(prevPid);
          }
        }
      }

      const mergedCatProducts = Array.from(productMap.values());

      if (mergedCatProducts.length > 0) {
        await this.redisService.setJson(catKey, mergedCatProducts);
      }

      const catDurationSec = ((Date.now() - catStart) / 1000).toFixed(1);

      // Calculate sync metrics and log details
      const elapsedTotalSec = (Date.now() - syncStartAll) / 1000;
      const progressRatio =
        (allProducts.length + mergedCatProducts.length) / 50000; // rough estimation
      const estRemainingSec =
        progressRatio > 0
          ? elapsedTotalSec / progressRatio - elapsedTotalSec
          : 0;

      this.logger.log(
        `[Sync Status] Cat: "${categoryName}" | Page: ${pageNum} | Synced: ${mergedCatProducts.length} | New: ${newProductsCount} | Updated: ${updatedProductsCount} | Dups Removed: ${duplicatesRemovedCount} | API Calls: ${catApiCalls} | Duration: ${catDurationSec}s | Est. Remaining: ${estRemainingSec.toFixed(0)}s`,
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

    return { products: allProducts, changedPids, deletedPids };
  }

  private async batchWriteToRedis(
    operations: { key: string; value: any; ttl?: number }[],
  ) {
    const CHUNK_SIZE = 150;
    // Warehouse content is fully rebuilt every sync, so a long TTL is safe and
    // prevents premature eviction of per-product keys between syncs.
    const defaultTtl = REDIS_TTL.WEEKLY;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const { ok, failed, failedKeys } =
        await this.redisService.pipelineSetJson(
          chunk.map((op) => ({
            key: op.key,
            value: op.value,
            ttlSeconds: op.ttl ?? defaultTtl,
          })),
        );
      if (failed > 0) {
        this.logger.warn(
          `[Cron] Redis batch chunk ${i / CHUNK_SIZE}: ${ok} ok, ${failed} failed (${failedKeys.slice(0, 10).join(', ')}...)`,
        );
      }
    }
  }

  /**
   * Post-sync integrity check. The expensive KEYS scan was removed because at
   * 14k+ products it scans the entire Upstash keyspace on every sync, consuming
   * thousands of quota units. batchWriteToRedis already returns ok/failed counts
   * so write failures are already surfaced. This method now only logs the count.
   */
  private async verifyWarehouseIntegrity(products: any[]) {
    this.logger.log(
      `[Integrity] Catalog sync complete — total products in warehouse: ${products.length}`,
    );
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
    const price = Number(
      (rawPrice * CJ_CONFIG.CURRENCY_EXCHANGE_RATE).toFixed(2),
    );

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
          ? Number(
            (
              Number(v.variantSellPrice) * CJ_CONFIG.CURRENCY_EXCHANGE_RATE
            ).toFixed(2),
          )
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
          result[key] =
            !isNaN(num) && num > 0 ? String(Math.min(num, 200)) : value;
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

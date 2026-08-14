import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CjService } from '../cj/cj.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

type ProductQuery = {
  categoryId?: string;
  collectionType?: string;
  subcategoryName?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  colors?: string;
  sizes?: string;
  minRating?: string;
  sort?: string;
  pid?: string;
  page?: string;
  limit?: string;
  pageNum?: string;
  pageSize?: string;
  keyword?: string;
  [key: string]: string | undefined;
};

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly productTtlSeconds = 60 * 60 * 6;
  private readonly inFlightRequests = new Map<string, Promise<any>>();
  private readonly l1Cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private readonly cjService: CjService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) { }

  async onModuleInit() {
    this.logger.log(
      '[Products] Module initialized — in-memory L1 cache ready',
    );
  }

  async getProducts(query: ProductQuery = {}) {
    const cacheKey = this.buildCacheKey(query);
    const now = Date.now();

    // 1. In-memory L1 Cache (< 1ms, zero network latency)
    const l1Hit = this.l1Cache.get(cacheKey);
    if (l1Hit && l1Hit.expiresAt > now) {
      this.logger.log(`[Products] L1 Memory Cache HIT ${cacheKey}`);
      return l1Hit.data;
    }

    this.logger.log(`[Products] L1 Cache MISS ${cacheKey} — fast in-memory warehouse evaluation`);

    // 2. Evaluate from local in-memory catalog directly (takes ~15ms)
    const result = await this.runSingleFlight(cacheKey, () =>
      this.fetchFromWarehouse(query),
    );

    // Cache search queries for 30 min, listings for 6 hours
    const isSearchQuery = Boolean(
      (query.q || query.keyword || query.search || '').trim(),
    );
    const ttlSeconds = isSearchQuery ? 1800 : this.productTtlSeconds;

    if (
      result &&
      Array.isArray(result.products) &&
      result.products.length > 0
    ) {
      // Store in L1 memory cache immediately for instant subsequent hits
      this.l1Cache.set(cacheKey, { data: result, expiresAt: now + 10 * 60 * 1000 });

      // Non-blocking async write to Redis in background
      this.redisService.setJson(cacheKey, result, ttlSeconds).catch((e) => {
        this.logger.warn(`[Products] Background Redis write failed for ${cacheKey}: ${e.message}`);
      });

      this.logger.log(
        `[Products] Cache WRITE ${cacheKey} (TTL ${ttlSeconds}s) → ${result.products.length} products`,
      );
    } else {
      this.logger.warn(
        `[Products] Skipping Cache WRITE for ${cacheKey} because result returned 0 products (${result?.source})`,
      );
    }

    return result;
  }

  async getProduct(id: string) {
    const cacheKey = `product:${id}`;
    const cached =
      await this.redisService.getJson<Record<string, any>>(cacheKey);

    if (cached) {
      this.logger.log(`[Product] Cache HIT ${cacheKey}`);
      return this.withReviews(cached, id);
    }

    this.logger.log(`[Product] Cache MISS ${cacheKey} — fetching from CJ API`);

    // Single product detail may still call CJ (it's a targeted per-PID request, not a list call)
    const product = await this.runSingleFlight(cacheKey, async () => {
      return await this.cjService.getProductById(id);
    });

    await this.redisService.setJson(cacheKey, product, this.productTtlSeconds);
    this.logger.log(`[Product] Cache WRITE ${cacheKey}`);

    return this.withReviews(product, id);
  }

  async getCatalogStats() {
    const cacheKey = 'products:catalog_stats';
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) return cached;

    const warehouseRes = await this.cjService.getWarehouseProducts(1, 1);
    const totalProducts = warehouseRes?.total || 14593;

    const stats = {
      success: true,
      totalProducts,
      totalCategories: 6,
      status: 'synced',
    };

    await this.redisService.setJson(cacheKey, stats, 1800); // 30 mins TTL
    return stats;
  }


  // ─── Public: related products ──────────────────────────────────────────────

  async getRelatedProducts(id: string) {
    const cacheKey = `products:related:${id}`;
    const cached = await this.redisService.getJson<any[]>(cacheKey);

    if (cached) {
      this.logger.log(`[RelatedProducts] CACHE HIT ${cacheKey}`);
      return { products: cached };
    }

    this.logger.log(`[RelatedProducts] CACHE MISS — local catalog lookup for ${id}`);

    try {
      // Read from local Redis only — warehouse:product:{id} is the primary key,
      // product:{id} is the legacy fallback. Do NOT call cjService.getProductById()
      // here: related-products must never trigger a live CJ API request.
      let localProduct =
        await this.redisService.getJson<Record<string, any>>(`warehouse:product:${id}`) ??
        await this.redisService.getJson<Record<string, any>>(`product:${id}`);

      if (!localProduct) {
        this.logger.log(`[RelatedProducts] No local product found for ${id} — returning empty`);
        return { products: [] };
      }

      const subcategoryName =
        localProduct._category ??
        localProduct.subcategoryName ??
        localProduct.categoryName ??
        '';

      // Subcategory lookup via in-memory warehouse cache (no extra Redis/CJ calls)
      this.logger.log(`[RelatedProducts] Local catalog lookup — subcategory: "${subcategoryName}"`);

      if (!subcategoryName) {
        this.logger.log(`[RelatedProducts] No subcategory on product ${id} — returning empty`);
        return { products: [] };
      }

      const warehouseResult = await this.cjService.getWarehouseProducts(
        1,
        16,
        undefined,
        subcategoryName,
      );

      if (!warehouseResult || warehouseResult.products.length === 0) {
        this.logger.log(`[RelatedProducts] No related products found for subcategory "${subcategoryName}"`);
        return { products: [] };
      }

      // Exclude the current product, take max 8
      const candidates = warehouseResult.products
        .filter((p: any) => String(p.pid || p.id || p._id) !== String(id))
        .slice(0, 8);

      const withRatings = await Promise.all(
        candidates.map((p: any) => this.withReviews(p, p.pid || p._id)),
      );

      if (withRatings.length > 0) {
        await this.redisService.setJson(cacheKey, withRatings, 60 * 60);
      }

      return { products: withRatings };
    } catch (err: any) {
      this.logger.warn(
        `[RelatedProducts] Error building related products for ${id}: ${err?.message ?? err}`,
      );
      return { products: [] };
    }
  }

  async createReview(id: string, token: string, dto: CreateReviewDto) {
    if (!dto.comment?.trim())
      throw new BadRequestException('Comment is required');
    if (!dto.rating || dto.rating < 1 || dto.rating > 5)
      throw new BadRequestException('Rating must be between 1 and 5');

    let userName = 'Verified Customer';
    if (token) {
      try {
        const user = await this.resolveUser(token);
        userName =
          user.name ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          'Verified Customer';
      } catch {
        // Fallback to Verified Customer if token is expired or invalid
      }
    }

    const review = await this.reviewModel.create({
      productId: id,
      rating: dto.rating,
      comment: dto.comment.trim(),
      userName,
    });

    // Clear single product cache so the new review is immediately returned on reload
    await this.redisService.del(`product:${id}`);

    return { review };
  }



  private async fetchFromWarehouse(query: ProductQuery) {
    const pageNum = Math.max(1, Number(query.pageNum || query.page || 1));
    const pageSize = Math.min(
      Math.max(1, Number(query.pageSize || query.limit || 6)),
      200,
    );

    // ── Search query ─────────────────────────────────────────────────────────
    const rawSearchQuery = (
      query.q ||
      query.keyword ||
      query.search ||
      ''
    ).trim();

    // Sanitize: cap at 100 chars, strip injection symbols
    const cleanQuery = rawSearchQuery
      .slice(0, 100)
      .replace(/[<>{}$]/g, '')
      .trim();

    if (cleanQuery) {
      // Delegate to cjService.getProducts which uses the 5-minute in-memory
      // warehouse cache (getWarehouseCache + mgetJson index lookup).
      // This avoids a direct warehouse:all Redis GET on every search cache miss.
      const searchResult = await this.cjService.getProducts({
        keyword: cleanQuery,
        pageNum: String(pageNum),
        pageSize: String(pageSize),
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.minPrice ? { minPrice: query.minPrice } : {}),
        ...(query.maxPrice ? { maxPrice: query.maxPrice } : {}),
      });

      const products = Array.isArray(searchResult?.products)
        ? searchResult.products
        : [];

      return {
        success: true,
        query: cleanQuery,
        total: searchResult?.total ?? searchResult?.data?.total ?? products.length,
        page: pageNum,
        limit: pageSize,
        source: products.length > 0 ? 'warehouse:search' : 'warehouse:search_empty',
        products,
      };
    }

    // ── Category / collection listing ─────────────────────────────────────────
    const warehouseResult = await this.cjService.getWarehouseProducts(
      pageNum,
      pageSize,
      query.categoryId,
      query.subcategoryName,
      query.collectionType,
    );

    // Warehouse returned products — serve directly, no CJ call.
    if (warehouseResult && warehouseResult.products.length > 0) {
      this.logger.log(
        `[Products] Warehouse HIT sub=${query.subcategoryName ?? '-'} page=${pageNum} → ${warehouseResult.products.length}/${warehouseResult.total}`,
      );
      return {
        success: true,
        products: warehouseResult.products,
        total: warehouseResult.total,
        page: pageNum,
        limit: pageSize,
        source: 'warehouse',
      };
    }

    // warehouseResult is non-null but empty: warehouse is populated and the
    // requested subcategory simply has no matching products. Return empty —
    // do NOT fall back to the live CJ API. A populated warehouse miss must
    // never become a CJ request.
    if (warehouseResult !== null) {
      this.logger.log(
        `[Products] Warehouse populated but 0 matches for sub=${query.subcategoryName ?? '-'} — returning empty`,
      );
      return {
        success: true,
        products: [],
        total: 0,
        page: pageNum,
        limit: pageSize,
        source: 'warehouse_empty',
        message: 'No products found in this category',
      };
    }

    // warehouseResult === null: warehouse is genuinely empty (not yet synced).
    // Allow a single CJ API call so the page is not blank on first boot.
    try {
      this.logger.log(
        `[Products] Warehouse not synced yet — falling back to live CJ API for sub=${query.subcategoryName ?? '-'}`,
      );
      const liveData = await this.cjService.getProducts(query);
      if (
        liveData &&
        Array.isArray(liveData.products) &&
        liveData.products.length > 0
      ) {
        return {
          success: true,
          products: liveData.products,
          total: liveData.total || liveData.products.length,
          page: pageNum,
          limit: pageSize,
          source: 'cj_live_fallback',
        };
      }
    } catch (err: any) {
      this.logger.warn(
        `[Products] CJ live fallback failed: ${err?.message ?? err}`,
      );
    }

    return {
      success: true,
      products: [],
      total: 0,
      page: pageNum,
      limit: pageSize,
      source: 'warehouse_empty',
      message: 'Products are syncing — please try again in a few minutes',
    };
  }



  // ─── Private: helpers ─────────────────────────────────────────────────────

  private async withReviews(product: Record<string, any>, id: string) {
    const reviews = await this.reviewModel
      .find({ productId: id })
      .sort({ createdAt: -1 })
      .exec();
    const numReviews = reviews.length;
    const averageRating =
      numReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews
        : (product.averageRating ?? 0);

    return { ...product, reviews, numReviews, averageRating };
  }

  private async resolveUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User no longer exists');
      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private buildCacheKey(query: ProductQuery) {
    const IGNORE_PARAMS = new Set(['minPrice', 'maxPrice', 'minRating']);
    const normalized = Object.entries(query)
      .filter(([key, value]) => Boolean(value) && !IGNORE_PARAMS.has(key))
      .map(([key, value]) => `${key}:${String(value).trim().toLowerCase()}`)
      .sort();

    return normalized.length > 0
      ? `api:products:${normalized.join(':')}`
      : 'api:products:all';
  }

  private runSingleFlight<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const existing = this.inFlightRequests.get(key);
    if (existing) return existing as Promise<T>;

    const request = factory().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, request);
    return request;
  }
}

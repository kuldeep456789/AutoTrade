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
      '[Products] Module initialized — preserving existing api:products:* cache keys',
    );
  }

  async getProducts(query: ProductQuery = {}) {
    const cacheKey = this.buildCacheKey(query);
    const cached = await this.redisService.getJson(cacheKey);

    if (cached) {
      this.logger.log(`[Products] Cache HIT ${cacheKey}`);
      return cached;
    }

    this.logger.log(`[Products] Cache MISS ${cacheKey}`);

    const result = await this.runSingleFlight(cacheKey, () =>
      this.fetchFromWarehouse(query),
    );

    // Cache search queries for 300s (5 min TTL), listings for 6 hours
    const isSearchQuery = Boolean(
      (query.q || query.keyword || query.search || '').trim(),
    );
    const ttlSeconds = isSearchQuery ? 1800 : this.productTtlSeconds;

    if (
      result &&
      Array.isArray(result.products) &&
      result.products.length > 0
    ) {
      await this.redisService.setJson(cacheKey, result, ttlSeconds);
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
      this.logger.log(`[Products] Related cache HIT ${cacheKey}`);
      return { products: cached };
    }

    try {
      const cjProduct = await this.cjService.getProductById(id);
      const subcategoryName =
        cjProduct?._category ??
        cjProduct?.subcategoryName ??
        cjProduct?.categoryName ??
        '';

      let products: any[] = [];

      // 1. Try finding products from the same subcategory
      if (subcategoryName) {
        const warehouseResult = await this.cjService.getWarehouseProducts(
          1,
          16,
          undefined,
          subcategoryName,
        );
        if (warehouseResult && warehouseResult.products.length > 0) {
          products = warehouseResult.products.filter(
            (p: any) => (p.pid || p.id || p._id) !== id,
          );
        }
      }

      // 2. Fallback: if no products found in subcategory, return items from main warehouse pool
      if (products.length === 0) {
        const fallbackResult = await this.cjService.getWarehouseProducts(1, 16);
        if (fallbackResult && fallbackResult.products.length > 0) {
          products = fallbackResult.products.filter(
            (p: any) => (p.pid || p.id || p._id) !== id,
          );
        }
      }

      const finalProducts = products.slice(0, 8);
      const withRatings = await Promise.all(
        finalProducts.map((p: any) => this.withReviews(p, p.pid || p._id)),
      );
      if (withRatings.length > 0) {
        await this.redisService.setJson(cacheKey, withRatings, 60 * 60);
      }
      return { products: withRatings };
    } catch (err: any) {
      this.logger.warn(
        `[Products] Failed to fetch related for ${id}: ${err?.message ?? err}`,
      );
    }

    return { products: [] };
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

    // ── Search query: filter & score warehouse products with relevance engine ──
    const rawSearchQuery = (
      query.q ||
      query.keyword ||
      query.search ||
      ''
    ).trim();

    // Sanitize input: cap length at 100, remove dangerous injection symbols
    const cleanQuery = rawSearchQuery
      .slice(0, 100)
      .replace(/[<>{}$]/g, '')
      .trim();

    if (cleanQuery) {
      const queryKeywords = cleanQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      // ── Pure Redis search: read warehouse directly, zero CJ API calls ──
      const MAX_MATCHES = 10;
      const rawWarehouse =
        (await this.redisService.getJson<any[]>('warehouse:all')) ??
        (await this.redisService.getJson<any[]>('products:all')) ??
        [];

      const candidateProducts: any[] = Array.isArray(rawWarehouse)
        ? rawWarehouse
        : (rawWarehouse as any)?.products ?? [];

      if (candidateProducts.length > 0) {
        const scoredProducts: { product: any; score: number }[] = [];

        for (const p of candidateProducts) {
          const score = this.computeRelevanceScore(
            p,
            cleanQuery,
            queryKeywords,
          );
          if (score > 0) {
            // Price range filtering
            const price = Number(p.discountPrice || p.price || 0);
            if (query.minPrice && price < Number(query.minPrice)) continue;
            if (query.maxPrice && price > Number(query.maxPrice)) continue;

            scoredProducts.push({ product: p, score });

            if (scoredProducts.length >= MAX_MATCHES) break;
          }
        }

        // Sort by relevance (or price/rating if specified)
        const sortMode = (query.sort || 'relevance').toLowerCase();
        scoredProducts.sort((a, b) => {
          if (sortMode === 'price-asc' || sortMode === 'price-low-to-high') {
            return (a.product.price || 0) - (b.product.price || 0);
          }
          if (sortMode === 'price-desc' || sortMode === 'price-high-to-low') {
            return (b.product.price || 0) - (a.product.price || 0);
          }
          if (sortMode === 'rating') {
            return (
              (b.product.averageRating || 0) - (a.product.averageRating || 0)
            );
          }
          return b.score - a.score;
        });

        const total = scoredProducts.length;
        const start = (pageNum - 1) * pageSize;
        const paginatedProducts = scoredProducts
          .slice(start, start + pageSize)
          .map((item) => item.product);

        return {
          success: true,
          query: cleanQuery,
          total,
          page: pageNum,
          limit: pageSize,
          source: 'warehouse:search',
          products: paginatedProducts,
        };
      }

      return {
        success: true,
        query: cleanQuery,
        total: 0,
        page: pageNum,
        limit: pageSize,
        source: 'warehouse:search_empty',
        products: [],
      };
    }

    // ── Category / collection listing: read from warehouse ─────────────────────
    const warehouseResult = await this.cjService.getWarehouseProducts(
      pageNum,
      pageSize,
      query.categoryId,
      query.subcategoryName,
      query.collectionType,
    );

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


    try {
      this.logger.log(
        `[Products] Warehouse MISS sub=${query.subcategoryName ?? '-'} — falling back to live CJ API`,
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
        `[Products] Live CJ API fallback attempt failed: ${err?.message ?? err}`,
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

  // ─── Private: Relevance Scoring Engine ─────────────────────────────────────

  private computeRelevanceScore(
    product: any,
    queryStr: string,
    queryKeywords: string[],
  ): number {
    const title = String(
      product.name || product.title || product.productName || '',
    ).trim();
    const brand = String(product.brand || product.productBrand || '').trim();
    const sku = String(product.sku || product.variantSku || '').trim();
    const category = String(
      product.collectionType ||
      product.categoryName ||
      product._category ||
      product.subcategoryName ||
      '',
    ).trim();
    const tags = Array.isArray(product.tags)
      ? product.tags.join(' ')
      : String(product.tags || '');
    const desc = String(product.description || '').trim();

    const titleLower = title.toLowerCase();
    const brandLower = brand.toLowerCase();
    const categoryLower = category.toLowerCase();
    const tagsLower = tags.toLowerCase();
    const descLower = desc.toLowerCase();
    const qLower = queryStr.toLowerCase();

    /**
     * Tokenize a text field into an array of lowercase word tokens.
     * Splits on any non-alphanumeric character so "women's" becomes ["women", "s"]
     * and handles hyphenated compound words like "full-zip" as ["full", "zip"].
     */
    const tokenize = (text: string): string[] =>
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 0);


    const kwMatchesField = (kw: string, text: string): boolean => {
      const tokens = tokenize(text);
      return tokens.some((tok) => tok === kw || tok.startsWith(kw));
    };


    const allFields = [titleLower, brandLower, categoryLower, tagsLower, descLower];


    for (const kw of queryKeywords) {
      const matchedAnyField = allFields.some((field) => kwMatchesField(kw, field));
      if (!matchedAnyField) {
        return 0;
      }
    }


    let score = 0;

    // 1. Exact full-phrase match in title
    if (titleLower === qLower) {
      score += 100;
    }
    // 2. Title starts with the full phrase
    else if (titleLower.startsWith(qLower)) {
      score += 60;
    }
    // 3. Title contains the full phrase as a substring
    else if (titleLower.includes(qLower)) {
      score += 35;
    }

    // 4. Count how many keywords match in title specifically (higher = more relevaSnt)
    const titleTokens = tokenize(titleLower);
    const titleMatchCount = queryKeywords.filter((kw) =>
      titleTokens.some((tok) => tok === kw || tok.startsWith(kw)),
    ).length;
    score += titleMatchCount * 10;

    // 5. All keywords found in title+brand (tight match)
    const mainText = `${titleLower} ${brandLower}`;
    const allInMain = queryKeywords.every((kw) => kwMatchesField(kw, mainText));
    if (allInMain) {
      score += 20;
    }

    // 6. Category match (any keyword)
    const catMatchCount = queryKeywords.filter((kw) =>
      kwMatchesField(kw, categoryLower),
    ).length;
    score += catMatchCount * 8;

    // 7. Tags / Description match (softer signal)
    const tagDescMatchCount = queryKeywords.filter((kw) =>
      kwMatchesField(kw, tagsLower) || kwMatchesField(kw, descLower),
    ).length;
    score += tagDescMatchCount * 3;

    return score;
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

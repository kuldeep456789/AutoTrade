import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { RedisService } from '../redis/redis.service';
import { REDIS_TTL } from '../redis/redis.constants';

@Injectable()
export class SearchRepository {
  private readonly logger = new Logger(SearchRepository.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Fetch products by PIDs — O(k) hydration instead of a full warehouse scan.
   *
   * Priority:
   *   1. MGET the per-product cache keys (warehouse:product:{pid}) in chunks.
   *   2. Legacy product:{pid} keys for any remaining misses.
   *   3. MongoDB as the durable fallback for anything still missing.
   *   4. Whole-warehouse scan ONLY as a last resort during migration, when
   *      neither per-product keys nor MongoDB have been populated yet.
   */
  async findProductsByPids(pids: string[]): Promise<any[]> {
    if (!pids || pids.length === 0) return [];

    const pidSet = new Set(pids);
    const resultMap = new Map<string, any>();
    const missing = new Set(pidSet);
    const CHUNK_SIZE = 50;

    const readKeys = async (keys: string[], ids: string[]) => {
      for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        const chunkKeys = keys.slice(i, i + CHUNK_SIZE);
        const chunkIds = ids.slice(i, i + CHUNK_SIZE);
        const values = await this.redisService.mgetJson<any>(chunkKeys);
        values.forEach((value, idx) => {
          if (value !== null && value !== undefined) {
            resultMap.set(chunkIds[idx], value);
            missing.delete(chunkIds[idx]);
          }
        });
      }
    };

    // 1. Primary per-product cache keys (single batch of MGET HTTP calls)
    await readKeys(
      pids.map((pid) => `warehouse:product:${pid}`),
      pids,
    );

    // 2. Legacy per-product keys for any misses
    if (missing.size > 0) {
      const legacyPids = Array.from(missing);
      await readKeys(
        legacyPids.map((pid) => `product:${pid}`),
        legacyPids,
      );
    }

    // 3. MongoDB fallback for any remaining misses
    if (missing.size > 0 && this.productModel) {
      try {
        const mongoProducts = await this.productModel
          .find({ pid: { $in: Array.from(missing) } })
          .lean()
          .exec();
        for (const p of mongoProducts) {
          const pid = String(p.pid || p.id || p._id || '');
          if (pid) {
            resultMap.set(pid, p);
            missing.delete(pid);
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `[SearchRepository] Mongo fallback query failed: ${err?.message ?? err}`,
        );
      }
    }

    // 4. Last-resort full warehouse scan (migration safety net only)
    if (resultMap.size === 0 && missing.size === pidSet.size) {
      const rawWarehouse =
        (await this.redisService.getJson<any[]>('warehouse:all')) ??
        (await this.redisService.getJson<any[]>('products:all')) ??
        [];
      const warehouseProducts: any[] = Array.isArray(rawWarehouse)
        ? rawWarehouse
        : ((rawWarehouse as any)?.products ?? []);
      if (warehouseProducts.length > 0) {
        this.logger.warn(
          `[SearchRepository] Per-product keys not found — falling back to full warehouse scan (${warehouseProducts.length} products) for PIDs: [${Array.from(pidSet).join(', ')}]`,
        );
        for (const p of warehouseProducts) {
          const pid = String(p.pid || p.id || p._id || '');
          if (pid && pidSet.has(pid)) resultMap.set(pid, p);
        }

        // Self-heal: backfill per-product keys so the next lookup is O(1)
        // instead of re-scanning the whole warehouse.
        const foundPids = Array.from(resultMap.keys());
        if (foundPids.length > 0) {
          const backfillOps = foundPids.map((pid) => ({
            key: `warehouse:product:${pid}`,
            value: resultMap.get(pid),
          }));
          const { ok, failed } = await this.redisService.pipelineSetJson(
            backfillOps.map((op) => ({
              ...op,
              ttlSeconds: REDIS_TTL.WEEKLY,
            })),
          );
          this.logger.log(
            `[SearchRepository] Self-heal: backfilled ${ok} per-product keys${failed > 0 ? ` (${failed} failed)` : ''} from warehouse scan`,
          );
        }
      }
    }

    if (missing.size > 0) {
      this.logger.warn(
        `[SearchRepository] ${missing.size}/${pidSet.size} products unresolved after all lookups: [${Array.from(missing).join(', ')}]`,
      );
    }

    // Return products in the requested PID order
    return pids.map((id) => resultMap.get(id)).filter(Boolean);
  }

  async enrichOrderItems(items: any[]): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) return;

    const pids = [
      ...new Set(
        items
          .map((i) => i?.productId)
          .filter((p) => typeof p === 'string' && p.length > 0),
      ),
    ];

    if (pids.length === 0) return;

    const products = await this.findProductsByPids(pids);
    const productMap = new Map<string, any>();
    for (const p of products) {
      if (!p) continue;
      const pid = String(p.pid || p.id || p._id || '');
      if (pid) productMap.set(pid, p);
    }

    for (const item of items) {
      const product = productMap.get(String(item.productId));
      if (!product) continue;

      const color = item.variant?.color || product.colors?.[0] || '';
      const size = item.variant?.size || product.sizes?.[0] || '';

      item.image = product.images?.[0] || null;
      item.productName =
        product.title || product.productName || product.name || '';
      item.price = product.discountPrice || product.price || 0;
      item.sku = product.sku || '';
      item.color = color;
      item.size = size;
    }
  }

  async enrichOrderItemsBatch(orders: any[]): Promise<void> {
    if (!Array.isArray(orders) || orders.length === 0) return;

    const allPids = new Set<string>();
    for (const order of orders) {
      const items = order?.items || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.productId && typeof item.productId === 'string') {
            allPids.add(item.productId);
          }
        }
      }
    }

    if (allPids.size === 0) return;

    const products = await this.findProductsByPids(Array.from(allPids));
    const productMap = new Map<string, any>();
    for (const p of products) {
      if (!p) continue;
      const pid = String(p.pid || p.id || p._id || '');
      if (pid) productMap.set(pid, p);
    }

    for (const order of orders) {
      const items = order?.items || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const product = productMap.get(String(item.productId));
          if (!product) continue;

          const color = item.variant?.color || product.colors?.[0] || '';
          const size = item.variant?.size || product.sizes?.[0] || '';

          item.image = item.image || product.images?.[0] || null;
          item.productName =
            item.productName || product.title || product.productName || product.name || '';
          item.price = item.price || product.discountPrice || product.price || 0;
          item.sku = item.sku || product.sku || '';
          item.color = item.color || color;
          item.size = item.size || size;
        }
      }
    }
  }

  /**
   * Fetch all products available for inverted index building.
   */
  async getAllProductsForIndexing(): Promise<any[]> {
    const rawWarehouse =
      (await this.redisService.getJson<any[]>('warehouse:all')) ??
      (await this.redisService.getJson<any[]>('products:all')) ??
      [];

    const warehouseProducts: any[] = Array.isArray(rawWarehouse)
      ? rawWarehouse
      : ((rawWarehouse as any)?.products ?? []);

    if (warehouseProducts.length > 0) {
      return warehouseProducts;
    }

    // Fallback to MongoDB
    if (this.productModel) {
      try {
        return await this.productModel.find().lean().exec();
      } catch (err: any) {
        this.logger.warn(
          `[SearchRepository] Mongo getAllProducts failed: ${err?.message ?? err}`,
        );
      }
    }

    return [];
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SearchRepository {
  private readonly logger = new Logger(SearchRepository.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Fetch products by PIDs.
   * Checks Redis warehouse first for maximum speed (0ms DB latency).
   * Falls back to MongoDB for missing products.
   */
  async findProductsByPids(pids: string[]): Promise<any[]> {
    if (!pids || pids.length === 0) return [];

    const pidSet = new Set(pids);

    // 1. Check Redis warehouse pool
    const rawWarehouse =
      (await this.redisService.getJson<any[]>('warehouse:all')) ??
      (await this.redisService.getJson<any[]>('products:all')) ??
      [];

    const warehouseProducts: any[] = Array.isArray(rawWarehouse)
      ? rawWarehouse
      : (rawWarehouse as any)?.products ?? [];

    const foundFromWarehouse: any[] = [];
    const missingPids = new Set(pidSet);

    for (const p of warehouseProducts) {
      const pid = String(p.pid || p.id || p._id || '');
      if (pid && pidSet.has(pid)) {
        foundFromWarehouse.push(p);
        missingPids.delete(pid);
      }
    }

    // 2. Fallback to MongoDB for any missing products
    let mongoProducts: any[] = [];
    if (missingPids.size > 0 && this.productModel) {
      try {
        mongoProducts = await this.productModel
          .find({ pid: { $in: Array.from(missingPids) } })
          .lean()
          .exec();
      } catch (err: any) {
        this.logger.warn(`[SearchRepository] Mongo fallback query failed: ${err?.message ?? err}`);
      }
    }

    const resultMap = new Map<string, any>();
    for (const p of foundFromWarehouse) {
      const pid = String(p.pid || p.id || p._id || '');
      if (pid) resultMap.set(pid, p);
    }
    for (const p of mongoProducts) {
      const pid = String(p.pid || p.id || p._id || '');
      if (pid && !resultMap.has(pid)) resultMap.set(pid, p);
    }

    // Return products in the requested PID order
    return pids.map((id) => resultMap.get(id)).filter(Boolean);
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
      : (rawWarehouse as any)?.products ?? [];

    if (warehouseProducts.length > 0) {
      return warehouseProducts;
    }

    // Fallback to MongoDB
    if (this.productModel) {
      try {
        return await this.productModel.find().lean().exec();
      } catch (err: any) {
        this.logger.warn(`[SearchRepository] Mongo getAllProducts failed: ${err?.message ?? err}`);
      }
    }

    return [];
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { tokenizeText, generatePrefixes } from './utils/tokenizer';
import { IndexStats } from './interfaces/search-result.interface';

@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  // Key prefixes in Redis
  public static readonly KEY_TOKEN_PREFIX = 'search:index:';
  public static readonly KEY_PREFIX_MAP = 'search:prefix:';
  public static readonly KEY_PRODUCT_TOKENS = 'search:product_tokens:';
  public static readonly KEY_META_STATS = 'search:meta:stats';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Extract all searchable tokens for a given product across all specified fields:
   * - Product Name / Title
   * - Brand
   * - Category
   * - Subcategory
   * - Tags
   * - Description
   * - Keywords / SKU
   */
  public extractProductTokens(product: any): { tokens: string[]; prefixes: string[] } {
    const fieldsToTokenize = [
      product.name,
      product.title,
      product.productName,
      product.brand,
      product.productBrand,
      product.collectionType,
      product.categoryName,
      product._category,
      product.subcategoryName,
      product.description,
      product.sku,
      Array.isArray(product.tags) ? product.tags.join(' ') : product.tags,
      Array.isArray(product.keywords) ? product.keywords.join(' ') : product.keywords,
    ];

    const tokenSet = new Set<string>();

    for (const field of fieldsToTokenize) {
      if (typeof field === 'string' && field.trim()) {
        const extracted = tokenizeText(field);
        for (const t of extracted) {
          tokenSet.add(t);
        }
      }
    }

    const tokens = Array.from(tokenSet);
    const prefixSet = new Set<string>();

    for (const token of tokens) {
      const generated = generatePrefixes(token);
      for (const p of generated) {
        prefixSet.add(p);
      }
    }

    return {
      tokens,
      prefixes: Array.from(prefixSet),
    };
  }

  /**
   * Rebuild or build full inverted index for all provided products.
   */
  async buildFullIndex(products: any[]): Promise<IndexStats> {
    const startTime = Date.now();
    this.logger.log(`[SearchIndex] Starting full index build for ${products.length} products...`);

    const tokenMap = new Map<string, Set<string>>();
    const prefixMap = new Map<string, Set<string>>();
    const productTokenMap = new Map<string, string[]>();

    for (const product of products) {
      const pid = String(product.pid || product.id || product._id || '');
      if (!pid) continue;

      const { tokens, prefixes } = this.extractProductTokens(product);
      productTokenMap.set(pid, tokens);

      for (const token of tokens) {
        if (!tokenMap.has(token)) {
          tokenMap.set(token, new Set());
        }
        tokenMap.get(token)!.add(pid);
      }

      for (const prefix of prefixes) {
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, new Set());
        }
        prefixMap.get(prefix)!.add(pid);
      }
    }

    const operations: { key: string; value: any }[] = [];

    // Exact token index entries
    for (const [token, pidSet] of tokenMap.entries()) {
      operations.push({
        key: `${SearchIndexService.KEY_TOKEN_PREFIX}${token}`,
        value: Array.from(pidSet),
      });
    }

    // Prefix index entries
    for (const [prefix, pidSet] of prefixMap.entries()) {
      operations.push({
        key: `${SearchIndexService.KEY_PREFIX_MAP}${prefix}`,
        value: Array.from(pidSet),
      });
    }

    // Per-product token lists for fast incremental cleanup
    for (const [pid, tokens] of productTokenMap.entries()) {
      operations.push({
        key: `${SearchIndexService.KEY_PRODUCT_TOKENS}${pid}`,
        value: tokens,
      });
    }

    // Perform chunked batch write to Redis
    await this.batchWrite(operations);

    const buildTimeMs = Date.now() - startTime;
    const stats: IndexStats = {
      indexedProductsCount: productTokenMap.size,
      uniqueTokensCount: tokenMap.size,
      buildTimeMs,
      lastUpdated: new Date().toISOString(),
    };

    await this.redisService.setJson(SearchIndexService.KEY_META_STATS, stats, 86400 * 30);

    this.logger.log(
      `[SearchIndex] Full index build complete in ${buildTimeMs}ms. Indexed ${stats.indexedProductsCount} products, ${stats.uniqueTokensCount} unique tokens.`,
    );

    return stats;
  }

  /**
   * Index or update a single product in the inverted index.
   */
  async indexProduct(product: any): Promise<void> {
    const pid = String(product.pid || product.id || product._id || '');
    if (!pid) return;

    await this.removeProduct(pid);

    const { tokens, prefixes } = this.extractProductTokens(product);

    await this.redisService.setJson(
      `${SearchIndexService.KEY_PRODUCT_TOKENS}${pid}`,
      tokens,
    );

    for (const token of tokens) {
      const key = `${SearchIndexService.KEY_TOKEN_PREFIX}${token}`;
      const existing = (await this.redisService.getJson<string[]>(key)) || [];
      if (!existing.includes(pid)) {
        existing.push(pid);
        await this.redisService.setJson(key, existing);
      }
    }

    for (const prefix of prefixes) {
      const key = `${SearchIndexService.KEY_PREFIX_MAP}${prefix}`;
      const existing = (await this.redisService.getJson<string[]>(key)) || [];
      if (!existing.includes(pid)) {
        existing.push(pid);
        await this.redisService.setJson(key, existing);
      }
    }
  }

  /**
   * Remove a product from the inverted index when deleted.
   */
  async removeProduct(pid: string): Promise<void> {
    if (!pid) return;

    const tokensKey = `${SearchIndexService.KEY_PRODUCT_TOKENS}${pid}`;
    const tokens = (await this.redisService.getJson<string[]>(tokensKey)) || [];

    if (tokens.length > 0) {
      for (const token of tokens) {
        const key = `${SearchIndexService.KEY_TOKEN_PREFIX}${token}`;
        const existing = (await this.redisService.getJson<string[]>(key)) || [];
        const filtered = existing.filter((id) => id !== pid);

        if (filtered.length > 0) {
          await this.redisService.setJson(key, filtered);
        } else {
          await this.redisService.del(key);
        }

        const prefixes = generatePrefixes(token);
        for (const prefix of prefixes) {
          const prefKey = `${SearchIndexService.KEY_PREFIX_MAP}${prefix}`;
          const prefExisting = (await this.redisService.getJson<string[]>(prefKey)) || [];
          const prefFiltered = prefExisting.filter((id) => id !== pid);

          if (prefFiltered.length > 0) {
            await this.redisService.setJson(prefKey, prefFiltered);
          } else {
            await this.redisService.del(prefKey);
          }
        }
      }

      await this.redisService.del(tokensKey);
    }
  }

  /**
   * Retrieve PIDs for an exact token from Redis.
   */
  async getTokenPids(token: string): Promise<string[]> {
    const key = `${SearchIndexService.KEY_TOKEN_PREFIX}${token.toLowerCase()}`;
    return (await this.redisService.getJson<string[]>(key)) || [];
  }

  /**
   * Retrieve PIDs for a prefix from Redis.
   */
  async getPrefixPids(prefix: string): Promise<string[]> {
    const key = `${SearchIndexService.KEY_PREFIX_MAP}${prefix.toLowerCase()}`;
    return (await this.redisService.getJson<string[]>(key)) || [];
  }

  /**
   * Get metadata stats of the inverted index.
   */
  async getStats(): Promise<IndexStats | null> {
    return await this.redisService.getJson<IndexStats>(SearchIndexService.KEY_META_STATS);
  }

  private async batchWrite(operations: { key: string; value: any }[]) {
    const CHUNK_SIZE = 150;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((op) => this.redisService.setJson(op.key, op.value)),
      );
    }
  }
}

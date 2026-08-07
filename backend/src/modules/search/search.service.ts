import { Injectable, Logger } from '@nestjs/common';
import { SearchIndexService } from './search-index.service';
import { SearchRepository } from './search.repository';
import { cleanQueryString, tokenizeText } from './utils/tokenizer';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from './interfaces/search-result.interface';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly searchIndexService: SearchIndexService,
    private readonly searchRepository: SearchRepository,
  ) { }

  /**
   * High-performance inverted index search engine.
   * Target execution latency: < 50ms for 15k+ products.
   */
  async search(queryDto: SearchQueryDto): Promise<SearchResult> {
    const startTime = Date.now();
    const rawQuery = (
      queryDto.q ||
      queryDto.keyword ||
      queryDto.search ||
      ''
    ).trim();

    const cleanQuery = cleanQueryString(rawQuery);
    const pageNum = Math.max(1, Number(queryDto.pageNum || queryDto.page || 1));
    const pageSize = Math.min(
      Math.max(1, Number(queryDto.pageSize || queryDto.limit || 12)),
      50,
    );

    if (!cleanQuery) {
      return {
        success: true,
        query: '',
        total: 0,
        page: pageNum,
        limit: pageSize,
        source: 'inverted_index:empty_query',
        products: [],
        searchTimeMs: Date.now() - startTime,
      };
    }

    const queryTokens = tokenizeText(cleanQuery);
    if (queryTokens.length === 0) {
      return {
        success: true,
        query: cleanQuery,
        total: 0,
        page: pageNum,
        limit: pageSize,
        source: 'inverted_index:no_tokens',
        products: [],
        searchTimeMs: Date.now() - startTime,
      };
    }

    try {
      // 1. Fetch PID sets for each query token (exact + prefix lookup)
      const pidFrequencyMap = new Map<string, number>();
      const tokenPidSets: Set<string>[] = [];

      for (const token of queryTokens) {
        const [exactPids, prefixPids] = await Promise.all([
          this.searchIndexService.getTokenPids(token),
          this.searchIndexService.getPrefixPids(token),
        ]);

        const combinedSet = new Set<string>([...exactPids, ...prefixPids]);
        tokenPidSets.push(combinedSet);

        for (const pid of combinedSet) {
          pidFrequencyMap.set(pid, (pidFrequencyMap.get(pid) || 0) + 1);
        }
      }

      // If no PIDs found in inverted index, return 0 products
      if (pidFrequencyMap.size === 0) {
        return {
          success: true,
          query: cleanQuery,
          total: 0,
          page: pageNum,
          limit: pageSize,
          source: 'inverted_index:miss',
          products: [],
          searchTimeMs: Date.now() - startTime,
        };
      }

      // 2. Multi-word search priority:
      // Products matching MORE query tokens rank higher.
      // If query has multiple tokens, prioritize intersection (matching all tokens first)
      const candidatePids = Array.from(pidFrequencyMap.keys()).sort((a, b) => {
        const countA = pidFrequencyMap.get(a) || 0;
        const countB = pidFrequencyMap.get(b) || 0;
        return countB - countA;
      });

      // Limit candidates for hydration to max 200 items for sub-50ms performance
      const topCandidates = candidatePids.slice(0, 200);

      // 3. Hydrate candidate products by PID
      const candidateProducts = await this.searchRepository.findProductsByPids(topCandidates);

      // 4. Fine-grained ranking & scoring
      const scoredProducts: { product: any; score: number }[] = [];

      for (const p of candidateProducts) {
        if (!p) continue;

        // Apply price filter if provided
        const price = Number(p.discountPrice || p.price || 0);
        if (queryDto.minPrice && price < Number(queryDto.minPrice)) continue;
        if (queryDto.maxPrice && price > Number(queryDto.maxPrice)) continue;

        const score = this.calculateRelevanceScore(p, cleanQuery, queryTokens, pidFrequencyMap.get(String(p.pid || p.id || p._id)) || 1);
        if (score > 0) {
          scoredProducts.push({ product: p, score });
        }
      }

      // 5. Sort results by relevance score or price/rating
      const sortMode = (queryDto.sort || 'relevance').toLowerCase();
      scoredProducts.sort((a, b) => {
        if (sortMode === 'price-asc' || sortMode === 'price-low-to-high') {
          return (a.product.price || 0) - (b.product.price || 0);
        }
        if (sortMode === 'price-desc' || sortMode === 'price-high-to-low') {
          return (b.product.price || 0) - (a.product.price || 0);
        }
        if (sortMode === 'rating') {
          return (b.product.averageRating || 0) - (a.product.averageRating || 0);
        }
        return b.score - a.score;
      });

      const total = scoredProducts.length;
      const start = (pageNum - 1) * pageSize;
      const paginatedProducts = scoredProducts
        .slice(start, start + pageSize)
        .map((item) => item.product);

      const searchTimeMs = Date.now() - startTime;
      this.logger.log(
        `[SearchService] Inverted index query "${cleanQuery}" returned ${total} matches in ${searchTimeMs}ms`,
      );

      return {
        success: true,
        query: cleanQuery,
        total,
        page: pageNum,
        limit: pageSize,
        source: 'inverted_index',
        products: paginatedProducts,
        searchTimeMs,
      };
    } catch (error: any) {
      this.logger.error(
        `[SearchService] Search error for "${cleanQuery}": ${error?.message || error}`,
      );
      // Graceful fallback to empty response instead of breaking
      return {
        success: true,
        query: cleanQuery,
        total: 0,
        page: pageNum,
        limit: pageSize,
        source: 'inverted_index:error_fallback',
        products: [],
        searchTimeMs: Date.now() - startTime,
      };
    }
  }


  private calculateRelevanceScore(
    product: any,
    queryStr: string,
    queryTokens: string[],
    matchedTokenCount: number,
  ): number {
    const title = String(
      product.name || product.title || product.productName || '',
    ).trim().toLowerCase();
    const brand = String(product.brand || product.productBrand || '').trim().toLowerCase();
    const category = String(
      product.collectionType ||
      product.categoryName ||
      product._category ||
      product.subcategoryName ||
      '',
    ).trim().toLowerCase();
    const tags = (Array.isArray(product.tags) ? product.tags.join(' ') : String(product.tags || '')).toLowerCase();
    const desc = String(product.description || '').trim().toLowerCase();
    const qLower = queryStr.toLowerCase();

    let score = matchedTokenCount * 20; // Multi-token multiplier

    // 1. Title Exact Match
    if (title === qLower) {
      score += 100;
    }
    // 2. Title Starts With Query
    else if (title.startsWith(qLower)) {
      score += 60;
    }
    // 3. Title Contains Query Substring
    else if (title.includes(qLower)) {
      score += 35;
    }

    // 4. Token match in specific fields
    for (const kw of queryTokens) {
      if (title.includes(kw)) score += 10;
      if (brand.includes(kw)) score += 25;
      if (category.includes(kw)) score += 15;
      if (tags.includes(kw) || desc.includes(kw)) score += 5;
    }

    return score;
  }
}

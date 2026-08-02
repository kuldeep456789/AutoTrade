export interface SearchResult {
  success: boolean;
  query: string;
  total: number;
  page: number;
  limit: number;
  source: string;
  products: any[];
  searchTimeMs?: number;
}

export interface IndexStats {
  indexedProductsCount: number;
  uniqueTokensCount: number;
  buildTimeMs: number;
  lastUpdated: string;
}

export const REDIS_CACHE_KEYS = {
  PRODUCTS_ALL: 'products:all',
  PRODUCTS_QUERY: (queryKey: string) => `products:query:${queryKey}`,
  PRODUCT_DETAIL: (id: string) => `products:detail:${id}`,
  CATEGORIES_ALL: 'categories:all',
  CJ_TOKEN: 'cj:auth:token',
  CJ_PRODUCTS: (params: string) => `cj:products:${params}`,
} as const;

export const REDIS_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600 * 6, // 6 hours
  DAILY: 3600 * 24, // 24 hours
  WEEKLY: 3600 * 24 * 7, // 7 days
} as const;

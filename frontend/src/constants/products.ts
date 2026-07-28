/**
 * src/constants/products.ts
 *
 * Single source of truth for product-related constants shared across
 * the frontend. Import from here instead of duplicating in components.
 */

/** CJ Dropshipping product/category IDs to exclude from all listings. */
export const EXCLUDED_IDS = new Set([
  '2607130752441623600',
  '2607130905271619800',
  '2075876029409300482',
  '2046802660565475329',
  '2502151121241601900',
  '2043934021520044033',
  '2043944570651648002',
  '2043945824983830529',
  '2043943887814762497',
  '2043294797236301825',
  '2606121220391623700',
  '2075130484984541185',
  '2607151126551616100',
]);

/** Returns true if this product should be hidden from the UI. */
export const isExcluded = (p: any): boolean =>
  EXCLUDED_IDS.has(String(p?.pid ?? '')) ||
  EXCLUDED_IDS.has(String(p?.categoryId ?? p?.category ?? ''));

/** Filter an array of products, removing any excluded ones. */
export const filterExcluded = (products: any[]): any[] =>
  Array.isArray(products) ? products.filter((p) => !isExcluded(p)) : [];

/**
 * Canonical men's subcategory names (matches what the backend stores in _category).
 * Used for generating navigation tabs and filtering locally.
 */
export const MEN_CATEGORIES = [
  'T-Shirts',
  'Shirts',
  'Jeans',
  'Cargo Pants',
  'Shorts',
  'Hoodies',
  'Sweatshirts',
  'Jackets',
  'Trousers & Pants',
  'Joggers',
  'Co-Ord Sets',
  'Ethnic Wear',
  'Activewear',
] as const;

/**
 * Canonical women's subcategory names (matches what the backend stores in _category).
 * Used for generating navigation tabs and filtering locally.
 */
export const WOMEN_CATEGORIES = [
  'Tops',
  'T-Shirts',
  'Dresses',
  'Jeans',
  'Skirts',
  'Trousers & Pants',
  'Shorts',
  'Hoodies',
  'Sweatshirts',
  'Jackets',
  'Co-Ord Sets',
  'Ethnic Wear',
  'Activewear',
] as const;

export type MenCategory = (typeof MEN_CATEGORIES)[number];
export type WomenCategory = (typeof WOMEN_CATEGORIES)[number];

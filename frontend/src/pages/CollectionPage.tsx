import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetProductsQuery } from '../store/slices/productApiSlice';
import ProductCard, { ProductCardSkeleton } from '../components/product/ProductCard';
import Pagination from '../components/Pagination';

import { CATEGORY_SLUG_MAP } from '../config/categories';

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toSlug = (value: string) => normalizeSlug(value);
const fromSlug = (value: string) => value.replace(/-/g, ' ');

const CollectionPage = () => {
  const { subcategory } = useParams();
  const normalizedSubcategory = subcategory?.toLowerCase() || '';
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [normalizedSubcategory]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scrollCategories = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 280;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  // Resolve slug mapping
  const categoryInfo = normalizedSubcategory ? CATEGORY_SLUG_MAP[normalizedSubcategory] : undefined;
  const targetSubcategoryName = categoryInfo?.subcategoryName;
  const targetCollectionType = categoryInfo?.collectionType;

  // Determine query parameters based on current category selection
  const queryParams = useMemo(() => {
    if (!normalizedSubcategory || normalizedSubcategory === 'all') {
      return { pageNum: 1, pageSize: 500 };
    }
    if (targetSubcategoryName) {
      return { subcategoryName: targetSubcategoryName, pageNum: 1, pageSize: 500 };
    }
    if (targetCollectionType) {
      return { collectionType: targetCollectionType, pageNum: 1, pageSize: 500 };
    }
    // Fallback for custom slug
    return { subcategoryName: fromSlug(normalizedSubcategory), pageNum: 1, pageSize: 500 };
  }, [normalizedSubcategory, targetSubcategoryName, targetCollectionType]);

  const { data: apiResponse, isLoading, error } = useGetProductsQuery(queryParams);

  const rawProducts = Array.isArray(apiResponse?.products) ? apiResponse.products : [];

  // Query full collection pool to derive category navigation tabs for the current section
  const collectionPoolQuery = useMemo(() => {
    if (targetCollectionType) {
      return { collectionType: targetCollectionType, pageNum: 1, pageSize: 500 };
    }
    return { pageNum: 1, pageSize: 500 };
  }, [targetCollectionType]);

  const { data: collectionPoolData } = useGetProductsQuery(
    collectionPoolQuery,
    { skip: !targetCollectionType }
  );

  // Derive unique subcategory tabs
  const derivedTabs = useMemo(() => {
    const pool =
      Array.isArray(collectionPoolData?.products) && collectionPoolData.products.length > 0
        ? collectionPoolData.products
        : rawProducts;

    const catMap = new Map<string, number>();

    for (const p of pool) {
      const cat = String(p.subcategoryName ?? p._category ?? '').trim();
      if (!cat) continue;
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    }

    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [collectionPoolData, rawProducts]);

  // Page title
  const rawTitle = categoryInfo?.title || (normalizedSubcategory ? fromSlug(normalizedSubcategory) : 'All Collections');
  const pageTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  // Products to render: use exact API returned products for targeted subcategories
  const filteredProducts = rawProducts;

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const headerCount = filteredProducts.length;

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))]">
      {/* Compact Senior Developer Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-10 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-3.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Home</Link>
            <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
            <Link to="/collections/exterior-accessories" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Collections</Link>
            {subcategory && (
              <>
                <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
                <span className="text-zinc-900 dark:text-white font-extrabold">{pageTitle}</span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                {isLoading ? 'Loading...' : `${headerCount} Products Available`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Senior Developer Subcategory Pill Navigation */}
      {derivedTabs.length > 0 && (
        <div className="sticky top-[72px] bg-[hsl(var(--background))]/95 backdrop-blur-md z-20 border-b border-zinc-200 dark:border-zinc-800 shadow-sm py-3.5">
          <div className="max-w-[1920px] mx-auto px-6 sm:px-10 relative">
            {canScrollLeft && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll right"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex items-center gap-5 overflow-x-auto hide-scrollbar scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x px-2 lg:px-0"
            >
              {derivedTabs.map((tab) => {
                const tabSlug = toSlug(tab.name);
                const isActive = targetSubcategoryName
                  ? targetSubcategoryName.toLowerCase() === tab.name.toLowerCase()
                  : toSlug(tab.name) === normalizedSubcategory;
                const linkTo = `/collections/${tabSlug}`;
                const rawName = fromSlug(tabSlug);
                const formattedName = rawName
                  .split(' ')
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');

                return (
                  <Link
                    key={tab.name}
                    to={linkTo}
                    className={`group relative shrink-0 flex items-center gap-2 py-3 px-3.5 text-sm sm:text-base font-bold transition-colors duration-200 cursor-pointer ${isActive
                      ? 'text-zinc-900 dark:text-white font-extrabold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                  >
                    <span className="capitalize">{formattedName}</span>
                    <span className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-orange-500 font-extrabold' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}>
                      ({tab.count})
                    </span>
                    {isActive ? (
                      <motion.span
                        layoutId="activeSubTab"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    ) : (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-full h-[2.5px] bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-200" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-[1920px] mx-auto px-6 sm:px-10 py-10">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 m-6">
            <h2 className="text-red-600 font-black text-xl mb-4">ERROR LOADING PRODUCTS</h2>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 sm:py-32 px-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#111111] dark:text-white mb-3">
              Nothing found
            </h3>
            <p className="text-[15px] text-zinc-500 max-w-md mx-auto text-center mb-8 leading-relaxed">
              We couldn't find any products in this collection. Try exploring other categories to find what you're looking for.
            </p>
            <Link
              to="/collections/all"
              className="px-8 py-3.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[15px] font-medium rounded-full hover:bg-black/80 dark:hover:bg-zinc-200 transition-all duration-200"
            >
              Explore All Products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {paginatedProducts.map((product: any, idx: number) => (
                <ProductCard key={`${product.pid || product._id || product.id || product.name}-${idx}`} product={product} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;

import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetProductsQuery } from '../store/slices/productApiSlice';
import ProductCard, { ProductCardSkeleton } from '../components/product/ProductCard';
import Pagination from '../components/Pagination';

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
  const { gender, subcategory } = useParams();
  const normalizedGender = gender?.toLowerCase() || '';
  const normalizedSubcategory = subcategory?.toLowerCase() || '';
  const isAllGender = normalizedGender === 'all' || normalizedGender === '';
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [normalizedGender, normalizedSubcategory]);

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



  const { data: allProductsData, isLoading, error } = useGetProductsQuery({
    ...(isAllGender ? {} : { gender: normalizedGender }),
    pageNum: 1,
    pageSize: 50000, // Fetch active warehouse pool for this gender to derive category tabs & paginate
  });

  const productsPool = Array.isArray(allProductsData?.products) ? allProductsData.products : [];

  /**
   * Derive unique category tabs from the actual product data.
   * This eliminates the need for hardcoded category lists or extra API calls.
   */
  const derivedTabs = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const p of productsPool) {
      const cat = String(p._category ?? p.subcategoryName ?? 'Other').trim();
      if (!cat) continue;
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    }

    // Convert to array and sort by count (most popular first)
    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [productsPool]);

  // Determine active category based on slug
  const activeCategory = normalizedSubcategory
    ? derivedTabs.find(tab => {
      let tabSlug = toSlug(tab.name);
      if (normalizedGender === 'men' && tabSlug === 'jeans') {
        tabSlug = 'men-jeans';
      }
      return tabSlug === toSlug(fromSlug(normalizedSubcategory));
    })
    : undefined;

  // Filter products by active category
  const filteredProducts = activeCategory
    ? productsPool.filter((p: any) => {
      const cat = String(p._category ?? p.subcategoryName ?? '').trim();
      return toSlug(cat) === toSlug(activeCategory.name);
    })
    : productsPool;

  // Client-side pagination
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const pageTitle = activeCategory?.name
    ? activeCategory.name.toUpperCase()
    : subcategory
      ? fromSlug(subcategory).toUpperCase()
      : isAllGender
        ? 'ALL COLLECTIONS'
        : `${gender?.toUpperCase()} COLLECTIONS`;

  const headerCount = activeCategory ? activeCategory.count : productsPool.length;

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] uppercase">
      {/* Compact Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-10">
          <div className="flex items-center gap-2 pt-5 pb-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
            <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">HOME</Link>
            <ChevronRight size={10} strokeWidth={2.5} />
            {gender && (
              <>
                <Link to={`/collections/${gender}`} className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">{gender.toUpperCase()}</Link>
                {subcategory && <ChevronRight size={10} strokeWidth={2.5} />}
              </>
            )}
            {subcategory && (
              <span className="text-zinc-700 dark:text-zinc-300">{pageTitle}</span>
            )}
          </div>
          <div className="flex items-center justify-between pb-5">
            <h1 className="text-[22px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight text-[hsl(var(--foreground))] leading-none">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">
                {isLoading ? '...' : headerCount} ITEMS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Category Navigation */}
      {derivedTabs.length > 0 && (
        <div className="sticky top-[88px] bg-[hsl(var(--background))] z-20 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="max-w-[1920px] mx-auto px-6 sm:px-10 relative">
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
            )}
            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            )}

            {/* Category Tabs */}
            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x py-3 px-8 lg:px-0"
            >
              {derivedTabs.map((tab) => {
                let tabSlug = toSlug(tab.name);
                if (gender?.toLowerCase() === 'men' && tabSlug === 'jeans') {
                  tabSlug = 'men-jeans';
                }
                const isActive = activeCategory?.name === tab.name;
                const linkTo = gender ? `/collections/${gender}/${tabSlug}` : `/collections/${tabSlug}`;

                return (
                  <Link
                    key={tab.name}
                    to={linkTo}
                    className={`group relative shrink-0 py-2 px-2 text-[13px] sm:text-[15px] font-bold tracking-wider transition-all duration-200 cursor-pointer ${isActive
                      ? 'text-[hsl(var(--foreground))]'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-[hsl(var(--foreground))]'
                      }`}
                  >
                    {tab.name.toUpperCase()}
                    <span className={`ml-1 text-[10px] font-semibold ${isActive ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                      ({tab.count})
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-[calc(100%-16px)] h-[3px] rounded-full bg-[hsl(var(--foreground))]"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-0 group-hover:w-[calc(100%-16px)] h-[3px] rounded-full bg-zinc-300 dark:bg-zinc-600 transition-all duration-300" />
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
              {paginatedProducts.map((product: any) => (
                <ProductCard key={product.pid || product._id || product.id || product.name} product={product} />
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

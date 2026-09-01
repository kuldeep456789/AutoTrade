import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Check,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetProductsQuery } from '../store/slices/productApiSlice';
import ProductCard, { ProductCardSkeleton } from '../components/product/ProductCard';
import Pagination from '../components/Pagination';
import { CATEGORY_SLUG_MAP, NAV_CATEGORIES, normalizeSlug } from '../config/categories';
import { useCurrency } from '../context/CurrencyContext';

const toSlug = (value: string) => normalizeSlug(value);
const fromSlug = (value: string) => value.replace(/-/g, ' ');

const CollectionPage = () => {
  const { subcategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleParam = searchParams.get('vehicle') || '';

  const normalizedSubcategory = subcategory?.toLowerCase() || '';
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filters & Sorting state
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<any>(null);

  const { formatCurrency } = useCurrency();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auto_selected_vehicle');
      if (stored) {
        setActiveVehicle(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

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

  const ITEMS_PER_PAGE = 24;
  const queryParams = useMemo(() => {
    if (!normalizedSubcategory || normalizedSubcategory === 'all') {
      return { pageNum: page, pageSize: ITEMS_PER_PAGE };
    }
    if (targetSubcategoryName) {
      return { subcategoryName: targetSubcategoryName, pageNum: page, pageSize: ITEMS_PER_PAGE };
    }
    if (targetCollectionType) {
      return { collectionType: targetCollectionType, pageNum: page, pageSize: ITEMS_PER_PAGE };
    }
    return { subcategoryName: fromSlug(normalizedSubcategory), pageNum: page, pageSize: ITEMS_PER_PAGE };
  }, [normalizedSubcategory, targetSubcategoryName, targetCollectionType, page]);

  const { data: apiResponse, isLoading, error } = useGetProductsQuery(queryParams);
  const rawProducts = Array.isArray(apiResponse?.products) ? apiResponse.products : [];

  // Derive subcategory / category tabs
  const derivedTabs = useMemo(() => {
    if (targetCollectionType) {
      const navCat = NAV_CATEGORIES.find((c) => c.label === targetCollectionType);
      if (navCat && navCat.subs.length > 0) {
        return navCat.subs.map((sub) => ({
          name: sub.label,
          to: sub.to,
          count: rawProducts.filter(
            (p: any) => String(p.subcategoryName || '').toLowerCase() === sub.label.toLowerCase()
          ).length || 0,
        }));
      }
    }

    // Default for /collections/all: display all main categories
    return NAV_CATEGORIES.map((cat) => ({
      name: cat.label,
      to: cat.to,
      count: 0,
    }));
  }, [targetCollectionType, rawProducts]);

  // Page title
  const rawTitle = categoryInfo?.title || (normalizedSubcategory ? fromSlug(normalizedSubcategory) : 'All Collections');
  const pageTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  // Client-side filtering & sorting
  const processedProducts = useMemo(() => {
    let list = rawProducts.filter((p: any) => {
      const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
      return price && Number(price) > 1;
    });

    if (priceFilter !== null) {
      list = list.filter((p: any) => {
        const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
        return Number(price) <= priceFilter;
      });
    }

    if (onlyInStock) {
      list = list.filter((p: any) => p.countInStock === undefined || Number(p.countInStock) > 0);
    }

    list.sort((a: any, b: any) => {
      const aPrice = Number(a.discountPrice || a.price || 0);
      const bPrice = Number(b.discountPrice || b.price || 0);
      if (sortBy === 'price-asc') return aPrice - bPrice;
      if (sortBy === 'price-desc') return bPrice - aPrice;
      if (sortBy === 'rating') return (b.rating || 4.5) - (a.rating || 4.5);
      return 0;
    });

    return list;
  }, [rawProducts, priceFilter, onlyInStock, sortBy]);

  const serverTotal = apiResponse?.total ?? processedProducts.length;
  const totalPages = Math.max(1, Math.ceil(serverTotal / ITEMS_PER_PAGE));

  const clearAllFilters = () => {
    setPriceFilter(null);
    setOnlyInStock(false);
    setSortBy('featured');
  };

  const hasActiveFilters = priceFilter !== null || onlyInStock || sortBy !== 'featured';

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] font-sans">
      {/* ── Top Breadcrumb & Title Bar ── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Link to="/" className="hover:text-[#FF7A00] transition-colors">Home</Link>
              <ChevronRight size={12} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
              <Link to="/collections/all" className="hover:text-[#FF7A00] transition-colors">Collections</Link>
              {subcategory && (
                <>
                  <ChevronRight size={12} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
                  <span className="text-zinc-900 dark:text-white font-extrabold">{pageTitle}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {activeVehicle && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <ShieldCheck size={13} />
                  <span>Showing fits for {activeVehicle.brand} {activeVehicle.model}</span>
                </div>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {isLoading ? '...' : `${serverTotal.toLocaleString()} Products`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Subcategory Tab Pill Navigation ── */}
      {derivedTabs.length > 0 && (
        <div className="sticky top-[80px] bg-[hsl(var(--background))]/95 backdrop-blur-md z-20 border-b border-zinc-200 dark:border-zinc-800 shadow-2xs py-2.5">
          <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white cursor-pointer hidden lg:flex"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex items-center gap-2 overflow-x-auto hide-scrollbar scrollbar-hide [scrollbar-width:none] touch-pan-x px-1"
            >
              {derivedTabs.map((tab) => {
                const tabSlug = toSlug(tab.name);
                const isActive = targetSubcategoryName
                  ? targetSubcategoryName.toLowerCase() === tab.name.toLowerCase()
                  : targetCollectionType
                  ? targetCollectionType.toLowerCase() === tab.name.toLowerCase()
                  : toSlug(tab.name) === normalizedSubcategory;
                const linkTo = tab.to || `/collections/${tabSlug}`;

                return (
                  <Link
                    key={tab.name}
                    to={linkTo}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-850 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{tab.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout: Sidebar Filters (Desktop) + Product Grid ── */}
      <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 py-6 sm:py-8">
        {/* Mobile Control Bar */}
        <div className="lg:hidden flex items-center justify-between gap-3 mb-6 p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
          >
            <Filter size={14} className="text-[#FF7A00]" />
            <span>Filter</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />}
          </button>

          <div className="flex-1 relative">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full h-10 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Desktop Sidebar Filter (3 Cols) ── */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-[140px] space-y-5 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#FF7A00]" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Filters
                </h2>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-orange-500 hover:underline font-bold cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold px-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-[#FF7A00] cursor-pointer"
              >
                <option value="featured">Featured / Best Match</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>

            {/* Price Filter Pills */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Maximum Price
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[999, 1999, 4999, 9999].map((maxP) => {
                  const isSelected = priceFilter === maxP;
                  return (
                    <button
                      key={maxP}
                      type="button"
                      onClick={() => setPriceFilter(isSelected ? null : maxP)}
                      className={`h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF7A00] border-[#FF7A00] text-white'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                      }`}
                    >
                      Under {formatCurrency(maxP)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In Stock Toggle */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  In Stock Only
                </span>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer accent-[#FF7A00]"
                />
              </label>
            </div>

            {/* Categories Quick List */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Top Categories
              </label>
              <ul className="space-y-1 text-xs">
                {NAV_CATEGORIES.map((cat) => (
                  <li key={cat.to}>
                    <Link
                      to={cat.to}
                      className="flex items-center justify-between py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-[#FF7A00] transition-colors font-medium"
                    >
                      <span>{cat.label}</span>
                      <ChevronRight size={12} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Products Grid (9 Cols on Desktop, 12 on Mobile) ── */}
          <div className="lg:col-span-9">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5">
                {[...Array(12)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 p-6 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900">
                <h3 className="text-red-600 font-bold text-lg mb-2">Failed to load catalog products</h3>
                <p className="text-xs text-zinc-500">Please refresh or check back in a few moments.</p>
              </div>
            ) : processedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No matching products</h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-6">
                  We couldn't find items with your selected filters. Try resetting the filters to view full inventory.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-6 h-10 rounded-xl bg-zinc-900 hover:bg-[#FF7A00] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5">
                  {processedProducts.map((product: any, idx: number) => (
                    <ProductCard
                      key={`${product.pid || product._id || product.id || product.name}-${idx}`}
                      product={product}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(p) => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Bottom Sheet / Modal ── */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-h-[85vh] bg-white dark:bg-zinc-900 rounded-t-3xl p-6 overflow-y-auto border-t border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-base font-extrabold uppercase tracking-wider">Filter Products</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Price Limit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[999, 1999, 4999, 9999].map((maxP) => (
                    <button
                      key={maxP}
                      type="button"
                      onClick={() => setPriceFilter(priceFilter === maxP ? null : maxP)}
                      className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        priceFilter === maxP
                          ? 'bg-[#FF7A00] border-[#FF7A00] text-white'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Under {formatCurrency(maxP)}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl cursor-pointer">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">In Stock Only</span>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#FF7A00]"
                />
              </label>

              {/* Apply / Close Button */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold uppercase tracking-wider"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="h-12 rounded-xl bg-[#FF7A00] text-white text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollectionPage;

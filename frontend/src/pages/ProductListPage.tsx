import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, Filter, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetProductsQuery } from '../store/slices/productApiSlice';
import { useGetCategoriesQuery } from '../store/slices/categoryApiSlice';
import ProductCard, { ProductCardSkeleton } from '../components/product/ProductCard';
import Pagination from '../components/Pagination';
import { useCurrency } from '../context/CurrencyContext';

const ITEMS_PER_PAGE = 24;

const ProductListPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const [page, setPage] = useState(1);
  const isNewArrivals = location.pathname.includes('/new-arrivals');
  const isTrending = location.pathname.includes('/trending');
  const [sortBy, setSortBy] = useState(isNewArrivals ? 'newest' : 'featured');
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { formatCurrency } = useCurrency();

  useEffect(() => {
    setPage(1);
  }, [location.pathname, keyword]);

  const { data: categoriesData } = useGetCategoriesQuery(undefined);
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const activeCategoryId = categoryParam
    ? categories.find((c: any) => c.name === categoryParam)?._id
    : undefined;

  const { data: productsData, isLoading, error } = useGetProductsQuery({
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
    ...(keyword ? { q: keyword } : {}),
    ...(isNewArrivals ? { sort: 'newest' } : {}),
    pageNum: page,
    pageSize: ITEMS_PER_PAGE,
  });

  const allProducts = productsData?.products || [];
  const serverTotal = productsData?.total ?? allProducts.length;

  const processedProducts = useMemo(() => {
    let list = allProducts.filter((p: any) => {
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
  }, [allProducts, priceFilter, onlyInStock, sortBy]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / ITEMS_PER_PAGE));

  const pageTitle = isNewArrivals
    ? 'New Arrivals'
    : isTrending
    ? 'Trending Products'
    : keyword
    ? `Search: "${keyword}"`
    : 'All Accessories';

  const clearAllFilters = () => {
    setPriceFilter(null);
    setOnlyInStock(false);
    setSortBy('featured');
  };

  const hasActiveFilters = priceFilter !== null || onlyInStock || sortBy !== 'featured';

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] font-sans">
      {/* ── Breadcrumb & Header ── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Link to="/" className="hover:text-[#FF7A00] transition-colors">Home</Link>
              <ChevronRight size={12} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
              <span className="text-zinc-900 dark:text-white font-extrabold">{pageTitle}</span>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {isLoading ? '...' : `${serverTotal.toLocaleString()} Products Found`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
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
              onChange={(e) => setSortBy(e.target.value)}
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
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-[130px] space-y-5 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
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

            {/* Sort */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Sort Options
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold px-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-[#FF7A00] cursor-pointer"
              >
                <option value="featured">Featured / Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Max Price
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[999, 1999, 4999, 9999].map((maxP) => (
                  <button
                    key={maxP}
                    type="button"
                    onClick={() => setPriceFilter(priceFilter === maxP ? null : maxP)}
                    className={`h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  In Stock Only
                </span>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#FF7A00]"
                />
              </label>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5">
                {[...Array(12)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 p-6 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900">
                <h3 className="text-red-600 font-bold text-lg mb-2">Error loading products</h3>
                <p className="text-xs text-zinc-500">Please try again later.</p>
              </div>
            ) : processedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  No products found {keyword && `for "${keyword}"`}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
                  Try checking your spelling or explore our popular automotive categories.
                </p>
                <Link
                  to="/collections/all"
                  className="px-6 h-11 rounded-xl bg-zinc-900 hover:bg-[#FF7A00] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center"
                >
                  Explore All Collections
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5">
                  {processedProducts.map((product: any, index: number) => (
                    <ProductCard
                      key={product.pid || product._id || product.id || index}
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

      {/* Mobile Filter Sheet */}
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
                <h3 className="text-base font-extrabold uppercase tracking-wider">Filter Results</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

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

              <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl cursor-pointer">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">In Stock Only</span>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#FF7A00]"
                />
              </label>

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

export default ProductListPage;

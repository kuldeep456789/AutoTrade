import { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useGetProductsQuery } from '../store/slices/productApiSlice';
import { useGetCategoriesQuery } from '../store/slices/categoryApiSlice';
import ProductCard from '../components/product/ProductCard';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

const getCollectionFromPath = (pathname: string) =>
  pathname.includes('/men') ? 'Men' as const
    : pathname.includes('/women') ? 'Women' as const
      : pathname.includes('/new-arrivals') ? undefined
      : undefined;

const getActiveTabFromPath = (pathname: string) =>
  pathname.includes('/new-arrivals') ? 'ALL'
    : pathname.includes('/men') ? 'MEN'
    : pathname.includes('/women') ? 'WOMEN'
      : 'ALL';

const ProductListPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const [page, setPage] = useState(1);
  const collectionType = getCollectionFromPath(location.pathname);
  const isNewArrivals = location.pathname.includes('/new-arrivals');
  const [sortBy] = useState(isNewArrivals ? 'Newest' : 'Popularity');
  const [activeTab, setActiveTab] = useState(() => getActiveTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getActiveTabFromPath(location.pathname));
    setPage(1);
  }, [location.pathname]);

  const { data: categoriesData } = useGetCategoriesQuery(undefined);
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const visibleCatalogCategories = categories;

  const activeCategoryId =
    categoryParam ? visibleCatalogCategories.find((c: any) => c.name === categoryParam)?._id : undefined;

  const { data: productsData, isLoading, error } = useGetProductsQuery(
    {
      ...(activeCategoryId ? { categoryId: activeCategoryId } : {}),
      ...(keyword ? { q: keyword } : {}),
      ...(collectionType ? { collectionType } : {}),
      ...(isNewArrivals ? { sort: 'newest' } : {}),
      pageNum: 1,
      pageSize: 100,
    }
  );

  let filteredProducts = productsData?.products || [];

  // Tab filtering
  if (!keyword && activeTab === 'MEN') {
    filteredProducts = filteredProducts.filter((p: any) => p.collectionType === 'Men');
  } else if (!keyword && activeTab === 'WOMEN') {
    filteredProducts = filteredProducts.filter((p: any) => p.collectionType === 'Women');
  }

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    const aPrice = a.discountPrice || a.price;
    const bPrice = b.discountPrice || b.price;
    if (sortBy === 'Newest') return 0;
    if (sortBy === 'Popularity') return b.numReviews - a.numReviews;
    if (sortBy === 'Price: Low to High') return aPrice - bPrice;
    if (sortBy === 'Price: High to Low') return bPrice - aPrice;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = sortedProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const pageTitle = isNewArrivals
    ? 'NEW ARRIVALS'
    : keyword
    ? `Search: "${keyword}"`
    : collectionType
    ? `${collectionType} Collections`
    : 'Our Shop';


  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] uppercase">
      {/* Breadcrumbs */}
      <div className="w-full border-b-2 border-black dark:border-white px-6 sm:px-10 py-4 flex justify-between items-center text-xs font-bold tracking-widest text-zinc-500">
        <div className="flex gap-2 items-center">
          <Link to="/" className="hover:text-[hsl(var(--foreground))] transition-colors">HOME</Link>
          <ChevronRight size={10} strokeWidth={3} />
          <span className="text-[hsl(var(--foreground))]">{pageTitle}</span>
        </div>
        <span className="text-[hsl(var(--foreground))] font-black tracking-widest">
          FOUND {isLoading ? '...' : sortedProducts.length} ITEMS
        </span>
      </div>

      {/* Page header */}
      {(!isLoading && sortedProducts.length === 0) || keyword ? null : (
        <div className="w-full border-b-2 border-black dark:border-white">
          <div className="max-w-[1920px] mx-auto px-6 sm:px-10 py-10 sm:py-14">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-[hsl(var(--foreground))] leading-none">
              {pageTitle}
            </h1>
          </div>
        </div>
      )}


      <div className="max-w-[1920px] mx-auto">
        {/* Loading */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 border-2 border-black dark:border-white m-6">
            <span className="text-lg font-black uppercase tracking-widest text-red-600">ERROR LOADING PRODUCTS</span>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="relative w-full py-32 sm:py-48 px-6 flex flex-col items-center justify-center overflow-hidden">
            {/* Premium Decorative Background */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[500px] h-[500px] bg-zinc-200/50 dark:bg-zinc-800/20 rounded-full blur-[120px] opacity-60" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto backdrop-blur-sm bg-white/30 dark:bg-zinc-950/30 p-10 sm:p-16 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] dark:shadow-2xl">
              <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 mb-8">
                <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 rounded-full animate-pulse opacity-50" />
                <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
                  <Search className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                </div>
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight uppercase text-[#111111] dark:text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
                NO RESULTS FOUND
              </h3>
              
              <p className="text-[15px] sm:text-[16px] text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-medium mb-10">
                We couldn't find any products matching {keyword ? <><span className="font-bold text-[#111111] dark:text-white">"{keyword}"</span>.</> : 'your filters.'} Please try a different search term or explore our full collection.
              </p>
              
              <Link 
                to="/collections/all" 
                className="group relative inline-flex items-center justify-center gap-2 px-10 h-14 bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[14px] font-bold tracking-widest uppercase rounded-full hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_10px_40px_rgba(255,255,255,0.2)] transition-all duration-300"
              >
                <span>EXPLORE ALL</span>
                <div className="w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <Search size={12} strokeWidth={3} />
                </div>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* BORDER-COLLAPSE GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {paginatedProducts.map((product: any, index: number) => (
                <ProductCard
                  key={product.pid || product._id || product.id || `${product.title || product.name || 'product'}-${index}`}
                  product={product}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;

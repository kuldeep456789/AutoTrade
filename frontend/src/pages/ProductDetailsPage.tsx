import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetProductDetailsQuery,
  useCreateReviewMutation,
  useGetRelatedProductsQuery,
} from '../store/slices/productApiSlice';
import { addToCart } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import type { RootState } from '../store/store';
import {
  ShoppingBag,
  Heart,
  Star,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  X,
  ZoomIn,
  ShieldCheck,
  Award,
  Truck,
  RotateCcw,
  Sparkles,
  ClipboardList,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProductCard from '../components/product/ProductCard';
import { getProductId } from '../lib/product';
import { useCurrency } from '../context/CurrencyContext';
import { useDiscount } from '../context/DiscountContext';
import DiscountBadge from '../components/common/DiscountBadge';
import { normalizeSlug } from '../config/categories';
import TrustBadgesBar from '../components/layout/TrustBadgesBar';
import QuantitySelector from '../components/QuantitySelector';

const MOCK_REVIEWS = [
  { user: 'Vikram Singh', rating: 5, comment: 'Exceptional build quality and precision fitment for my Nexon. Arrived in 2 days!', date: '3 days ago' },
  { user: 'Amit Patel', rating: 5, comment: 'High-grade automotive accessory. Clear instructions and solid feel. Highly recommended.', date: '1 week ago' },
  { user: 'Rohan Sharma', rating: 4, comment: 'Very good product, matches OEM specifications nicely.', date: '2 weeks ago' },
];

const ProductFeaturesAndSpecs = ({ product }: { product: any }) => {
  const [descOpen, setDescOpen] = useState(true);
  const productName = String(product?.name || product?.title || 'AutoTrade Accessory').trim();
  const brandName = String(product?.brand || 'AutoTrade Pro Series').trim();
  const categoryName = String(product?.collectionType || product?.subcategoryName || 'Automotive Parts').trim();

  return (
    <div className="w-full mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white space-y-6">
      {/* Description Header */}
      <button
        type="button"
        onClick={() => setDescOpen(!descOpen)}
        className="w-full py-3 flex items-center justify-between bg-transparent hover:opacity-80 transition-opacity cursor-pointer border-b border-zinc-200 dark:border-zinc-800 group"
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-[#FF7A00]" />
          <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
            Product Specifications & Overview
          </span>
        </div>
        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
          {descOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {descOpen && (
        <div className="space-y-6 text-left">
          {/* Overview */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-extrabold text-[#FF7A00] tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
              Overview
            </h4>
            <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal normal-case">
              The <strong className="text-zinc-900 dark:text-white font-bold">{productName}</strong> is engineered to meet strict automotive industry standards, providing superior durability, aesthetics, and functional performance.
            </p>
            {product?.description && (
              <div
                className="product-description text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed normal-case mt-3 border-l-2 border-orange-500/50 pl-3 py-1"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </div>

          {/* Key Features */}
          <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs sm:text-sm font-extrabold text-[#FF7A00] tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
              Key Features & Benefits
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal normal-case">
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-[#FF7A00] mt-0.5 shrink-0" strokeWidth={3} />
                <span><strong className="text-zinc-900 dark:text-white">Durable Construction:</strong> Built using heavy-duty automotive materials resistant to wear and harsh weather.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-[#FF7A00] mt-0.5 shrink-0" strokeWidth={3} />
                <span><strong className="text-zinc-900 dark:text-white">Precision Compatibility:</strong> Designed specifically for seamless vehicle integration.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-[#FF7A00] mt-0.5 shrink-0" strokeWidth={3} />
                <span><strong className="text-zinc-900 dark:text-white">Plug & Play Setup:</strong> Quick, non-invasive installation with standard mounting points.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-[#FF7A00] mt-0.5 shrink-0" strokeWidth={3} />
                <span><strong className="text-zinc-900 dark:text-white">Quality Verified:</strong> 100% factory inspected for finish, alignment, and reliability.</span>
              </li>
            </ul>
          </div>

          {/* 2-Column Specifications Table (Requirement 9) */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs sm:text-sm font-extrabold text-[#FF7A00] tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
              Specifications Table
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300 font-normal">
                <thead className="bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-white font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 w-1/3 min-w-[120px]">Property</th>
                    <th className="py-3 px-4 w-2/3">Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-white">Brand</td>
                    <td className="py-2.5 px-4">{brandName}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-white">Category</td>
                    <td className="py-2.5 px-4">{categoryName}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-white">Condition</td>
                    <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">100% Brand New Original</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-white">Warranty</td>
                    <td className="py-2.5 px-4">1-Year AutoTrade Guarantee</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-white">Installation</td>
                    <td className="py-2.5 px-4">Direct Replacement / Easy Mount</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductDetailsSkeleton = () => (
  <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] animate-pulse">
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-6 space-y-4">
          <div className="h-7 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-8 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

const ProductDetailsPage = () => {
  const { formatCurrency } = useCurrency();
  const { getOriginalPrice, getDiscountPercent } = useDiscount();
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(id);
  const { data: relatedData } = useGetRelatedProductsQuery(id, { skip: !id });
  const relatedProducts = relatedData?.products || [];
  const [createReview, { isLoading: isReviewLoading }] = useCreateReviewMutation();

  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const productId = product ? getProductId(product) || id || '' : '';
  const isWishlisted = product ? wishlistItems.some((item: any) => item._id === productId) : false;

  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<any>(null);

  // Zoom & Lightbox
  const [zoomLens, setZoomLens] = useState({ active: false, imgX: 50, imgY: 50, conX: 50, conY: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  // Review Form
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [userNewReviews, setUserNewReviews] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auto_selected_vehicle');
      if (stored) setActiveVehicle(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (buyBoxRef.current) {
        const rect = buyBoxRef.current.getBoundingClientRect();
        // Show sticky bar once user scrolls past main action buttons
        setShowStickyBar(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWishlistToggle = () => {
    dispatch(
      toggleWishlist({
        _id: productId,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        image: product?.images?.[0] || '',
      })
    );
    if (!isWishlisted) {
      toast.success('Added to your Wishlist');
    }
  };

  useEffect(() => {
    setSelectedImage(0);
    setZoomLens({ active: false, imgX: 50, imgY: 50, conX: 50, conY: 50 });
    setLightboxOpen(false);
  }, [id]);

  if (isLoading) return <ProductDetailsSkeleton />;

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
          <h2 className="text-xl font-bold mb-3">Product not found</h2>
          <Link
            to="/collections/all"
            className="px-6 h-11 inline-flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-[#FF7A00] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  const productName = String(product?.name || product?.title || '').trim();
  const currentSellingPrice = Number(product.discountPrice || product.price || 0);
  const rawOriginalPrice = product.originalPrice || product.mrp;
  const displayOriginalPrice = rawOriginalPrice && Number(rawOriginalPrice) > currentSellingPrice
    ? Number(rawOriginalPrice)
    : getOriginalPrice(currentSellingPrice);

  const discountPct = getDiscountPercent(currentSellingPrice, displayOriginalPrice);
  const displayImages = product?.images && product.images.length > 0 ? product.images : ['/img/placeholder.png'];

  const handleAddToCart = () => {
    const itemSnapshot = {
      _id: productId,
      name: product.name,
      price: currentSellingPrice,
      image: displayImages[0],
      qty: qty,
      variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
      vid: product.variants?.[0]?.vid || '',
      sku: product.sku || product.pid || '',
    };

    if (!userInfo) {
      sessionStorage.setItem('pendingCartItem', JSON.stringify(itemSnapshot));
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    dispatch(addToCart(itemSnapshot));
    setIsAdded(true);
    toast.success('Added to Cart');
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    dispatch(
      addToCart({
        _id: productId,
        name: product.name,
        price: currentSellingPrice,
        image: displayImages[0],
        qty: qty,
        increment: true,
        variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
        vid: product.variants?.[0]?.vid || '',
        sku: product.sku || product.pid || '',
      })
    );
    navigate('/cart');
  };

  const handleImageZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const img = container.querySelector('img');
    if (!img) return;
    const crect = container.getBoundingClientRect();
    const irect = img.getBoundingClientRect();
    const imgX = ((e.clientX - irect.left) / irect.width) * 100;
    const imgY = ((e.clientY - irect.top) / irect.height) * 100;
    const conX = ((e.clientX - crect.left) / crect.width) * 100;
    const conY = ((e.clientY - crect.top) / crect.height) * 100;
    setZoomLens({
      active: true,
      imgX: Math.min(100, Math.max(0, imgX)),
      imgY: Math.min(100, Math.max(0, imgY)),
      conX: Math.min(100, Math.max(0, conX)),
      conY: Math.min(100, Math.max(0, conY)),
    });
  };

  const allReviews = [
    ...userNewReviews,
    ...(product?.reviews || []).map((r: any) => ({
      user: r.userName,
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toLocaleDateString(),
    })),
    ...MOCK_REVIEWS,
  ];

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] font-sans overflow-x-hidden pb-16 md:pb-8">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:text-[#FF7A00] transition-colors">Home</Link>
            <ChevronRight size={12} strokeWidth={2.5} className="text-zinc-400" />
            {product.subcategoryName && (
              <>
                <Link
                  to={`/collections/${normalizeSlug(String(product.subcategoryName))}`}
                  className="hover:text-[#FF7A00] transition-colors capitalize"
                >
                  {product.subcategoryName}
                </Link>
                <ChevronRight size={12} strokeWidth={2.5} className="text-zinc-400" />
              </>
            )}
            <span className="text-zinc-900 dark:text-white font-extrabold truncate max-w-[200px] sm:max-w-md">
              {product.title || product.name}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main PDP Content (Two Columns) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column — Gallery */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
            {/* Main Image Container */}
            <div
              onMouseMove={handleImageZoom}
              onMouseLeave={() => setZoomLens((p) => ({ ...p, active: false }))}
              onClick={() => setLightboxOpen(true)}
              className="relative w-full aspect-[4/3] max-h-[460px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex items-center justify-center cursor-crosshair shadow-md p-4 group"
            >
              {discountPct > 0 && (
                <div className="absolute top-3.5 left-3.5 z-10">
                  <DiscountBadge percent={discountPct} variant="emerald" showIcon />
                </div>
              )}

              <img
                src={displayImages[selectedImage] || displayImages[0]}
                alt={productName}
                className="max-w-full max-h-full object-contain p-2 select-none"
              />

              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={12} /> Click to Expand
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {displayImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                {displayImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer p-1 bg-white dark:bg-zinc-900 ${
                      selectedImage === idx
                        ? 'border-[#FF7A00] ring-2 ring-orange-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column — Product Details & Buy Box */}
          <div className="lg:col-span-6 space-y-5 text-left" ref={buyBoxRef}>
            {/* Category Tag & Rating */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest">
                {product.subcategoryName || product.collectionType || 'Automotive Upgrade'}
              </span>
              <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Star size={13} fill="currentColor" />
                <span>4.8</span>
                <span className="text-zinc-500 font-normal">({allReviews.length} reviews)</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-snug">
              {productName}
            </h1>

            {/* Pricing Box */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tabular-nums">
                  {formatCurrency(currentSellingPrice)}
                </span>
                {displayOriginalPrice > currentSellingPrice && (
                  <span className="text-sm sm:text-base text-zinc-400 line-through font-medium tabular-nums">
                    {formatCurrency(displayOriginalPrice)}
                  </span>
                )}
                {discountPct > 0 && <DiscountBadge percent={discountPct} variant="emerald" />}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check size={14} strokeWidth={3} /> In Stock
                </span>
                <span>&bull;</span>
                <span>Includes Taxes & Free Standard Shipping</span>
              </div>
            </div>

            {/* Vehicle Compatibility Banner */}
            <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck size={20} className="text-[#FF7A00] shrink-0" />
                <div className="text-xs truncate">
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    {activeVehicle
                      ? `Guaranteed Fit for ${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year})`
                      : 'Guaranteed OEM Compatibility'}
                  </span>
                  <span className="text-zinc-500 text-[11px]">
                    Verified with manufacturer blueprint specifications
                  </span>
                </div>
              </div>
              <Link
                to="/#shop-by-category"
                className="text-[11px] font-bold text-orange-500 hover:underline shrink-0"
              >
                Change
              </Link>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Quantity:
              </span>
              <QuantitySelector
                value={qty}
                onChange={(newQty) => setQty(newQty)}
                onDecrement={() => setQty((q) => Math.max(1, q - 1))}
                onIncrement={() => setQty((q) => q + 1)}
                className="w-32 h-10 border border-zinc-300 dark:border-zinc-700 rounded-xl"
              />
            </div>

            {/* Action Buttons: Buy Now & Add to Cart */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="sm:col-span-6 h-13 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#FF9E00] hover:to-[#FF7A00] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Buy Now</span>
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                className="sm:col-span-5 h-13 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-extrabold text-xs uppercase tracking-wider shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {isAdded ? (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWishlistToggle}
                className={`sm:col-span-1 h-13 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                  isWishlisted
                    ? 'border-red-500 text-red-500 bg-red-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#FF7A00]'
                }`}
                aria-label="Toggle Wishlist"
              >
                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Compact Trust Badges */}
            <TrustBadgesBar compact className="mt-4" />

            {/* Description, Features & 2-Col Specs */}
            <ProductFeaturesAndSpecs product={product} />
          </div>
        </div>

        {/* 3. Customer Reviews Section */}
        <section className="mt-14 pt-10 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest block mb-1">
                Customer Feedback
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold uppercase text-zinc-900 dark:text-white">
                Ratings & Verified Reviews
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allReviews.map((rev, rIdx) => (
              <div
                key={rIdx}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{rev.user}</span>
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal normal-case">
                  "{rev.comment}"
                </p>
                <span className="text-[10px] text-zinc-400 block pt-1">{rev.date}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Related Products Grid */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 pt-10 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-white mb-6 text-left">
              You Might Also Like
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5">
              {relatedProducts.slice(0, 4).map((relProd: any, idx: number) => (
                <ProductCard key={idx} product={relProd} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Sticky Mobile Purchase Bar on Scroll (Requirement 7) ── */}
      {showStickyBar && (
        <div className="fixed bottom-[54px] md:bottom-0 left-0 right-0 z-30 bg-black/95 dark:bg-black/95 backdrop-blur-xl border-t border-zinc-800 p-2.5 xs:p-3 shadow-2xl transition-all duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="hidden xs:flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-white truncate max-w-[180px]">{productName}</span>
              <span className="text-sm font-black text-[#FF7A00]">{formatCurrency(currentSellingPrice)}</span>
            </div>

            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 xs:flex-initial px-5 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShoppingBag size={14} />
                <span>Add To Bag</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 xs:flex-initial px-6 h-11 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Buy Now</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 text-white/80 hover:text-white cursor-pointer"
          >
            <X size={24} />
          </button>
          <img
            src={displayImages[selectedImage] || displayImages[0]}
            alt={productName}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;

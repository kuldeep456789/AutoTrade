import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingBag, Check, Star, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { addToCart } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { RootState } from '../../store/store';
import { getProductId } from '../../lib/product';
import { useCurrency } from '../../context/CurrencyContext';
import { useDiscount } from '../../context/DiscountContext';
import DiscountBadge from '../common/DiscountBadge';

interface ProductCardProps {
  product: any;
  showCompatibility?: boolean;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80';

export const ProductCardSkeleton = () => (
  <div className="flex flex-col w-full bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs animate-pulse">
    <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-2.5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  </div>
);

const ProductCard = ({ product, showCompatibility = true }: ProductCardProps) => {
  const { formatCurrency } = useCurrency();
  const { getOriginalPrice, getDiscountPercent } = useDiscount();
  const [imageFailed, setImageFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auto_selected_vehicle');
      if (stored) {
        setSelectedVehicle(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const productId = getProductId(product) || product.name || 'product';
  const isWishlisted = wishlistItems.some((item: any) => item._id === productId);

  const productName = product.title || (product as any)?.productName || product.name || 'AutoTrade Accessory';
  const categoryLabel = product.subcategoryName || product.collectionType || product.categoryName || '';

  const primaryImage = product?.images?.[0] || (product as any)?.productImage || PLACEHOLDER_IMAGE;
  const hoverImage = product?.images?.[1] || null;

  const currentPrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  const rawOriginal = product.originalPrice || product.mrp;
  const displayOriginalPrice = rawOriginal && Number(rawOriginal) > Number(currentPrice)
    ? Number(rawOriginal)
    : getOriginalPrice(currentPrice);

  const discountPercent = getDiscountPercent(currentPrice, displayOriginalPrice);

  // Stable Mock Rating Generator
  const getMockRating = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = 4.3 + (Math.abs(hash % 7) / 10); // 4.3 to 4.9
    const count = 12 + Math.abs(hash % 120); // 12 to 132 reviews
    return {
      score: score.toFixed(1),
      count: count,
    };
  };

  const ratingVal = getMockRating(productName);

  // Hide products with no meaningful price
  if (!currentPrice || Number(currentPrice) <= 1) return null;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      toggleWishlist({
        _id: productId,
        name: productName,
        price: currentPrice,
        discountPrice: product.discountPrice,
        image: primaryImage,
      })
    );
    if (!isWishlisted) {
      toast.success('Added to Wishlist');
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      const pendingItem = {
        _id: productId,
        name: productName,
        price: currentPrice,
        image: primaryImage,
        qty: 1,
        variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
        vid: product.variants?.[0]?.vid || '',
        sku: product.sku || product.pid || '',
      };
      sessionStorage.setItem('pendingCartItem', JSON.stringify(pendingItem));
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    dispatch(
      addToCart({
        _id: productId,
        name: productName,
        price: currentPrice,
        image: primaryImage,
        qty: 1,
        variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
        vid: product.variants?.[0]?.vid || '',
        sku: product.sku || product.pid || '',
      })
    );
    setIsAdded(true);
    toast.success('Added to Cart');
    setTimeout(() => setIsAdded(false), 2000);
  };

  const compatibilityBadge = selectedVehicle ? (
    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/40 truncate">
      <Check size={11} strokeWidth={3} className="shrink-0" />
      <span className="truncate">Fits {selectedVehicle.brand} {selectedVehicle.model}</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
      <ShieldCheck size={11} className="text-[#FF7A00] shrink-0" />
      <span>Guaranteed Fit</span>
    </div>
  );

  return (
    <div
      className="group relative flex flex-col h-full w-full bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#FF7A00] hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.99]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Product Image Area */}
      <Link
        to={`/product/${productId}`}
        className="relative block aspect-[4/3] w-full bg-zinc-50 dark:bg-zinc-950/70 overflow-hidden"
      >
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <DiscountBadge percent={discountPercent} variant="emerald" showIcon />
          </div>
        )}

        {/* Stock / In Stock Indicator */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-black/70 backdrop-blur-xs text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30">
          In Stock
        </div>

        <img
          src={imageFailed ? PLACEHOLDER_IMAGE : hovered && hoverImage ? hoverImage : primaryImage}
          alt={productName}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Circular Wishlist button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className={`absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border shadow-sm backdrop-blur-md transition-all duration-200 active:scale-90 cursor-pointer ${
            isWishlisted
              ? 'text-red-500 border-red-400 bg-white dark:bg-zinc-900'
              : 'text-zinc-500 hover:text-red-500 border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 hover:border-red-400'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </Link>

      {/* Product Content Details */}
      <div className="flex flex-col flex-1 p-3 sm:p-3.5 bg-white dark:bg-zinc-900/90 text-left justify-between">
        <div>
          {/* Category & Ratings */}
          <div className="flex items-center justify-between gap-1 mb-1">
            {categoryLabel ? (
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[65%]">
                {categoryLabel}
              </span>
            ) : <span />}

            <div className="flex items-center gap-1 shrink-0 text-amber-500 text-[11px] font-bold">
              <Star size={11} fill="currentColor" />
              <span>{ratingVal.score}</span>
              <span className="text-[9px] text-zinc-400 font-normal">({ratingVal.count})</span>
            </div>
          </div>

          {/* Title */}
          <Link to={`/product/${productId}`} className="group/title block mb-2">
            <h3 className="text-xs xs:text-[13px] sm:text-sm font-semibold text-zinc-900 dark:text-white group-hover/title:text-[#FF7A00] transition-colors line-clamp-2 leading-snug tracking-tight">
              {productName}
            </h3>
          </Link>

          {/* Vehicle Compatibility Tag */}
          {showCompatibility && (
            <div className="mb-2">
              {compatibilityBadge}
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col min-w-0">
            <span className="text-sm xs:text-base sm:text-[17px] font-extrabold text-zinc-950 dark:text-white tabular-nums leading-tight">
              {formatCurrency(currentPrice)}
            </span>
            {displayOriginalPrice > currentPrice && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through tabular-nums leading-none mt-0.5">
                {formatCurrency(displayOriginalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label="Add to cart"
            className={`px-3 h-8 sm:h-9 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 hover:bg-[#FF7A00] text-white dark:bg-zinc-800 dark:hover:bg-[#FF7A00] border border-zinc-700/50 dark:border-zinc-700'
            }`}
          >
            {isAdded ? (
              <>
                <Check size={13} strokeWidth={3} />
                <span className="hidden xs:inline">Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={13} strokeWidth={2.25} />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

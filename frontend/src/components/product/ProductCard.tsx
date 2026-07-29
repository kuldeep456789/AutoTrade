import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { addToCart } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { RootState } from '../../store/store';
import WishlistLoginPopup from '../WishlistLoginPopup';
import { getProductId } from '../../lib/product';
import { formatINR } from '../../lib/currency';

interface ProductCardProps {
  product: any;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80';

export const ProductCardSkeleton = () => (
  <div className="flex flex-col w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-square w-full bg-zinc-200 dark:bg-zinc-800" />
    <div className="p-4 space-y-3">
      <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded pt-2" />
    </div>
  </div>
);

const ProductCard = ({ product }: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);

  const productId = getProductId(product) || product.name || 'product';
  const isWishlisted = wishlistItems.some((item: any) => item._id === productId);

  const productName = product.title || (product as any)?.productName || product.name || 'AutoTrade Product';

  const primaryImage = product?.images?.[0] || (product as any)?.productImage || PLACEHOLDER_IMAGE;
  const hoverImage = product?.images?.[1] || null;

  const currentPrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  const originalPrice = product.discountPrice && product.discountPrice < product.price ? product.price : undefined;

  const discountPct = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // ── Hide products with no meaningful price (₹0 – ₹1) ───────────────────────
  if (!currentPrice || Number(currentPrice) <= 1) return null;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userInfo) {
      setShowWishlistPopup(true);
      return;
    }
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
        increment: true,
        variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
      })
    );

    setIsAdded(true);
    toast.success('Added to Bag');
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div
      className="group relative flex flex-col w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Product Image Box */}
      <Link to={`/product/${productId}`} className="relative block aspect-square w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden p-2.5 sm:p-3 transition-colors duration-200">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 px-6 text-center">
            <span className="mt-2 line-clamp-2 text-sm font-bold text-zinc-900 dark:text-white">
              {productName}
            </span>
          </div>
        ) : (
          <>
            {/* Primary image */}
            <img
              src={primaryImage}
              alt={productName}
              loading="lazy"
              onError={() => { if (primaryImage !== PLACEHOLDER_IMAGE) setImageFailed(true); }}
              className={`h-full w-full object-contain object-center transform group-hover:scale-105 transition-all duration-500 ${
                hovered && hoverImage ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* Secondary hover image */}
            {hoverImage && (
              <img
                src={hoverImage}
                alt={`${productName} hover view`}
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-contain object-center p-2.5 sm:p-3 transform group-hover:scale-105 transition-all duration-500 ${
                  hovered ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
          </>
        )}

        {/* Top Badges */}
        {discountPct > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            <span className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md">
              -{discountPct}%
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 shadow-md hover:scale-110 active:scale-95 ${
            isWishlisted
              ? 'bg-red-600 text-white'
              : 'bg-white/80 dark:bg-black/60 text-zinc-700 dark:text-zinc-300 hover:bg-red-600 hover:text-white'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </Link>

      {/* Product Content Details */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 justify-between bg-white dark:bg-zinc-900 transition-colors duration-200">
        <Link to={`/product/${productId}`} className="space-y-1.5">
          {/* Subcategory / Brand Tag */}
          {(product.subcategoryName || product.collectionType || product.categoryName || product.category?.name) && (
            <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest block">
              {product.subcategoryName || product.collectionType || product.categoryName || product.category?.name}
            </span>
          )}

          {/* Product Title */}
          <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-2 leading-snug tracking-tight">
            {productName}
          </h3>
        </Link>

        {/* Price & Quick Add Button */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                {formatINR(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through">
                  {formatINR(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleQuickAdd}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 shadow-sm active:scale-95 cursor-pointer ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/30'
            }`}
          >
            {isAdded ? (
              <>
                <Check size={14} strokeWidth={3} />
                <span>ADDED</span>
              </>
            ) : (
              <>
                <ShoppingBag size={14} />
                <span>ADD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showWishlistPopup && (
        <WishlistLoginPopup
          product={{
            _id: productId,
            name: productName,
            price: currentPrice,
            discountPrice: product.discountPrice,
            image: primaryImage,
          }}
          onClose={() => setShowWishlistPopup(false)}
        />
      )}
    </div>
  );
};

export default ProductCard;

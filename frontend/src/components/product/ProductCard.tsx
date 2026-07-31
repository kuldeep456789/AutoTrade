import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingCart, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { addToCart } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { RootState } from '../../store/store';
import WishlistLoginPopup from '../WishlistLoginPopup';
import { getProductId } from '../../lib/product';
import { useCurrency } from '../../context/CurrencyContext';

interface ProductCardProps {
  product: any;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80';

export const ProductCardSkeleton = () => (
  <div className="flex flex-col w-full bg-[#111111] border border-[#262626] rounded-[20px] overflow-hidden shadow-sm animate-pulse h-[440px]">
    <div className="aspect-square w-full bg-[#1c1c1e]" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-2/3 bg-[#262626] rounded" />
      <div className="h-4 w-1/3 bg-[#262626] rounded" />
      <div className="h-3 w-1/2 bg-[#262626] rounded pt-1" />
    </div>
  </div>
);

const ProductCard = ({ product }: ProductCardProps) => {
  const { formatCurrency } = useCurrency();
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
  const rawOriginal = product.originalPrice || product.mrp || (product.discountPrice && product.discountPrice < product.price ? product.price : undefined);
  const displayOriginalPrice = rawOriginal && Number(rawOriginal) > Number(currentPrice)
    ? Number(rawOriginal)
    : Math.round(Number(currentPrice) * 1.3);



  // Stable Mock Rating Generator
  const getMockRating = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = 4.3 + (Math.abs(hash % 7) / 10); // 4.3 to 4.9
    const count = 15 + Math.abs(hash % 140); // 15 to 155 reviews
    return {
      score: score.toFixed(1),
      count: count,
    };
  };

  const ratingVal = getMockRating(productName);

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
        variant: { color: product.colors?.[0] || 'Default', size: 'One Size' },
      })
    );
    setIsAdded(true);
    toast.success('Added to Cart');
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div
      className="group relative flex flex-col min-h-[430px] sm:min-h-[450px] w-full bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#262626] rounded-[20px] overflow-hidden transition-colors duration-300 ease-in-out hover:border-[#FF7A00]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Product Image Area (Tall 1:1 Aspect Ratio) */}
      <Link to={`/product/${productId}`} className="relative block aspect-square w-full bg-zinc-50 dark:bg-[#161616] overflow-hidden">
        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-[11px] font-bold border border-emerald-300/60 dark:border-emerald-800 shadow-sm backdrop-blur-sm">
            {/* <span className="text-[10px]">💵</span> */}
            18% GST
          </span>
        </div>

        <img
          src={imageFailed ? PLACEHOLDER_IMAGE : (hovered && hoverImage ? hoverImage : primaryImage)}
          alt={productName}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />

        {/* Circular wishlist button */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full border border-zinc-200 bg-white shadow-sm transition-colors duration-300 cursor-pointer ${isWishlisted
              ? 'text-red-500 border-red-500'
              : 'text-zinc-500 hover:text-red-500 hover:border-red-500'
            }`}
          aria-label="Wishlist"
        >
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      </Link>

      {/* Product Content Details */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 justify-between bg-white dark:bg-[#111111]">
        <Link to={`/product/${productId}`} className="block mb-2">
          {/* Product Title */}
          <h3 className="text-[13px] sm:text-[14px] font-inter font-semibold text-zinc-900 dark:text-white group-hover:text-[#FF7A00] transition-colors line-clamp-1 leading-snug tracking-tight normal-case">
            {productName}
          </h3>
        </Link>

        {/* Price, Rating & Quick Add Row */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="space-y-1">
            {/* Price */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[17px] sm:text-[19px] font-inter font-bold text-zinc-950 dark:text-white">
                {formatCurrency(currentPrice)}
              </span>
              <span className="text-[12px] font-inter font-medium text-zinc-400 dark:text-zinc-500 line-through">
                {formatCurrency(displayOriginalPrice)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold">
                Bulk Rate
              </span>
            </div>
          </div>

          <button
            onClick={handleQuickAdd}
            className={`px-3.5 h-8.5 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 cursor-pointer shrink-0 border text-[11px] font-bold uppercase tracking-wider ${isAdded
                ? 'bg-zinc-950 dark:bg-white border-transparent text-white dark:text-zinc-950'
                : 'bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-850'
              }`}
            aria-label="Add to cart"
          >
            {isAdded ? (
              <>
                <Check size={13} strokeWidth={3} className="text-white dark:text-zinc-950" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart size={13} strokeWidth={2.5} />
                <span>ADD CART</span>
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

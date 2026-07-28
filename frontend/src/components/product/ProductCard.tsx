import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { RootState } from '../../store/store';
import { getProductId } from '../../lib/product';
import { formatINR } from '../../lib/currency';
import toast from 'react-hot-toast';
import WishlistLoginPopup from '../WishlistLoginPopup';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%23f4f4f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="900" fill="%23a1a1aa" letter-spacing="4">VASTRA</text></svg>';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    price: number;
    discountPrice?: number;
    images: string[];
    variants?: { color: string; size: string; stock: number }[];
    colors?: string[];
    sizes?: string[];
    tags?: string[];
    title?: string;
    description?: string;
    numReviews?: number;
    averageRating?: number;
  };
  keyword?: string;
}

export const ProductCardSkeleton = () => (
  <div className="w-full bg-white dark:bg-zinc-900 rounded-[14px] overflow-hidden animate-pulse">
    <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-800" />
    <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
      <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-14 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  </div>
);

const ProductCard = ({ product }: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);
  const dispatch = useDispatch();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const productId = getProductId(product) || product.name || 'product';
  const isWishlisted = wishlistItems.some((item: any) => item._id === productId);

  const primaryImage = product?.images?.[0] || (product as any)?.productImage || PLACEHOLDER_IMAGE;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userInfo) {
      setShowWishlistPopup(true);
      return;
    }
    dispatch(
      toggleWishlist({
        _id: productId,
        name: product.name || (product as any)?.productName || product.title,
        price: product.price || (product as any)?.sellPrice,
        discountPrice: product.discountPrice,
        image: primaryImage,
      })
    );
    if (!isWishlisted) {
      toast.success('Added to your Wishlist');
    }
  };

  const currentPrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  const originalPrice = product.discountPrice && product.discountPrice < product.price ? product.price : undefined;
  // Force HMR update to apply price logic

  return (
    <div className="group relative flex flex-col w-full bg-white dark:bg-zinc-900 border-none cursor-pointer">
      <Link to={`/product/${productId}`} className="block w-full">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f6f6f6] dark:bg-zinc-800">
          {imageFailed ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 px-8 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">VASTRA</span>
              <span className="mt-2 line-clamp-3 text-lg font-bold leading-tight text-zinc-700 dark:text-zinc-300">
                {product.title || (product as any)?.productName || product.name}
              </span>
            </div>
          ) : (
            <img
              src={primaryImage}
              alt={product.name || (product as any)?.productName}
              loading="lazy"
              onError={() => { if (primaryImage !== PLACEHOLDER_IMAGE) setImageFailed(true); }}
              className="h-full w-full object-cover object-center"
            />
          )}

          <button
            onClick={handleWishlistClick}
            className={`absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-110 ${
              isWishlisted
                ? 'text-orange-500 shadow-orange-500/20'
                : 'text-zinc-400 hover:text-orange-500'
            }`}
            aria-label="Add to wishlist"
          >
            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>
      </Link>

      <Link to={`/product/${productId}`} className="flex flex-col pt-3 pb-1 flex-1">
        <span className="text-[13px] font-medium text-[#9e352f] mb-1">Just In</span>
        <h3 className="text-[15px] sm:text-base font-medium text-[#111111] dark:text-white line-clamp-2">
          {product.title || (product as any)?.productName || product.name}
        </h3>
        {product.description && (
          <p className="text-[14px] text-gray-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
            {product.description.replace(/<[^>]*>?/gm, '')}
          </p>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
          <span className="text-[15px] sm:text-[16px] font-medium text-[#111111] dark:text-white">
            {formatINR(currentPrice)}
          </span>
          {originalPrice && (
            <span className="text-[14px] sm:text-[15px] text-gray-500 line-through">
              {formatINR(originalPrice)}
            </span>
          )}
        </div>
      </Link>

      {showWishlistPopup && (
        <WishlistLoginPopup
          product={{
            _id: productId,
            name: product.name,
            price: product.price,
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

import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatINR } from '../lib/currency';
import type { RootState } from '../store/store';
import { removeFromWishlist } from '../store/slices/wishlistSlice';
import { addToCart } from '../store/slices/cartSlice';
import { useAddToCartMutation } from '../store/slices/cartApiSlice';
import { useRemoveWishlistItemMutation } from '../store/slices/wishlistApiSlice';

const WishlistPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const [addToCartBackend, { isLoading: isAddingToCart }] = useAddToCartMutation();
  const [removeWishlistItemBackend] = useRemoveWishlistItemMutation();

  const moveToCart = async (item: any) => {
    try {
      const cartItem = {
        _id: item._id,
        name: item.name,
        price: item.discountPrice || item.price,
        image: item.image,
        qty: 1,
        increment: true,
        variant: { color: 'Black', size: 'M' },
      };

      if (userInfo?.accessToken) {
        await addToCartBackend({ productId: item._id, quantity: 1 }).unwrap();
      }

      dispatch(addToCart(cartItem));
      dispatch(removeFromWishlist(item._id));

      if (userInfo?.accessToken) {
        removeWishlistItemBackend(item._id);
      }

      toast.success('Item moved to your Bag successfully.');
    } catch (err: any) {
      const message = err?.data?.message || 'Failed to move item. Please try again.';
      toast.error(message);
    }
  };

  const handleRemove = (item: any) => {
    dispatch(removeFromWishlist(item._id));
    if (userInfo?.accessToken) {
      removeWishlistItemBackend(item._id);
    }
    toast('Item removed from Wishlist.', { icon: '💔' });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-zinc-900 dark:text-white tracking-tight">
            My Wishlist
          </h1>
          {wishlistItems.length > 0 && (
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <div className="text-center py-24 max-w-lg mx-auto">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full" />
              <Heart className="relative z-10 w-9 h-9 text-zinc-300 dark:text-zinc-600" strokeWidth={1} />
            </div>
            <h2 className="text-[22px] font-bold text-zinc-900 dark:text-white mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Save items you love by tapping the heart icon. They&apos;ll stay here for when you&apos;re ready to buy.
            </p>
            <button
              onClick={() => navigate('/', { state: { scrollTo: 'men' } })}
              className="inline-flex items-center justify-center h-[52px] px-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-bold tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
            >
              START SHOPPING
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlistItems.map((item: any) => (
              <div
                key={item._id}
                className="flex gap-5 rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-5 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250"
              >
                <Link to={`/product/${item._id}`} className="w-[110px] h-[140px] shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                  <div>
                    <Link to={`/product/${item._id}`}>
                      <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-white line-clamp-2 hover:underline transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-[17px] font-bold mt-1.5 text-zinc-900 dark:text-white">
                      {formatINR(item.discountPrice || item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => moveToCart(item)}
                      disabled={isAddingToCart}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-[40px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      {isAddingToCart ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ShoppingBag size={14} strokeWidth={2} />
                      )}
                      Add to Bag
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 cursor-pointer"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;

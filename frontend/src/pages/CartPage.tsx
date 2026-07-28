import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { addToCart, removeFromCart, applyCoupon, removeCoupon, COUPONS } from '../store/slices/cartSlice';
import type { CartItem } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { useGetRelatedProductsQuery } from '../store/slices/productApiSlice';
import ProductCard from '../components/product/ProductCard';
import { Trash2, ShoppingBag, Heart, Percent, Truck, X, ChevronRight, Star } from 'lucide-react';
import QuantitySelector from '../components/QuantitySelector';
import { formatINR } from '../lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import MinimumOrderModal from '../components/checkout/MinimumOrderModal';

const getItemDescription = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('shirt') || n.includes('top') || n.includes('tee')) {
    return { desc: "Breathable cotton-blend top for all-day comfort.", fact: "Fun Fact: T-shirts evolved from 19th-century undergarments." };
  }
  if (n.includes('jeans') || n.includes('denim') || n.includes('pants') || n.includes('trousers')) {
    return { desc: "Durable premium fabric with an optimal stretch fit.", fact: "Fun Fact: The first denim pants were reinforced with copper rivets." };
  }
  if (n.includes('dress') || n.includes('gown')) {
    return { desc: "Elegant silhouette crafted from luxurious flowing fabrics.", fact: "Fun Fact: The 'little black dress' was popularized in the 1920s." };
  }
  if (n.includes('jacket') || n.includes('coat') || n.includes('hoodie') || n.includes('sweater')) {
    return { desc: "Weather-ready outerwear with superior thermal insulation.", fact: "Fun Fact: The modern zipper was first used widely on jackets in the 1930s." };
  }
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot')) {
    return { desc: "Ergonomic footwear designed for maximum support and style.", fact: "Fun Fact: Sneakers got their name because their rubber soles make them quiet." };
  }
  return { desc: "High-quality material offering a perfect blend of style and durability.", fact: "Fun Fact: Fashion is one of the world's oldest and largest industries." };
};

const CartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state: RootState) => state.cart);
  const { cartItems, itemsPrice, shippingPrice, totalPrice } = cart;

  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const isItemWishlisted = (id: string) => wishlistItems.some((item: any) => item._id === id);

  const [couponCode, setCouponCode] = useState(cart.appliedCoupon || '');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [isMinOrderModalOpen, setIsMinOrderModalOpen] = useState(false);

  useEffect(() => {
    if (cart.appliedCoupon) {
      setCouponCode(cart.appliedCoupon);
      if (!couponMsg) {
        setCouponMsg({ text: `Coupon "${cart.appliedCoupon}" is active!`, isError: false });
      }
    } else {
      setCouponCode('');
      setCouponMsg(null);
    }
  }, [cart.appliedCoupon]);

  const firstCartItemId = cartItems[0]?._id;
  const { data: relatedData } = useGetRelatedProductsQuery(firstCartItemId, { skip: !firstCartItemId });
  const recommendedProducts = relatedData?.products
    ?.filter((p: any) => !cartItems.some((c: any) => c._id === (p.pid || p._id)))
    ?.slice(0, 4) || [];

  const addToCartHandler = (item: CartItem, qty: number) => {
    dispatch(addToCart({ ...item, qty }));
  };

  const removeFromCartHandler = (id: string, size: string, color: string) => {
    dispatch(removeFromCart({ id, size, color }));
    setRemoveConfirm(null);
  };

  const moveToWishlistHandler = (item: CartItem) => {
    if (!isItemWishlisted(item._id)) {
      dispatch(toggleWishlist({
        _id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
      }));
    }
    dispatch(removeFromCart({ id: item._id, size: item.variant.size, color: item.variant.color }));
    setCouponMsg({ text: 'Moved item to wishlist.', isError: false });
    setTimeout(() => setCouponMsg(null), 3000);
  };

  const handleApplyCoupon = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return;

    const couponDef = COUPONS[cleanCode];
    if (!couponDef) {
      setCouponMsg({ text: `Invalid coupon. Try: ${Object.keys(COUPONS).join(', ')}.`, isError: true });
      return;
    }
    if (itemsPrice < couponDef.min) {
      setCouponMsg({ text: `Min. cart value of ${formatINR(couponDef.min)} required for ${cleanCode}.`, isError: true });
      return;
    }
    dispatch(applyCoupon(cleanCode));
    const savings = couponDef.discount(itemsPrice);
    setCouponMsg({ text: `"${cleanCode}" applied! You save ${formatINR(savings)}.`, isError: false });
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    setCouponCode('');
    setCouponMsg({ text: 'Coupon removed.', isError: false });
    setTimeout(() => setCouponMsg(null), 3000);
  };

  const checkoutHandler = () => {
    if (itemsPrice < 50000) {
      setIsMinOrderModalOpen(true);
      return;
    }
    navigate('/shipping');
  };

  const getShippingNext = () => {
    const discounted = itemsPrice - cart.couponDiscount;
    if (discounted === 0) return { msg: '', pct: 0, free: false };
    if (discounted >= 5000) return { msg: 'FREE shipping unlocked!', pct: 100, free: true };
    if (discounted >= 999) return { msg: `Add ${formatINR(5000 - discounted)} more for FREE shipping`, pct: (discounted / 5000) * 100, free: false };
    if (discounted >= 499) return { msg: `Add ${formatINR(999 - discounted)} more to drop shipping to ${formatINR(49)}`, pct: (discounted / 999) * 100, free: false };
    return { msg: `Add ${formatINR(499 - discounted)} more to drop shipping to ${formatINR(99)}`, pct: (discounted / 499) * 100, free: false };
  };

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {cartItems.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-9 h-9 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Your bag is empty</h2>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
              Looks like you haven't added anything yet. Browse our latest arrivals to find something you love.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/collections/men" className="h-[52px] px-8 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[13px] font-bold tracking-wider flex items-center justify-center hover:opacity-90 transition-all duration-200 w-full sm:w-auto">
                SHOP MEN
              </Link>
              <Link to="/collections/women" className="h-[52px] px-8 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-[13px] font-bold tracking-wider flex items-center justify-center hover:border-[hsl(var(--foreground))] transition-all duration-200 w-full sm:w-auto">
                SHOP WOMEN
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] font-bold tracking-tight leading-none">Shopping Bag</h1>
                <p className="text-[14px] text-zinc-500 mt-1.5">
                  {cartItems.reduce((sum, i) => sum + i.qty, 0)} {cartItems.reduce((sum, i) => sum + i.qty, 0) === 1 ? 'Item' : 'Items'}
                </p>
              </div>
              <Link to="/collections/men" className="flex items-center gap-1 text-[13px] font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">
                Continue Shopping <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>



            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
              {/* Left Column — Cart Items (70%) */}
              <div className="w-full lg:w-[70%] space-y-4">
                <AnimatePresence>
                  {cartItems.map((item) => (
                    <motion.div
                      key={`${item._id}-${item.variant.size}-${item.variant.color}`}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex gap-4 sm:gap-5 hover:shadow-sm transition-shadow duration-200"
                    >
                      {/* Image */}
                      <div className="w-[110px] sm:w-[140px] h-[150px] sm:h-[180px] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0 group">
                        <Link to={`/product/${item._id}`}>
                          <img
                            src={item.image || undefined}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        </Link>
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        {/* Top row: name + price */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <Link to={`/product/${item._id}`} className="text-[18px] sm:text-[20px] font-semibold leading-tight block truncate hover:underline">
                              {item.name}
                            </Link>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[13px] text-zinc-500">
                              <span>Color: <span className="text-[hsl(var(--foreground))] font-medium">{item.variant.color}</span></span>
                              <span>Size: <span className="text-[hsl(var(--foreground))] font-medium">{item.variant.size}</span></span>
                            </div>

                            {/* Description & Fact */}
                            {(() => {
                              const info = getItemDescription(item.name);
                              return (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 italic">"{info.desc}"</p>
                                  <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                                    {info.fact}
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Rating */}
                            <div className="flex items-center gap-1.5 mt-2.5">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={13} strokeWidth={1.5} fill="#f59e0b" className="text-amber-500" />
                                ))}
                              </div>
                              <span className="text-[12px] text-zinc-500 font-medium">(245 Reviews)</span>
                            </div>
                          </div>
                          <span className="text-[18px] sm:text-[20px] font-bold shrink-0">{formatINR(item.price)}</span>
                        </div>

                        {/* Bottom row: qty + actions */}
                        <div className="flex items-center justify-between mt-4">
                          {/* Quantity Pill Selector */}
                          <QuantitySelector
                            value={item.qty}
                            min={1}
                            max={9999}
                            onDecrement={() => item.qty > 1 && addToCartHandler(item, item.qty - 1)}
                            onIncrement={() => addToCartHandler(item, item.qty + 1)}
                            onChange={(qty) => addToCartHandler(item, qty)}
                            className="border border-zinc-300 dark:border-zinc-600 rounded-full bg-[hsl(var(--background))] overflow-hidden h-9 px-1"
                          />

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => moveToWishlistHandler(item)}
                              className={`flex items-center gap-1.5 h-9 px-3 rounded-full border transition-all duration-200 cursor-pointer text-[12px] font-semibold ${isItemWishlisted(item._id)
                                  ? 'border-red-200 dark:border-red-900 text-red-500 bg-red-50 dark:bg-red-950/20'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-[hsl(var(--foreground))]'
                                }`}
                            >
                              <Heart size={14} strokeWidth={2} fill={isItemWishlisted(item._id) ? 'currentColor' : 'none'} />
                              <span>Wishlist</span>
                            </button>
                            <button
                              onClick={() => removeFromCartHandler(item._id, item.variant.size, item.variant.color)}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Recommended */}
                {recommendedProducts.length > 0 && (
                  <div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-[18px] font-bold tracking-tight mb-5">You May Also Like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {recommendedProducts.map((product: any) => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column — Order Summary (30%) */}
              <div className="w-full lg:w-[30%] lg:sticky lg:top-[130px] space-y-5">
                {/* Coupon Section */}
                <div className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                  <h3 className="text-[14px] font-bold tracking-wide mb-4 flex items-center gap-2">
                    <Percent size={16} strokeWidth={1.5} className="text-zinc-500" /> Offers & Coupons
                  </h3>



                  {/* Coupon Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={!!cart.appliedCoupon}
                      className="flex-1 h-[44px] px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-[13px] focus:outline-none focus:border-[hsl(var(--foreground))] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 bg-transparent text-[hsl(var(--foreground))] placeholder:text-zinc-400 uppercase font-semibold"
                    />
                    {cart.appliedCoupon ? (
                      <button onClick={handleRemoveCoupon} className="h-[44px] px-4 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-[12px] font-bold transition-colors cursor-pointer whitespace-nowrap">
                        REMOVE
                      </button>
                    ) : (
                      <button onClick={() => handleApplyCoupon(couponCode)} disabled={!couponCode} className="h-[44px] px-5 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 text-[12px] font-bold transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap">
                        APPLY
                      </button>
                    )}
                  </div>

                  {couponMsg && (
                    <div className={`p-2.5 rounded-lg text-[12px] font-semibold mb-3 ${couponMsg.isError ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' : 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30'}`}>
                      {couponMsg.text}
                    </div>
                  )}


                </div>

                {/* Order Summary */}
                <div className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <h2 className="text-[14px] font-bold tracking-wide mb-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">Order Summary</h2>

                  <div className="space-y-3.5 text-[14px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-semibold">{formatINR(itemsPrice)}</span>
                    </div>

                    {cart.couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount ({cart.appliedCoupon})</span>
                        <span className="font-bold">-{formatINR(cart.couponDiscount)}</span>
                      </div>
                    )}



                  </div>

                  <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-[15px] font-bold">Total</span>
                    <span className="text-[24px] font-bold tracking-tight">{formatINR(totalPrice)}</span>
                  </div>

                  <button
                    onClick={checkoutHandler}
                    className="w-full h-[56px] mt-5 rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[15px] font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sticky Mobile Checkout */}
        {cartItems.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[hsl(var(--card))] border-t border-zinc-200 dark:border-zinc-700 p-4 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-zinc-500">{cartItems.reduce((sum, i) => sum + i.qty, 0)} Items</span>
              <span className="text-[20px] font-bold">{formatINR(totalPrice)}</span>
            </div>
            <button
              onClick={checkoutHandler}
              className="w-full h-[52px] rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[14px] font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      <AnimatePresence>
        {removeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setRemoveConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[hsl(var(--card))] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold">Remove item?</h3>
                <button onClick={() => setRemoveConfirm(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
              <p className="text-[14px] text-zinc-500 mb-6">This item will be removed from your shopping bag.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveConfirm(null)}
                  className="flex-1 h-[44px] rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-[13px] font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const [id, size, color] = removeConfirm.match(/^(.+?)-(.+?)-(.+)$/)?.slice(1) || [];
                    if (id && size && color) removeFromCartHandler(id, size, color);
                  }}
                  className="flex-1 h-[44px] rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MinimumOrderModal
        isOpen={isMinOrderModalOpen}
        onClose={() => setIsMinOrderModalOpen(false)}
        cartTotal={totalPrice}
      />
    </div>
  );
};

export default CartPage;

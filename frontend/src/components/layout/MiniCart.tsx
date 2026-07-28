import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { addToCart, removeFromCart } from '../../store/slices/cartSlice';
import type { CartItem } from '../../store/slices/cartSlice';
import { X, ShoppingBag, Trash2, ArrowRight, ShoppingCart, ShieldCheck } from 'lucide-react';
import { formatINR } from '../../lib/currency';
import QuantitySelector from '../QuantitySelector';
import MinimumOrderModal from '../checkout/MinimumOrderModal';

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const parsePrice = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const MiniCart = ({ isOpen, onClose }: MiniCartProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartItems, totalPrice, itemsPrice } = useSelector((state: RootState) => state.cart);
  const [isMinOrderModalOpen, setIsMinOrderModalOpen] = useState(false);

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const calculatedSubtotal = itemsPrice > 0
    ? itemsPrice
    : cartItems.reduce((acc, item) => acc + Math.round(parsePrice(item.price)) * item.qty, 0);

  const handleCheckout = () => {
    if (calculatedSubtotal < 50000) {
      setIsMinOrderModalOpen(true);
      return;
    }
    onClose();
    navigate('/shipping');
  };

  const updateQty = (item: CartItem, delta: number) => {
    const newQty = item.qty + delta;
    if (newQty < 1) {
      dispatch(removeFromCart({ id: item._id, size: item.variant.size, color: item.variant.color }));
    } else {
      dispatch(addToCart({ ...item, qty: newQty }));
    }
  };

  const setQty = (item: CartItem, qty: number) => {
    dispatch(addToCart({ ...item, qty }));
  };

  const removeItem = (item: CartItem) => {
    dispatch(removeFromCart({ id: item._id, size: item.variant.size, color: item.variant.color }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-[70] w-full max-w-[420px] bg-white dark:bg-[#141416] text-zinc-900 dark:text-white border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <ShoppingBag size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">MY BAG</span>
                {totalItemCount > 0 && (
                  <span className="inline-flex items-center justify-center text-xs bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold px-2 py-0.5 rounded-full">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Review your selected items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                <ShoppingCart size={36} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Your bag is empty</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[240px]">
                  Explore our luxury collection and add items to your shopping bag.
                </p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="mt-2 h-[48px] px-7 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, idx) => {
                const itemPriceNumber = Math.round(parsePrice(item.price));
                const totalItemPrice = itemPriceNumber * item.qty;

                return (
                  <div
                    key={`${item._id}-${item.variant.size}-${item.variant.color}-${idx}`}
                    className="flex gap-4 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                  >
                    {/* Product Image */}
                    <Link
                      to={`/product/${item._id}`}
                      onClick={onClose}
                      className="shrink-0 w-20 h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={item.image || undefined}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <Link
                          to={`/product/${item._id}`}
                          onClick={onClose}
                          className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight leading-snug line-clamp-2 uppercase hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        >
                          {item.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                            Size: {item.variant.size}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase truncate max-w-[100px]">
                            {item.variant.color}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        {/* Qty Controls */}
                        <QuantitySelector
                          value={item.qty}
                          min={1}
                          max={9999}
                          onDecrement={() => updateQty(item, -1)}
                          onIncrement={() => updateQty(item, 1)}
                          onChange={(qty) => setQty(item, qty)}
                          className="border border-zinc-300 dark:border-zinc-700 rounded-lg h-7 scale-90 -ml-2"
                        />

                        {/* Price + Remove */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                            {formatINR(totalItemPrice)}
                          </span>
                          <button
                            onClick={() => removeItem(item)}
                            title="Remove item"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
            {/* Subtotal */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-500 dark:text-zinc-400">SUBTOTAL</span>
                <span className="text-lg font-extrabold font-mono text-zinc-900 dark:text-white">
                  {formatINR(calculatedSubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" /> Secure Checkout
                </span>
                <span>Taxes & Shipping calculated at checkout</span>
              </div>
            </div>

            {/* Minimum Order Warning Banner if under 50k */}
            {calculatedSubtotal < 50000 && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Minimum order amount is ₹50,000</span>
                <span className="font-bold">Add {formatINR(50000 - calculatedSubtotal)}</span>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                to="/cart"
                onClick={onClose}
                className="h-[48px] rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                View Cart
              </Link>
              <button
                onClick={handleCheckout}
                className="h-[48px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-md cursor-pointer"
              >
                Checkout <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      <MinimumOrderModal 
        isOpen={isMinOrderModalOpen} 
        onClose={() => setIsMinOrderModalOpen(false)} 
        cartTotal={calculatedSubtotal} 
      />
    </>
  );
};

export default MiniCart;

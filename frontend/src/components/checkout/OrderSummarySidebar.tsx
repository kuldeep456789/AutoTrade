import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store/store';
import { ArrowRight, Package, Tag } from 'lucide-react';
import { formatINR } from '../../lib/currency';
import { applyCoupon, removeCoupon, COUPONS } from '../../store/slices/cartSlice';

interface OrderSummarySidebarProps {
  buttonText?: string;
  buttonAction?: () => void;
  disableButton?: boolean;
}

const OrderSummarySidebar = ({ buttonText, buttonAction, disableButton }: OrderSummarySidebarProps) => {
  const cart = useSelector((state: RootState) => state.cart);
  const { cartItems, itemsPrice, shippingPrice, taxPrice, totalPrice } = cart;
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const dispatch = useDispatch();

  const handleApplyCoupon = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return;

    const couponDef = COUPONS[cleanCode];
    if (!couponDef) {
      setCouponMsg({ text: `Invalid coupon. Try: ${Object.keys(COUPONS).join(', ')}.`, isError: true });
      return;
    }
    if (itemsPrice < couponDef.min) {
      setCouponMsg({ text: `Min. cart value of ${formatINR(couponDef.min)} required.`, isError: true });
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

  return (
    <div className="sticky top-[130px] bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl overflow-hidden shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-[#2A2A2A] flex items-center gap-2">
        <Package size={16} className="text-zinc-400" strokeWidth={1.5} />
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-700 dark:text-zinc-300">
          Order Summary
        </h2>
        <span className="ml-auto text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Items */}
      <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-4 scrollbar-thin">
        {cartItems.map((item) => (
          <div key={`${item._id}-${item.variant.size}-${item.variant.color}`} className="flex gap-3 items-start">
            <div className="relative w-16 h-[72px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" />
              <span className="absolute -top-1.5 -right-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm border border-white dark:border-[#18181B]">
                {item.qty}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug text-zinc-900 dark:text-white line-clamp-2">{item.name}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider">
                {item.variant.color} &middot; {item.variant.size}
              </p>
              <p className="text-[13px] font-bold text-zinc-900 dark:text-white mt-1">{formatINR(item.price)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coupon */}
      <div className="px-6 py-3 border-t border-zinc-200 dark:border-[#2A2A2A]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
            <input
              type="text"
              value={cart.appliedCoupon || couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={!!cart.appliedCoupon}
              placeholder="Coupon code"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors disabled:opacity-60"
            />
          </div>
          {cart.appliedCoupon ? (
            <button onClick={handleRemoveCoupon} className="h-10 px-4 rounded-xl border border-red-500 text-red-500 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 active:scale-[0.97] shrink-0">
              Remove
            </button>
          ) : (
            <button onClick={() => handleApplyCoupon(couponCode)} disabled={!couponCode} className="h-10 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.97] shrink-0 disabled:opacity-50">
              Apply
            </button>
          )}
        </div>
        {couponMsg && (
          <div className={`mt-2 text-[11px] font-semibold ${couponMsg.isError ? 'text-red-500' : 'text-green-600'}`}>
            {couponMsg.text}
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="px-6 py-4 border-t border-zinc-200 dark:border-[#2A2A2A] space-y-3">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatINR(itemsPrice)}</span>
        </div>

      </div>

      {/* Total */}
      <div className="px-6 py-4 border-t border-zinc-200 dark:border-[#2A2A2A] flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/30">
        <span className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Total</span>
        <span className="text-2xl font-bold text-zinc-900 dark:text-white">{formatINR(totalPrice)}</span>
      </div>


      {/* CTA Button */}
      {buttonText && buttonAction && (
        <div className="px-6 pb-6">
          <button
            onClick={buttonAction}
            disabled={disableButton || cartItems.length === 0}
            className="w-full group flex items-center justify-center gap-2 h-[56px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold tracking-wider transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {buttonText}
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
          </button>
        </div>
      )}


    </div>
  );
};

export default OrderSummarySidebar;

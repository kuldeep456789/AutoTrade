import { Link, useParams } from 'react-router-dom';
import { useGetOrderDetailsQuery } from '../store/slices/orderApiSlice';
import { useGetProductDetailsQuery } from '../store/slices/productApiSlice';
import { CheckCircle, Clock, CreditCard, Package, MapPin, Truck, FileText, ShoppingBag } from 'lucide-react';
import { formatINR } from '../lib/currency';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Payment Pending', className: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
};

const OrderItemRow = ({ productId, quantity }: { productId: string; quantity: number }) => {
  const { data: product } = useGetProductDetailsQuery(productId);
  const name = product?.name || product?.title || `Product ${productId}`;
  const image = product?.images?.[0];
  const price = product?.discountPrice || product?.price || 0;

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="w-[60px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/product/${productId}`} className="text-[14px] font-semibold text-zinc-900 dark:text-white line-clamp-2 hover:underline transition-colors">
          {name}
        </Link>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[15px] font-bold text-zinc-900 dark:text-white">{formatINR(price)}</p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">QTY: {quantity}</p>
      </div>
    </div>
  );
};

const OrderSuccessPage = () => {
  const { id } = useParams();
  const { data: order, isLoading, error } = useGetOrderDetailsQuery(id);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0F0F10]">
      <div className="w-12 h-12 border-4 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#0F0F10] text-red-500">
      Failed to load order. <Link to="/" className="underline ml-2 font-semibold">Go Home</Link>
    </div>
  );

  const status = statusConfig[order.status] || statusConfig.pending;
  const isPaid = order.paymentStatus === 'paid';
  const paymentMethodLabel = 'RAZORPAY SECURE';
  const paymentStatusLabel = isPaid ? 'PAYMENT CAPTURED' : 'PAYMENT PENDING';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Success Banner */}
        <div className="text-center mb-10 animate-fadeIn">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full animate-ping" />
            <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <CheckCircle className="w-8 h-8 text-emerald-500" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
            Order Placed!
          </h1>
          <p className="text-[16px] text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Thank you for shopping with <span className="font-semibold text-zinc-900 dark:text-white">VASTRA</span>.
          </p>

          {/* Order ID badge */}
          <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-[#2A2A2A] shadow-sm">
            <Package size={16} className="text-zinc-400" strokeWidth={1.5} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Order</span>
            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white tracking-wider select-all">{order._id}</span>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white">Order Status</h3>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border ${status.className}`}>
              <Clock size={13} strokeWidth={2} />
              {status.label.toUpperCase()}
            </span>
            <p className="mt-3 text-[13px] text-zinc-500 dark:text-zinc-400">
              Estimated delivery: 5&ndash;8 business days
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white">Billing Details</h3>
            </div>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-1">Payment Method</p>
            <p className="text-[15px] font-semibold text-zinc-900 dark:text-white mb-2">{paymentMethodLabel}</p>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider px-3.5 py-1.5 rounded-full border ${
              isPaid
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
            }`}>
              {isPaid ? <><CheckCircle size={12} strokeWidth={2.5} /> {paymentStatusLabel}</> : paymentStatusLabel}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden mb-8">
          <div className="px-6 sm:px-8 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-zinc-400" strokeWidth={1.5} />
              Items in Order
            </h2>
          </div>
          <div className="px-6 sm:px-8 divide-y divide-zinc-100 dark:divide-zinc-800">
            {order.items.map((item: any, i: number) => (
              <OrderItemRow key={i} productId={item.productId} quantity={item.quantity} />
            ))}
          </div>
          <div className="px-6 sm:px-8 py-5 bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[14px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total</span>
            <span className="text-[28px] sm:text-[32px] font-bold text-zinc-900 dark:text-white tracking-tight">{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={`/orders/${order._id}`}
            className="inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <FileText size={18} strokeWidth={2} />
            Track Order
          </Link>
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]"
          >
            <ShoppingBag size={18} strokeWidth={2} />
            Continue Shopping
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
          {[
            { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Secure', sub: '256-bit SSL' },
            { icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>, label: 'Returns', sub: '30-day policy' },
            { icon: <Truck size={20} strokeWidth={1.5} />, label: 'Shipping', sub: `Free on ${formatINR(5000)}+` },
            { icon: <Clock size={20} strokeWidth={1.5} />, label: 'Support', sub: '24/7 assistance' },
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 py-4 px-2 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-250">
              <span className="text-zinc-400 dark:text-zinc-500">{feat.icon}</span>
              <p className="text-[12px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300">{feat.label}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{feat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;

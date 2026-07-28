import { Link, useParams, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useGetOrderDetailsQuery } from '../store/slices/orderApiSlice';
import { useGetProductDetailsQuery, useGetRelatedProductsQuery } from '../store/slices/productApiSlice';
import { ChevronRight, ShoppingBag, Package, CheckCircle, Clock, Truck, MapPin, AlertCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatINR } from '../lib/currency';
import ProductCard from '../components/product/ProductCard';
import ReturnRequestModal from '../components/returns/ReturnRequestModal';
import { useGetMyReturnsQuery } from '../store/slices/returnApiSlice';

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package, desc: 'Order has been placed' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, desc: 'Order has been confirmed' },
  { key: 'packed', label: 'Packed', icon: ShoppingBag, desc: 'Item has been packed' },
  { key: 'shipped', label: 'Shipped', icon: Truck, desc: 'Item has been shipped' },
  { key: 'out_for_delivery', label: 'Out For Delivery', icon: Truck, desc: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, desc: 'Package delivered' },
];

const STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  packed: 2,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'In Transit', className: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  packed: { label: 'Packed', className: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  shipped: { label: 'Shipped', className: 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  out_for_delivery: { label: 'Out For Delivery', className: 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  delivered: { label: 'Delivered', className: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  refunded: { label: 'Refunded', className: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  refund_completed: { label: 'Refunded', className: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  requested: { label: 'Return Requested', className: 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  approved: { label: 'Return Approved', className: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  item_received: { label: 'Item Received', className: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  item_not_received: { label: 'Item Not Received', className: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  rejected: { label: 'Return Rejected', className: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
};

const orderDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const OrderItemRow = ({ productId, quantity }: { productId: string; quantity: number }) => {
  const { data: product } = useGetProductDetailsQuery(productId);
  const name = product?.name || product?.title || `Product`;
  const image = product?.images?.[0];
  const price = product?.discountPrice || product?.price || 0;
  const color = product?.colors?.[0] || 'Black';
  const size = product?.sizes?.[0] || 'M';

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="w-[68px] h-[84px] shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><Package size={20} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/product/${productId}`} className="text-[14px] font-semibold text-zinc-900 dark:text-white line-clamp-2 hover:underline transition-colors">
          {name}
        </Link>
        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
          <span>Color: {color}</span>
          <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <span>Size: {size}</span>
          <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <span>Qty: {quantity}</span>
        </div>
        <p className="text-[15px] font-bold text-zinc-900 dark:text-white mt-2">{formatINR(price)}</p>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-72 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-12 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="w-full lg:w-[65%] space-y-6">
            <div className="h-52 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
            <div className="h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          </div>
          <div className="w-full lg:w-[35%] space-y-6">
            <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
            <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const OrderTrackingPage = () => {
  const { id } = useParams();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  if (!userInfo) {
    return <Navigate to={id ? `/login?redirect=/orders/${id}` : '/login?redirect=/account'} replace />;
  }

  const { data: order, isLoading, error } = useGetOrderDetailsQuery(id);
  const { data: myReturns } = useGetMyReturnsQuery(undefined, { skip: !id, pollingInterval: 3000 });
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(t); }, []);

  if (isLoading) return <Skeleton />;

  if (error) {
    const isForbidden = (error as any)?.status === 403 || (error as any)?.originalStatus === 403;

    if (isForbidden) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10] flex items-center justify-center">
          <div className="text-center px-6 py-16 max-w-md">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-950/30 rounded-full" />
              <AlertCircle className="relative z-10 w-9 h-9 text-red-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-[28px] font-bold text-zinc-900 dark:text-white mb-3">Access Denied</h1>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
              You do not have permission to view this order.
            </p>
            <Link to="/account" className="inline-flex items-center justify-center h-[52px] px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200">My Account</Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10] flex items-center justify-center">
        <div className="text-center px-6 py-16 max-w-md">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full" />
            <Package className="relative z-10 w-9 h-9 text-zinc-300 dark:text-zinc-600" strokeWidth={1} />
          </div>
          <h1 className="text-[28px] font-bold text-zinc-900 dark:text-white mb-3">Order Not Found</h1>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">The requested order could not be found.</p>
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 h-[52px] px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]">
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const hasReturn = myReturns?.some((r: any) => r.orderId === order._id);
  const currentReturn = myReturns?.find((r: any) => r.orderId === order._id);

  const isReturnRefunded = currentReturn && ['refunded', 'refund_completed', 'completed'].includes(String(currentReturn.status).toLowerCase());
  const isOrderRefunded = order.status === 'refunded' || isReturnRefunded;

  const activeStatusKey = isOrderRefunded
    ? 'refunded'
    : currentReturn
      ? String(currentReturn.status).toLowerCase()
      : (order.status || 'pending').toLowerCase();

  const paymentLabel = 'Razorpay Secure';
  const totalItemsPrice = order?.totalAmount || 0;

  const timelineSteps = isOrderRefunded
    ? [
        ...TIMELINE_STEPS,
        { key: 'refunded', label: 'Refund Completed', icon: RotateCcw, desc: 'Amount refunded to original payment method' },
      ]
    : TIMELINE_STEPS;

  const currentStepIndex = isOrderRefunded
    ? timelineSteps.length - 1
    : STEP_INDEX[order.status] ?? 0;

  const status = statusConfig[activeStatusKey] || statusConfig[order.status] || statusConfig.pending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: loaded ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-zinc-50 dark:bg-[#0F0F10]"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] font-semibold text-zinc-400 dark:text-zinc-500 mb-6">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Home</Link>
          <ChevronRight size={12} strokeWidth={2.5} />
          <Link to="/account" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">My Orders</Link>
          <ChevronRight size={12} strokeWidth={2.5} />
          <span className="text-zinc-700 dark:text-zinc-300">Track Order</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-zinc-900 dark:text-white tracking-tight">Track Your Order</h1>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">Stay updated with your shipment in real time.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-4">
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold border shadow-sm w-fit ${status.className}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {status.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* Left Column - 65% */}
          <div className="w-full lg:w-[65%] space-y-6">

            {/* Order Info Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: loaded ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-250"
            >
              <div className="px-6 sm:px-8 py-5 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Package size={18} className="text-zinc-400" strokeWidth={1.5} />
                  Order Information
                </h2>
              </div>
              <div className="px-6 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">Placed on</p>
                  <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">{orderDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">Estimated Delivery</p>
                  <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">
                    {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">Payment</p>
                  <p className="text-[14px] font-semibold text-zinc-900 dark:text-white capitalize">{paymentLabel}</p>
                </div>
              </div>
            </motion.div>

            {/* Delivery Timeline */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: loaded ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-250"
            >
              <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white mb-8">
                {isOrderRefunded ? 'Order & Refund Progress' : 'Delivery Progress'}
              </h2>
              <div className="space-y-0">
                {timelineSteps.map((step, idx) => {
                  const isComplete = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = step.icon;
                  const isRefundStep = step.key === 'refunded';
                  const dateStr = isComplete || isCurrent
                    ? (isRefundStep && currentReturn?.updatedAt
                        ? new Date(currentReturn.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' • ' + new Date(currentReturn.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' • ' + new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      )
                    : '';

                  return (
                    <div key={step.key} className="flex gap-5 relative pb-8 last:pb-0">
                      {/* Timeline line */}
                      {idx < timelineSteps.length - 1 && (
                        <div className={`absolute left-[17px] top-10 w-[2px] h-[calc(100%-32px)] rounded-full ${
                          isComplete ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`} />
                      )}
                      {/* Icon */}
                      <div className={`relative flex items-center justify-center w-[36px] h-[36px] rounded-full border-2 shrink-0 transition-all duration-300 ${
                        isRefundStep
                          ? 'bg-amber-500 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105'
                          : isComplete
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : isCurrent
                          ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] scale-105'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600'
                      }`}>
                        {isRefundStep ? <RotateCcw size={16} strokeWidth={2.5} /> : isComplete || isCurrent ? <CheckCircle size={16} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={1.5} />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <p className={`text-[14px] font-bold transition-colors ${
                          isRefundStep ? 'text-amber-600 dark:text-amber-400' : isComplete ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-[12px] text-zinc-500 dark:text-zinc-500 mt-0.5">{step.desc}</p>
                        {dateStr && (
                          <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-600 mt-1">{dateStr}</p>
                        )}
                        {isCurrent && !isComplete && !isRefundStep && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                            <Clock size={11} strokeWidth={2} />
                            Expected delivery soon
                          </span>
                        )}
                        {isRefundStep && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            <RotateCcw size={11} strokeWidth={2} />
                            Refund process completed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            </div>

          {/* Right Column - 35% */}
          <div className="w-full lg:w-[35%] space-y-6">

            {/* Order Summary Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: loaded ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-250"
            >
              <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-[16px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-zinc-400" strokeWidth={1.5} />
                  Order Summary
                </h2>
              </div>

              {/* Items */}
              <div className="px-6 divide-y divide-zinc-100 dark:divide-zinc-800">
                {order.items?.map((item: any, i: number) => (
                  <OrderItemRow key={i} productId={item.productId} quantity={item.quantity} />
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{formatINR(totalItemsPrice)}</span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                  <span className="text-[15px] font-bold text-zinc-900 dark:text-white">Total</span>
                  <span className="text-[22px] font-bold text-zinc-900 dark:text-white tracking-tight">{formatINR(totalItemsPrice)}</span>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: loaded ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="space-y-3"
            >
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full inline-flex items-center justify-center gap-2.5 h-[52px] rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98]"
              >
                <ShoppingBag size={17} strokeWidth={2} />
                Continue Shopping
              </Link>
              <Link
                to="/contact"
                className="w-full inline-flex items-center justify-center gap-2.5 h-[52px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[14px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200 active:scale-[0.98]"
              >
                <HelpCircle size={17} strokeWidth={1.5} />
                Need Help?
              </Link>
              
              {/* Return UI */}
              {order.status === 'delivered' && !hasReturn && (
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2.5 h-[52px] rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[14px] font-bold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200 active:scale-[0.98]"
                >
                  Return Request
                </button>
              )}

              {hasReturn && currentReturn && (
                <div className="mt-4 p-4 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/30">
                  <h3 className="text-[14px] font-bold text-orange-800 dark:text-orange-400 mb-2">Return Status</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700 dark:text-orange-500 capitalize font-medium">{currentReturn.status.replace(/_/g, ' ')}</span>
                    <span className="text-orange-600 dark:text-orange-500/70">{new Date(currentReturn.createdAt).toLocaleDateString()}</span>
                  </div>
                  {currentReturn.adminRemarks && (
                    <div className="mt-3 text-xs bg-white dark:bg-black/20 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/30 text-orange-800 dark:text-orange-400/90">
                      <p className="font-semibold mb-1 opacity-70">Admin Note:</p>
                      <p>{currentReturn.adminRemarks}</p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>

          </div>
        </div>

        {isReturnModalOpen && (
          <ReturnRequestModal
            orderId={order._id}
            items={order.items || []}
            onClose={() => setIsReturnModalOpen(false)}
            onSuccess={() => setIsReturnModalOpen(false)}
          />
        )}

        {/* Recommended Products */}
        <RecommendedSection productId={id} />
      </div>
    </motion.div>
  );
};

const RecommendedSection = ({ productId }: { productId?: string }) => {
  const firstItemId = productId;
  const { data: relatedData } = useGetRelatedProductsQuery(firstItemId, { skip: !firstItemId });
  const related = relatedData?.products || [];

  if (!related.length) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="mt-10 mb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-bold text-zinc-900 dark:text-white tracking-tight">You May Also Like</h2>
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          View All <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {related.slice(0, 5).map((product: any) => (
          <ProductCard key={product.pid || product._id} product={product} />
        ))}
      </div>
    </motion.div>
  );
};

export default OrderTrackingPage;

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  User,
  Package,
  MapPin,
  CreditCard,
  CalendarDays,
  ShieldCheck,
  Box,
  Truck,
  Receipt,
  Hash,
  Ruler,
  Palette,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { adminApi, type AdminOrder } from '../../services/adminApi';
import PaymentBadge from '../../components/admin/PaymentBadge';
import StatusDropdown from '../../components/admin/StatusDropdown';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';

const PLACEHOLDER_IMAGE = 'https://placehold.co/160x160?text=No+Image';

const TIMELINE = [
  { key: 'pending', label: 'Order Created' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const TIMELINE_ALIASES: Record<string, string> = {};

function normalizeStatus(status: string) {
  const key = String(status || 'pending').toLowerCase();
  return TIMELINE_ALIASES[key] ?? key;
}



function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function InfoRow({ label, value, mono = false, icon }: { label: string; value: React.ReactNode; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
        {icon}
        {label}
      </span>
      <span className={`text-[13px] font-semibold text-zinc-900 dark:text-white text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function SectionHeader({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
        <span className="text-orange-500">{icon}</span>
        {title}
      </h3>
      {right}
    </div>
  );
}

export default function AdminOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { formatAdminCurrency } = useAdminCurrency();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi.orders.getById(orderId!)
      .then((o) => { if (!cancelled) setOrder(o); })
      .catch((err: any) => { if (!cancelled) setError(err?.message ?? 'Failed to load order'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!order) return;
    try {
      setUpdating(true);
      await adminApi.orders.updateStatus(order._id, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }, [order]);



  const summary = useMemo(() => {
    if (!order) return null;
    const subtotal = (order.items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (it.quantity || 1),
      0
    );
    const total = Number(order.totalAmount || 0);
    const discount = subtotal > total ? subtotal - total : 0;
    const shipping = subtotal <= total ? total - subtotal : 0;
    return { subtotal, discount, shipping, total };
  }, [order]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Package className="h-10 w-10 text-zinc-400 mb-4" />
        <p className="text-red-500 text-sm font-semibold">{error ?? 'Order not found'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-orange-500 text-sm font-bold underline cursor-pointer"
        >
          Retry
        </button>
        <Link to="/admin/orders" className="mt-4 text-sm font-semibold text-zinc-500 hover:text-orange-500 transition-colors flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
      </div>
    );
  }

  const customer = order.userId;
  const name = (customer
    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
    : 'Guest User') || 'Guest User';
  const initials = String(name).substring(0, 2).toUpperCase();
  const currentStatus = normalizeStatus(order.status);
  const currentIndex = Math.max(TIMELINE.findIndex((s) => s.key === currentStatus), 0);
  const isCancelled = order.status?.toLowerCase() === 'cancelled';

  const addressLines = order.shippingDetails
    ? [
      order.shippingDetails.address,
      order.shippingDetails.city,
      order.shippingDetails.province,
      order.shippingDetails.zip,
      order.shippingDetails.countryCode || order.shippingDetails.country,
    ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Order <span className="text-orange-500">#{order._id.slice(-8).toUpperCase()}</span>
            </h1>
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
            <CalendarDays size={14} />
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusDropdown value={order.status} onChange={handleStatusChange} loading={updating} accent />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left column: Customer + Order Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <SectionHeader icon={<User size={15} />} title="Customer Information" />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md shadow-orange-500/20">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-zinc-900 dark:text-white truncate">{name}</p>
                  {customer?.email && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                      <Mail size={13} /> {customer.email}
                    </p>
                  )}
                  {customer?.phone && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5">
                      <Phone size={13} /> {customer.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Shipping Address</p>
                {addressLines.length ? (
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {order.shippingDetails?.customerName && <>{order.shippingDetails.customerName}<br /></>}
                    {addressLines.join(', ')}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">No shipping address</p>
                )}
                {order.shippingDetails?.phone && (
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <Phone size={13} className="text-zinc-400" /> {order.shippingDetails.phone}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono break-all">
                <Hash size={12} className="shrink-0" />
                <span>User ID: {customer?._id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <SectionHeader icon={<ShieldCheck size={15} />} title="Order Information" />
            <div className="px-5 sm:px-6">
              <InfoRow icon={<Hash size={13} />} label="Order ID" value={order._id} mono />
              <InfoRow icon={<CalendarDays size={13} />} label="Placed On" value={formatDateShort(order.createdAt)} />
              <InfoRow icon={<Box size={13} />} label="Order Status" value={order.status || 'pending'} />
              <InfoRow icon={<CreditCard size={13} />} label="Payment Status" value={order.paymentStatus || 'unpaid'} />
              <InfoRow icon={<CreditCard size={13} />} label="Payment Method" value={order.paymentProvider || 'Stripe'} />
              {order.paymentIntentId && (
                <InfoRow icon={<CreditCard size={13} />} label="Stripe Payment Intent" value={order.paymentIntentId} mono />
              )}
              {order.checkoutSessionId && (
                <InfoRow icon={<CreditCard size={13} />} label="Stripe Checkout Session" value={order.checkoutSessionId} mono />
              )}
              {order.receiptUrl && (
                <InfoRow
                  icon={<CreditCard size={13} />}
                  label="Receipt"
                  value={
                    <a
                      href={order.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-500 hover:text-orange-600 font-semibold underline"
                    >
                      View Receipt
                    </a>
                  }
                />
              )}
            </div>
          </div>

          {/* Payment Summary */}
          {summary && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <SectionHeader icon={<Receipt size={15} />} title="Payment Summary" />
              <div className="px-5 sm:px-6 pt-2 pb-5">
                {/* <InfoRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
                  <InfoRow label="Shipping" value={summary.shipping > 0 ? formatCurrency(summary.shipping) : 'Included'} />
                  <InfoRow label="Tax" value="Included" />
                  {summary.discount > 0 && (
                    <InfoRow label="Discount" value={<span className="text-emerald-600 dark:text-emerald-400">− {formatCurrency(summary.discount)}</span>} />
                  )} */}
                <div className="flex items-center justify-between py-4 mt-2 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Grand Total</span>
                  <span className="text-[26px] font-bold text-[#111827] dark:text-white tracking-tight">
                    {formatAdminCurrency(summary.total)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Items + Timeline */}
        <div className="xl:col-span-2 space-y-6">
          {/* Ordered Products */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <SectionHeader
              icon={<Package size={15} />}
              title={`Ordered Products (${order.items?.length || 0})`}
              right={<Truck size={16} className="text-zinc-300 dark:text-zinc-600" />}
            />
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {order.items?.length ? (
                order.items.map((item: any, idx: number) => {
                  const unitPrice = Number(item.price) || 0;
                  const lineTotal = unitPrice * (item.quantity || 1);
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6">
                      {/* Product Image */}
                      <Link
                        to={`/admin/products/${item.productId}`}
                        className="shrink-0 block w-20 h-20 rounded-xl overflow-hidden bg-white border border-zinc-200 dark:border-zinc-700 shadow-sm group"
                        aria-label={`View ${item.productName || 'product'}`}
                      >
                        <img
                          src={item.image || PLACEHOLDER_IMAGE}
                          alt={item.productName || 'Product'}
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/admin/products/${item.productId}`}
                          className="text-[15px] font-bold text-zinc-900 dark:text-white leading-snug line-clamp-1 hover:text-orange-500 transition-colors"
                        >
                          {item.productName || 'Unknown Product'}
                        </Link>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {item.productId && <span>PID: {item.productId}</span>}
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
                          {item.color && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg">
                              <Palette size={11} />
                              <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 dark:border-zinc-600 inline-block" style={{ background: item.color }} />
                              {item.color}
                            </span>
                          )}
                          {item.size && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg">
                              <Ruler size={11} /> Size: {item.size}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Qty + Price + View */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 sm:gap-1.5 shrink-0">
                        <span className="px-3.5 py-1.5 rounded-full bg-orange-500 text-white text-sm font-bold shadow-md shadow-orange-500/20 whitespace-nowrap">
                          Qty {item.quantity}
                        </span>
                        <div className="text-right">
                          <p className="text-xs text-zinc-400">Unit {formatAdminCurrency(unitPrice)}</p>
                          <p className="text-base font-extrabold text-zinc-900 dark:text-white whitespace-nowrap">
                            {formatAdminCurrency(lineTotal)}
                          </p>
                        </div>
                        <Link
                          to={`/admin/products/${item.productId}`}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                        >
                          View Product <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-zinc-400 text-center py-8">No items</p>
              )}
            </div>
          </div>

          {/* Shipping Timeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <SectionHeader icon={<Truck size={15} />} title="Shipping Timeline" />
            <div className="p-5 sm:p-6">
              {isCancelled ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                    <CheckCircle2 size={22} className="text-red-500" />
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Order Cancelled</p>
                  <p className="text-xs text-zinc-400 mt-1">This order has been cancelled.</p>
                </div>
              ) : (
                <ol className="relative">
                  {TIMELINE.map((step, i) => {
                    const isReached = i <= currentIndex;
                    const isCurrent = i === currentIndex;
                    return (
                      <li key={step.key} className="flex items-center gap-4 pb-8 last:pb-0 relative">
                        {i < TIMELINE.length - 1 && (
                          <span
                            className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${isReached && i < currentIndex ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                          />
                        )}
                        <span
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${isReached
                            ? isCurrent
                              ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110'
                              : 'bg-orange-500/10 border-orange-500 text-orange-500'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600'
                            }`}
                        >
                          {isReached ? <CheckCircle2 size={15} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[15px] font-bold ${isCurrent ? 'text-orange-500' : isReached ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {step.label}
                            {isCurrent && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Box, CalendarDays, ArrowUpRight } from 'lucide-react';
import type { AdminOrder } from '../../services/adminApi';
import PaymentBadge from './PaymentBadge';
import StatusDropdown from './StatusDropdown';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';

const PLACEHOLDER_IMAGE = 'https://placehold.co/60x60?text=No+Image';

function initialsOf(order: AdminOrder): string {
  const customer = order.userId;
  const name = customer
    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
    : '';
  return String(name || '?').substring(0, 2).toUpperCase();
}

function customerNameOf(order: AdminOrder): string {
  const customer = order.userId;
  return (customer
    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
    : 'Guest User') || 'Guest User';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const OrderCard = memo(function OrderCard({
  order,
  updating,
  onUpdateStatus,
}: {
  order: AdminOrder;
  updating: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const name = customerNameOf(order);
  const initials = initialsOf(order);
  const total = Number(order.totalAmount ?? 0);
  const itemCount = order.items?.length || 0;
  const itemImage = order.items?.[0]?.image || PLACEHOLDER_IMAGE;
  const isJustUpdated = false;
  const { formatAdminCurrency } = useAdminCurrency();

  return (
    <div
      className={`group grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.1fr_1.5fr_0.6fr_1fr_0.9fr_0.8fr_1.1fr] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-orange-500/40 ${
        isJustUpdated ? 'ring-1 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20' : ''
      }`}
    >
      {/* Order ID */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Order ID</p>
        <Link
          to={`/admin/orders/${order._id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 font-mono tracking-tight hover:text-orange-600 transition-colors"
        >
          <span className="text-xs font-medium text-orange-400/70">#</span>
          {order._id.slice(-8).toUpperCase()}
        </Link>
      </div>

      {/* Customer */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Customer</p>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow-2xs">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate leading-tight">{name}</p>
            {order.userId?.email && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">{order.userId.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Items</p>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 hidden sm:block">
            <img src={itemImage} alt="" loading="lazy" className="w-full h-full object-cover" />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <Box size={13} className="text-zinc-400" />
            {itemCount}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Amount</p>
        <p className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tracking-tight tabular-nums whitespace-nowrap">
          {formatAdminCurrency(total)}
        </p>
      </div>

      {/* Date */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Date</p>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-zinc-400 shrink-0 hidden sm:block" />
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Payment */}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 lg:hidden">Payment</p>
        <PaymentBadge status={order.paymentStatus} />
      </div>

      {/* Status + Action */}
      <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 min-w-0">
        <StatusDropdown value={order.status} onChange={(s) => onUpdateStatus(order._id, s)} loading={updating} />
        <Link
          to={`/admin/orders/${order._id}`}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-500/10 transition-all duration-150 cursor-pointer shrink-0"
        >
          View Order
          <ArrowUpRight size={13} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
});

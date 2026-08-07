import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, RefreshCw, X, ChevronRight, Eye, Package, Hash, CalendarDays } from 'lucide-react';
import { adminApi, type AdminReturn } from '../../services/adminApi';
import toast from 'react-hot-toast';

const statusFlow = ['requested', 'approved', 'item_not_received', 'item_received', 'not_refunded', 'refunded', 'rejected'];

export default function AdminReturnRequests() {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reviewModalReturn, setReviewModalReturn] = useState<AdminReturn | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [viewItemsReturn, setViewItemsReturn] = useState<AdminReturn | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollTabs = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };
  const closeReviewModal = () => {
    setReviewModalReturn(null);
    setAdminNote('');
  };

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.returns.list();
      setReturns(data.returns ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const openViewItems = (ret: AdminReturn) => setViewItemsReturn(ret);
  const closeViewItems = () => setViewItemsReturn(null);
  const goToReview = (ret: AdminReturn) => {
    setViewItemsReturn(null);
    setReviewModalReturn(ret);
    setAdminNote(ret.adminRemarks || '');
  };

  // Lock body scroll while a modal is open
  useEffect(() => {
    document.body.style.overflow = reviewModalReturn || viewItemsReturn ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [reviewModalReturn, viewItemsReturn]);

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    try {
      await adminApi.returns.updateStatus(returnId, newStatus, adminNote);
      setReturns(prev =>
        prev.map(r => r._id === returnId ? { ...r, status: newStatus, adminRemarks: adminNote } : r)
      );
      toast.success('Return status updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    } finally {
      closeReviewModal();
    }
  };

  const filtered = selectedStatus
    ? returns.filter((r) => r.status === selectedStatus)
    : returns;

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'requested').length,
    completed: returns.filter(r => r.status === 'refunded').length,
    rejected: returns.filter(r => r.status === 'rejected').length,
    awaiting_item: returns.filter(r => r.status === 'approved').length,
    ready_to_refund: returns.filter(r => r.status === 'item_received').length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Return Requests</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Track and manage customer returns and refunds</p>
        </div>
        <button onClick={fetchReturns} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm cursor-pointer transition-colors">
          <RefreshCw className="h-4 w-4 text-orange-500" />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'AWAITING REVIEW', value: stats.pending, color: 'text-red-500' },
          { label: 'AWAITING ITEM', value: stats.awaiting_item, color: 'text-zinc-900 dark:text-white' },
          { label: 'READY TO REFUND', value: stats.ready_to_refund, color: 'text-orange-500' },
          { label: 'REFUNDED', value: stats.completed, color: 'text-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 shadow-xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-md transition-colors duration-200">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase mb-1">{stat.label}</p>
            <p className={`text-3xl font-extrabold ${stat.color}`}>{loading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Filter tabs */}
        <div className="relative border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center pr-12">
          {/* Scrollable tabs container */}
          <div
            ref={tabsRef}
            className="flex-1 overflow-x-auto scrollbar-hide flex gap-2 py-3.5 px-4 whitespace-nowrap scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => setSelectedStatus('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${!selectedStatus
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
            >
              All
            </button>
            {statusFlow.map(s => {
              const count = returns.filter((r) => r.status === s).length;
              const isSelected = selectedStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                >
                  <span className="capitalize">{s.replace(/_/g, ' ')}</span> {count > 0 && <span className="ml-1 opacity-80 font-bold">({count})</span>}
                </button>
              );
            })}
          </div>

        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-red-500 text-sm font-semibold">{error}</p>
            <button onClick={fetchReturns} className="mt-3 text-orange-500 text-sm font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Items</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                  <th className="px-6 py-4 font-semibold">Stage</th>
                  <th className="px-6 py-4 font-semibold">Requested</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filtered.map((ret) => {
                  const customer = ret.userId;
                  const customerName = customer
                    ? (customer.name || customer.email || 'Unknown')
                    : 'Unknown';

                  return (
                    <tr key={ret._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-orange-500 font-extrabold whitespace-nowrap">
                        #{ret.orderId ? (ret.orderId.length > 8 ? ret.orderId.slice(-8).toUpperCase() : ret.orderId.toUpperCase()) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">{customerName}</p>
                        <p className="text-xs text-zinc-400 truncate max-w-[180px]">{customer?.email || 'N/A'}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-orange-500">
                            {ret.totalItems || ret.items?.length || 0} Item(s)
                          </span>

                          <span className="text-xs text-zinc-500">
                            {ret.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} Qty
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 max-w-[200px] truncate">{ret.reason}</td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-zinc-900 dark:text-white font-bold text-xs">{ret.status.replace(/_/g, ' ')}</span>
                      </td>

                      <td className="px-6 py-4 flex items-center justify-between">
                        <span className="text-zinc-400 text-xs">{new Date(ret.createdAt).toLocaleDateString('en-GB')}</span>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => openViewItems(ret)}
                            className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Eye size={13} className="text-orange-500" />
                            View Items
                          </button>
                          <button
                            onClick={() => {
                              setReviewModalReturn(ret);
                              setAdminNote(ret.adminRemarks || '');
                            }}
                            className="px-4 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RotateCcw className="h-8 w-8 text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No return requests found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {viewItemsReturn && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={closeViewItems}>
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-orange-500 uppercase mb-1 flex items-center gap-1.5">
                  <Package size={12} /> Returned Products
                </p>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  Order #
                  <span className="text-orange-500">
                    {viewItemsReturn.orderId ? (viewItemsReturn.orderId.length > 8 ? viewItemsReturn.orderId.slice(-8).toUpperCase() : viewItemsReturn.orderId.toUpperCase()) : 'N/A'}
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {viewItemsReturn.userId?.name || 'Unknown'} · {viewItemsReturn.userId?.email || 'N/A'}
                </p>
              </div>
              <button onClick={closeViewItems} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Summary */}
            <div className="mx-6 mt-5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Requested</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-zinc-400" />
                  {new Date(viewItemsReturn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Items</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                  {viewItemsReturn.totalItems || viewItemsReturn.items?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Quantity</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                  {viewItemsReturn.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Refund Amount</p>
                <p className="text-sm font-bold text-orange-500 mt-1">
                  ₹{Number(viewItemsReturn.refundAmount ?? viewItemsReturn.totalReturnAmount ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="mx-6 mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Return Reason</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{viewItemsReturn.reason}</p>
              {viewItemsReturn.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{viewItemsReturn.description}</p>
              )}
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto mt-4 px-6 pb-2 space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Returned Products ({viewItemsReturn.items?.length || 0})
              </h3>
              {viewItemsReturn.items?.length ? (
                viewItemsReturn.items.map((item, index) => {
                  const unitPrice = Number(item.price) || 0;
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
                      <img
                        src={item.productImage || 'https://placehold.co/60x60?text=No+Image'}
                        alt={item.productName || 'Product'}
                        loading="lazy"
                        className="w-16 h-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-white text-sm line-clamp-1">{item.productName || 'Unknown Product'}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <Hash size={11} className="shrink-0" /> PID: {item.productId || 'N/A'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Size: {item.productSize || '—'}</span>
                          <span>Color: {item.productColor || '—'}</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xs text-zinc-400">Unit ₹{unitPrice.toLocaleString('en-IN')}</p>
                        <p className="text-base font-extrabold text-zinc-900 dark:text-white">₹{lineTotal.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-zinc-400 text-center py-6">No items found</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              <button
                onClick={closeViewItems}
                className="flex-1 bg-zinc-100 dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                CLOSE
              </button>
              <button
                onClick={() => goToReview(viewItemsReturn)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer shadow-md shadow-orange-500/20"
              >
                REVIEW RETURN
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModalReturn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeReviewModal}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-[95vw] sm:max-w-[700px] lg:max-w-[960px] xl:max-w-[1000px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center gap-4 p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold tracking-widest text-orange-500 uppercase mb-1">Return Request</p>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
                  Order #{reviewModalReturn.orderId ? (reviewModalReturn.orderId.length > 8 ? reviewModalReturn.orderId.slice(-8).toUpperCase() : reviewModalReturn.orderId.toUpperCase()) : 'N/A'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                  {reviewModalReturn.userId?.name || 'Unknown'} · {reviewModalReturn.userId?.email || 'N/A'}
                </p>
              </div>
              <button onClick={closeReviewModal} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Stage */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-white text-base capitalize">Stage:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                    reviewModalReturn.status === 'rejected'
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : reviewModalReturn.status === 'refunded'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    }`}
                >
                  {reviewModalReturn.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Progress tracker spanning full width */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-4">Progress</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-3 gap-y-3">
                  {statusFlow.map((step, index) => {
                    const currentIndex = statusFlow.indexOf(reviewModalReturn.status);
                    const isPast = index < currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={step} className="flex items-center gap-2 min-w-0">
                        <div
                          className={`shrink-0 w-3 h-3 rounded-full border-2 ${isPast || isCurrent ? 'border-orange-500 bg-orange-500' : 'border-zinc-400 bg-white dark:bg-zinc-800'}`}
                        />
                        <span
                          className={`text-xs capitalize truncate ${isPast || isCurrent ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-400 font-medium'}`}
                        >
                          {step.replace(/_/g, ' ')}
                        </span>
                        {isCurrent && <span className="text-[10px] text-orange-500 font-bold shrink-0">•</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason + Comments: two-column on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-2">Reason</p>
                  <p className="text-sm text-zinc-900 dark:text-white font-semibold leading-relaxed">{reviewModalReturn.reason}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-2">Comments</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">{reviewModalReturn.description || '—'}</p>
                </div>
              </div>

              {/* Returned Products */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Returned Products ({reviewModalReturn.items?.length || 0})
                </h3>

                {reviewModalReturn.items?.length ? (
                  reviewModalReturn.items.map((item, index) => {
                    const unitPrice = Number(item.price) || 0;
                    const lineTotal = unitPrice * item.quantity;
                    const sku = (item as any).sku;
                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950"
                      >
                        <img
                          src={item.productImage || 'https://placehold.co/96x96?text=No+Image'}
                          alt={item.productName || 'Product'}
                          loading="lazy"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-white text-[15px] leading-snug line-clamp-2">
                            {item.productName || 'Unknown Product'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
                            {sku && (
                              <span className="text-zinc-500 dark:text-zinc-400">
                                <span className="text-zinc-400 uppercase tracking-wider">SKU</span> <span className="font-mono text-zinc-800 dark:text-zinc-200">{sku}</span>
                              </span>
                            )}
                            <span className="text-zinc-500 dark:text-zinc-400">
                              <span className="text-zinc-400 uppercase tracking-wider">Qty</span> <span className="font-semibold text-zinc-900 dark:text-white">{item.quantity}</span>
                            </span>
                            <span className="text-zinc-500 dark:text-zinc-400">
                              <span className="text-zinc-400 uppercase tracking-wider">Size</span> <span className="font-semibold text-zinc-900 dark:text-white">{item.productSize || '—'}</span>
                            </span>
                            <span className="text-zinc-500 dark:text-zinc-400">
                              <span className="text-zinc-400 uppercase tracking-wider">Color</span> <span className="font-semibold text-zinc-900 dark:text-white">{item.productColor || '—'}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0">
                          <p className="text-xs text-zinc-400">Unit ₹{unitPrice.toLocaleString('en-IN')}</p>
                          <p className="text-xl font-extrabold text-zinc-900 dark:text-white whitespace-nowrap">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-6">No items found</p>
                )}
              </div>

              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Add a note (optional) — the customer sees this on their order timeline."
                className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
                rows={3}
              />
            </div>

            {/* Footer: fixed actions */}
            <div className="p-5 sm:p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 bg-white dark:bg-zinc-900">
              {reviewModalReturn.status === 'requested' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'approved')}
                    className="flex-1 min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'rejected')}
                    className="flex-1 min-h-[48px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    REJECT
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'approved' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_received')}
                    className="flex-1 min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    ITEM RECEIVED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_not_received')}
                    className="flex-1 min-h-[48px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    ITEM NOT RECEIVED
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'item_received' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'refunded')}
                    className="flex-1 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    REFUNDED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'not_refunded')}
                    className="flex-1 min-h-[48px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    NOT REFUNDED
                  </button>
                </>
              )}

              {!['requested', 'approved', 'item_received'].includes(reviewModalReturn.status) && (
                <div className="w-full text-center text-xs font-bold text-zinc-400 py-2 min-h-[48px] flex items-center justify-center">
                  Status: {reviewModalReturn.status.replace(/_/g, ' ').toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, RefreshCw, X } from 'lucide-react';
import { adminApi, type AdminReturn } from '../../services/adminApi';
import toast from 'react-hot-toast';

const statusFlow = ['requested', 'approved', 'item_not_received', 'item_received', 'not_refunded', 'refunded', 'rejected'];

export default function AdminReturnRequests() {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewModalReturn, setReviewModalReturn] = useState<AdminReturn | null>(null);
  const [adminNote, setAdminNote] = useState('');

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

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    try {
      setUpdatingId(returnId);
      await adminApi.returns.updateStatus(returnId, newStatus, adminNote);
      setReturns(prev =>
        prev.map(r => r._id === returnId ? { ...r, status: newStatus, adminRemarks: adminNote } : r)
      );
      toast.success('Return status updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
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
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !selectedStatus 
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="capitalize">{s.replace(/_/g, ' ')}</span> {count > 0 && <span className="ml-1 opacity-80 font-bold">({count})</span>}
              </button>
            );
          })}
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
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
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

                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 max-w-[200px] truncate">{ret.reason}</td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-zinc-900 dark:text-white font-bold text-xs">{ret.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 flex items-center justify-between">
                        <span className="text-zinc-400 text-xs">{new Date(ret.createdAt).toLocaleDateString('en-GB')}</span>
                        <button
                          onClick={() => {
                            setReviewModalReturn(ret);
                            setAdminNote(ret.adminRemarks || '');
                          }}
                          className="ml-4 px-4 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
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

      {reviewModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-orange-500 uppercase mb-1">Return Request</p>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Order #{reviewModalReturn.orderId ? (reviewModalReturn.orderId.length > 8 ? reviewModalReturn.orderId.slice(-8).toUpperCase() : reviewModalReturn.orderId.toUpperCase()) : 'N/A'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {reviewModalReturn.userId?.name || 'Unknown'} · {reviewModalReturn.userId?.email || 'N/A'}
                </p>
              </div>
              <button onClick={closeReviewModal} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="font-bold text-zinc-900 dark:text-white text-base capitalize">Stage: {reviewModalReturn.status.replace(/_/g, ' ')}</div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-3">Progress</p>
                <div className="space-y-3 relative">
                  {statusFlow.map((step, index) => {
                    const currentIndex = statusFlow.indexOf(reviewModalReturn.status);
                    const isPast = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <div key={step} className="flex items-center gap-3 relative z-10">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${isPast || isCurrent ? 'border-orange-500 bg-orange-500' : 'border-zinc-400 bg-zinc-100 dark:bg-zinc-800'}`} />
                        <span className={`text-xs ${isPast || isCurrent ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-400 font-medium'} capitalize`}>
                          {step.replace(/_/g, ' ')}
                        </span>
                        {isCurrent && <span className="text-[10px] text-orange-500 font-bold ml-2">— current</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Reason</span>
                  <span className="text-zinc-900 dark:text-white font-semibold">{reviewModalReturn.reason}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <span className="text-zinc-500 dark:text-zinc-400">Comments</span>
                  <span className="text-zinc-900 dark:text-white font-medium max-w-[60%] text-right">{reviewModalReturn.description || '-'}</span>
                </div>
              </div>

              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Add a note (optional) — the customer sees this on their order timeline."
                className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
                rows={3}
              />
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              {reviewModalReturn.status === 'requested' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'approved')}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'rejected')}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    REJECT
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'approved' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_received')}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    ITEM RECEIVED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_not_received')}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    ITEM NOT RECEIVED
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'item_received' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'refunded')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    REFUNDED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'not_refunded')}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    NOT REFUNDED
                  </button>
                </>
              )}

              {!['requested', 'approved', 'item_received'].includes(reviewModalReturn.status) && (
                <div className="w-full text-center text-xs font-bold text-zinc-400 py-2">
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

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';
import { adminApi, type AdminReturn } from '../../services/adminApi';

const statusFlow = ['requested', 'approved', 'item_not_received', 'item_received', 'not_refunded', 'refunded', 'rejected'];
const statusColors: Record<string, string> = {
  requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-blue-100 text-blue-700',
  item_not_received: 'bg-red-100 text-red-700',
  item_received: 'bg-indigo-100 text-indigo-700',
  not_refunded: 'bg-red-100 text-red-700',
  refunded: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

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
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update status');
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Return Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage customer returns and refunds</p>
        </div>
        <button onClick={fetchReturns} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'AWAITING REVIEW', value: stats.pending, color: 'text-red-600', bg: 'bg-white' },
          { label: 'AWAITING ITEM', value: stats.awaiting_item, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'READY TO REFUND', value: stats.ready_to_refund, color: 'text-orange-500', bg: 'bg-white' },
          { label: 'REFUNDED', value: stats.completed, color: 'text-gray-900', bg: 'bg-white' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-5 shadow-sm border border-gray-200`}>
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{loading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filter tabs */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${!selectedStatus ? 'bg-[#3b2416] text-white' : 'text-gray-600 hover:bg-gray-200/50'}`}
          >
            All
          </button>
          {statusFlow.map(s => {
            const count = returns.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${selectedStatus === s ? 'bg-[#3b2416] text-white' : 'text-gray-600 hover:bg-gray-200/50'}`}
              >
                <span className="capitalize">{s.replace(/_/g, ' ')}</span> {count > 0 && <span className="ml-1 opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchReturns} className="mt-3 text-[#0050cb] text-sm underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-mono text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[11px] tracking-widest text-gray-400 uppercase">Order</th>
                  <th className="px-6 py-4 font-semibold text-[11px] tracking-widest text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 font-semibold text-[11px] tracking-widest text-gray-400 uppercase">Reason</th>
                  <th className="px-6 py-4 font-semibold text-[11px] tracking-widest text-gray-400 uppercase">Stage</th>
                  <th className="px-6 py-4 font-semibold text-[11px] tracking-widest text-gray-400 uppercase">Requested</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((ret) => {
                  const isUpdating = updatingId === ret._id;
                  const customer = ret.userId;
                  const customerName = customer
                    ? (customer.name || customer.email || 'Unknown')
                    : 'Unknown';

                  return (
                    <tr key={ret._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-[#3b2416] font-extrabold whitespace-nowrap">
                        #{ret.orderId ? (ret.orderId.length > 8 ? ret.orderId.slice(-8).toUpperCase() : ret.orderId.toUpperCase()) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 truncate max-w-[180px]">{customerName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{customer?.email || 'N/A'}</p>
                      </td>

                      <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{ret.reason}</td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-900 font-bold text-xs">{ret.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{new Date(ret.createdAt).toLocaleDateString('en-GB')}</span>
                        <button
                          onClick={() => {
                            setReviewModalReturn(ret);
                            setAdminNote(ret.adminRemarks || '');
                          }}
                          className="ml-4 px-4 py-1.5 bg-white border border-gray-200 text-gray-700 font-medium text-xs rounded shadow-sm hover:bg-gray-50"
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
              <div className="flex flex-col items-center justify-center py-12">
                <RotateCcw className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No return requests found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {reviewModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[#fcfaf8] w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#a37951] uppercase mb-1">Return Request</p>
                <h2 className="text-xl font-bold text-gray-900">
                  Order #{reviewModalReturn.orderId ? (reviewModalReturn.orderId.length > 8 ? reviewModalReturn.orderId.slice(-8).toUpperCase() : reviewModalReturn.orderId.toUpperCase()) : 'N/A'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {reviewModalReturn.userId?.name || 'Unknown'} · {reviewModalReturn.userId?.email || 'N/A'}
                </p>
              </div>
              <button onClick={closeReviewModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="font-bold text-gray-900 mb-6 capitalize">{reviewModalReturn.status.replace(/_/g, ' ')}</div>

              <div className="bg-[#f5efe9] p-5 rounded-xl mb-6">
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">Progress</p>
                <div className="space-y-3 relative">
                  {/* Progress Line */}
                  <div className="absolute left-1.5 top-2.5 bottom-2.5 w-0.5 bg-gray-300"></div>

                  {statusFlow.map((step, index) => {
                    const currentIndex = statusFlow.indexOf(reviewModalReturn.status);
                    const isPast = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <div key={step} className="flex items-center gap-3 relative z-10">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 bg-[#f5efe9] ${isPast || isCurrent ? 'border-[#8b6540] bg-[#8b6540]' : 'border-gray-300'}`} />
                        <span className={`text-sm ${isPast || isCurrent ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'} capitalize`}>
                          {step.replace(/_/g, ' ')}
                        </span>
                        {isCurrent && <span className="text-[10px] text-[#a37951] ml-2">— current</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 text-sm mb-6">

                <div className="flex justify-between">
                  <span className="text-gray-500">Payment method</span>
                  <span className="text-gray-900">Stripe</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <span className="text-gray-500">Reason</span>
                  <span className="text-gray-900">{reviewModalReturn.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comments</span>
                  <span className="text-gray-900 max-w-[60%] text-right">{reviewModalReturn.description || '-'}</span>
                </div>
              </div>

              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Add a note (optional) — the customer sees this on their order timeline."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#8b6540]"
                rows={3}
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-4">
              {reviewModalReturn.status === 'requested' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'approved')}
                    className="flex-1 bg-[#3b2416] hover:bg-[#2c1a0f] text-white py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'rejected')}
                    className="flex-1 bg-white border border-[#c13b3b] text-[#c13b3b] hover:bg-red-50 py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    REJECT
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'approved' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_received')}
                    className="flex-1 bg-[#3b2416] hover:bg-[#2c1a0f] text-white py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    ITEM RECEIVED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'item_not_received')}
                    className="flex-1 bg-white border border-[#c13b3b] text-[#c13b3b] hover:bg-red-50 py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    ITEM NOT RECEIVED
                  </button>
                </>
              )}

              {reviewModalReturn.status === 'item_received' && (
                <>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'refunded')}
                    className="flex-1 bg-[#3b2416] hover:bg-[#2c1a0f] text-white py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    REFUNDED
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewModalReturn._id, 'not_refunded')}
                    className="flex-1 bg-white border border-[#c13b3b] text-[#c13b3b] hover:bg-red-50 py-3 rounded-lg font-bold text-xs tracking-wider transition-colors"
                  >
                    NOT REFUNDED
                  </button>
                </>
              )}

              {!['requested', 'approved', 'item_received'].includes(reviewModalReturn.status) && (
                <div className="w-full text-center text-sm font-semibold text-gray-400 py-2">
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

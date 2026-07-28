import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { adminApi, type CustomerIssue } from '../../services/adminApi';

const priorityColors: Record<string, string> = {
  low: 'bg-zinc-50 text-zinc-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-600',
};

const statusColors: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
};

export default function AdminCustomerIssues() {
  const [issues, setIssues] = useState<CustomerIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.issues.list();
      setIssues(data.issues ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await adminApi.issues.updateStatus(id, newStatus);
      setIssues(prev =>
        prev.map(iss => iss._id === id ? { ...iss, status: newStatus as any } : iss)
      );
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = issues.filter((iss) => {
    const matchFilter = filter === 'all' || iss.status === filter;
    const customer = iss.userId;
    const customerName = String(customer
      ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
      : 'Unknown') || 'Unknown';
      
    const matchSearch =
      iss.subject.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase()) ||
      iss._id.toLowerCase().includes(search.toLowerCase());
      
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Issues</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${issues.length} total support tickets`}
          </p>
        </div>
        <button onClick={fetchIssues} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex bg-gray-100/80 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {['all', 'open', 'in_progress', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  filter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchIssues} className="mt-3 text-[#0050cb] text-sm underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-mono text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Issue ID</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((iss) => {
                  const customer = iss.userId;
                  const customerName = String(customer
                    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
                    : 'Unknown') || 'Unknown';
                  const isUpdating = updatingId === iss._id;

                  return (
                    <tr key={iss._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        #{iss._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{customerName}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 max-w-[200px] truncate" title={iss.subject}>{iss.subject}</p>
                        {iss.description && (
                           <p className="text-xs text-gray-500 max-w-[200px] truncate" title={iss.description}>{iss.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${priorityColors[iss.priority] || 'bg-gray-100 text-gray-600'}`}>
                          {iss.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(iss.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {isUpdating ? (
                           <div className="w-5 h-5 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <select
                            value={iss.status}
                            onChange={(e) => handleStatusChange(iss._id, e.target.value)}
                            className={`text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0050cb] cursor-pointer capitalize font-medium ${statusColors[iss.status] || 'bg-white'}`}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No issues found matching your criteria</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

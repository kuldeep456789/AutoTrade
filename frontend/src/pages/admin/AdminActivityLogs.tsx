import { useState } from 'react';
import { Search, RefreshCw, Activity, Filter, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useActivityLogs } from '../../features/admin/api/useActivityLogs';

const EVENT_TYPES = [
  'registration_started',
  'email_verified',
  'login_success',
  'login_failed',
  'password_reset_requested'
];

export default function AdminActivityLogs() {
  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading: loading, error, refetch: fetchLogs } = useActivityLogs({
    page,
    limit,
    search,
    eventTypes: selectedEventTypes.join(','),
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.pagination?.pages ?? 1;
  const totalItems = data?.pagination?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const toggleEventType = (type: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const getEventColor = (type?: string) => {
    if (!type) return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    if (type.includes('success') || type.includes('verified') || type === 'account_created') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (type.includes('failed') || type.includes('expired') || type.includes('abandoned') || type.includes('deleted')) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (type.includes('started') || type.includes('requested') || type.includes('sent')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-orange-500" />
            User Activity Logs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading logs...' : `Showing ${logs.length} of ${totalItems} events`}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        
        {/* Filters Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 space-y-3">
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 transition-colors shadow-sm"
              />
              <button type="submit" className="hidden">Search</button>
            </form>

            <button
              onClick={() => fetchLogs()}
              title="Refresh Logs"
              className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-200 hover:border-orange-500/50 shadow-xs cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
            >
              <RefreshCw className={`h-4 w-4 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setSelectedEventTypes([]); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                selectedEventTypes.length === 0
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-500/50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
              }`}
            >
              All Events
            </button>
            {EVENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleEventType(type)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  selectedEventTypes.includes(type)
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-500/50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="flex items-center justify-center h-48">
               <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-red-500 text-sm font-semibold">{error instanceof Error ? error.message : 'Failed to load logs'}</p>
              <button onClick={() => fetchLogs()} className="mt-3 text-orange-500 text-sm font-bold underline">Retry</button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6">
              <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">No activity logs found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Event</th>
                  <th className="px-6 py-4 font-semibold">User Details</th>
                  <th className="px-6 py-4 font-semibold">Reg / Verif Status</th>
                  <th className="px-6 py-4 font-semibold">Device</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getEventColor(log.eventType)}`}>
                        {log.eventType || 'unknown_event'}
                      </span>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-[10px] text-zinc-500 font-mono max-w-[200px] truncate" title={JSON.stringify(log.metadata)}>
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          {log.userId ? <User size={12} className="text-orange-500" /> : null}
                          {log.userName || '—'}
                        </span>
                        <span className="text-xs text-zinc-500">{log.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400">Reg: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{log.registrationStatus}</span></span>
                        <span className="text-zinc-600 dark:text-zinc-400">Ver: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{log.verificationStatus}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]" title={log.userAgent}>
                          {log.userAgent || 'Unknown Device'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

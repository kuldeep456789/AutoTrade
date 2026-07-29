import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Users } from 'lucide-react';
import { adminApi, type AdminUser } from '../../services/adminApi';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.users.list();
      setUsers(data.users ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Customers</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading...' : `${users.length} registered users`}
          </p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm cursor-pointer transition-colors">
          <RefreshCw className="h-4 w-4 text-orange-500" />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Search bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-red-500 text-sm font-semibold">{error}</p>
            <button onClick={fetchUsers} className="mt-3 text-orange-500 text-sm font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filtered.map((user) => {
                  const initials = String(user.name || user.email || 'Unknown').substring(0, 2).toUpperCase();
                  const isAdmin = user.role === 'admin';
                  return (
                    <tr key={user._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center font-bold text-xs">
                            {initials}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-white">{user.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-medium">{user.email}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{user.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isAdmin 
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 uppercase tracking-wider' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No users found</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}

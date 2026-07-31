import { useEffect, useState } from 'react';
import { Download, Banknote, Calendar, ShoppingBag, MousePointerClick, Truck, UserPlus, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { adminApi, type DashboardStats, type AdminOrder, type AnalyticsData } from '../../services/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, analyticsData] = await Promise.all([
        adminApi.dashboard.getStats(),
        adminApi.analytics.get()
      ]);
      setStats(data.stats);
      setRecentOrders(data.recentOrders ?? []);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleExport = () => {
    if (!recentOrders || recentOrders.length === 0) {
      toast.error("No dashboard order data to export");
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Amount', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...recentOrders.map(order => {
        const customer = order.userId;
        const name = (customer ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email) : 'Unknown') || 'Unknown';
        const email = customer?.email || 'N/A';
        const date = new Date(order.createdAt).toLocaleDateString();
        return `"${order._id}","${name.replace(/"/g, '""')}","${email}","₹${order.totalAmount}","${order.status}","${date}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dashboard data exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-10 animate-pulse">
        <div className="flex gap-4">
          <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl ml-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time analytics and revenue metrics for your automotive catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-zinc-700 dark:text-zinc-200 shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4 text-orange-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={Banknote}
          title="Collected Revenue" value={`₹${((stats?.totalRevenue ?? 0) / 100000).toFixed(1)}L`}
          subtitle={`₹${(stats?.totalRevenue ?? 0).toLocaleString()} from paid orders`}
          accent="emerald"
        />
        <StatCard
          icon={Calendar}
          title="Total Orders" value={String(stats?.totalOrders ?? 0)}
          subtitle={`${stats?.unpaidOrders ?? 0} unpaid · ${(stats?.totalOrders ?? 0) - (stats?.unpaidOrders ?? 0)} paid`}
        />
        <StatCard
          icon={ShoppingBag}
          title="Pending Returns" value={String(stats?.pendingReturns ?? 0)}
          subtitle="Awaiting processing"
        />
        <StatCard
          icon={MousePointerClick}
          title="Total Users" value={String(stats?.totalUsers ?? 0)}
          subtitle="Registered customers"
        />
      </section>

      {/* Secondary Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 backdrop-blur-md transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Revenue Analytics</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Monthly breakdown of gross sales</p>
            </div>
            <a href="/admin/commission-finance" className="text-orange-500 text-xs font-semibold hover:underline">
              View Finance &rarr;
            </a>
          </div>
          <div className="h-64">
            {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', color: '#fff' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-black text-zinc-900 dark:text-white p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-orange-500" />
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Catalog Quick Stats</h4>
            </div>
            <div className="space-y-5">
              <QuickStat icon={Banknote} label="Collected Revenue (Paid)" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} />
              <QuickStat icon={ShoppingBag} label="Total Orders" value={String(stats?.totalOrders ?? 0)} />
              <QuickStat icon={UserPlus} label="Total Customers" value={String(stats?.totalUsers ?? 0)} />
              <QuickStat icon={Truck} label="Pending Returns" value={String(stats?.pendingReturns ?? 0)} />
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col backdrop-blur-md transition-colors duration-200">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Orders</h4>
            <a href="/admin/orders" className="text-orange-500 text-xs font-semibold hover:underline">View All Orders &rarr;</a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-400 dark:text-zinc-500 text-sm">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-950 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {recentOrders.map((order) => {
                    const customer = order.userId;
                    const name = (customer
                      ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
                      : 'Unknown') || 'Unknown';
                    const initials = String(name).substring(0, 2).toUpperCase();
                    const isPaid = order.paymentStatus === 'paid';

                    return (
                      <tr key={order._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-orange-500 font-semibold">#{order._id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-orange-500/10 text-orange-500 border border-orange-500/20">{initials}</div>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">₹{(order.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                          }`}>
                            {isPaid ? 'Paid' : order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, accent }: any) {
  const accentClass = accent === 'emerald'
    ? 'p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-200'
    : 'p-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 group-hover:scale-110 transition-transform duration-200';
  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl hover:border-orange-500/50 transition-all duration-200 group flex flex-col justify-between backdrop-blur-md">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={accentClass}>
            <Icon size={20} strokeWidth={1.75} />
          </div>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider font-bold">{title}</p>
        <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">{value}</h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shrink-0">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none">{label}</p>
        <p className="text-base font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ChevronRight, Download, RefreshCw, Banknote, Calendar, ShoppingBag, MousePointerClick, MoreVertical, Truck, UserPlus } from 'lucide-react';
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
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-8 w-32 bg-gray-200 rounded ml-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-[#0050cb] text-white rounded hover:opacity-90 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <style>
        {`
          @keyframes drawChartPath {
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
      {/* Breadcrumbs & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-[#0050cb] cursor-pointer">Home</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">Dashboard</span>
        </nav>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded font-mono text-xs font-medium hover:bg-gray-50 transition-all text-gray-700 shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={Banknote} iconBg="bg-blue-50 text-blue-600"
          title="Total Revenue" value={`₹${((stats?.totalRevenue ?? 0) / 100000).toFixed(1)}L`}
          subtitle={`₹${(stats?.totalRevenue ?? 0).toLocaleString()} lifetime`}
        />
        <StatCard
          icon={Calendar} iconBg="bg-gray-100 text-gray-600"
          title="Total Orders" value={String(stats?.totalOrders ?? 0)}
          subtitle="All time orders"
        />
        <StatCard
          icon={ShoppingBag} iconBg="bg-orange-50 text-orange-600"
          title="Pending Returns" value={String(stats?.pendingReturns ?? 0)}
          subtitle="Awaiting processing"
        />
        <StatCard
          icon={MousePointerClick} iconBg="bg-blue-50 text-blue-600"
          title="Total Users" value={String(stats?.totalUsers ?? 0)}
          subtitle="Registered customers"
        />
      </section>

      {/* Secondary Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-semibold text-gray-900">Revenue Overview</h4>
            <a href="/admin/commission-finance" className="text-[#0050cb] font-mono text-xs font-medium hover:underline">View Finance</a>
          </div>
          <div className="h-64">
            {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0050cb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0050cb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0050cb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Latest Orders Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h4 className="text-xl font-semibold text-gray-900">Recent Orders</h4>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 font-mono text-[11px] text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Order ID</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentOrders.map((order) => {
                    const customer = order.userId;
                    const name = (customer
                      ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
                      : 'Unknown') || 'Unknown';
                    const initials = String(name).substring(0, 2).toUpperCase();
                    const statusClass =
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700';

                    return (
                      <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">#{order._id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-blue-50 text-blue-700">{initials}</div>
                            <span className="font-medium text-gray-900 truncate max-w-[120px]">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{(order.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass}`}>
                            {order.paymentStatus === 'paid' ? 'Paid' : order.status}
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

        {/* Activity Feed */}
        <div className="bg-[#213145] text-white p-6 rounded-xl shadow-sm">
          <h4 className="text-xl font-semibold mb-6">Quick Stats</h4>
          <div className="space-y-6">
            <QuickStat icon={Banknote} label="Lifetime Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} />
            <QuickStat icon={ShoppingBag} label="Total Orders" value={String(stats?.totalOrders ?? 0)} />
            <QuickStat icon={UserPlus} label="Total Customers" value={String(stats?.totalUsers ?? 0)} />
            <QuickStat icon={Truck} label="Pending Returns" value={String(stats?.pendingReturns ?? 0)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, title, value, subtitle }: any) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:border-[#0050cb] transition-colors group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">{title}</p>
        <h3 className="text-[32px] font-bold text-gray-900 mt-1">{value}</h3>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-xs opacity-60">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

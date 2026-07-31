import { useState, useEffect, useCallback } from 'react';
import { Search, Package, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type AdminOrder } from '../../services/adminApi';
import Pagination from '../../components/Pagination';

const statusFilters = ['All', 'Confirmed', 'Processing', 'Shipped', 'Out For Delivery', 'Delivered'];
const statusColors: Record<string, string> = {
  pending: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  confirmed: 'bg-teal-500/10 text-teal-500 border border-teal-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  shipped: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  out_for_delivery: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  'out for delivery': 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  unpaid: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

const orderStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out For Delivery' },
  { value: 'delivered', label: 'Delivered' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Pagination state (20 orders per page)
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.orders.list();
      setOrders(data.orders ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await adminApi.orders.updateStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o)
      );
      toast.success('Order status updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportOrders = () => {
    if (!orders || orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Items', 'Total Amount', 'Payment Status', 'Status', 'Date'];
    const rows = orders.map((o: any) => {
      const customer = o.userId;
      const name = (customer ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email) : 'Guest User') || 'Guest User';
      const email = customer?.email || o.shippingAddress?.email || 'N/A';
      const itemsCount = o.orderItems?.length || 0;
      const date = new Date(o.createdAt).toLocaleDateString();
      return `"${o._id}","${name.replace(/"/g, '""')}","${email}","${itemsCount}","₹${o.totalAmount}","${o.paymentStatus || 'unpaid'}","${o.status}","${date}"`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported successfully!');
  };

  const filtered = orders.filter((o) => {
    const status = o.status || 'Pending';
    const isUnpaid = (o.paymentStatus || 'unpaid') !== 'paid';
    let matchTab: boolean;
    if (activeTab === 'All') {
      matchTab = true;
    } else if (activeTab === 'Unpaid') {
      matchTab = isUnpaid;
    } else {
      matchTab = status.toLowerCase() === activeTab.toLowerCase();
    }
    const customerName = o.userId
      ? (o.userId.name || `${o.userId.firstName ?? ''} ${o.userId.lastName ?? ''}`.trim() || (o.userId.email ?? ''))
      : '';
    const matchSearch = !search ||
      (o._id || '').toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.paymentStatus || 'unpaid').toLowerCase().includes(search.toLowerCase()) ||
      (o.status || 'pending').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Orders Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading...' : `${orders.length} total orders`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportOrders} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all">
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Filters */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex overflow-x-auto pb-1 md:pb-0 w-full md:w-auto gap-1.5 scrollbar-hide">
            {statusFilters.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-red-500 text-sm font-semibold">{error}</p>
            <button onClick={fetchOrders} className="mt-3 text-orange-500 text-sm font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Order Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {paginatedOrders.map((order) => {
                  const customer = order.userId;
                  const name = (customer
                    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
                    : 'Unknown') || 'Unknown';
                  const initials = String(name).substring(0, 2).toUpperCase();
                  const isUpdating = updatingId === order._id;

                  return (
                    <tr key={order._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-orange-500">#{order._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[140px]">{name}</p>
                            {customer?.email && <p className="text-xs text-zinc-400 truncate max-w-[140px]">{customer.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-zinc-900 dark:text-white">₹{(order.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColors[order.paymentStatus] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <select
                            value={(order.status || 'pending').toLowerCase()}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 w-44 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                          >
                            {orderStatusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-8 w-8 text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders found</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} orders
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

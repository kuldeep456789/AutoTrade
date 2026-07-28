import { useState, useEffect, useCallback } from 'react';
import { Search, Package, MoreVertical, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type AdminOrder } from '../../services/adminApi';
import Pagination from '../../components/Pagination';

const statusFilters = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Out For Delivery', 'Delivered'];
const statusColors: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-teal-100 text-teal-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  'out for delivery': 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-gray-100 text-gray-700',
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
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update status');
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
    const matchTab = activeTab === 'All' || status.toLowerCase() === activeTab.toLowerCase();
    const customerName = o.userId
      ? (o.userId.name || `${o.userId.firstName ?? ''} ${o.userId.lastName ?? ''}`.trim() || (o.userId.email ?? ''))
      : '';
    const matchSearch = !search ||
      (o._id || '').toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${orders.length} total orders`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm cursor-pointer">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={handleExportOrders} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm cursor-pointer">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex overflow-x-auto pb-1 md:pb-0 w-full md:w-auto gap-1">
            {statusFilters.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-[#0050cb] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff]"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchOrders} className="mt-3 text-[#0050cb] text-sm underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-sm font-mono text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium">Order Status</th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {paginatedOrders.map((order) => {
                  const customer = order.userId;
                  const name = (customer
                    ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)
                    : 'Unknown') || 'Unknown';
                  const initials = String(name).substring(0, 2).toUpperCase();
                  const isUpdating = updatingId === order._id;

                  return (
                    <tr key={order._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700">#{order._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[120px]">{name}</p>
                            {customer?.email && <p className="text-xs text-gray-500 truncate max-w-[120px]">{customer.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{(order.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1.5 rounded-full text-xs font-bold ${statusColors[order.paymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isUpdating ? (
                          <div className="w-5 h-5 border-2 border-[#0050cb] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <select
                            value={(order.status || 'pending').toLowerCase()}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="text-sm border border-gray-200 rounded px-3 py-1.5 w-44 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0050cb] cursor-pointer"
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
                <Package className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No orders found</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
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

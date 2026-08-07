import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type AdminOrder } from '../../services/adminApi';
import Pagination from '../../components/Pagination';
import { OrderCard } from '../../components/admin/OrderCard';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';

const statusFilters = ['All', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];


export default function AdminOrders() {
  const { formatAdminCurrency } = useAdminCurrency();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;
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

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await adminApi.orders.updateStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o)
      );
      toast.success(`Order status updated to "${newStatus}"`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleExportOrders = () => {
    if (!orders || orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Items', 'Total Amount', 'Payment Status', 'Status', 'Date'];
    const rows = orders.map((o: any) => {
      const customer = o.userId;
      const name = (customer ? (customer.name || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email) : 'Guest User') || 'Guest User';
      const email = customer?.email || o.shippingDetails?.email || 'N/A';
      const itemsCount = o.items?.length || 0;
      const date = new Date(o.createdAt).toLocaleDateString();
      return `"${o._id}","${name.replace(/"/g, '""')}","${email}","${itemsCount}","${formatAdminCurrency(Number(o.totalAmount || 0))}","${o.paymentStatus || 'unpaid'}","${o.status}","${date}"`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported successfully!');
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const status = o.status || 'Pending';
      let matchTab: boolean;
      if (activeTab === 'All') {
        matchTab = true;
      } else {
        matchTab = status.toLowerCase() === activeTab.toLowerCase();
      }
      const customerName = o.userId
        ? (o.userId.name || `${o.userId.firstName ?? ''} ${o.userId.lastName ?? ''}`.trim() || (o.userId.email ?? ''))
        : '';
      const matchSearch = !search ||
        (o._id || '').toLowerCase().includes(search.toLowerCase()) ||
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        (o.paymentStatus || 'pending').toLowerCase().includes(search.toLowerCase()) ||
        (o.status || 'pending').toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [orders, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(
    () => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage]
  );

  const currentPageClamped = Math.min(currentPage, totalPages);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Orders</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Loading...' : `${orders.length} total orders`}
          </p>
        </div>
        <button
          onClick={handleExportOrders}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Filters */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex overflow-x-auto pb-1 md:pb-0 w-full md:w-auto gap-1.5 scrollbar-hide">
            {statusFilters.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${activeTab === tab
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

        {/* Order Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 text-sm font-semibold">{error}</p>
            <button onClick={fetchOrders} className="mt-3 text-orange-500 text-sm font-bold underline cursor-pointer">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-zinc-400 mb-3" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">No orders found</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-3">
            {/* Desktop Table Header */}
            <div className="hidden lg:grid grid-cols-[1.1fr_1.5fr_0.6fr_1fr_0.9fr_0.8fr_1.1fr] gap-x-4 px-5 pb-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <div>Order ID</div>
              <div>Customer</div>
              <div>Items</div>
              <div>Amount</div>
              <div>Date</div>
              <div>Payment</div>
              <div className="text-right">Status / Action</div>
            </div>

            {paginatedOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                updating={updatingId === order._id}
                onUpdateStatus={handleStatusChange}
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>
              Showing {Math.min((currentPageClamped - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(currentPageClamped * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} orders
            </span>
            <Pagination
              currentPage={currentPageClamped}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

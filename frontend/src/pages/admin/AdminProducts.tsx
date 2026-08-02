import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Download, Edit, Trash, Package, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, type AdminProduct } from '../../services/adminApi';
import { useGetCatalogStatsQuery } from '../../store/slices/productApiSlice';

const ITEMS_PER_PAGE = 20;

export default function AdminProducts() {
  const { data: statsData } = useGetCatalogStatsQuery(undefined);
  const totalWarehouseCount = statsData?.totalProducts || 14593;

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchProducts = useCallback(async (page: number, searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.products.list(page, ITEMS_PER_PAGE, searchQuery);
      setProducts(data.products ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.total ?? 0);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(currentPage, search);
  }, [fetchProducts, currentPage, search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      setSearch(value);
    }, 400);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete product "${name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(id);
      await adminApi.products.delete(id);
      await fetchProducts(currentPage, search);
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportProducts = () => {
    if (!products || products.length === 0) { toast.error('No products to export'); return; }
    const headers = ['Product ID', 'Name', 'Category', 'Price', 'Discount Price', 'Stock'];
    const rows = products.map((p: any) => {
      const name = p.name || 'Unnamed';
      const category = p.category?.name || 'Uncategorized';
      return `"${p._id}","${name.replace(/"/g, '""')}","${category}","₹${p.price || 0}","₹${p.discountPrice || 0}","${p.stock ?? 0}"`;
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `products_p${currentPage}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported!');
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  const getPageNums = () => {
    const max = 5;
    const half = Math.floor(max / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Products</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
              {totalWarehouseCount.toLocaleString()} Warehouse Catalog Items
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your store's inventory and catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={() => fetchProducts(currentPage, search)} className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm flex cursor-pointer transition-colors">
            <RefreshCw className="h-4 w-4 text-orange-500" /> Refresh
          </button>
          <button onClick={handleExportProducts} className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm flex cursor-pointer transition-colors">
            <Download className="h-4 w-4 text-orange-500" /> Export Page
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-200">
        {/* Header bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          {!loading && totalCount > 0 && (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
              Showing {startItem}–{endItem} of {totalCount.toLocaleString()} products
            </span>
          )}
        </div>

        {/* Table body */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-red-500 text-sm font-semibold">{error}</p>
            <button onClick={() => fetchProducts(currentPage, search)} className="mt-3 text-orange-500 text-sm font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product Name</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {products.map((p) => {
                  const isDeleting = deletingId === p._id;
                  const image = p.images && p.images.length > 0 ? p.images[0] : '';
                  return (
                    <tr key={p._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex-shrink-0">
                            {image ? (
                              <img src={image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-white line-clamp-1">{p.name}</p>
                            <p className="text-xs text-orange-500 font-mono">#{p._id.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-zinc-900 dark:text-white">
                        ₹{(p.discountPrice || p.price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${(p.stock ?? 0) > 10 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : (p.stock ?? 0) > 0 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {(p.stock ?? 0) > 0 ? `${p.stock} in stock` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            disabled={isDeleting}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isDeleting ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-8 w-8 text-zinc-400 mb-3" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No products found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Page {currentPage} of {totalPages} — {totalCount.toLocaleString()} total products
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >«</button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPageNums().map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === num
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105'
                      : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

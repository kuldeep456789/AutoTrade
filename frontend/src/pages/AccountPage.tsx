import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { toggleWishlist, clearWishlist } from '../store/slices/wishlistSlice';
import { addToCart, saveShippingAddress, clearCartItems } from '../store/slices/cartSlice';
import { apiSlice } from '../store/slices/apiSlice';
import { useGetUserOrdersQuery } from '../store/slices/orderApiSlice';
import { useGetMyReturnsQuery } from '../store/slices/returnApiSlice';
import { Package, User, MapPin, Heart, Settings, LogOut, ChevronRight, ShoppingBag, Clock, CheckCircle, XCircle, Trash2, Plus, Pencil, Bell, Moon, Sun, Mail, Phone, Truck, RotateCcw, Camera, X, ShieldCheck } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import EditProfileModal from '../components/profile/EditProfileModal';
import ChangePasswordModal from '../components/profile/ChangePasswordModal';
import EditAddressModal, { type AddressData } from '../components/profile/EditAddressModal';
import TwoFactorModal from '../components/profile/TwoFactorModal';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'notifications', label: 'Admin Messages', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'security', label: 'Security & 2FA', icon: Settings },
] as const;

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'Order Placed', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: Package },
  packed: { label: 'Packed', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', icon: Package },
  shipped: { label: 'Shipped', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800', icon: Truck },
  out_for_delivery: { label: 'Out For Delivery', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', icon: CheckCircle },
  confirmed: { label: 'Confirmed', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', icon: XCircle },
  refunded: { label: 'Refunded', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', icon: RotateCcw },
};

const PAGE_SIZE = 5;

const AccountPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const { theme, toggleTheme } = useTheme();
  const { formatCurrency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';
  const [page, setPage] = useState(1);
  const [fadeKey, setFadeKey] = useState(0);
  const prevTabRef = useRef(activeTab);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [addressModalTitle, setAddressModalTitle] = useState('Edit Address');
  const [selectedAddress, setSelectedAddress] = useState<AddressData>({
    name: userInfo?.name || '',
    line1: '',
    line2: '',
    country: 'India',
    phone: userInfo?.phone || '',
  });

  const currentUserId = userInfo?._id || userInfo?.id;

  const [addressList, setAddressList] = useState<AddressData[]>(() => {
    if (!currentUserId) return [];
    const saved = localStorage.getItem(`savedAddresses_${currentUserId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { }
    }
    return [];
  });

  useEffect(() => {
    if (currentUserId) {
      const saved = localStorage.getItem(`savedAddresses_${currentUserId}`);
      if (saved) {
        try {
          setAddressList(JSON.parse(saved));
          return;
        } catch { }
      }
      setAddressList([]);
    } else {
      setAddressList([]);
    }
  }, [currentUserId]);

  const saveAddressList = (newAddresses: AddressData[]) => {
    setAddressList(newAddresses);
    if (currentUserId) {
      localStorage.setItem(`savedAddresses_${currentUserId}`, JSON.stringify(newAddresses));
    }
  };

  const handleOpenAddAddress = () => {
    setSelectedAddress({
      id: `addr_${Date.now()}`,
      tag: 'HOME',
      name: userInfo?.name || `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim() || '',
      line1: '',
      line2: '',
      country: 'India',
      phone: userInfo?.phone || '',
      isDefault: addressList.length === 0,
    });
    setAddressModalTitle('Add New Address');
    setShowEditAddressModal(true);
  };

  const handleOpenEditAddress = (addr: AddressData) => {
    setSelectedAddress(addr);
    setAddressModalTitle('Edit Address');
    setShowEditAddressModal(true);
  };

  const handleSaveAddress = (savedAddr: AddressData) => {
    let updated: AddressData[];
    const exists = addressList.some((a) => a.id === savedAddr.id);

    if (exists) {
      updated = addressList.map((a) => (a.id === savedAddr.id ? savedAddr : a));
    } else {
      updated = [...addressList, savedAddr];
    }

    if (savedAddr.isDefault) {
      updated = updated.map((a) => ({
        ...a,
        isDefault: a.id === savedAddr.id,
      }));

      const defaultShipping = {
        name: savedAddr.name,
        address: savedAddr.line1,
        city: savedAddr.line2,
        postalCode: '',
        country: savedAddr.country,
        phone: savedAddr.phone,
      };
      dispatch(saveShippingAddress(defaultShipping));
    }

    saveAddressList(updated);
    toast.success(savedAddr.isDefault ? 'Set as default address!' : 'Address saved successfully!');
  };

  const handleDeleteAddress = (id?: string) => {
    if (!id) return;
    const updated = addressList.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    saveAddressList(updated);
    toast.success('Address deleted successfully!');
  };

  const { data: allOrders = [], isLoading: ordersLoading } = useGetUserOrdersQuery(undefined, { skip: !userInfo });
  const { data: myReturns = [] } = useGetMyReturnsQuery(undefined, { skip: !userInfo, pollingInterval: 3000 });

  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    let timerId: any = null;

    const fetchMessages = () => {
      if ((activeTab === 'notifications' || activeTab === 'messages') && userInfo?.email) {
        const email = userInfo.email.trim().toLowerCase();
        const token = userInfo?.accessToken || (userInfo as any)?.token || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

        fetch(`/api/contact/user/${encodeURIComponent(email)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const filtered = data.filter((m: any) => (m.email || '').trim().toLowerCase() === email);
              setUserMessages(filtered);
            } else {
              setUserMessages([]);
            }
          })
          .catch(() => setUserMessages([]))
          .finally(() => setLoadingMessages(false));
      } else {
        setUserMessages([]);
      }
    };

    if (activeTab === 'notifications' || activeTab === 'messages') {
      setLoadingMessages(true);
      fetchMessages();
      timerId = setInterval(fetchMessages, 3000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeTab, userInfo?.email]);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      setFadeKey((k) => k + 1);
    }
  }, [activeTab]);

  if (!userInfo) {
    return <Navigate to="/login?redirect=/account" replace />;
  }

  const setTab = (id: string) => {
    setSearchParams(id === 'orders' ? {} : { tab: id });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(allOrders.length / PAGE_SIZE));
  const ordersData = {
    orders: allOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: allOrders.length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* ── Profile Header ── */}
      <div className="bg-white dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200 backdrop-blur-md">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              {/* Avatar */}
              <div className="relative shrink-0 group cursor-pointer" onClick={() => setShowEditModal(true)} title="Click to upload profile photo">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white text-2xl sm:text-3xl font-bold border-2 border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden relative transition-colors duration-200">
                  {(userInfo.avatar || (userInfo as any).image || userInfo.profileImage) ? (
                    <img
                      src={userInfo.avatar || (userInfo as any).image || userInfo.profileImage}
                      alt={userInfo.name || 'User Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (userInfo.name?.[0] || userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={22} />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5.5 h-5.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-sm">
                  <CheckCircle size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider">
                    {userInfo.role === 'admin' ? 'Admin' : 'Verified Member'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Mail size={15} strokeWidth={1.75} className="text-orange-500" />
                    {userInfo.email}
                  </span>
                  {userInfo.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={15} strokeWidth={1.75} className="text-orange-500" />
                      {userInfo.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-all shadow-sm cursor-pointer"
              >
                <Pencil size={15} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dashboard Body ── */}
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[240px_1fr]">

          {/* ── Sidebar ── */}
          <aside className="flex overflow-x-auto lg:flex-col lg:space-y-1.5 gap-2 lg:gap-0 scrollbar-hide pb-2 lg:pb-0 lg:sticky lg:top-[110px] lg:self-start -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`relative shrink-0 flex items-center gap-2.5 sm:gap-3.5 rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer group ${isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-white dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800'
                    }`}
                >
                  <Icon size={18} className="shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.id === 'wishlist' && wishlistItems.length > 0 && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}>
                      {wishlistItems.length}
                    </span>
                  )}
                  {tab.id === 'notifications' && userMessages.length > 0 && (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-orange-500/10 text-orange-500'
                      }`}>
                      {userMessages.length}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="shrink-0 lg:pt-4 lg:mt-3 lg:border-t border-zinc-200 dark:border-zinc-800 flex items-center">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/20 whitespace-nowrap cursor-pointer"
              >
                <LogOut size={18} strokeWidth={1.75} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="min-h-[500px]">
            <div key={fadeKey} className="animate-fadeIn">
              {activeTab === 'orders' && (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Orders</h2>
                    {ordersData && ordersData.total > 0 && (
                      <span className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {ordersData.total} order{ordersData.total !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {ordersLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-5 animate-pulse">
                          <div className="flex gap-4">
                            <div className="w-[72px] h-[88px] rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex-1 space-y-3">
                              <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                              <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                              <div className="h-6 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : ordersData?.orders?.length > 0 ? (
                    <div className="space-y-4">
                      {ordersData.orders.map((order: any) => {
                        const orderReturn = myReturns.find((r: any) => r.orderId === order._id);
                        let displayStatusStr = (order.status || 'pending').toLowerCase().replace(/\s+/g, '_');
                        if (displayStatusStr === 'pending' && order.paymentStatus === 'paid') {
                          displayStatusStr = 'confirmed';
                        }
                        if (orderReturn && ['refunded', 'refund_completed', 'completed'].includes(String(orderReturn.status).toLowerCase())) {
                          displayStatusStr = 'refunded';
                        }
                        const status = statusConfig[displayStatusStr] || statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const firstItem = order.items?.[0];
                        const itemCount = order.items?.reduce((a: number, i: any) => a + i.quantity, 0) || 0;

                        return (
                          <Link
                            key={order._id}
                            to={`/orders/${order._id}`}
                            className="group block rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250"
                          >
                            <div className="p-5 sm:p-6">
                              <div className="flex items-start gap-4 sm:gap-5">
                                {/* Product image */}
                                <div className="relative shrink-0">
                                  {firstItem?.image ? (
                                    <div className="w-[72px] h-[88px] sm:w-[80px] sm:h-[100px] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                      <img src={firstItem.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-[72px] h-[88px] sm:w-[80px] sm:h-[100px] rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                      <ShoppingBag size={24} className="text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                  )}
                                  {order.items?.length > 1 && (
                                    <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold flex items-center justify-center px-1 shadow-sm border-2 border-white dark:border-[#18181B]">
                                      +{order.items.length - 1}
                                    </span>
                                  )}
                                </div>

                                {/* Order info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div className="min-w-0">
                                      <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white truncate">
                                        Order #{order._id.slice(-8).toUpperCase()}
                                      </h3>
                                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                      <p className="mt-0.5 text-[13px] text-zinc-400 dark:text-zinc-500">
                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                        {order.paymentStatus === 'paid' ? ' · Paid online' : ' · Payment pending'}
                                      </p>
                                    </div>
                                    <div className="text-left sm:text-right shrink-0">
                                      <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                                        {formatCurrency(order.totalAmount || 0)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Status + action */}
                                  <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border ${status.bg} ${status.color}`}>
                                      <StatusIcon size={13} strokeWidth={2} />
                                      {status.label.toUpperCase()}
                                    </span>
                                    <span className="text-[13px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors font-medium">
                                      View details
                                      <ChevronRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-5">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="h-11 px-5 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            Previous
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`w-11 h-11 rounded-xl text-sm font-semibold transition-all duration-200 ${p === page
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                                : 'border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="h-11 px-5 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#18181B] p-14 sm:p-16 text-center">
                      <div className="mx-auto w-[72px] h-[72px] rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-5 border border-amber-200 dark:border-amber-800/30">
                        <ShoppingBag size={32} className="text-amber-500 dark:text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">No orders yet</h3>
                      <p className="text-base text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
                        Your order history will appear here once you make your first purchase. Start exploring our collection!
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                          to="/"
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                        >
                          <ShoppingBag size={18} strokeWidth={2} />
                          Continue Shopping
                        </Link>
                        <Link
                          to="/cart"
                          className="inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]"
                        >
                          View Cart
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'profile' && (
                <section className="space-y-6">
                  <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Profile</h2>

                  {/* Personal Information */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">Personal Information</h3>
                      <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">Manage your personal details and contact information.</p>
                    </div>
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <ProfileField label="First Name" value={userInfo.firstName} />
                        <ProfileField label="Last Name" value={userInfo.lastName} />
                        <ProfileField label="Email" value={userInfo.email} icon={<Mail size={16} />} />
                        {userInfo.phone && <ProfileField label="Phone" value={userInfo.phone} icon={<Phone size={16} />} />}
                      </div>
                    </div>
                  </div>

                  {/* Account Security */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">Account Security</h3>
                      <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">Update your password and secure your account.</p>
                    </div>
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-2.5 h-[50px] px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.98] shadow-sm">
                          <Pencil size={16} strokeWidth={2} />
                          Edit Profile
                        </button>
                        <button onClick={() => setShowPasswordModal(true)} className="inline-flex items-center gap-2.5 h-[50px] px-6 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]">
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'security' && (
                <section className="space-y-6">
                  <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Security & 2FA</h2>

                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                      <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${userInfo?.isTwoFactorEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {userInfo?.isTwoFactorEnabled ? '2FA is Enabled' : '2FA is Disabled'}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {userInfo?.isTwoFactorEnabled ? 'Your account is secured.' : 'Protect your account now.'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setShowTwoFactorModal(true)} className="px-5 py-2 rounded-lg font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition">
                          {userInfo?.isTwoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden">
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">Change Password</h3>
                      <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">Update your password to keep your account safe.</p>
                    </div>
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                      <button onClick={() => setShowPasswordModal(true)} className="inline-flex items-center gap-2.5 h-[50px] px-6 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]">
                        Change Password
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'addresses' && (
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Addresses</h2>
                  </div>

                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {addressList.map((addr) => (
                      <div
                        key={addr.id}
                        className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250 flex flex-col justify-between"
                      >
                        <div>
                          {addr.isDefault && (
                            <div className="flex justify-end mb-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30">
                                <CheckCircle size={10} strokeWidth={3} />
                                DEFAULT
                              </span>
                            </div>
                          )}
                          <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">{addr.name}</p>
                          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {addr.line1}<br />
                            {addr.line2}<br />
                            {addr.country}
                          </p>
                          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{addr.phone}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEditAddress(addr)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                            >
                              <Pencil size={14} strokeWidth={1.5} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                              Delete
                            </button>
                          </div>
                          {!addr.isDefault && (
                            <button
                              onClick={() => handleSaveAddress({ ...addr, isDefault: true })}
                              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline decoration-dashed"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add New Address Card */}
                    <button
                      onClick={handleOpenAddAddress}
                      className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 flex flex-col items-center justify-center min-h-[220px] hover:border-zinc-900 dark:hover:border-white hover:bg-white dark:hover:bg-zinc-800/50 transition-all duration-250 cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
                      </div>
                      <span className="text-base font-bold text-zinc-900 dark:text-white">Add New Address</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Add shipping or billing location</span>
                    </button>
                  </div>
                </section>
              )}

              {activeTab === 'wishlist' && (
                <section className="space-y-6">
                  <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Wishlist</h2>

                  {wishlistItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#18181B] p-14 sm:p-16 text-center">
                      <div className="mx-auto w-[72px] h-[72px] rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-5 border border-red-200 dark:border-red-800/30">
                        <Heart size={32} className="text-red-400 dark:text-red-400" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Your wishlist is empty</h3>
                      <p className="text-base text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
                        Save items you love by tapping the heart icon. They'll stay here for when you're ready to buy.
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                      >
                        <Heart size={18} strokeWidth={2} />
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Stats card */}
                      <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-200 dark:border-red-800/30">
                              <Heart size={22} className="text-red-500 dark:text-red-400" strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-[22px] font-bold text-zinc-900 dark:text-white">{wishlistItems.length}</p>
                              <p className="text-[15px] text-zinc-500 dark:text-zinc-400">Saved items</p>
                            </div>
                          </div>
                          <Link
                            to="/"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="inline-flex items-center gap-2.5 h-[48px] px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.98] shadow-sm"
                          >
                            <ShoppingBag size={16} strokeWidth={2} />
                            Continue Shopping
                          </Link>
                        </div>
                      </div>

                      {/* Wishlist items grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {wishlistItems.map((item: any) => (
                          <div
                            key={item._id}
                            className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-4 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-250"
                          >
                            <div className="flex gap-4">
                              <Link to={`/product/${item._id}`} className="w-24 h-28 sm:w-28 sm:h-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                              </Link>
                              <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                                <div>
                                  <Link to={`/product/${item._id}`}>
                                    <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white line-clamp-2 hover:underline">{item.name}</h3>
                                  </Link>
                                  <p className="text-base font-bold mt-1.5 text-zinc-900 dark:text-white">
                                    {formatCurrency(item.discountPrice || item.price)}
                                  </p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => {
                                      dispatch(addToCart({
                                        _id: item._id, name: item.name,
                                        price: item.discountPrice || item.price,
                                        image: item.image, qty: 1,
                                        variant: { color: 'Black', size: 'M' },
                                      }));
                                    }}
                                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 active:scale-[0.97]"
                                  >
                                    <ShoppingBag size={13} strokeWidth={2} />
                                    Add to Bag
                                  </button>
                                  <button
                                    onClick={() => dispatch(toggleWishlist(item))}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                                    aria-label="Remove"
                                  >
                                    <Trash2 size={14} strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

              {(activeTab === 'notifications' || activeTab === 'messages') && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Bell className="w-7 h-7 text-amber-500" strokeWidth={2} />
                      Messages
                    </h2>
                  </div>

                  {loadingMessages ? (
                    <div className="p-12 text-center text-zinc-500">Loading your notifications and admin messages...</div>
                  ) : userMessages.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-12 text-center">
                      <Bell className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No notifications yet</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Messages and resolution replies sent by Admin will appear here.</p>
                      <Link to="/contact" className="mt-4 inline-block px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl">
                        Send Message to Admin
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userMessages.map((msg: any) => {
                        const isResolved = msg.status === 'resolved';
                        return (
                          <div key={msg._id} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {msg.subject}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-zinc-400 font-mono">
                                  {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${isResolved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  }`}>
                                  {isResolved ? 'Admin Resolved' : 'Pending Response'}
                                </span>
                              </div>
                            </div>

                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 whitespace-pre-wrap">
                              {msg.message}
                            </p>

                            {/* Admin Resolution Response */}
                            {msg.adminReply ? (
                              <div className="mt-4 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle size={15} className="text-blue-600 dark:text-blue-400" />
                                    Admin Message / Response:
                                  </span>
                                  {msg.repliedAt && (
                                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                      {new Date(msg.repliedAt).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-blue-950 dark:text-blue-100 font-medium whitespace-pre-wrap">
                                  {msg.adminReply}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                <Clock size={14} />
                                <span>Message sent to Admin. You will receive a resolution notification here once Admin responds.</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'settings' && (
                <section className="space-y-6">
                  <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-900 dark:text-white tracking-tight">Settings</h2>


                  {/* Appearance */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#18181B] overflow-hidden hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-250">
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          {theme === 'dark' ? <Moon size={20} className="text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} /> : <Sun size={20} className="text-zinc-600" strokeWidth={1.5} />}
                        </div>
                        <div>
                          <h3 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">Appearance</h3>
                          <p className="text-[15px] text-zinc-500 dark:text-zinc-400">Toggle between light and dark themes.</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          {theme === 'dark' ? (
                            <Moon size={18} className="text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                          ) : (
                            <Sun size={18} className="text-zinc-500" strokeWidth={1.5} />
                          )}
                          <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                          </span>
                        </div>
                        <button
                          onClick={toggleTheme}
                          className={`relative w-[52px] h-7 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'
                            }`}
                        >
                          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                            }`}>
                            {theme === 'dark' ? (
                              <Moon size={11} className="text-zinc-700" strokeWidth={2} />
                            ) : (
                              <Sun size={11} className="text-amber-500" strokeWidth={2} />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>


      {/* Modals */}
      {userInfo && (
        <>
          {showEditModal && <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} user={userInfo as any} />}
          {showPasswordModal && <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />}
          {showTwoFactorModal && <TwoFactorModal isOpen={showTwoFactorModal} onClose={() => setShowTwoFactorModal(false)} />}
        </>
      )}

      <EditAddressModal
        isOpen={showEditAddressModal}
        onClose={() => setShowEditAddressModal(false)}
        address={selectedAddress}
        title={addressModalTitle}
        onSave={handleSaveAddress}
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden z-10 animate-fadeIn"
            >
              {/* Close X Button */}
              <button
                onClick={() => setShowLogoutModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              {/* Red Circular Icon */}
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-100 dark:border-red-900/20">
                <LogOut size={28} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Confirm Logout</h3>

              {/* Message */}
              <div className="mt-3.5 space-y-1.5">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-normal">
                  Are you sure you want to logout from your account?
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 normal-case leading-relaxed">
                  You will need to login again to access your account.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-8 grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors active:scale-[0.98] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(logout());
                    dispatch(apiSlice.util.resetApiState());
                    dispatch(clearCartItems());
                    dispatch(clearWishlist());
                    setShowLogoutModal(false);
                    navigate('/');
                  }}
                  className="h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-md shadow-red-600/10 cursor-pointer"
                >
                  <LogOut size={16} />
                  Confirm Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileField = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-colors">
    <p className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1.5">
      {icon && <span className="text-zinc-400">{icon}</span>}
      {label}
    </p>
    <p className="text-[16px] font-medium text-zinc-900 dark:text-white">{value}</p>
  </div>
);

export default AccountPage;

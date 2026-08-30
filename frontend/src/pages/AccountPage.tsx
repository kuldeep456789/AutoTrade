import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { toggleWishlist, clearWishlist } from '../store/slices/wishlistSlice';
import { addToCart, saveShippingAddress, clearCartItems } from '../store/slices/cartSlice';
import { apiSlice } from '../store/slices/apiSlice';
import {
  useGetUserOrdersQuery,
  useCreateCheckoutSessionMutation,
  useCancelOrderMutation,
} from '../store/slices/orderApiSlice';
import { useGetMyReturnsQuery } from '../store/slices/returnApiSlice';
import { apiUrl } from '../lib/api';
import {
  Package,
  User,
  MapPin,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  Pencil,
  Bell,
  Moon,
  Sun,
  Mail,
  Phone,
  Truck,
  RotateCcw,
  Camera,
  X,
  ShieldCheck,
  Award,
  Sparkles,
  ExternalLink,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import EditProfileModal from '../components/profile/EditProfileModal';
import EditAddressModal, { type AddressData } from '../components/profile/EditAddressModal';
import TwoFactorModal from '../components/profile/TwoFactorModal';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'notifications', label: 'Messages', icon: Bell },
  { id: 'profile', label: 'Profile Overview', icon: User },
  { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'security', label: 'Security & 2FA', icon: Settings },
] as const;

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  payment_pending: { label: 'Payment Pending', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  pending: { label: 'Payment Pending', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Package },
  packed: { label: 'Packed', color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: Package },
  shipped: { label: 'Shipped', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  confirmed: { label: 'Confirmed', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  refunded: { label: 'Refunded', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: RotateCcw },
};

const PAGE_SIZE = 5;

function CopyIdButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="inline-flex items-center gap-1 text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
      title="Copy Order ID"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

const AccountPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const { theme, toggleTheme } = useTheme();
  const { formatCurrency, currency } = useCurrency();
  const [createCheckoutSession] = useCreateCheckoutSessionMutation();
  const [cancelOrder] = useCancelOrderMutation();

  const handlePayNow = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await createCheckoutSession({ orderId, currency }).unwrap();
      if (!res?.checkoutUrl) {
        toast.error('Payment session could not be created');
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to initiate payment');
    }
  };

  const handleCancelOrder = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId).unwrap();
      toast.success('Order cancelled successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to cancel order');
    }
  };

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = new URLSearchParams(location.search).get('tab') || 'orders';
  const activeTab = rawTab === 'settings' ? 'security' : rawTab;
  const [page, setPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [addressModalTitle, setAddressModalTitle] = useState('Edit Address');
  const [selectedAddress, setSelectedAddress] = useState<AddressData>({
    name: userInfo?.name || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
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
      city: '',
      state: '',
      postalCode: '',
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
        city: savedAddr.city,
        postalCode: savedAddr.postalCode,
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
      if (activeTab === 'notifications' || activeTab === 'messages') {
        const token = userInfo?.accessToken || (userInfo as any)?.token || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
        if (!token) {
          setUserMessages([]);
          setLoadingMessages(false);
          return;
        }

        fetch(apiUrl('/api/contact/me'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        })
          .then((res) => {
            if (res.status === 401) {
              setUserMessages([]);
              return [];
            }
            return res.json();
          })
          .then((data) => {
            if (Array.isArray(data)) {
              setUserMessages(data);
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
      timerId = setInterval(fetchMessages, 15000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeTab, userInfo?.accessToken, (userInfo as any)?.token]);

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

  const memberSince = (userInfo as any)?.createdAt
    ? new Date((userInfo as any).createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 transition-colors duration-200 pb-16">
      
      {/* ── Premium Hero Header ── */}
      <section className="relative overflow-hidden bg-white dark:bg-[#121215] border-b border-zinc-200/80 dark:border-white/[0.08] shadow-sm">
        {/* Subtle background glow ambient */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            {/* User Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar with Camera Trigger */}
              <div
                className="relative shrink-0 group cursor-pointer"
                onClick={() => setShowEditModal(true)}
                title="Click to upload profile photo"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white text-3xl font-extrabold border-2 border-zinc-200 dark:border-zinc-700/80 shadow-lg overflow-hidden relative transition-all duration-300 group-hover:border-orange-500">
                  {(userInfo.avatar || (userInfo as any).image || userInfo.profileImage) ? (
                    <img
                      src={userInfo.avatar || (userInfo as any).image || userInfo.profileImage}
                      alt={userInfo.name || 'User Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (userInfo.name?.[0] || userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white backdrop-blur-[2px]">
                    <Camera size={24} />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121215] flex items-center justify-center shadow-md">
                  <CheckCircle size={13} className="text-white" strokeWidth={3} />
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Valued Member'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider">
                    <Sparkles size={12} />
                    {userInfo.role === 'admin' ? 'Admin Access' : 'Verified Member'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Mail size={15} className="text-orange-500" />
                    {userInfo.email}
                  </span>
                  {userInfo.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={15} className="text-orange-500" />
                      {userInfo.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                    Member since {memberSince}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Pencil size={15} /> Edit Profile
              </button>
            </div>
          </div>

          {/* ── Metric Cards Strip ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-100 dark:border-white/[0.06]">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#1A1A1E] border border-zinc-200/60 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-orange-500" /> Total Orders
              </p>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {allOrders.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#1A1A1E] border border-zinc-200/60 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={14} className="text-rose-500" /> Wishlist Items
              </p>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {wishlistItems.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#1A1A1E] border border-zinc-200/60 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-500" /> Saved Addresses
              </p>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {addressList.length}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Main Layout Body ── */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">

          {/* ── Sticky Sidebar ── */}
          <aside className="flex overflow-x-auto lg:flex-col lg:space-y-1.5 gap-2 lg:gap-0 scrollbar-hide pb-2 lg:pb-0 lg:sticky lg:top-[100px] lg:self-start -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="hidden lg:block px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Account Menu
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`relative shrink-0 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer group ${isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white dark:bg-[#16161A] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-white/[0.08]'
                    }`}
                >
                  <Icon size={18} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="whitespace-nowrap flex-1 text-left">{tab.label}</span>
                  {tab.id === 'wishlist' && wishlistItems.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                      {wishlistItems.length}
                    </span>
                  )}
                  {tab.id === 'notifications' && userMessages.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-orange-500/10 text-orange-500'
                      }`}>
                      {userMessages.length}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="shrink-0 lg:pt-4 lg:mt-3 lg:border-t border-zinc-200 dark:border-white/[0.08] flex items-center">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 border border-transparent hover:border-rose-500/20 whitespace-nowrap cursor-pointer"
              >
                <LogOut size={18} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* ── Main Tab Content ── */}
          <main className="min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── ORDERS TAB ── */}
                {activeTab === 'orders' && (
                  <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Order History</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Track, manage, or view details of your recent purchases.</p>
                      </div>
                      {ordersData && ordersData.total > 0 && (
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                          {ordersData.total} Total Order{ordersData.total !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {ordersLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6 animate-pulse">
                            <div className="flex gap-5">
                              <div className="w-20 h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                              <div className="flex-1 space-y-3">
                                <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                                <div className="h-7 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
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
                          if (displayStatusStr === 'pending') {
                            if (order.paymentStatus === 'paid') {
                              displayStatusStr = 'confirmed';
                            } else {
                              displayStatusStr = 'payment_pending';
                            }
                          }
                          if (orderReturn && ['refunded', 'refund_completed', 'completed'].includes(String(orderReturn.status).toLowerCase())) {
                            displayStatusStr = 'refunded';
                          }
                          const status = statusConfig[displayStatusStr] || statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
                          const StatusIcon = status.icon;
                          const firstItem = order.items?.[0];
                          const itemCount = order.items?.reduce((a: number, i: any) => a + i.quantity, 0) || 0;

                          return (
                            <div
                              key={order._id}
                              className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] hover:border-zinc-300 dark:hover:border-white/[0.2] hover:shadow-xl transition-all duration-200 p-5 sm:p-6"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    Order #{order._id.slice(-8).toUpperCase()}
                                    <CopyIdButton text={order._id} />
                                  </span>
                                  <span className="text-xs text-zinc-400 font-medium">•</span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${status.bg} ${status.color}`}>
                                    <StatusIcon size={14} strokeWidth={2.5} />
                                    {status.label}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-5 pt-4">
                                <div className="relative shrink-0">
                                  {firstItem?.image ? (
                                    <div className="w-20 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                      <img src={firstItem.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-20 h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                      <ShoppingBag size={24} className="text-zinc-400" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                                    {firstItem?.productName || firstItem?.name || `Order Items (${itemCount})`}
                                  </h3>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    {itemCount} item{itemCount !== 1 ? 's' : ''} total
                                    {order.paymentStatus === 'paid' ? ' • Paid online' : ' • Payment pending'}
                                  </p>
                                  <p className="text-lg font-extrabold text-zinc-900 dark:text-white mt-2">
                                    {formatCurrency(order.totalAmount || 0)}
                                  </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                                  {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                                    <button
                                      onClick={(e) => handlePayNow(e, order._id)}
                                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                    >
                                      Pay Now
                                    </button>
                                  )}

                                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                    <button
                                      onClick={(e) => handleCancelOrder(e, order._id)}
                                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  )}

                                  <Link
                                    to={`/orders/${order._id}`}
                                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Details <ChevronRight size={14} />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-6">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page <= 1}
                              className="h-10 px-4 rounded-xl text-xs font-bold border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#16161A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${p === page
                                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                  : 'border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#16161A] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                  }`}
                              >
                                {p}
                              </button>
                            ))}
                            <button
                              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                              disabled={page >= totalPages}
                              className="h-10 px-4 rounded-xl text-xs font-bold border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#16161A] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16161A] p-12 sm:p-16 text-center">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-5 border border-orange-500/20">
                          <ShoppingBag size={30} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2">No orders placed yet</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
                          Your order history will appear here once you place your first order.
                        </p>
                        <Link
                          to="/"
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          <ShoppingBag size={18} /> Start Shopping
                        </Link>
                      </div>
                    )}
                  </section>
                )}

                {/* ── PROFILE TAB ── */}
                {activeTab === 'profile' && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Profile Overview</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your personal account details and preferences.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Personal Info */}
                      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <User size={18} className="text-orange-500" /> Personal Information
                        </h3>
                        <div className="space-y-3 pt-2">
                          <ProfileField label="First Name" value={userInfo.firstName} />
                          <ProfileField label="Last Name" value={userInfo.lastName} />
                          <ProfileField label="Email Address" value={userInfo.email} icon={<Mail size={15} />} />
                          {userInfo.phone && <ProfileField label="Phone Number" value={userInfo.phone} icon={<Phone size={15} />} />}
                        </div>
                      </div>

                      {/* Account Security Card */}
                      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck size={18} className="text-emerald-500" /> Account Security
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Keep your account password secure or update your public contact info.</p>
                        
                        <div className="pt-3 space-y-3">
                          <button
                            onClick={() => setShowEditModal(true)}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                          >
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                              <Pencil size={16} className="text-orange-500" /> Edit Profile Info
                            </span>
                            <ChevronRight size={16} className="text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── SECURITY & 2FA TAB ── */}
                {activeTab === 'security' && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Security & Settings</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage authentication security options and theme appearance.</p>
                    </div>

                    <div className="space-y-6">
                      {/* 2FA Card */}
                      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${userInfo?.isTwoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                              <ShieldCheck size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-white">
                                {userInfo?.isTwoFactorEnabled ? 'Two-Factor Authentication Active' : 'Two-Factor Authentication Disabled'}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {userInfo?.isTwoFactorEnabled ? 'Your account is extra secure with TOTP authentication.' : 'Protect your account with an extra verification code layer.'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowTwoFactorModal(true)}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                          >
                            {userInfo?.isTwoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                          </button>
                        </div>
                      </div>

                      {/* Appearance Card */}
                      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                              {theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-white">Theme Appearance</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Toggle between dark mode and light mode.</p>
                            </div>
                          </div>
                          <button
                            onClick={toggleTheme}
                            className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-orange-500' : 'bg-zinc-300'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`}>
                              {theme === 'dark' ? <Moon size={12} className="text-zinc-900" /> : <Sun size={12} className="text-amber-500" />}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── ADDRESSES TAB ── */}
                {activeTab === 'addresses' && (
                  <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Saved Addresses</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage delivery locations for faster checkout.</p>
                      </div>
                    </div>

                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                      {addressList.map((addr) => (
                        <div
                          key={addr.id}
                          className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-white/[0.2] transition-all shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20 uppercase tracking-wider">
                                <MapPin size={12} />
                                {addr.tag || 'HOME'}
                              </span>

                              {addr.isDefault && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider">
                                  <CheckCircle size={12} /> DEFAULT
                                </span>
                              )}
                            </div>

                            <p className="text-base font-bold text-zinc-900 dark:text-white">{addr.name}</p>
                            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              {addr.line1}<br />
                              {addr.line2 && <>{addr.line2}<br /></>}
                              {addr.city}, {addr.state} {addr.postalCode}<br />
                              {addr.country}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-zinc-400 flex items-center gap-1">
                              <Phone size={12} /> {addr.phone}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditAddress(addr)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>

                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSaveAddress({ ...addr, isDefault: true })}
                                className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
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
                        className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-orange-500 hover:bg-orange-500/[0.02] transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Plus size={24} />
                        </div>
                        <span className="text-base font-bold text-zinc-900 dark:text-white">Add New Address</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Add shipping or billing location</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* ── WISHLIST TAB ── */}
                {activeTab === 'wishlist' && (
                  <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Saved Wishlist</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your saved products ready for purchase.</p>
                      </div>
                      {wishlistItems.length > 0 && (
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                          {wishlistItems.length} Saved Item{wishlistItems.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {wishlistItems.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16161A] p-12 sm:p-16 text-center">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-5 border border-rose-500/20">
                          <Heart size={30} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2">Your wishlist is empty</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
                          Tap the heart icon on any product to save it here for later.
                        </p>
                        <Link
                          to="/"
                          className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          <ShoppingBag size={18} /> Discover Products
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {wishlistItems.map((item: any) => (
                          <div
                            key={item._id}
                            className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-4 hover:border-zinc-300 dark:hover:border-white/[0.2] transition-all shadow-sm flex gap-4"
                          >
                            <Link to={`/product/${item._id}`} className="w-24 h-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                              <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                            </Link>

                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <Link to={`/product/${item._id}`}>
                                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2 hover:underline">{item.name}</h3>
                                </Link>
                                <p className="text-base font-extrabold text-zinc-900 dark:text-white mt-1.5">
                                  {formatCurrency(item.discountPrice || item.price)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    dispatch(addToCart({
                                      _id: item._id, name: item.name,
                                      price: item.discountPrice || item.price,
                                      image: item.image, qty: 1,
                                      variant: { color: 'Black', size: 'M' },
                                    }));
                                    toast.success('Added to Bag!');
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                >
                                  <ShoppingBag size={14} /> Add to Bag
                                </button>

                                <button
                                  onClick={() => dispatch(toggleWishlist(item))}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer"
                                  title="Remove from Wishlist"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── MESSAGES / NOTIFICATIONS TAB ── */}
                {(activeTab === 'notifications' || activeTab === 'messages') && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Bell className="text-orange-500" size={26} /> Admin Support Messages
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Resolution responses and updates from customer support.</p>
                    </div>

                    {loadingMessages ? (
                      <div className="p-12 text-center text-zinc-500">Loading support notifications...</div>
                    ) : userMessages.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16161A] p-12 text-center">
                        <Bell className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No support notifications yet</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">Messages sent to support and admin resolution replies will show up here.</p>
                        <Link to="/contact" className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all">
                          Contact Admin Support
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userMessages.map((msg: any) => {
                          const isResolved = msg.status === 'resolved';
                          return (
                            <div key={msg._id} className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#16161A] p-6 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                  {msg.subject}
                                </h3>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-zinc-400 font-mono">
                                    {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${isResolved ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                    {isResolved ? 'Resolved' : 'Pending Response'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 whitespace-pre-wrap">
                                {msg.message}
                              </p>

                              {msg.adminReply ? (
                                <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <CheckCircle size={14} /> Admin Reply
                                    </span>
                                    {msg.repliedAt && (
                                      <span className="text-xs text-blue-400 font-mono">
                                        {new Date(msg.repliedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-900 dark:text-white font-medium whitespace-pre-wrap">
                                    {msg.adminReply}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 font-medium">
                                  <Clock size={14} />
                                  <span>Submitted to Admin. Resolution update will appear here.</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ── Profile Modals ── */}
      {userInfo && (
        <>
          {showEditModal && <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} user={userInfo as any} />}
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

      {/* ── Logout Confirmation Modal ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden z-10"
            >
              <button
                onClick={() => setShowLogoutModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-5 shadow-sm border border-rose-500/20">
                <LogOut size={28} />
              </div>

              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Confirm Logout</h3>

              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Are you sure you want to sign out?
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You will need to sign in again to access your orders and account settings.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
                  className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-rose-600/20"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileField = ({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) => (
  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/[0.06]">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
      {icon}
      {label}
    </p>
    <p className="text-sm font-bold text-zinc-900 dark:text-white break-all">{value || 'Not set'}</p>
  </div>
);

export default AccountPage;

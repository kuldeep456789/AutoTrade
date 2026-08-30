import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  UserRound,
  X,
  Search,
  Menu,
  Package,
  MapPin,
  Settings,
  LogOut,
  Loader2,
  Shield,
  Bell,
  Home,
  LayoutGrid,
  Car,
  Armchair,
  Wrench,
  Bike,
  Cpu,
  Cog,
  ChevronRight,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { apiSlice } from '../../store/slices/apiSlice';
import { clearCartItems } from '../../store/slices/cartSlice';
import { clearWishlist } from '../../store/slices/wishlistSlice';
import { useGetProductsQuery, productApiSlice } from '../../store/slices/productApiSlice';
import { getProductId } from '../../lib/product';
import { apiUrl } from '../../lib/api';

import MiniCart from './MiniCart';
import CurrencySelector from './CurrencySelector';

import ThemeToggle from '../theme/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { NAV_CATEGORIES as navCategories } from '../../config/categories';

const CATEGORY_ICONS: Record<string, any> = {
  'Exterior Accessories': Car,
  'Interior Accessories': Armchair,
  'Tools, Maintenance & Care': Wrench,
  'Car Electronics': Cpu,
  'Motorcycle Accessories & Parts': Bike,
  'Auto Replacement Parts': Cog,
};

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.cartItems);
  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.qty, 0);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const wishlistCount = wishlistItems.length;
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const userDisplayName =
    userInfo?.firstName?.trim() ||
    [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(' ').trim() ||
    userInfo?.email ||
    'ME';

  const queryQ = new URLSearchParams(location.search).get('q') || '';
  const [searchQuery, setSearchQuery] = useState(queryQ);
  const prefetchProductDetails = productApiSlice.usePrefetch('getProductDetails');
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(new URLSearchParams(location.search).get('q') || '');
    } else {
      setSearchQuery('');
    }
  }, [location.pathname, location.search]);

  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestionListRef = useRef<any[]>([]);
  const doSearchRef = useRef<((q: string) => void) | undefined>(undefined);
  const profileRef = useRef<HTMLDivElement>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Close mobile drawer and search focus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchFocused(false);
    setSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    const token = userInfo?.accessToken || (userInfo as any)?.token;
    if (!token) {
      setUnreadNotifications(0);
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isSubscribed = true;

    const fetchNotifications = () => {
      const currentToken = userInfo?.accessToken || (userInfo as any)?.token;
      if (!currentToken) {
        if (isSubscribed) setUnreadNotifications(0);
        return;
      }

      fetch(apiUrl('/api/contact/me'), {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            if (isSubscribed) setUnreadNotifications(0);
            if (intervalId !== null) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (isSubscribed && Array.isArray(data)) {
            setUnreadNotifications(data.length);
          }
        })
        .catch(() => {});
    };

    fetchNotifications();
    intervalId = setInterval(fetchNotifications, 30000);

    return () => {
      isSubscribed = false;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [userInfo]);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close search suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(e.target as Node)) {
        setMobileSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!searchFocused && !mobileSearchFocused) return;
    const handler = (e: KeyboardEvent) => {
      const list = suggestionListRef.current;
      if (e.key === 'Escape') {
        setSearchFocused(false);
        setMobileSearchFocused(false);
        searchInputRef.current?.blur();
        mobileSearchInputRef.current?.blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIdx((i) => Math.min(i + 1, list.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIdx((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Enter') {
        if (selectedSuggestionIdx >= 0) {
          e.preventDefault();
          const item = list[selectedSuggestionIdx];
          if (item.type === 'category' || item.type === 'product') {
            if (item.to) {
              navigate(item.to);
              setSearchFocused(false);
              setMobileSearchFocused(false);
              setSelectedSuggestionIdx(-1);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchFocused, mobileSearchFocused, selectedSuggestionIdx, navigate]);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearchFetching } = useGetProductsQuery(
    { q: debouncedQuery, pageNum: 1, pageSize: 6 },
    { skip: debouncedQuery.trim().length < 3 }
  );

  const products = searchResults?.products?.slice(0, 5) ?? [];

  // Build suggestion list
  const suggestionList: {
    type: string;
    label: string;
    to?: string;
    productId?: string;
    image?: string;
    price?: string;
    category?: string;
  }[] = [];

  if (debouncedQuery.length >= 2) {
    const qLower = debouncedQuery.toLowerCase();
    const qTokens = qLower.split(/\s+/).filter(Boolean);

    const tokenPrefixMatchAll = (label: string): boolean => {
      const labelTokens = label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      return qTokens.every((qt) => labelTokens.some((lt) => lt === qt || lt.startsWith(qt)));
    };

    navCategories.forEach((cat) => {
      if (tokenPrefixMatchAll(cat.label)) {
        suggestionList.push({
          type: 'category',
          label: cat.label,
          to: cat.to,
        });
      }
      cat.subs.forEach((sub) => {
        if (tokenPrefixMatchAll(`${cat.label} ${sub.label}`)) {
          suggestionList.push({
            type: 'category',
            label: `${cat.label} > ${sub.label}`,
            to: sub.to,
          });
        }
      });
    });

    products.forEach((p: any) => {
      const getProductPrice = (item: any) => {
        const num = (v: any) =>
          typeof v === 'number' && !isNaN(v) && v > 0
            ? v
            : typeof v === 'string' && !isNaN(Number(v)) && Number(v) > 0
            ? Number(v)
            : 0;
        const discount = num(item.discountPrice);
        const price = num(item.price);
        const sell = num(item.sellPrice);
        const original = num(item.originalPrice);
        const mrp = num(item.mrp);
        const variantPrice = num(item.variants?.[0]?.price || item.variants?.[0]?.discountPrice);
        if (discount && price && discount < price) return discount;
        if (discount) return discount;
        if (price) return price;
        if (sell) return sell;
        if (original) return original;
        if (mrp) return mrp;
        if (variantPrice) return variantPrice;
        return price || discount || sell || 399;
      };

      const pId = getProductId(p);
      suggestionList.push({
        type: 'product',
        label: p.title || p.productName || p.name || '',
        to: `/product/${pId}`,
        productId: pId,
        image: p.images?.[0] || p.productImage,
        price: formatCurrency(getProductPrice(p)),
        category: p.collectionType || p.categoryName || '',
      });
    });
  }
  suggestionListRef.current = suggestionList;

  const doSearchRefValue = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setSearchFocused(false);
      setMobileSearchFocused(false);
      setSelectedSuggestionIdx(-1);
    },
    [navigate]
  );
  doSearchRef.current = doSearchRefValue;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearchRefValue(searchQuery);
  };

  const highlightMatch = (text: string) => {
    if (!debouncedQuery || debouncedQuery.length < 2) return text;
    const idx = text.toLowerCase().indexOf(debouncedQuery.toLowerCase());
    if (idx === -1) return text;
    const match = text.slice(idx, idx + debouncedQuery.length);
    return (
      <>
        {text.slice(0, idx)}
        {match && <mark className="bg-orange-500/30 text-[#FF7A00] font-bold px-0.5 rounded">{match}</mark>}
        {text.slice(idx + debouncedQuery.length)}
      </>
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-black text-white transition-all duration-300 font-sans border-b border-zinc-800/80 ${
          scrolled ? 'shadow-2xl shadow-black/70' : 'shadow-none'
        }`}
      >
        {/* ───────── 1. DESKTOP HEADER (hidden md:flex) ───────── */}
        <div className="hidden md:flex items-center justify-between h-[80px] max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 gap-6">
          {/* Desktop Left - Logo */}
          <Link to="/" className="shrink-0 flex items-center group py-1">
            <img
              src="/img/logo.png"
              alt="AutoTrade Pro"
              className="h-14 sm:h-16 md:h-[64px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Middle - Search Bar + Currency Selector */}
          <div className="flex items-center gap-2.5 flex-1 max-w-[500px] lg:max-w-[700px] mx-auto">
            <div ref={searchContainerRef} className="flex-1 relative">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <div
                  className={`flex items-center rounded-lg border transition-all duration-200 h-[42px] bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-within:border-[#FF7A00] overflow-hidden`}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedSuggestionIdx(-1);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search parts, categories..."
                    className="flex-1 bg-transparent text-[13px] px-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none text-left normal-case"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mr-1.5 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.5} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#FF7A00] hover:bg-[#FF9E00] text-white px-4 h-full flex items-center justify-center transition-colors cursor-pointer rounded-r-lg shrink-0"
                    aria-label="Submit search"
                  >
                    <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </form>

              {/* Desktop Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchFocused && debouncedQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-zinc-950 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden z-50 text-left"
                    style={{ transformOrigin: 'top center' } as React.CSSProperties}
                  >
                    <div className="py-2">
                      {isSearchFetching && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" strokeWidth={1.5} />
                        </div>
                      )}
                      {!isSearchFetching && suggestionList.length > 0 && (
                        <div>
                          {suggestionList.map((item: any, i: number) => {
                            if (item.type === 'category') {
                              return (
                                <Link
                                  key={`cat-${item.label}-${i}`}
                                  to={item.to}
                                  onClick={() => {
                                    setSearchFocused(false);
                                    setSearchQuery('');
                                  }}
                                  onMouseEnter={() => setSelectedSuggestionIdx(i)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                    selectedSuggestionIdx === i ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                                  }`}
                                >
                                  <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                  <span className="text-zinc-200">{highlightMatch(item.label)}</span>
                                </Link>
                              );
                            }
                            if (item.type === 'product') {
                              return (
                                <Link
                                  key={`prod-${item.to}-${i}`}
                                  to={item.to}
                                  onClick={() => {
                                    setSearchFocused(false);
                                    setSearchQuery('');
                                  }}
                                  onMouseEnter={() => {
                                    setSelectedSuggestionIdx(i);
                                    if (item.productId) {
                                      prefetchProductDetails(item.productId);
                                    }
                                  }}
                                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                    selectedSuggestionIdx === i ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                                  }`}
                                >
                                  <div className="w-10 h-12 shrink-0 bg-zinc-900 border border-zinc-800 overflow-hidden rounded">
                                    {item.image && (
                                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {highlightMatch(item.label)}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.category}</p>
                                  </div>
                                  <span className="text-sm font-semibold text-orange-400 shrink-0">
                                    {item.price}
                                  </span>
                                </Link>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      {!isSearchFetching && products.length === 0 && debouncedQuery.length >= 2 && (
                        <div className="px-4 py-8 text-center">
                          <p className="text-sm text-zinc-400">No products found for "{debouncedQuery}"</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <CurrencySelector />
          </div>

          {/* Desktop Right - Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative flex items-center justify-center w-11 h-11 hover:bg-zinc-800 rounded-full transition-colors group text-zinc-300 hover:text-white"
              aria-label="Wishlist"
            >
              <Heart className="h-6 w-6 group-hover:scale-105 transition-transform duration-200" strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => setMiniCartOpen(true)}
              className="relative flex items-center justify-center w-11 h-11 hover:bg-zinc-800 rounded-full transition-colors group cursor-pointer text-zinc-300 hover:text-white"
              aria-label="Open cart"
            >
              <ShoppingBag
                className="h-6 w-6 group-hover:scale-105 transition-transform duration-200"
                strokeWidth={1.5}
              />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] px-1 h-[18px] bg-[#FF7A00] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            {userInfo && (
              <Link
                to="/account?tab=notifications"
                className="relative flex items-center justify-center w-11 h-11 hover:bg-zinc-800 rounded-full transition-colors group text-zinc-300 hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6 group-hover:scale-105 transition-transform duration-200" strokeWidth={1.5} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] px-1 h-[18px] bg-[#FF7A00] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* Settings & Account Section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 group ${
                  profileOpen ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                aria-label="Account"
              >
                <UserRound
                  className="h-6 w-6 group-hover:scale-105 transition-transform duration-200"
                  strokeWidth={1.5}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50 text-left"
                    style={{ transformOrigin: 'top right' } as React.CSSProperties}
                  >
                    {userInfo ? (
                      <div className="px-6 py-5 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold text-zinc-800 dark:text-zinc-100 truncate">
                                {userInfo.firstName || userDisplayName}
                              </p>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  userInfo.role === 'admin'
                                    ? 'bg-[#0050cb] text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                                }`}
                              >
                                {userInfo.role === 'admin' ? 'Admin' : 'User'}
                              </span>
                            </div>
                            <p className="text-[13px] text-zinc-500 mt-0.5 truncate">{userInfo.email}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-5 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3 mb-0.5">
                          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                            <UserRound className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-zinc-800 dark:text-zinc-100">Settings & Account</p>
                            <p className="text-[13px] text-zinc-500 mt-0.5">Manage preferences and profile access.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1 mb-3">
                        Appearance
                      </p>
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer">
                        <span className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
                          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                        <ThemeToggle />
                      </div>
                    </div>

                    {userInfo ? (
                      <div className="py-3">
                        <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-5 mb-2">
                          Account Options
                        </p>
                        {[
                          { to: '/account?tab=profile', label: 'My Profile', icon: UserRound },
                          { to: '/account', label: 'My Orders', icon: Package },
                          { to: '/account?tab=wishlist', label: 'Wishlist', icon: Heart },
                          { to: '/account?tab=addresses', label: 'Saved Addresses', icon: MapPin },
                          { to: '/account?tab=settings', label: 'Account Settings', icon: Settings },
                        ].map(({ to, label, icon: Icon }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3.5 px-5 py-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-colors"
                          >
                            <Icon className="h-[18px] w-[18px] text-zinc-400" strokeWidth={1.5} />
                            {label}
                          </Link>
                        ))}

                        {userInfo?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3.5 px-5 py-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-colors"
                          >
                            <Shield className="h-[18px] w-[18px] text-zinc-400" strokeWidth={1.5} />
                            Admin Panel
                          </Link>
                        )}

                        <div className="border-t border-zinc-100 dark:border-zinc-800 mt-2 pt-2 px-2">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setShowLogoutModal(true);
                            }}
                            className="w-full flex items-center gap-3.5 px-4 py-3 text-[14px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer transition-colors"
                          >
                            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            Logout
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 space-y-3">
                        <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                          Account Access
                        </p>
                        <Link
                          to="/login"
                          onClick={() => setProfileOpen(false)}
                          className="block w-full text-center bg-[#FF7A00] hover:bg-[#FF9E00] text-white rounded-xl py-3.5 text-[14px] font-bold tracking-wide transition-all shadow-md shadow-orange-500/20"
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setProfileOpen(false)}
                          className="block w-full text-center bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 text-[14px] font-semibold tracking-wide hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                        >
                          Sign Up
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ───────── 2. MOBILE HEADER (md:hidden) — ULTRA SLEEK PRO ROW ───────── */}
        <div className="md:hidden flex items-center justify-between h-16 px-3.5 gap-2.5 bg-black border-b border-zinc-850">
          {/* Left: AutoTrade Pro Logo */}
          <Link to="/" className="shrink-0 flex items-center py-1">
            <img src="/img/logo.png" alt="AutoTrade Pro" className="h-8 xs:h-9 w-auto object-contain" />
          </Link>

          {/* Center: Integrated Pill Search Bar */}
          <div className="flex-1 relative" ref={mobileSearchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="flex items-center rounded-full bg-zinc-900 border border-zinc-800 focus-within:border-[#FF7A00] h-10 px-3.5 transition-all duration-200 overflow-hidden shadow-inner">
                <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-2" strokeWidth={2} />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedSuggestionIdx(-1);
                  }}
                  onFocus={() => setMobileSearchFocused(true)}
                  placeholder="Search parts, brands, categories..."
                  className="flex-1 bg-transparent text-xs sm:text-[13px] text-white placeholder:text-zinc-500 focus:outline-none text-left normal-case tracking-tight"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </form>

            {/* Mobile Search Suggestions Dropdown */}
            <AnimatePresence>
              {mobileSearchFocused && debouncedQuery.trim().length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden z-50 text-left max-h-[70vh] overflow-y-auto"
                >
                  <div className="py-2">
                    {isSearchFetching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" strokeWidth={1.5} />
                      </div>
                    )}
                    {!isSearchFetching && suggestionList.length > 0 && (
                      <div className="divide-y divide-zinc-900">
                        {suggestionList.map((item: any, i: number) => {
                          if (item.type === 'category') {
                            return (
                              <Link
                                key={`m-cat-${item.label}-${i}`}
                                to={item.to}
                                onClick={() => {
                                  setMobileSearchFocused(false);
                                  setSearchQuery('');
                                }}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-200 hover:bg-zinc-900"
                              >
                                <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" strokeWidth={1.5} />
                                <span className="truncate">{highlightMatch(item.label)}</span>
                              </Link>
                            );
                          }
                          if (item.type === 'product') {
                            return (
                              <Link
                                key={`m-prod-${item.to}-${i}`}
                                to={item.to}
                                onClick={() => {
                                  setMobileSearchFocused(false);
                                  setSearchQuery('');
                                }}
                                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-zinc-900 transition-colors"
                              >
                                <div className="w-9 h-11 shrink-0 bg-zinc-900 border border-zinc-800 overflow-hidden rounded">
                                  {item.image && (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {highlightMatch(item.label)}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 truncate">{item.category}</p>
                                </div>
                                <span className="text-xs font-bold text-[#FF7A00] shrink-0">{item.price}</span>
                              </Link>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                    {!isSearchFetching && products.length === 0 && debouncedQuery.length >= 2 && (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-zinc-400">No results found for "{debouncedQuery}"</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-900 active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {/* ───────── 3. MOBILE SLIDE-IN DRAWER NAVIGATION ───────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Slide-in Panel from Left */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-[85vw] max-w-[340px] h-full bg-zinc-950 border-r border-zinc-800 text-white flex flex-col justify-between overflow-y-auto shadow-2xl z-10"
            >
              {/* Drawer Top Bar: Logo + Close Button */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-850 bg-black/60 sticky top-0 z-20 backdrop-blur-md">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                  <img src="/img/logo.png" alt="AutoTrade Pro" className="h-8 w-auto object-contain" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-850 active:scale-95 transition-all cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 text-left">
                {/* User Info / Login Banner */}
                {userInfo ? (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {(userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{userInfo.firstName || userDisplayName}</p>
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-[#FF7A00]">
                          {userInfo.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{userInfo.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 space-y-3">
                    <div>
                      <p className="text-xs font-extrabold text-white uppercase tracking-wider">Welcome to AutoTrade</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Sign in to track orders & save vehicles</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="h-9 rounded-xl bg-[#FF7A00] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center hover:bg-[#FF9E00] transition-colors shadow-sm"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="h-9 rounded-xl border border-zinc-700 bg-zinc-850 text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center hover:bg-zinc-800 transition-colors"
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                )}

                {/* Section 1: Main Pages */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-2 mb-1.5">
                    Explore
                  </span>
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <Home className="w-4 h-4 text-[#FF7A00]" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/collections/all"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 text-[#FF7A00]" />
                    <span>All Collections</span>
                  </Link>
                </div>

                {/* Section 2: Shop by Category */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest block px-2 mb-1.5">
                    Shop Categories
                  </span>
                  {navCategories.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.label] || Car;
                    return (
                      <Link
                        key={cat.to}
                        to={cat.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-[#FF7A00] transition-colors shrink-0" />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        <ChevronRight size={13} className="text-zinc-600 group-hover:text-white transition-colors" />
                      </Link>
                    );
                  })}
                </div>

                {/* Section 3: Account Hub */}
                <div className="space-y-1 pt-2 border-t border-zinc-900">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-2 mb-1.5">
                    Account & Preferences
                  </span>
                  {userInfo ? (
                    <>
                      <Link
                        to="/account?tab=profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <UserRound className="w-4 h-4 text-zinc-400" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <Package className="w-4 h-4 text-zinc-400" />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="w-4 h-4 text-zinc-400" />
                          <span>Wishlist</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/account?tab=addresses"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-zinc-400" />
                        <span>Saved Addresses</span>
                      </Link>
                      <Link
                        to="/account?tab=settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" />
                        <span>Settings</span>
                      </Link>
                      {userInfo?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-400 hover:bg-zinc-900 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                    </>
                  ) : null}

                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 mt-2">
                    <span className="text-xs font-medium text-zinc-300">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    <ThemeToggle />
                  </div>

                  {userInfo && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer mt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer Footer info */}
              <div className="p-4 border-t border-zinc-900 text-center text-[10px] text-zinc-500">
                AutoTrade Pro &middot; Direct Automotive Marketplace
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mini Cart Panel */}
      <MiniCart isOpen={miniCartOpen} onClose={() => setMiniCartOpen(false)} />

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
              <button
                onClick={() => setShowLogoutModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-100 dark:border-red-900/20">
                <LogOut size={28} />
              </div>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Confirm Logout</h3>

              <div className="mt-3.5 space-y-1.5">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-normal">
                  Are you sure you want to logout from your account?
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 normal-case leading-relaxed">
                  You will need to login again to access your account.
                </p>
              </div>

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
    </>
  );
};

export default Navbar;

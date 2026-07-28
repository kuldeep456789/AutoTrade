import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, UserRound, X, Search, Menu, Package, MapPin, Settings, LogOut, Loader2, Shield, Mail, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { apiSlice } from '../../store/slices/apiSlice';
import { clearCartItems } from '../../store/slices/cartSlice';
import { clearWishlist } from '../../store/slices/wishlistSlice';
import { useGetProductsQuery, productApiSlice } from '../../store/slices/productApiSlice';
import { useGetCategoriesQuery } from '../../store/slices/categoryApiSlice';
import { getProductId } from '../../lib/product';
import { formatINR } from '../../lib/currency';
import MiniCart from './MiniCart';

import ThemeToggle from '../theme/ThemeToggle';

interface SubItem { label: string; to: string; }
interface NavCategory {
  label: string;
  to: string;
  subs: SubItem[];
}

const navCategories: NavCategory[] = [
  {
    label: 'Exterior Accessories',
    to: '/collections/exterior-accessories',
    subs: [
      { label: 'Car Stickers', to: '/collections/car-stickers' },
      { label: 'Other Exterior Accessories', to: '/collections/other-exterior-accessories' },
      { label: 'Car Covers', to: '/collections/car-covers' },
    ],
  },
  {
    label: 'Interior Accessories',
    to: '/collections/interior-accessories',
    subs: [
      { label: 'Floor Mats', to: '/collections/floor-mats' },
      { label: 'Car Aromatherapy', to: '/collections/car-aromatherapy' },
      { label: 'Car Perfume', to: '/collections/car-perfume' },
      { label: 'Key Case for Car', to: '/collections/key-case-for-car' },
      { label: 'Steering Covers', to: '/collections/steering-covers' },
      { label: 'Automobiles Seat Covers', to: '/collections/automobiles-seat-covers' },
      { label: 'Stowing Tidying', to: '/collections/stowing-tidying' },
    ],
  },
  {
    label: 'Tools, Maintenance & Care',
    to: '/collections/tools-maintenance-care',
    subs: [
      { label: 'Car Washer', to: '/collections/car-washer' },
      { label: 'Diagnostic Tools', to: '/collections/diagnostic-tools' },
      { label: 'Paint Care', to: '/collections/paint-care' },
      { label: 'Other Maintenance Products', to: '/collections/other-maintenance-products' },
    ],
  },
  {
    label: 'Car Electronics',
    to: '/collections/car-electronics',
    subs: [
      { label: 'Vehicle Camera', to: '/collections/vehicle-camera' },
      { label: 'DVR & Dash Camera', to: '/collections/dvr-dash-camera' },
      { label: 'Car Monitors', to: '/collections/car-monitors' },
      { label: 'Vehicle GPS', to: '/collections/vehicle-gps' },
      { label: 'Car Mirror Video', to: '/collections/car-mirror-video' },
      { label: 'Car Radios', to: '/collections/car-radios' },
      { label: 'GPS Trackers', to: '/collections/gps-trackers' },
      { label: 'Car Multimedia Player', to: '/collections/car-multimedia-player' },
      { label: 'Alarm Systems & Security', to: '/collections/alarm-systems-security' },
      { label: 'Jump Starter', to: '/collections/jump-starter' },
    ],
  },
  {
    label: 'Motorcycle Accessories & Parts',
    to: '/collections/motorcycle-accessories',
    subs: [
      { label: 'Lighting', to: '/collections/motorcycle-lighting' },
      { label: 'Exhaust & Exhaust Systems', to: '/collections/exhaust-systems' },
      { label: 'Motor Brake System', to: '/collections/motor-brake-system' },
      { label: 'Motorcycle Seat Covers', to: '/collections/motorcycle-seat-covers' },
      { label: 'Other Motorcycle Accessories', to: '/collections/other-motorcycle-accessories' },
      { label: 'Helmet Headset', to: '/collections/helmet-headset' },
      { label: 'Body & Frame', to: '/collections/body-frame' },
    ],
  },
  {
    label: 'Auto Replacement Parts',
    to: '/collections/auto-replacement-parts',
    subs: [
      { label: 'Interior Parts', to: '/collections/interior-parts' },
      { label: 'Car Brake System', to: '/collections/car-brake-system' },
      { label: 'Spark Plugs & Ignition System', to: '/collections/spark-plugs-ignition' },
      { label: 'Automobiles Sensors', to: '/collections/automobiles-sensors' },
      { label: 'Exterior Parts', to: '/collections/exterior-parts' },
      { label: 'Other Replacement Parts', to: '/collections/other-replacement-parts' },
      { label: 'Car Lights', to: '/collections/car-lights' },
      { label: 'Windscreen Wipers & Windows', to: '/collections/windscreen-wipers-windows' },
    ],
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.cartItems);
  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.qty, 0);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const wishlistCount = wishlistItems.length;
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const { data: categoriesData = [] } = useGetCategoriesQuery(undefined);
  const prefetchProducts = productApiSlice.usePrefetch('getProducts');

  const userDisplayName =
    userInfo?.firstName?.trim() ||
    [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(' ').trim() ||
    userInfo?.email ||
    'ME';

  const queryQ = new URLSearchParams(location.search).get('q') || '';
  const [searchQuery, setSearchQuery] = useState(queryQ);

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(new URLSearchParams(location.search).get('q') || '');
    } else {
      setSearchQuery('');
    }
  }, [location.pathname, location.search]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const dropdownCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestionListRef = useRef<any[]>([]);
  const doSearchRef = useRef<((q: string) => void) | undefined>(undefined);
  const profileRef = useRef<HTMLDivElement>(null);

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
    if (!searchFocused) return;
    const handler = (e: KeyboardEvent) => {
      const list = suggestionListRef.current;
      if (e.key === 'Escape') { setSearchFocused(false); searchInputRef.current?.blur(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestionIdx((i) => Math.min(i + 1, list.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestionIdx((i) => Math.max(i - 1, -1)); return; }
      if (e.key === 'Enter') {
        if (selectedSuggestionIdx >= 0) {
          e.preventDefault();
          const item = list[selectedSuggestionIdx];
          if (item.type === 'recent' || item.type === 'trending') {
            setSearchQuery(item.label);
            doSearchRef.current?.(item.label);
          } else if ((item.type === 'product' || item.type === 'category') && item.to) {
            navigate(item.to);
            setSearchFocused(false);
            setSelectedSuggestionIdx(-1);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchFocused, selectedSuggestionIdx, navigate]);

  // Debounced live search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearchFetching } = useGetProductsQuery(
    { q: debouncedQuery, pageNum: 1, pageSize: 6 },
    { skip: debouncedQuery.trim().length < 2 }
  );

  const products = searchResults?.products || [];

  // Build suggestion list
  const suggestionList: { type: string; label: string; to?: string; image?: string; price?: string; category?: string }[] = [];
  if (debouncedQuery.length >= 2) {
    const qLower = debouncedQuery.toLowerCase();
    const toSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    categoriesData.forEach((cat: any) => {
      if (cat.name?.toLowerCase().includes(qLower) || cat.group?.toLowerCase().includes(qLower)) {
        let slug = toSlug(cat.name);
        if (cat.group?.toLowerCase() === 'men' && slug === 'jeans') {
          slug = 'men-jeans';
        }
        suggestionList.push({
          type: 'category',
          label: `${cat.group} > ${cat.name}`,
          to: `/collections/${cat.group.toLowerCase()}/${slug}`
        });
      }
    });

    products.forEach((p: any) => {
      const getProductPrice = (item: any) => {
        const num = (v: any) => (typeof v === 'number' && !isNaN(v) && v > 0 ? v : typeof v === 'string' && !isNaN(Number(v)) && Number(v) > 0 ? Number(v) : 0);
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

      suggestionList.push({
        type: 'product',
        label: p.title || p.productName || p.name || '',
        to: `/product/${getProductId(p)}`,
        image: p.images?.[0] || p.productImage,
        price: formatINR(getProductPrice(p)),
        category: p.collectionType || p.categoryName || '',
      });
    });
  }
  suggestionListRef.current = suggestionList;

  const doSearchRefValue = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    setSelectedSuggestionIdx(-1);
  }, [navigate]);
  doSearchRef.current = doSearchRefValue;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearchRefValue(searchQuery);
  };
  const highlightMatch = (text: string) => {
    if (!debouncedQuery || debouncedQuery.length < 2) return text;
    const idx = text.toLowerCase().indexOf(debouncedQuery.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-black px-0.5 rounded">{text.slice(idx, idx + debouncedQuery.length)}</mark>
        {text.slice(idx + debouncedQuery.length)}
      </>
    );
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavEnter = (label: string) => {
    clearTimeout(dropdownCloseTimer.current);
    setOpenDropdown(label);
    setHoveredSub(null);
  };
  const handleNavLeave = () => {
    dropdownCloseTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      setHoveredSub(null);
    }, 120);
  };
  const handleDropdownEnter = () => {
    clearTimeout(dropdownCloseTimer.current);
  };
  const handleDropdownLeave = () => {
    dropdownCloseTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      setHoveredSub(null);
    }, 120);
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 w-full bg-black text-white transition-all duration-300 font-sans border-b border-zinc-800 ${scrolled ? 'shadow-xl shadow-black/40' : 'shadow-none'}`}>
        <div className="flex items-center justify-between h-[72px] max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10">

          {/* Left - Logo */}
          <Link to="/" className="shrink-0 flex items-center group">
            <img
              src="/img/logo.png"
              alt="AutoTrade"
              className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Center - Nav with Mega Dropdowns (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navCategories.map((cat) => {
              const hasSubs = cat.subs.length > 0;
              const isOpen = openDropdown === cat.label;
              const active = isActive(cat.to);
              const activeSub = hoveredSub ?? (cat.subs[0]?.label ?? null);
              const subItems = cat.subs;
              return (
                <div
                  key={cat.to}
                  className="relative"
                  onMouseEnter={() => handleNavEnter(cat.label)}
                  onMouseLeave={handleNavLeave}
                >
                  {/* Nav button */}
                  <Link
                    to={cat.to}
                    className={`flex items-center gap-1 px-2.5 xl:px-3 py-2 rounded-md text-[12.5px] xl:text-[13px] font-semibold tracking-wide transition-all duration-150 whitespace-nowrap ${active
                        ? 'text-red-400'
                        : isOpen
                          ? 'text-white bg-white/5'
                          : 'text-zinc-300 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {cat.label}
                    {hasSubs && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-400' : 'text-zinc-400'
                          }`}
                        strokeWidth={2.5}
                      />
                    )}
                  </Link>

                  {/* Mega Dropdown */}
                  <AnimatePresence>
                    {isOpen && hasSubs && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{ transformOrigin: 'top center' }}
                        className="absolute top-full left-0 mt-1 z-50 flex rounded-xl overflow-hidden shadow-2xl border border-[#1C274C] bg-white"
                        onMouseEnter={handleDropdownEnter}
                        onMouseLeave={handleDropdownLeave}
                      >
                        {/* Left panel – category list */}
                        <div className="w-[230px] border-r border-gray-100 py-2">
                          {navCategories.map((c) => {
                            const isThisHovered = (hoveredSub === null && c.label === cat.label) || c.label === hoveredSub?.split('__')[0];
                            const isHighlighted = c.label === (hoveredSub?.split('__')[0] ?? cat.label);
                            return (
                              <div
                                key={c.label}
                                className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors duration-100 group/item ${isHighlighted
                                    ? 'bg-orange-50'
                                    : 'hover:bg-gray-50'
                                  }`}
                                onMouseEnter={() => setHoveredSub(c.label + '__')}
                              >
                                <span className={`text-[13px] font-medium ${isHighlighted ? 'text-orange-500 font-semibold' : 'text-gray-800 group-hover/item:text-orange-500'
                                  }`}>
                                  {c.label}
                                </span>
                                {c.subs.length > 0 && (
                                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isHighlighted ? 'text-orange-500' : 'text-gray-400 group-hover/item:text-orange-500'
                                    }`} strokeWidth={2.5} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Right panel – subcategories of highlighted category */}
                        {(() => {
                          const highlightedCat = hoveredSub
                            ? navCategories.find(c => c.label === hoveredSub.split('__')[0])
                            : cat;
                          if (!highlightedCat || highlightedCat.subs.length === 0) return null;
                          return (
                            <div className="w-[210px] py-2 bg-white">
                              {highlightedCat.subs.map((sub) => (
                                <Link
                                  key={sub.to}
                                  to={sub.to}
                                  onClick={() => { setOpenDropdown(null); setHoveredSub(null); }}
                                  className="block px-5 py-3 text-[13px] text-gray-800 hover:text-orange-500 hover:bg-orange-50 transition-colors duration-100 font-medium"
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Right - Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-1.5">

            {/* Desktop Search Bar */}
            <div ref={searchContainerRef} className="hidden md:block relative">
              <motion.form
                onSubmit={handleSearchSubmit}
                className="relative"
                animate={searchFocused ? { scaleX: 1.05 } : { scaleX: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`flex items-center rounded-[25px] border transition-all duration-200 h-[44px] ${searchFocused ? 'border-blue-400 bg-[#16223D] shadow-lg shadow-black/30' : 'border-[#1E2C4F] bg-[#101B36] hover:border-[#2C3E6B]'}`}>
                  <Search className="ml-4 mr-2.5 h-4.5 w-4.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedSuggestionIdx(-1); }}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search products..."
                    className="flex-1 bg-transparent text-[14px] text-white placeholder:text-zinc-400 focus:outline-none min-w-[170px] max-w-[210px] lg:min-w-[210px] text-left normal-case"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mr-2 p-1 hover:bg-[#1E2C4F] rounded-full transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4 text-zinc-400" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </motion.form>

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchFocused && debouncedQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-[#0F182E] rounded-xl shadow-2xl border border-[#1E2C4F] overflow-hidden z-50"
                    style={{ transformOrigin: 'top center' }}
                  >
                    <div className="py-2">
                      {/* Loading */}
                      {isSearchFetching && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" strokeWidth={1.5} />
                        </div>
                      )}
                      {/* Results */}
                      {!isSearchFetching && (suggestionList.length > 0) && (
                        <div>
                          {suggestionList.map((item: any, i: number) => {
                            if (item.type === 'category') {
                              return (
                                <Link
                                  key={`cat-${item.label}-${i}`}
                                  to={item.to}
                                  onClick={() => { setSearchFocused(false); setSearchQuery(''); }}
                                  onMouseEnter={() => setSelectedSuggestionIdx(i)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${selectedSuggestionIdx === i ? 'bg-[#1E2C4F]' : 'hover:bg-[#16223D]'}`}
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
                                  onClick={() => { setSearchFocused(false); setSearchQuery(''); }}
                                  onMouseEnter={() => setSelectedSuggestionIdx(i)}
                                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${selectedSuggestionIdx === i ? 'bg-[#1E2C4F]' : 'hover:bg-[#16223D]'}`}
                                >
                                  <div className="w-10 h-12 shrink-0 bg-[#16223D] border border-[#25365E] overflow-hidden rounded">
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
                                  <span className="text-sm font-semibold text-blue-300 shrink-0">{item.price}</span>
                                </Link>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      {/* Empty */}
                      {!isSearchFetching && products.length === 0 && debouncedQuery.length >= 2 && (
                        <div className="px-4 py-8 text-center">
                          <Search className="h-6 w-6 mx-auto mb-2 text-zinc-500" strokeWidth={1.5} />
                          <p className="text-sm text-zinc-400">No products found for "{debouncedQuery}"</p>
                          <p className="text-xs text-zinc-500 mt-1">Try a different search term</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Search Trigger */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 hover:bg-[#1E2C4F] rounded-full transition-colors cursor-pointer text-zinc-300 hover:text-white"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-5.5 w-5.5" strokeWidth={1.5} />
            </button>

            {/* Theme Toggle */}
            <div className="hidden md:flex items-center justify-center w-10 h-10 hover:bg-[#1E2C4F] rounded-full transition-colors cursor-pointer text-zinc-300 hover:text-white">
              <ThemeToggle />
            </div>

            {/* Wishlist */}
            <Link to="/wishlist" className="hidden md:flex relative items-center justify-center w-10 h-10 hover:bg-[#1E2C4F] rounded-full transition-colors group text-zinc-300 hover:text-white">
              <Heart className="h-5.5 w-5.5 group-hover:scale-105 transition-transform duration-200" strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 cursor-pointer hover:bg-[#1E2C4F] text-zinc-300 hover:text-white group"
                style={{ backgroundColor: userInfo ? '#16223D' : 'transparent' }}
                aria-label="Profile"
              >
                {userInfo ? (
                  <span className="text-xs font-bold text-white uppercase tracking-wide select-none">
                    {(userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()}
                    {(userInfo.lastName?.[0] || '')}
                  </span>
                ) : (
                  <UserRound className="h-5.5 w-5.5 group-hover:scale-105 transition-all duration-200" strokeWidth={1.5} />
                )}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50"
                    style={{ transformOrigin: 'top right' }}
                  >
                    {userInfo ? (
                      <>
                        <div className="px-5 py-4 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                              Hello, {userInfo.firstName || userDisplayName}
                            </p>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${userInfo.role === 'admin' ? 'bg-[#0050cb] text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                              {userInfo.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{userInfo.email}</p>
                        </div>
                        <div className="py-1">
                          {[
                            { to: '/account?tab=profile', label: 'My Profile', icon: UserRound },
                            { to: '/account', label: 'My Orders', icon: Package },
                            { to: '/account?tab=notifications', label: 'Notifications', icon: Bell },
                            { to: '/account?tab=wishlist', label: 'Wishlist', icon: Heart },
                            { to: '/account?tab=addresses', label: 'Saved Addresses', icon: MapPin },
                            { to: '/account?tab=settings', label: 'Settings', icon: Settings },
                          ].map(({ to, label, icon: Icon }) => (
                            <Link
                              key={to}
                              to={to}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white rounded-xl transition-all duration-200 group/item"
                            >
                              <Icon className="h-4 w-4 text-zinc-400 group-hover/item:text-zinc-600 transition-colors duration-200" strokeWidth={1.5} />
                              {label}
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-zinc-100 py-1">
                          {userInfo?.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white rounded-xl transition-all duration-200 group/item"
                            >
                              <Shield className="h-4 w-4 text-zinc-400 group-hover/item:text-zinc-600 transition-colors duration-200" strokeWidth={1.5} />
                              Admin Panel
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              dispatch(logout());
                              dispatch(apiSlice.util.resetApiState());
                              dispatch(clearCartItems());
                              dispatch(clearWishlist());
                              setProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            <LogOut className="h-4 w-4" strokeWidth={1.5} />
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-5 py-5 text-center border-b border-zinc-100 dark:border-zinc-800">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <UserRound className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">Welcome to AutoTrade</h3>
                          <p className="text-xs text-zinc-500 mt-1">Discover premium automotive parts & accessories.</p>
                        </div>
                        <div className="px-4 py-4 space-y-2">
                          <Link
                            to="/login"
                            onClick={() => setProfileOpen(false)}
                            className="block w-full text-center bg-[#111111] dark:bg-white text-white dark:text-zinc-900 rounded-xl py-3 text-sm font-semibold tracking-wide hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                          >
                            Login
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => setProfileOpen(false)}
                            className="block w-full text-center bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl py-3 text-sm font-semibold tracking-wide hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-200"
                          >
                            Sign Up
                          </Link>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cart */}
            <button
              onClick={() => setMiniCartOpen(true)}
              className="relative flex items-center justify-center w-10 h-10 hover:bg-[#1E2C4F] rounded-full transition-colors group cursor-pointer text-zinc-300 hover:text-white"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5.5 w-5.5 group-hover:scale-105 transition-transform duration-200" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] px-1 h-[18px] bg-[#f97316] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle (Right side) */}
            <button
              className="lg:hidden flex items-center justify-center w-10 h-10 hover:bg-[#1E2C4F] rounded-full transition-colors cursor-pointer ml-1 text-zinc-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5.5 w-5.5" strokeWidth={1.5} /> : <Menu className="h-5.5 w-5.5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#111111] border-t border-zinc-200 dark:border-zinc-800 shadow-lg max-h-[calc(100vh-88px)] overflow-y-auto">
            <div className="px-6 py-6 space-y-1">
              {/* Profile section at top */}
              {userInfo ? (
                <div className="mb-5 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#111111] flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
                      {(userInfo.firstName?.[0] || userInfo.email?.[0] || 'U').toUpperCase()}
                      {(userInfo.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{userInfo.firstName || userDisplayName}</p>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${userInfo.role === 'admin' ? 'bg-[#0050cb] text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                          {userInfo.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{userInfo.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-5 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <UserRound className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Welcome to AutoTrade</p>
                      <p className="text-xs text-zinc-500">Sign in for exclusive access</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center bg-[#111111] dark:bg-white text-white dark:text-zinc-900 rounded-xl py-2.5 text-sm font-semibold"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 text-sm font-semibold"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <p className="px-3 py-2 text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">Shop</p>
              {navCategories.map((cat) => (
                <Link
                  key={cat.to}
                  to={cat.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-[17px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white rounded-lg transition-colors"
                >
                  {cat.label}
                </Link>
              ))}

              <hr className="my-3 border-zinc-100 dark:border-zinc-800" />

              {/* Account links */}
              <p className="px-3 py-2 text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">Account</p>
              {userInfo && (
                <>
                  {[
                    { to: '/account?tab=profile', label: 'My Profile', icon: UserRound },
                    { to: '/account', label: 'My Orders', icon: Package },
                    { to: '/account?tab=wishlist', label: 'Wishlist', icon: Heart },
                    { to: '/account?tab=addresses', label: 'Saved Addresses', icon: MapPin },
                    { to: '/account?tab=settings', label: 'Settings', icon: Settings },
                  ].map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Icon className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                      {label}
                    </Link>
                  ))}
                  {userInfo?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Shield className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { dispatch(logout()); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="h-5 w-5" strokeWidth={1.5} />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-[#111111] md:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Search header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <form onSubmit={(e) => { e.preventDefault(); doSearchRefValue(searchQuery); }} className="flex-1 flex items-center rounded-[25px] border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 h-[50px]">
                  <Search className="ml-5 mr-3 h-5 w-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 bg-transparent text-[15px] text-zinc-800 dark:text-white placeholder:text-zinc-400 focus:outline-none pr-2 text-left normal-case"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="mr-2 p-1 cursor-pointer">
                      <X className="h-4 w-4 text-zinc-400" strokeWidth={2} />
                    </button>
                  )}
                </form>
                <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 shrink-0 cursor-pointer">
                  Cancel
                </button>
              </div>

              {/* Search content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {debouncedQuery.length >= 2 ? (
                  isSearchFetching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" strokeWidth={1.5} />
                    </div>
                  ) : suggestionList.length > 0 ? (
                    <div className="space-y-3">
                      {suggestionList.map((item: any, i: number) => {
                        if (item.type === 'category') {
                          return (
                            <Link
                              key={`mcat-${item.label}-${i}`}
                              to={item.to}
                              onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            >
                              <Search className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{highlightMatch(item.label)}</span>
                            </Link>
                          );
                        }
                        if (item.type === 'product') {
                          return (
                            <Link
                              key={`mprod-${item.to}-${i}`}
                              to={item.to}
                              onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-16 h-20 shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden rounded-lg">
                                {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{highlightMatch(item.label)}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{item.category}</p>
                                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-1">{item.price}</p>
                              </div>
                            </Link>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                      <p className="text-sm text-zinc-500">No products found</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-10 w-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Type at least 2 characters to search...</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Cart */}
      <MiniCart isOpen={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
    </>
  );
};

export default Navbar;

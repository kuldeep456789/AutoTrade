import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Car,
  Armchair,
  Wrench,
  Bike,
  Cpu,
  Cog,
  ShieldCheck,
  Award,
  RotateCcw,
  Truck,
  Sparkles,
  Search,
} from 'lucide-react';
import { useGetProductsQuery, useGetCatalogStatsQuery } from '../store/slices/productApiSlice';
import ProductCard from '../components/product/ProductCard';
import { getProductId } from '../lib/product';
import TrustBadgesBar from '../components/layout/TrustBadgesBar';
import VehicleFinder from '../components/home/VehicleFinder';
import { useCurrency } from '../context/CurrencyContext';
import { useDiscount } from '../context/DiscountContext';
import DiscountBadge from '../components/common/DiscountBadge';

const heroCategories = [
  {
    title: 'Exterior Accessories',
    description: 'Style, protection & aero upgrades for exterior panels.',
    to: '/collections/exterior-accessories',
    bgImage: '/img/categories/exterior_accessories.png',
    icon: Car,
  },
  {
    title: 'Interior Accessories',
    description: 'Cabin luxury, tailored seat covers & floor mats.',
    to: '/collections/interior-accessories',
    bgImage: '/img/categories/interior_accessories.png',
    icon: Armchair,
  },
  {
    title: 'Tools, Maintenance & Care',
    description: 'Diagnostic scanners, washers & detailing essentials.',
    to: '/collections/tools-maintenance-care',
    bgImage: '/img/categories/tools_maintenance.png',
    icon: Wrench,
  },
  {
    title: 'Car Electronics',
    description: 'Smart dash cams, GPS navigation & multimedia setups.',
    to: '/collections/car-electronics',
    bgImage: '/img/categories/car_electronics.png',
    icon: Cpu,
  },
  {
    title: 'Motorcycle Parts',
    description: 'High-performance exhausts, lighting & bike gear.',
    to: '/collections/motorcycle-accessories',
    bgImage: '/img/categories/motorcycle_accessories.png',
    icon: Bike,
  },
  {
    title: 'Auto Replacement Parts',
    description: 'Braking systems, filters, ignition & OEM components.',
    to: '/collections/auto-replacement-parts',
    bgImage: '/img/categories/replacement_parts.png',
    icon: Cog,
  },
];

// ───────── TYPEWRITER HOOK ─────────
const TYPED_PHRASES = ['YOUR RIDE UPGRADE', 'PERFORMANCE BOOST', 'GENUINE OEM PARTS', 'PRECISION FIT'];
const TYPING_SPEED = 75;
const DELETING_SPEED = 35;
const PAUSE_AFTER_TYPING = 2200;
const PAUSE_AFTER_DELETING = 400;

function useTypewriter(phrases: string[]) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < current.length) {
          setDisplayText(current.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPING);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(current.slice(0, displayText.length - 1));
        } else {
          setIsDeleting(false);
          setPhraseIdx((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? DELETING_SPEED : (displayText.length === current.length ? PAUSE_AFTER_TYPING : TYPING_SPEED));

    return () => clearTimeout(timeout);
  }, [displayText, phraseIdx, isDeleting, phrases]);

  return displayText;
}

const HomePage = () => {
  const location = useLocation();
  const typedText = useTypewriter(TYPED_PHRASES);
  const { formatCurrency } = useCurrency();
  const { getOriginalPrice, getDiscountPercent } = useDiscount();

  // Hero slideshow
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHeroSlide((prev) => (prev + 1) % 2), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location.state?.scrollTo) {
      const section = document.getElementById(location.state.scrollTo);
      if (section) {
        setTimeout(() => {
          section.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.state]);

  const { data: autoData } = useGetProductsQuery({
    pageNum: 1,
    pageSize: 40,
  });

  const { data: statsData } = useGetCatalogStatsQuery(undefined);
  const totalCatalogCount = statsData?.totalProducts || autoData?.total || 14593;
  const formattedCatalogCount = totalCatalogCount.toLocaleString();

  const autoProducts = useMemo(() => {
    const raw = Array.isArray(autoData?.products) ? autoData.products : [];
    return raw.filter((p: any) => {
      const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
      return price && Number(price) > 1 && p.images && p.images.length > 0 && p.name;
    });
  }, [autoData]);

  // Featured carousel
  const carouselProducts = useMemo(() => {
    return autoProducts.slice(0, 10);
  }, [autoProducts]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Latest Arrival
  const latestArrivalProducts = useMemo(() => {
    return autoProducts.slice(10, 20);
  }, [autoProducts]);

  const latestArrivalRef = useRef<HTMLDivElement>(null);

  const scrollRef = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const [youMayLikeLimit, setYouMayLikeLimit] = useState(10);

  // Deal of the Day Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 36,
    seconds: 48,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('Exterior Accessories');

  const dealProducts = useMemo(() => {
    if (autoProducts.length === 0) return [];
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));

    const featured = autoProducts[hourSeed % autoProducts.length];
    const brakes = autoProducts.filter((p: any) => p.name && p.name.toLowerCase().includes('brake'));
    const brakeProduct = brakes.length > 0
      ? brakes[hourSeed % brakes.length]
      : autoProducts[(hourSeed + 1) % autoProducts.length];

    const lights = autoProducts.filter((p: any) =>
      p.name && (
        p.name.toLowerCase().includes('light') ||
        p.name.toLowerCase().includes('lamp') ||
        p.name.toLowerCase().includes('bulb')
      )
    );
    const lightProduct = lights.length > 0
      ? lights[hourSeed % lights.length]
      : autoProducts[(hourSeed + 2) % autoProducts.length];

    const interiors = autoProducts.filter((p: any) =>
      p.name && (
        p.name.toLowerCase().includes('interior') ||
        p.name.toLowerCase().includes('mat') ||
        p.name.toLowerCase().includes('seat') ||
        p.name.toLowerCase().includes('holder')
      )
    );
    const interiorProduct = interiors.length > 0
      ? interiors[hourSeed % interiors.length]
      : autoProducts[(hourSeed + 3) % autoProducts.length];

    return [featured, brakeProduct, lightProduct, interiorProduct].filter(Boolean);
  }, [autoProducts]);

  const trendingItems = useMemo(() => {
    const result: Record<string, any> = {};
    const categories = [
      'Exterior Accessories',
      'Interior Accessories',
      'Tools, Maintenance & Care',
      'Car Electronics',
      'Motorcycle Accessories & Parts',
      'Auto Replacement Parts',
    ];

    categories.forEach((catName, idx) => {
      let match = autoProducts.find((p: any) => p.collectionType === catName);
      if (!match) {
        const keyword = catName.split(' ')[0].toLowerCase();
        match = autoProducts.find((p: any) => p.name && p.name.toLowerCase().includes(keyword));
      }
      result[catName] = match || autoProducts[idx % autoProducts.length] || null;
    });
    return result;
  }, [autoProducts]);

  return (
    <div className="w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans">
      {/* ───────── 1. HERO SECTION ───────── */}
      <section className="relative min-h-[420px] xs:min-h-[460px] sm:h-[540px] lg:h-[640px] overflow-hidden bg-black text-white flex items-center">
        {['/img/car2.png', '/img/car1.png'].map((src, idx) => (
          <img
            key={src}
            src={src}
            alt={`AutoTrade Hero ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out"
            style={{ opacity: heroSlide === idx ? 1 : 0 }}
          />
        ))}
        {/* Soft gradient overlays for cinematic contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {[0, 1].map((idx) => (
            <button
              key={idx}
              onClick={() => setHeroSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${heroSlide === idx ? 'w-8 bg-[#FF7A00] shadow-[0_0_10px_rgba(255,122,0,0.8)]' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
          <div className="max-w-2xl text-left space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-[#FF7A00] text-[11px] sm:text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AutoTrade Pro &middot; Direct Marketplace</span>
            </div>

            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight uppercase">
              PERFORMANCE STARTS WITH <br className="hidden xs:inline" />
              <span className="text-[#FF7A00]">
                {typedText}
                <span className="inline-block w-1.5 sm:w-2 h-[0.85em] bg-[#FF7A00] ml-1 align-middle animate-pulse" />
              </span>
            </h1>

            <p className="text-xs xs:text-sm sm:text-base text-zinc-300 font-medium max-w-lg leading-relaxed normal-case">
              Discover over {formattedCatalogCount}+ precision-fit automotive accessories, diagnostic equipment, and OEM components engineered for every drive.
            </p>

            <div className="pt-2 sm:pt-4 flex flex-col xs:flex-row gap-3 sm:gap-4 items-stretch xs:items-center">
              <Link
                to="/collections/all"
                className="px-7 h-12 sm:h-13 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#FF9E00] hover:to-[#FF7A00] text-white text-xs sm:text-sm font-black tracking-wider uppercase transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Shop Now</span>
                <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('shop-by-category');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-7 h-12 sm:h-13 rounded-xl border border-white/30 hover:border-white bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 active:scale-[0.98] cursor-pointer backdrop-blur-sm flex items-center justify-center"
              >
                Explore Categories
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 2. TRUST BADGES (Compact 2x2 on Mobile) ───────── */}
      <TrustBadgesBar />


      {/* ───────── 4. SHOP BY CATEGORY ───────── */}
      <section id="shop-by-category" className="bg-zinc-50 dark:bg-zinc-950 py-10 sm:py-16 border-y border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-10 gap-3">
            <div>
              <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest block mb-1">
                Curated Collections
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
                Shop By Category
              </h2>
            </div>
            <Link
              to="/collections/all"
              className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 uppercase tracking-wider self-start sm:self-auto"
            >
              <span>View All Categories</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* 6 Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 xs:gap-4 sm:gap-5">
            {heroCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={idx}
                  to={cat.to}
                  className="group relative rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF7A00] shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden text-left p-3 xs:p-3.5 active:scale-[0.98]"
                >
                  {/* Category Image Box */}
                  <div className="relative w-full h-28 xs:h-32 sm:h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800/80 shrink-0">
                    <img
                      src={cat.bgImage}
                      alt={cat.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-zinc-950/80 backdrop-blur-xs text-[#FF7A00] border border-zinc-700/60 flex items-center justify-center shadow-sm">
                      <Icon size={14} strokeWidth={2} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col justify-between pt-3">
                    <div>
                      <h3 className="text-xs xs:text-[13px] font-bold tracking-tight text-zinc-900 dark:text-white uppercase group-hover:text-[#FF7A00] transition-colors leading-snug line-clamp-1">
                        {cat.title}
                      </h3>
                      <p className="text-[10px] xs:text-[11px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed line-clamp-2 mt-0.5 normal-case">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2">
                      <span className="w-full h-7 rounded-lg border border-orange-500/20 bg-orange-500/10 text-[10px] font-black text-orange-600 dark:text-orange-400 group-hover:bg-[#FF7A00] group-hover:text-white transition-all flex items-center justify-center gap-1 uppercase tracking-wider">
                        <span>Explore</span>
                        <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── 5. LATEST ARRIVALS CAROUSEL ───────── */}
      {latestArrivalProducts.length > 0 && (
        <section className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-950 py-10 sm:py-14 transition-colors duration-200">
          <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest block mb-1">
                  Just Dropped
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
                  Latest Arrivals
                </h2>
              </div>

              {/* Scroll Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRef(latestArrivalRef, 'left')}
                  className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF7A00] text-zinc-700 dark:text-zinc-300 hover:text-[#FF7A00] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Previous Latest Arrivals"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRef(latestArrivalRef, 'right')}
                  className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF7A00] text-zinc-700 dark:text-zinc-300 hover:text-[#FF7A00] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Next Latest Arrivals"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="relative -mx-4 xs:-mx-6 sm:mx-0">
              <div
                ref={latestArrivalRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 xs:px-6 sm:px-0 pb-3"
                style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {latestArrivalProducts.map((product: any, index: number) => (
                  <div key={`latest-${product.pid || product._id || product.id}-${index}`} className="shrink-0 w-[200px] xs:w-[240px] sm:w-[270px] md:w-[290px] snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── 6. TRENDING ACCESSORIES CAROUSEL ───────── */}
      {carouselProducts.length > 0 && (
        <section className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 py-10 sm:py-14 transition-colors duration-200">
          <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest block mb-1">
                  Handpicked & Verified
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
                  Trending Accessories
                </h2>
              </div>

              {/* Scroll Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRef(carouselRef, 'left')}
                  className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF7A00] text-zinc-700 dark:text-zinc-300 hover:text-[#FF7A00] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Previous Trending Accessories"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRef(carouselRef, 'right')}
                  className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF7A00] text-zinc-700 dark:text-zinc-300 hover:text-[#FF7A00] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Next Trending Accessories"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="relative -mx-4 xs:-mx-6 sm:mx-0">
              <div
                ref={carouselRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 xs:px-6 sm:px-0 pb-3"
                style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {carouselProducts.map((product: any, index: number) => (
                  <div key={`trending-${product.pid || product._id || product.id}-${index}`} className="shrink-0 w-[200px] xs:w-[240px] sm:w-[270px] md:w-[290px] snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── 6. FULL-WIDTH DEAL OF THE DAY & FLASH OFFERS ───────── */}
      <section className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white py-12 sm:py-16 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          {/* Header & Countdown Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 sm:mb-10 gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white border border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-[#FF7A00] text-[11px] font-black uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                <span>Flash Deals & Limited-Time Offers</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight uppercase text-white">
                Deal of the Day
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-lg">
                Exclusive direct manufacturer discounts on performance and luxury accessories. Updated hourly.
              </p>
            </div>

            {/* Countdown Timer + CTA */}
            <div className="relative z-10 flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                {[
                  { val: timeLeft.days, label: 'DAYS' },
                  { val: timeLeft.hours, label: 'HRS' },
                  { val: timeLeft.minutes, label: 'MINS' },
                  { val: timeLeft.seconds, label: 'SECS' },
                ].map((box, bIdx) => (
                  <div
                    key={bIdx}
                    className="flex flex-col items-center justify-center bg-black/80 border border-zinc-700/80 rounded-2xl w-13 h-15 sm:w-15 sm:h-17 shadow-inner"
                  >
                    <span className="text-base sm:text-xl font-black tracking-tight text-[#FF7A00] leading-none tabular-nums">
                      {String(box.val).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase mt-1">
                      {box.label}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/collections/all"
                className="px-6 h-12 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#FF9E00] hover:to-[#FF7A00] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 shrink-0"
              >
                <span>View All Deals</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Full-Width Grid of Deal Products */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-6">
            {dealProducts.slice(0, 8).map((prod: any, idx: number) => (
              <ProductCard key={`deal-${prod.pid || prod._id || prod.id}-${idx}`} product={prod} />
            ))}
          </div>
          {/* Bottom 4 Badges */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:flex sm:justify-between items-center gap-3 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#FF7A00]" /> 100% OEM Quality</span>
            <span className="flex items-center gap-2"><Award size={15} className="text-[#FF7A00]" /> Precision Tested</span>
            <span className="flex items-center gap-2"><RotateCcw size={15} className="text-[#FF7A00]" /> Easy Returns</span>
            <span className="flex items-center gap-2"><Truck size={15} className="text-[#FF7A00]" /> Express Shipping</span>
          </div>
        </div>
      </section>

      {/* ───────── 8. YOU MAY ALSO LIKE RECOMMENDATIONS ───────── */}
      <section className="py-12 sm:py-16 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#FF7A00]" /> Personalized Selection
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight uppercase">
                You May Also Like
              </h2>
            </div>

            <Link
              to="/collections/all"
              className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 uppercase tracking-wider"
            >





              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {autoProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4 sm:gap-5">
                {autoProducts.slice(0, youMayLikeLimit).map((product: any, idx: number) => (
                  <ProductCard key={`you-may-like-${product._id || getProductId(product) || idx}`} product={product} />
                ))}
              </div>

              {autoProducts.length > youMayLikeLimit && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setYouMayLikeLimit((prev) => prev + 10)}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-[#FF7A00] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Show More Products</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-400">Loading recommended catalog items...</p>
            </div>
          )}
        </div>
      </section>

      {/* ───────── 9. VERIFIED MANUFACTURER BRANDS ───────── */}
      <section className="bg-zinc-50 dark:bg-zinc-950 py-12 sm:py-16">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 mb-6 sm:mb-8 text-center">
          <p className="text-xs font-black text-[#FF7A00] uppercase tracking-widest mb-1.5">
            Direct Brand Partnerships
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">
            Verified Manufacturer Brands
          </h2>
        </div>
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 xs:gap-4 sm:gap-5">
          {[
            { src: '/img/CONTINENTAL_minimalist_vector_logo_2K_202607301318.jpeg', name: 'Continental' },
            { src: '/img/Minimalist_vector_logo_CASTROL_2K_202607301318.jpeg', name: 'Castrol' },
            { src: '/img/Minimalist_vector_logo_MOBIL_1_202607301318.jpeg', name: 'Mobil 1' },
            { src: '/img/Premium_minimalist_vector_logo_MANN_202607301318.jpeg', name: 'Mann Filter' },
            { src: '/img/one.jpeg', name: 'AutoTrade Partner' },
          ].map((logo, lIdx) => (
            <div
              key={`logo-${lIdx}`}
              className="flex items-center justify-center h-24 xs:h-28 sm:h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all p-4"
            >
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                className="max-h-full max-w-full w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;

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
  Award,
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useGetProductsQuery, useGetCatalogStatsQuery } from '../store/slices/productApiSlice';
import ProductCard from '../components/product/ProductCard';
import { getProductId } from '../lib/product';
import TrustBadgesBar from '../components/layout/TrustBadgesBar';
import { useCurrency } from '../context/CurrencyContext';

const heroCategories = [
  {
    title: 'Exterior Accessories',
    description: 'Enhance style and protection with premium exterior accessories.',
    to: '/collections/exterior-accessories',
    bgImage: '/img/categories/exterior_accessories.png',
    icon: Car,
  },
  {
    title: 'Interior Accessories',
    description: 'Upgrade comfort and luxury with high-quality interior accessories.',
    to: '/collections/interior-accessories',
    bgImage: '/img/categories/interior_accessories.png',
    icon: Armchair,
  },
  {
    title: 'Tools, Maintenance & Care',
    description: 'Professional tools and care products for every maintenance need.',
    to: '/collections/tools-maintenance-care',
    bgImage: '/img/categories/tools_maintenance.png',
    icon: Wrench,
  },
  {
    title: 'Car Electronics',
    description: 'Smart electronics for entertainment, safety and convenience.',
    to: '/collections/car-electronics',
    bgImage: '/img/categories/car_electronics.png',
    icon: Cpu,
  },
  {
    title: 'Motorcycle Accessories',
    description: 'Premium accessories and parts for ultimate ride performance.',
    to: '/collections/motorcycle-accessories',
    bgImage: '/img/categories/motorcycle_accessories.png',
    icon: Bike,
  },
  {
    title: 'Auto Replacement Parts',
    description: 'High-quality replacement parts for long-lasting performance.',
    to: '/collections/auto-replacement-parts',
    bgImage: '/img/categories/replacement_parts.png',
    icon: Cog,
  },
];

// ───────── TYPEWRITER HOOK ─────────
const TYPED_PHRASES = ['The Right Part', 'Premium Quality', 'Your Ride Upgrade', 'Performance Boost'];
const TYPING_SPEED = 80;
const DELETING_SPEED = 40;
const PAUSE_AFTER_TYPING = 2000;
const PAUSE_AFTER_DELETING = 400;

function useTypewriter(phrases: string[]) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < current.length) {
          setDisplayText(current.slice(0, displayText.length + 1));
        } else {
          // Pause, then start deleting
          setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPING);
        }
      } else {
        // Deleting
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

  // Hero slideshow
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHeroSlide((prev) => (prev + 1) % 2), 5000);
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
    pageSize: 200,
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

  // Featured carousel — first 10 valid products
  const carouselProducts = useMemo(() => {
    return autoProducts.slice(0, 10);
  }, [autoProducts]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Latest Arrival — next 10 valid products
  const latestArrivalProducts = useMemo(() => {
    return autoProducts.slice(10, 20);
  }, [autoProducts]);

  const latestArrivalRef = useRef<HTMLDivElement>(null);

  const scrollRef = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const [youMayLikeLimit, setYouMayLikeLimit] = useState(10);

  // Deal of the Day Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 15,
    minutes: 12,
    seconds: 34,
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
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60)); // 1-hour interval

    // 1. Featured product (hourly rotation over all products)
    const featured = autoProducts[hourSeed % autoProducts.length];

    // 2. Brake product (hourly rotation over products containing 'brake')
    const brakes = autoProducts.filter((p: any) => p.name && p.name.toLowerCase().includes('brake'));
    const brakeProduct = brakes.length > 0
      ? brakes[hourSeed % brakes.length]
      : autoProducts[(hourSeed + 1) % autoProducts.length];



    // 3. Light product (hourly rotation over products containing 'light'/'lamp'/'bulb')
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

    // 4. Interior product (hourly rotation over interior accessories)
    const interiors = autoProducts.filter((p: any) =>
      p.name && (
        p.name.toLowerCase().includes('interior') ||
        p.name.toLowerCase().includes('mat') ||
        p.name.toLowerCase().includes('seat') ||
        p.name.toLowerCase().includes('holder') ||
        p.name.toLowerCase().includes('organizer') ||
        p.name.toLowerCase().includes('cover')
      )
    );
    const interiorProduct = interiors.length > 0
      ? interiors[hourSeed % interiors.length]
      : autoProducts[(hourSeed + 3) % autoProducts.length];

    return [featured, brakeProduct, lightProduct, interiorProduct];
  }, [autoProducts]);

  const trendingItems = useMemo(() => {
    const result: Record<string, any> = {};
    const categories = [
      'Exterior Accessories',
      'Interior Accessories',
      'Tools, Maintenance & Care',
      'Car Electronics',
      'Motorcycle Accessories & Parts',
      'Auto Replacement Parts'
    ];

    categories.forEach((catName, idx) => {
      // 1. Try matching exact collectionType
      let match = autoProducts.find((p: any) => p.collectionType === catName);

      // 2. Try matching part of the name
      if (!match) {
        const keyword = catName.split(' ')[0].toLowerCase();
        match = autoProducts.find((p: any) => p.name && p.name.toLowerCase().includes(keyword));
      }

      // 3. Fallback to a unique product index
      result[catName] = match || autoProducts[idx % autoProducts.length] || null;
    });
    return result;
  }, [autoProducts]);

  return (
    <div className="w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans">
      {/* ───────── HERO VIDEO BANNER ───────── */}
      <section className="relative min-h-[380px] sm:h-[500px] lg:h-[660px] overflow-hidden bg-black text-white">
        {['/img/car2.png', '/img/car1.png'].map((src, idx) => (
          <img
            key={src}
            src={src}
            alt={`AutoTrade Hero ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out"
            style={{ opacity: heroSlide === idx ? 1 : 0 }}
          />
        ))}
        {/* Soft vignette overlay — kept light so the product stays visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
          {[0, 1].map((idx) => (
            <button
              key={idx}
              onClick={() => setHeroSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${heroSlide === idx ? 'w-9 bg-[#FF7A00] shadow-[0_0_12px_rgba(255,122,0,0.6)]' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
            />
          ))}
        </div>

        {/* Hero Content Overlay */}
        <div className="relative z-10 h-full max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center pb-10 sm:pb-0">
          <div className="max-w-[320px] xs:max-w-[360px] sm:max-w-2xl text-left space-y-6 sm:space-y-7 reveal-rise">

            <h1 className="text-[34px] leading-[1.08] xs:text-[38px] sm:text-7xl lg:text-7xl font-semibold tracking-tight uppercase">
              Performance Starts <br className="hidden sm:inline" />
              With <span className="text-[#FF7A00]">{typedText}<span className="inline-block w-[3px] h-[0.85em] bg-[#FF7A00] ml-1 align-middle" style={{ animation: 'blink-cursor 0.8s steps(1) infinite' }} /></span>
            </h1>
            <p className="text-[15px] sm:text-base text-zinc-300 font-medium normal-case max-w-md leading-relaxed">
              Explore {formattedCatalogCount}+ genuine automotive parts and accessories for every make and model. Engineered for excellence.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-col xs:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <Link
                to="/collections/exterior-accessories"
                className="w-full xs:w-auto px-8 h-14 sm:h-13 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#FF9E00] hover:to-[#FF7A00] text-white text-[13px] font-bold tracking-wider uppercase transition-all duration-300 shadow-[0_8px_24px_rgba(255,122,0,0.35)] hover:shadow-[0_8px_30px_rgba(255,122,0,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Shop Now</span>
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('collections-showcase');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full xs:w-auto px-8 h-14 sm:h-13 rounded-2xl border border-white/25 hover:border-white/60 bg-white/10 hover:bg-white/15 text-white text-[13px] font-bold tracking-wider uppercase transition-all duration-300 active:scale-[0.98] cursor-pointer backdrop-blur-md flex items-center justify-center"
              >
                Explore Categories
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TRUST BADGES BAR (Full Length) ───────── */}
      <TrustBadgesBar />

      {/* ───────── CATEGORY SHOWCASE ───────── */}
      <section id="collections-showcase" className="bg-zinc-50 dark:bg-zinc-950 py-12 sm:py-16 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-10 gap-4 reveal-fade-up">
            <div>
              <h3 className="text-2xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-600 dark:text-white uppercase">
                Popular Categories
              </h3>
            </div>

          </div>

          {/* 6 Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 xs:gap-4 sm:gap-5">
            {heroCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={idx}
                  to={cat.to}
                  className="group relative rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden text-left p-3 xs:p-3.5 active:scale-[0.98]"
                >
                  {/* Top Image Box */}
                  <div className="relative w-full h-28 xs:h-32 sm:h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800/80 shrink-0">
                    <img
                      src={cat.bgImage}
                      alt={cat.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-orange-500 border border-white/30 dark:border-zinc-700/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Icon size={16} strokeWidth={2} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col justify-between pt-3">
                    <div>
                      <h3 className="text-xs xs:text-[13px] font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase group-hover:text-orange-500 transition-colors leading-tight line-clamp-1">
                        {cat.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed line-clamp-2 mt-1">
                        {cat.description}
                      </p>
                    </div>

                    {/* Explore Button */}
                    <div className="mt-3 pt-2">
                      <span className="w-full h-8 py-1.5 px-3 rounded-full border border-orange-500/30 bg-orange-500/10 text-[10px] font-extrabold text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all flex items-center justify-center gap-1 uppercase tracking-wider shadow-2xs">
                        <span>Explore</span>
                        <ArrowRight size={12} className="transform group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── LATEST ARRIVAL CAROUSEL ───────── */}
      {latestArrivalProducts.length > 0 && (
        <section className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/80 transition-colors duration-200">
          <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 py-12 sm:py-14 lg:py-16">
            <div className="flex items-end justify-between mb-6 sm:mb-8 reveal-fade-up">
              <div>
                <span className="text-xs font-black text-orange-500 uppercase tracking-widest block mb-1">
                  Just Arrived
                </span>
                <h2 className="text-2xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-600 dark:text-white uppercase">
                  Latest Arrival
                </h2>
              </div>

              {/* Scroll Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRef(latestArrivalRef, 'left')}
                  className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-zinc-700 dark:text-zinc-300 hover:text-orange-500 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Previous Latest Arrivals"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scrollRef(latestArrivalRef, 'right')}
                  className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-zinc-700 dark:text-zinc-300 hover:text-orange-500 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Next Latest Arrivals"
                >
                  <ChevronRight size={18} />
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
                  <div key={`latest-${product.pid || product._id || product.id}-${index}`} className="flex-shrink-0 w-[220px] xs:w-[250px] sm:w-[280px] md:w-[300px] lg:w-[320px] snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── FEATURED COLLECTION CAROUSEL ───────── */}
      {carouselProducts.length > 0 && (
        <section className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/80 transition-colors duration-200">
          <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 py-12 sm:py-14 lg:py-16">
            <div className="flex items-end justify-between mb-6 sm:mb-8 reveal-fade-up">
              <div>
                <span className="text-xs font-black text-orange-500 uppercase tracking-widest block mb-1">
                  Handpicked Collection
                </span>
                <h2 className="text-2xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-600 dark:text-white uppercase">
                  Trending Accessories
                </h2>
              </div>

              {/* Scroll Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRef(carouselRef, 'left')}
                  className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-zinc-700 dark:text-zinc-300 hover:text-orange-500 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Previous Trending Accessories"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scrollRef(carouselRef, 'right')}
                  className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-zinc-700 dark:text-zinc-300 hover:text-orange-500 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Next Trending Accessories"
                >
                  <ChevronRight size={18} />
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
                  <div key={`${product.pid || product._id || product.id}-${index}`} className="flex-shrink-0 w-[220px] xs:w-[250px] sm:w-[280px] md:w-[300px] lg:w-[320px] snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── DEAL OF THE DAY & INTERACTIVE CAR EXPLORER ───────── */}
      <section className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white py-12 sm:py-16 border-b border-zinc-200 dark:border-zinc-900 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 xs:gap-6 sm:gap-8">

            {/* Left Box: Deal of the Day */}
            <div className="relative rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 xs:p-5 sm:p-8 flex flex-col justify-between overflow-hidden shadow-xl">
              {/* Background glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

              {/* Top Row: Heading and Timer */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF7A00] flex items-center justify-center font-bold text-sm text-white shrink-0">5</div>
                    <div>
                      <h3 className="text-base xs:text-lg font-bold tracking-wider uppercase text-[#FF7A00]">DEAL OF THE DAY</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Limited time offer. Grab it before it's gone!</p>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center gap-1.5 xs:gap-2 shrink-0 self-start sm:self-auto">
                    {[
                      { val: timeLeft.days, label: 'DAYS' },
                      { val: timeLeft.hours, label: 'HRS' },
                      { val: timeLeft.minutes, label: 'MINS' },
                      { val: timeLeft.seconds, label: 'SECS' }
                    ].map((box, bIdx) => (
                      <div key={bIdx} className="flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl w-11 xs:w-12 h-14 xs:h-16">
                        <span className="text-base xs:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-none tabular-nums">
                          {String(box.val).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] xs:text-[9px] font-bold text-zinc-500 tracking-wider uppercase mt-1">
                          {box.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4 Deals Stacked Vertically */}
                <div className="mt-5 xs:mt-6 space-y-2.5 xs:space-y-3">
                  {dealProducts.slice(0, 4).map((prod, idx) => {
                    const price = prod.discountPrice && prod.discountPrice < prod.price ? prod.discountPrice : prod.price;
                    const originalPrice = prod.price;
                    const discountPercent = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

                    return (
                      <div
                        key={idx}
                        className="group/deal relative flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#FF7A00]/50 transition-all duration-300 shadow-sm"
                      >
                        {/* Image */}
                        <Link
                          to={`/product/${getProductId(prod)}`}
                          className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden p-1.5"
                        >
                          <img
                            src={prod.images?.[0] || '/img/placeholder.png'}
                            alt={prod.name}
                            loading="lazy"
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(255,122,0,0.15)] group-hover/deal:scale-110 transition-transform duration-300"
                          />
                          {discountPercent > 0 && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#FF7A00] text-white text-[9px] font-black uppercase tracking-wider shadow-md">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[10px] text-[#FF7A00] font-black uppercase tracking-widest truncate">
                              {idx === 0
                                ? 'Featured Deal'
                                : idx === 1
                                  ? 'Brakes Special'
                                  : idx === 2
                                    ? 'Lighting Special'
                                    : 'Interior Styling'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider shrink-0 hidden sm:inline-block">
                              {prod.subcategoryName}
                            </span>
                          </div>
                          <Link to={`/product/${getProductId(prod)}`}>
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 group-hover/deal:text-[#FF7A00] transition-colors line-clamp-1">
                              {prod.name}
                            </h4>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm sm:text-base font-extrabold text-[#FF7A00] tabular-nums">{formatCurrency(price)}</span>
                            {discountPercent > 0 && (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through">{formatCurrency(originalPrice)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Bottom footer to fill remaining space + match right box's border-top badges */}
              <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
                <Link
                  to="/collections/auto-replacement-parts"
                  className="w-full h-11 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/30 hover:bg-[#FF7A00] hover:text-white text-[#FF7A00] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  View All Deals <ArrowRight size={14} />
                </Link>
              </div>

            </div>

            {/* Right Box: Interactive Car Explorer */}
            <div className="relative rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 xs:p-5 sm:p-8 flex flex-col justify-between overflow-hidden shadow-xl">

              {/* Heading */}
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF7A00] flex items-center justify-center font-bold text-sm text-white shrink-0">6</div>
                    <div>
                      <h3 className="text-base xs:text-lg font-bold tracking-wider uppercase text-[#FF7A00]">INTERACTIVE CAR EXPLORER</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Explore parts by clicking on the hotspots</p>
                    </div>
                  </div>
                </div>

                {/* Car Hotspots Graphic Layout */}
                <div className="relative mt-5 h-[260px] sm:h-[280px] w-full flex items-center justify-center bg-zinc-950/80 rounded-2xl border border-zinc-300/80 dark:border-zinc-800/60 overflow-hidden p-2">
                  <img
                    src="/img/interactive_car_wireframe.png"
                    alt="Interactive Wireframe Sedan"
                    loading="lazy"
                    className="w-full h-full object-cover filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                  />

                  {/* Hotspots Overlay */}
                  {/* Hotspot 1: Engine */}
                  <button
                    onClick={() => setSelectedCategory('Auto Replacement Parts')}
                    className="absolute top-[35%] left-[25%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Auto Replacement Parts' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Auto Replacement Parts' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                  {/* Hotspot 2: Headlight */}
                  <button
                    onClick={() => setSelectedCategory('Exterior Accessories')}
                    className="absolute top-[48%] left-[18%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Exterior Accessories' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Exterior Accessories' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                  {/* Hotspot 3: Exhaust */}
                  <button
                    onClick={() => setSelectedCategory('Motorcycle Accessories & Parts')}
                    className="absolute top-[68%] left-[32%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Motorcycle Accessories & Parts' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Motorcycle Accessories & Parts' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                  {/* Hotspot 4: Suspension */}
                  <button
                    onClick={() => setSelectedCategory('Auto Replacement Parts')}
                    className="absolute top-[40%] right-[32%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Auto Replacement Parts' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Auto Replacement Parts' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                  {/* Hotspot 5: Brakes */}
                  <button
                    onClick={() => setSelectedCategory('Auto Replacement Parts')}
                    className="absolute top-[60%] right-[22%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Auto Replacement Parts' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Auto Replacement Parts' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                  {/* Hotspot 6: Wheels */}
                  <button
                    onClick={() => setSelectedCategory('Exterior Accessories')}
                    className="absolute top-[72%] right-[28%] group cursor-pointer focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={`absolute w-6 h-6 rounded-full bg-orange-500/40 animate-ping transition-opacity ${selectedCategory === 'Exterior Accessories' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center transition-all ${selectedCategory === 'Exterior Accessories' ? 'bg-[#FF7A00] scale-125' : 'bg-zinc-500 group-hover:bg-[#FF7A00]'
                        }`} />
                    </div>
                  </button>
                </div>

                {/* Hotspot Links Panel */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 xs:gap-3 mt-5 xs:mt-6">
                  {[
                    { label: 'Exterior Accessories', img: '/img/one.jpeg', defaultLink: '/collections/exterior-accessories' },
                    { label: 'Interior Accessories', img: '/img/two.jpeg', defaultLink: '/collections/interior-accessories' },
                    { label: 'Tools, Maintenance & Care', img: '/img/three.jpeg', defaultLink: '/collections/tools-maintenance-care' },
                    { label: 'Car Electronics', img: '/img/four.jpeg', defaultLink: '/collections/car-electronics' },
                    { label: 'Motorcycle Accessories & Parts', img: '/img/five.jpeg', defaultLink: '/collections/motorcycle-accessories' },
                    { label: 'Auto Replacement Parts', img: '/img/brembo_brake_disc.png', defaultLink: '/collections/auto-replacement-parts' }
                  ].map((part, pIdx) => {
                    const actualProd = trendingItems[part.label];
                    const productLink = actualProd ? `/product/${getProductId(actualProd)}` : part.defaultLink;
                    const productImage = actualProd?.images?.[0] || part.img;

                    return (
                      <Link
                        key={pIdx}
                        to={productLink}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-[0.98] ${selectedCategory === part.label
                          ? 'bg-zinc-200 dark:bg-zinc-900 border-[#FF7A00] shadow-[0_0_15px_rgba(255,122,0,0.15)]'
                          : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                          }`}
                      >
                        <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 shrink-0">
                          <img src={productImage} alt={part.label} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className={`text-[11px] xs:text-[11.5px] font-black uppercase transition-colors block ${selectedCategory === part.label ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                            }`}>
                            {part.label}
                          </span>
                          <span className={`text-[10px] transition-colors block leading-tight mt-0.5 ${selectedCategory === part.label ? 'text-orange-500 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-500'
                            }`}>
                            Explore Collection
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>


              </div>

              {/* Bottom 4 Badges */}
              <div className="mt-6 xs:mt-8 pt-4 xs:pt-5 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-between items-center gap-3 text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#FF7A00]" /> OEM Quality</span>
                <span className="flex items-center gap-1.5"><Award size={14} className="text-[#FF7A00]" /> Precision Fit</span>
                <span className="flex items-center gap-1.5"><RotateCcw size={14} className="text-[#FF7A00]" /> High Durability</span>
                <span className="flex items-center gap-1.5"><Truck size={14} className="text-[#FF7A00]" /> Easy Installation</span>
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* ────── "You May Also Like" Recommendation Section ────── */}
      <section className="py-12 sm:py-16 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-900 transition-colors duration-200">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" /> Personalized Selection
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight uppercase">
                You May Also Like
              </h2>
            </div>

            <Link
              to="/collections/exterior-accessories"
              className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 uppercase tracking-wider"
            >
              Explore All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {autoProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4 sm:gap-5 lg:gap-6">
                {autoProducts.slice(0, youMayLikeLimit).map((product: any, idx: number) => (
                  <ProductCard key={`you-may-like-${product._id || getProductId(product) || idx}`} product={product} />
                ))}
              </div>

              {autoProducts.length > youMayLikeLimit && (
                <div className="mt-10 text-center">
                  <button
                    onClick={() => setYouMayLikeLimit((prev) => prev + 10)}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 text-zinc-900 dark:text-white text-xs font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Show More Products</span>
                    <ArrowRight size={14} className="text-orange-500" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-400">No recommended products available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Brand Logos Section (Static & Centered - No Duplicates, No Scroll) */}
      <section className="bg-zinc-50 dark:bg-zinc-950 py-12 sm:py-16 border-b border-zinc-200 dark:border-zinc-900 relative">
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 mb-6 sm:mb-10 text-center reveal-fade-up">
          <p className="text-xs font-black text-[#FF7A00] uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
            Direct Brand Partnerships
          </p>
          <h2 className="text-2xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-600 dark:text-white uppercase">
            Verified Manufacturer Brands
          </h2>
        </div>
        <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 xs:gap-4 sm:gap-5">
          {[
            { src: '/img/CONTINENTAL_minimalist_vector_logo_2K_202607301318.jpeg', name: 'Continental' },
            { src: '/img/Minimalist_vector_logo_CASTROL_2K_202607301318.jpeg', name: 'Castrol' },
            { src: '/img/Minimalist_vector_logo_MOBIL_1_202607301318.jpeg', name: 'Mobil 1' },
            { src: '/img/Premium_minimalist_vector_logo_MANN_202607301318.jpeg', name: 'Mann Filter' },
            { src: '/img/one.jpeg', name: 'AutoTrade Partner' }
          ].map((logo, lIdx) => (
            <div
              key={`logo-static-${lIdx}`}
              className="flex items-center justify-center h-24 xs:h-28 sm:h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300 p-4 sm:p-5"
            >
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                className="max-h-full max-w-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Empty state — warehouse not yet populated */}
      {autoProducts.length === 0 && (
        <section className="py-24 text-center border-b-2 border-black dark:border-white">
          <p className="text-2xl font-black tracking-widest text-zinc-400">SYNCING PRODUCTS...</p>
        </section>
      )}
    </div>
  );
};

export default HomePage;

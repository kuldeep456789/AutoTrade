import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  Car,
  Armchair,
  Wrench,
  Bike,
  Cpu,
  Cog,
  Droplets,
  Warehouse,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

import { useGetProductsQuery } from '../store/slices/productApiSlice';
import ProductCard from '../components/product/ProductCard';

const heroCategories = [
  {
    title: 'Exterior Accessories',
    description: 'Enhance style and protection with premium exterior accessories.',
    to: '/collections/exterior-accessories',
    bgImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    icon: Car,
  },
  {
    title: 'Interior Accessories',
    description: 'Upgrade comfort and luxury with high-quality interior accessories.',
    to: '/collections/interior-accessories',
    bgImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    icon: Armchair,
  },
  {
    title: 'Tools & Maintenance',
    description: 'Professional tools and care products for every maintenance need.',
    to: '/collections/tools-maintenance-care',
    bgImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    icon: Wrench,
  },
  {
    title: 'Car Electronics',
    description: 'Smart electronics for entertainment, safety and convenience.',
    to: '/collections/car-electronics',
    bgImage: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80',
    icon: Cpu,
  },
  {
    title: 'Motorcycle Accessories',
    description: 'Premium accessories and parts for ultimate ride performance.',
    to: '/collections/motorcycle-accessories',
    bgImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    icon: Bike,
  },
  {
    title: 'Auto Replacement Parts',
    description: 'High-quality replacement parts for long-lasting performance.',
    to: '/collections/auto-replacement-parts',
    bgImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    icon: Cog,
  },
  {
    title: 'Car Care & Detailing',
    description: 'Keep your vehicle looking new with premium care & detailing products.',
    to: '/collections/paint-care',
    bgImage: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
    icon: Droplets,
  },
  {
    title: 'Garage Equipment',
    description: 'Advanced garage equipment for workshops and professionals.',
    to: '/collections/diagnostic-tools',
    bgImage: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
    icon: Warehouse,
  },
];

const HomePage = () => {
  const location = useLocation();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

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

  /**
   * Fetch automotive products for the homepage carousel.
   * RTK Query caches this for 10 minutes.
   */
  const { data: autoData } = useGetProductsQuery({
    pageNum: 1,
    pageSize: 200,
  });

  const autoProducts = Array.isArray(autoData?.products) ? autoData.products : [];

  // Featured carousel — first 10 products
  const carouselProducts = useMemo(() => {
    return autoProducts.slice(0, 10);
  }, [autoProducts]);

  const carouselRef = useRef<HTMLDivElement>(null);

  const heroImages = [
    '/img/one.jpeg',
    '/img/two.jpeg',
    '/img/three.jpeg',
    '/img/four.jpeg',
    '/img/five.jpeg'
  ];

  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    let heroTimer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      heroTimer = setInterval(() => {
        setCurrentHeroIdx((prev) => (prev + 1) % heroImages.length);
      }, 5000);
    }

    if (!userInfo) {
      const popupTimer = setTimeout(() => setShowLoginPopup(true), 10000);
      return () => {
        if (heroTimer) clearInterval(heroTimer);
        clearTimeout(popupTimer);
      };
    }
    return () => {
      if (heroTimer) clearInterval(heroTimer);
    };
  }, [heroImages.length, userInfo, isPlaying]);

  const handleNextHero = () => {
    setCurrentHeroIdx((prev) => (prev + 1) % heroImages.length);
  };

  const handlePrevHero = () => {
    setCurrentHeroIdx((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  useEffect(() => {
    if (showLoginPopup) setCountdown(10);
  }, [showLoginPopup]);

  useEffect(() => {
    if (!showLoginPopup) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showLoginPopup, countdown]);

  return (
    <div className="w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans uppercase">
      {/* ───────── HERO ───────── */}
      <section className="relative h-[550px] sm:h-[650px] lg:h-[720px] overflow-hidden bg-black text-white">
        {heroImages.map((imgSrc: string, idx: number) => (
          <div
            key={idx}
            className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${idx === currentHeroIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img
              src={imgSrc}
              alt="AutoTrade Banner"
              className="h-full w-full object-cover object-center"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/35" />

        {/* Navigation Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {heroImages.map((_: string, idx: number) => (
            <button
              key={idx}
              onClick={() => setCurrentHeroIdx(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === currentHeroIdx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Right Controls */}
        <div className="absolute bottom-8 right-8 lg:right-16 z-20 flex gap-3 items-center">
          <button
            className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors cursor-pointer text-white"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors cursor-pointer text-white"
            onClick={handlePrevHero}
            aria-label="Previous video"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors cursor-pointer text-white"
            onClick={handleNextHero}
            aria-label="Next video"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ───────── CATEGORY SHOWCASE (1 SINGLE ROW OF ALL 8 CATEGORIES) ───────── */}
      <section className="bg-[#0b0e14] dark:bg-[#07090d] py-12 sm:py-16 border-b-2 border-black dark:border-zinc-800">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <p className="text-red-500 font-bold tracking-[0.2em] text-xs sm:text-sm uppercase mb-2">Shop By Category</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
                Explore Premium Collections
              </h2>
            </div>
            <Link
              to="/collections/all"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-widest text-zinc-400 hover:text-red-500 transition-colors uppercase group"
            >
              <span>VIEW ALL CATEGORIES</span>
              <ArrowRight className="w-4 h-4 text-red-500 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 1 Single Horizontal Row Container (8 Columns on XL screens, horizontal scroll on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
            {heroCategories.map((cat, idx) => (
              <Link
                key={idx}
                to={cat.to}
                className="group relative rounded-2xl bg-[#0a0d14] border border-zinc-800/80 hover:border-zinc-700 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between text-center p-4 sm:p-5"
              >
                {/* Top: Icon Badge */}
                <div className="relative z-10 my-1">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-zinc-700 flex items-center justify-center text-white bg-black/40 group-hover:scale-105 group-hover:border-red-500 transition-all duration-300">
                    <cat.icon className="w-7 h-7 stroke-[2]" />
                  </div>
                </div>

                {/* Center: Title & Description */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3">
                  <h3 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase group-hover:text-red-500 transition-colors leading-snug mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-normal normal-case leading-tight line-clamp-2">
                    {cat.description}
                  </p>
                </div>

                {/* Bottom: Pill Button */}
                <div className="relative z-10 mt-1">
                  <div className="px-3 py-1.5 rounded-full border border-zinc-700/80 bg-black/60 text-[10px] font-bold text-white group-hover:border-red-500 group-hover:text-red-500 transition-all inline-flex items-center gap-1 uppercase tracking-wider shadow-sm">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3 text-red-500 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURED COLLECTION carousel ───────── */}
      {carouselProducts.length > 0 && (
        <section className="border-b-2 border-black dark:border-zinc-800 bg-[#07090d]">
          <div className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10 lg:py-12">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <p className="text-red-500 font-bold tracking-[0.2em] text-xs uppercase mb-1">Featured Store</p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none text-white">COLLECTION</h2>
              </div>
            </div>
            <div className="relative group">
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16"
                style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {carouselProducts.map((product: any, index: number) => (
                  <div key={`${product.pid || product._id || product.id}-${index}`} className="flex-shrink-0 w-[210px] sm:w-[240px] md:w-[250px] lg:w-[260px] snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {carouselProducts.length > 0 && (
                <div className="flex justify-end mt-4 gap-3">
                  <button
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-zinc-900 text-white shadow-md hover:bg-red-600 transition-all flex items-center justify-center cursor-pointer border border-zinc-800"
                    aria-label="Previous products"
                  >
                    <ChevronLeft size={18} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-zinc-900 text-white shadow-md hover:bg-red-600 transition-all flex items-center justify-center cursor-pointer border border-zinc-800"
                    aria-label="Next products"
                  >
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Empty state — warehouse not yet populated */}
      {autoProducts.length === 0 && (
        <section className="py-24 text-center border-b-2 border-black dark:border-white">
          <p className="text-2xl font-black tracking-widest text-zinc-400">SYNCING PRODUCTS...</p>
          <p className="mt-3 text-sm text-zinc-500 font-normal normal-case">Products will appear once the hourly sync completes.</p>
        </section>
      )}
    </div>
  );
};

export default HomePage;

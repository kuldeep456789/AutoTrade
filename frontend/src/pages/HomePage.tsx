import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

import { useGetProductsQuery } from '../store/slices/productApiSlice';
import ProductCard from '../components/product/ProductCard';


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
   * Two warehouse fetches: one for men, one for women.
   * RTK Query caches both for 10 minutes. CollectionPage, Navbar search,
   * and any other component that calls useGetProductsQuery with the same
   * args will reuse the same cached response — no extra network requests.
   */
  const { data: menData } = useGetProductsQuery({
    gender: 'men',
    pageNum: 1,
    pageSize: 200,
  });

  const { data: womenData } = useGetProductsQuery({
    gender: 'women',
    pageNum: 1,
    pageSize: 200,
  });

  const menProducts = Array.isArray(menData?.products) ? menData.products : [];
  const womenProducts = Array.isArray(womenData?.products) ? womenData.products : [];



  // Featured carousel — mix of first 5 men + 5 women products
  const carouselProducts = useMemo(() => {
    const mixed: any[] = [];
    const max = Math.min(menProducts.length, womenProducts.length, 5);
    for (let i = 0; i < max; i++) {
      mixed.push(menProducts[i], womenProducts[i]);
    }
    return mixed.slice(0, 10);
  }, [menProducts, womenProducts]);

  const carouselRef = useRef<HTMLDivElement>(null);

  const heroVideos = [
    '/video/Create_a_premium_cinematic_fas.mp4',
    // The second video is not yet present in the folder, so we reuse the first or add a placeholder
    '/video/Luxury_cinematic_clothing_comm.mp4'
  ];

  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    let heroTimer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      heroTimer = setInterval(() => {
        setCurrentHeroIdx((prev) => (prev + 1) % heroVideos.length);
      }, 10000);
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
  }, [heroVideos.length, userInfo, isPlaying]);

  useEffect(() => {
    // Play the current video, pause the others
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      if (idx === currentHeroIdx && isPlaying) {
        video.currentTime = 0; // Reset video to start when it becomes active
        video.play().catch(e => console.log('Autoplay blocked', e));
      } else {
        video.pause();
      }
    });
  }, [currentHeroIdx, isPlaying]);

  const handleNextHero = () => {
    setCurrentHeroIdx((prev) => (prev + 1) % heroVideos.length);
  };

  const handlePrevHero = () => {
    setCurrentHeroIdx((prev) => (prev - 1 + heroVideos.length) % heroVideos.length);
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
        {heroVideos.map((vid: string, idx: number) => (
          <div
            key={idx}
            className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${idx === currentHeroIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <video
              ref={(el) => { videoRefs.current[idx] = el; }}
              src={vid}
              muted
              playsInline
              loop={heroVideos.length === 1} // Loop if there's only one video
              className="h-full w-full object-cover object-center"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex flex-col justify-center h-full w-full max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 pt-10">
          <div className="max-w-2xl w-full">
            <h1 className="text-6xl sm:text-8xl lg:text-[100px] font-black leading-[0.85] tracking-tighter text-white drop-shadow-2xl">
              VASTRA
            </h1>
            <p className="mt-6 sm:mt-8 text-lg sm:text-xl text-white/95 max-w-lg leading-relaxed font-medium normal-case tracking-normal drop-shadow-md">
              Elevating Everyday Fashion with Premium Quality, Modern Design, and Timeless Style.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-5 items-center w-full sm:w-auto">
              <Link to="/collections/men" className="inline-flex w-full sm:w-auto items-center justify-center h-[56px] sm:h-[64px] px-10 sm:px-14 bg-white text-black text-[15px] sm:text-[16px] font-bold tracking-widest transition-all duration-300 hover:bg-zinc-200 border-2 border-white hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                SHOP MEN
              </Link>
              <Link to="/collections/women" className="inline-flex w-full sm:w-auto items-center justify-center h-[56px] sm:h-[64px] px-10 sm:px-14 text-white text-[15px] sm:text-[16px] font-bold tracking-widest transition-all duration-300 hover:bg-white hover:text-black border-2 border-white hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                SHOP WOMEN
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {heroVideos.map((_: string, idx: number) => (
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

      {/* ───────── FEATURED COLLECTION carousel ───────── */}
      {carouselProducts.length > 0 && (
        <section className="border-b-2 border-black dark:border-white">
          <div className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
            <div className="flex items-end justify-between mb-8 sm:mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none">COLLECTION</h2>
              </div>
            </div>
            <div className="relative group">
              <div 
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16"
                style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                  {carouselProducts.map((product: any) => (
                    <div key={product.pid || product._id} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[calc(25%-12px)] snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))}
              </div>
              
              {carouselProducts.length > 0 && (
                <div className="flex justify-end mt-4 gap-3">
                  <button
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' });
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 text-black dark:text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700"
                    aria-label="Previous products"
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' });
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 text-black dark:text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700"
                    aria-label="Next products"
                  >
                    <ChevronRight size={20} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}


      {/* Empty state — warehouse not yet populated */}
      {menProducts.length === 0 && womenProducts.length === 0 && (
        <section className="py-24 text-center border-b-2 border-black dark:border-white">
          <p className="text-2xl font-black tracking-widest text-zinc-400">SYNCING PRODUCTS...</p>
          <p className="mt-3 text-sm text-zinc-500 font-normal normal-case">Products will appear once the hourly sync completes.</p>
        </section>
      )}
    </div>
  );
};

export default HomePage;

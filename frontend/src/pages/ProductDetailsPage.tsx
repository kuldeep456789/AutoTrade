import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetProductDetailsQuery, useCreateReviewMutation, useGetRelatedProductsQuery } from '../store/slices/productApiSlice';
import { addToCart } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import type { RootState } from '../store/store';
import { ShoppingBag, Heart, Star, Check, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, X, ZoomIn, SendHorizontal, ThumbsUp, Share2, Loader2, UserRound, ClipboardList, Award, Truck, RotateCcw, ShieldCheck, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import ProductCard from '../components/product/ProductCard';
import WishlistLoginPopup from '../components/WishlistLoginPopup';
import { getColorHex } from '../utils/colorMap';
import { getProductId } from '../lib/product';
import { formatINR } from '../lib/currency';
import { useCurrency } from '../context/CurrencyContext';

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Mock review data generator seeded per product
const MOCK_REVIEWS = [
  { user: 'Rahul M.', rating: 5, comment: 'Amazing build quality! Fits perfectly on my vehicle and works as expected.', date: '2 days ago', helpful: 24 },
  { user: 'Priya S.', rating: 4, comment: 'Great automotive product overall. Easy installation and premium finish.', date: '1 week ago', helpful: 17 },
];

const ProductFeaturesAndSpecs = ({ product }: { product: any }) => {
  const [descOpen, setDescOpen] = useState(true);
  const productName = String(product?.name || product?.title || 'AutoTrade Equipment').trim();
  const brandName = String(product?.brand || 'AutoTrade Pro Series').trim();

  return (
    <div className="w-full mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 bg-transparent text-zinc-900 dark:text-white space-y-6">
      {/* ── Header Toggle ── */}
      <button
        onClick={() => setDescOpen(!descOpen)}
        className="w-full py-3 flex items-center justify-between bg-transparent hover:opacity-80 transition-opacity cursor-pointer border-b border-zinc-200 dark:border-zinc-800/80 group"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Product Description & Specs
          </span>
        </div>
        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
          {descOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {descOpen && (
        <div className="space-y-6 bg-transparent py-1 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700/60 scrollbar-track-transparent">

          {/* 1. Overview */}
          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-orange-500 tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Overview
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal normal-case">
              The <strong className="text-zinc-900 dark:text-white font-semibold">{productName}</strong> delivers high performance, reliability, and precision engineering for automotive enthusiasts and professional garages.
            </p>
            {product?.description && (
              <div
                className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed normal-case mt-3 space-y-2 border-l-2 border-orange-500/50 pl-3 py-1"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </div>

          {/* 2. Key Features */}
          <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
            <h3 className="text-sm sm:text-base font-bold text-orange-500 tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Key Features & Benefits
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal normal-case">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-900 dark:text-white font-semibold">Premium Build:</strong> Engineered with high-grade durable materials for extended service life.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-900 dark:text-white font-semibold">Universal Compatibility:</strong> Works seamlessly across major vehicle models and setups.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-900 dark:text-white font-semibold">Plug & Play Installation:</strong> Quick, hassle-free installation without modifications.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-900 dark:text-white font-semibold">Quality Verified:</strong> 100% factory tested and quality assured.</span>
              </li>
            </ul>
          </div>

          {/* 3. Detailed Specifications Table */}
          <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
            <h3 className="text-sm sm:text-base font-bold text-orange-500 tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Specifications
            </h3>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-transparent">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300 font-normal">
                <thead className="bg-zinc-100 dark:bg-zinc-900/60 text-orange-500 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3.5 w-1/3">Property</th>
                    <th className="py-2.5 px-3.5 w-2/3">Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 bg-transparent">
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-zinc-900 dark:text-white">Brand / Line</td>
                    <td className="py-2.5 px-3.5">{brandName}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-zinc-900 dark:text-white">Condition</td>
                    <td className="py-2.5 px-3.5 text-orange-500 font-medium">100% Brand New Original</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-zinc-900 dark:text-white">Warranty</td>
                    <td className="py-2.5 px-3.5">1-Year Standard AutoTrade Guarantee</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 font-semibold text-zinc-900 dark:text-white">Quality Inspection</td>
                    <td className="py-2.5 px-3.5">Passed ISO9001 standard inspection</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Package Contents */}
          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
            <h3 className="text-sm sm:text-base font-bold text-orange-500 tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Package Contents
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-300 font-normal normal-case">
              <li>1x {productName}</li>
              <li>1x Setup Guide & User Manual</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
};

const ProductDetailsPage = () => {
  const { formatCurrency } = useCurrency();
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(id);
  const { data: relatedData } = useGetRelatedProductsQuery(id, { skip: !id });
  const relatedProducts = relatedData?.products || [];
  const [createReview, { isLoading: isReviewLoading }] = useCreateReviewMutation();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const productId = product ? getProductId(product) || id || '' : '';
  const isWishlisted = product ? wishlistItems.some((item: any) => item._id === productId) : false;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const imageRef = useRef<HTMLDivElement>(null);
  const [zoomLens, setZoomLens] = useState({ active: false, imgX: 50, imgY: 50, conX: 50, conY: 50 });
  const ZOOM_SCALE = 2.5;
  const LENS_SIZE = 110;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  // Reviews
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [userNewReviews, setUserNewReviews] = useState<any[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, boolean>>({});
  const reviewRef = useRef<HTMLDivElement>(null);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);

  const handleWishlistToggle = () => {
    if (!userInfo) {
      setShowWishlistPopup(true);
      return;
    }
    dispatch(
      toggleWishlist({
        _id: productId,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        image: product?.images?.[0] || '',
      })
    );
    if (!isWishlisted) {
      toast.success('Added to your Wishlist');
    }
  };

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedColor]);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingCartItem');
    if (pending) {
      try {
        const item = JSON.parse(pending);
        dispatch(addToCart(item));
        setIsAdded(true);
        toast.success('Product added successfully');
        setTimeout(() => setIsAdded(false), 2000);
      } catch (_) {
        // ignore parse errors
      } finally {
        sessionStorage.removeItem('pendingCartItem');
      }
    }
  }, [dispatch]);

  if (isLoading) {
    return <Loader />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="text-center border-2 border-black dark:border-white p-12">
          <Link to="/" className="text-sm font-bold underline underline-offset-4 uppercase tracking-wider hover:text-red-600 transition-colors">
            BACK TO SHOP
          </Link>
        </div>
      </div>
    );
  }

  // ── Block direct access to products with no meaningful price (₹0 – ₹1) ──────
  const productDisplayPrice = Number(product.price ?? product.discountPrice ?? 0);
  if (productDisplayPrice <= 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="text-center p-12">
          <p className="text-zinc-500 mb-4 font-medium">This product is currently unavailable.</p>
          <Link to="/" className="text-sm font-bold underline underline-offset-4 uppercase tracking-wider hover:text-orange-500 transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }
  const variants = product?.variants ?? [];

  const colors =
    product?.colors?.length
      ? product.colors
      : [...new Set(variants.map((v: any) => v.color).filter(Boolean))];

  const productName = String(product?.name || product?.title || '').trim();

  const currentSellingPrice = Number(product.discountPrice || product.price || 0);
  const rawOriginalPrice = product.originalPrice || product.mrp || (product.discountPrice && product.price > product.discountPrice ? product.price : undefined);
  const displayOriginalPrice = rawOriginalPrice && Number(rawOriginalPrice) > currentSellingPrice
    ? Number(rawOriginalPrice)
    : Math.round(currentSellingPrice * 1.3);

  const discountPct = Math.round(((displayOriginalPrice - currentSellingPrice) / displayOriginalPrice) * 100);

  const handleAddToCart = () => {
    const activeColor = selectedColor || (colors && colors.length > 0 ? colors[0] : 'Default');
    if (!userInfo) {
      const pendingItem = {
        _id: productId,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product?.images?.[0] || '',
        qty: qty,
        variant: { color: activeColor, size: 'One Size' },
      };
      sessionStorage.setItem('pendingCartItem', JSON.stringify(pendingItem));
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    dispatch(
      addToCart({
        _id: productId,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product?.images?.[0] || '',
        qty: qty,
        increment: true,
        variant: { color: activeColor, size: 'One Size' },
      })
    );
    setIsAdded(true);
    toast.success('Product added to your bag');
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    const activeColor = selectedColor || (colors && colors.length > 0 ? colors[0] : 'Default');
    dispatch(
      addToCart({
        _id: productId,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product?.images?.[0] || '',
        qty: qty,
        increment: true,
        variant: { color: activeColor, size: 'One Size' },
      })
    );
    navigate('/cart');
  };

  const baseImages = product?.images || [];

  const colorVariantImages = selectedColor && product.variants
    ? product.variants
      .filter((v: any) => v.color === selectedColor)
      .map((v: any) => v.variantImage || v.image || '')
      .filter(Boolean)
    : [];

  const displayImages = [...new Set([
    ...colorVariantImages,
    ...baseImages,
  ])];

  const handleImageZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const img = container.querySelector('img');
    if (!img) return;
    const crect = container.getBoundingClientRect();
    const irect = img.getBoundingClientRect();
    const imgX = ((e.clientX - irect.left) / irect.width) * 100;
    const imgY = ((e.clientY - irect.top) / irect.height) * 100;
    const conX = ((e.clientX - crect.left) / crect.width) * 100;
    const conY = ((e.clientY - crect.top) / crect.height) * 100;
    setZoomLens({ active: true, imgX: Math.min(100, Math.max(0, imgX)), imgY: Math.min(100, Math.max(0, imgY)), conX: Math.min(100, Math.max(0, conX)), conY: Math.min(100, Math.max(0, conY)) });
  };

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const lightboxPrev = () => setLightboxIdx((p) => (p - 1 + displayImages.length) % displayImages.length);
  const lightboxNext = () => setLightboxIdx((p) => (p + 1) % displayImages.length);

  const handleReviewSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      setErrorMsg('Please enter a review.');
      return;
    }
    if (!userInfo) {
      setErrorMsg('Please sign in to submit a review.');
      return;
    }
    try {
      await createReview({
        productId: id,
        rating: reviewRating,
        comment: reviewText,
      }).unwrap();

      const newRev = {
        user: userInfo?.name || `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim() || 'Verified Customer',
        rating: reviewRating,
        comment: reviewText.trim(),
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        helpful: 0,
      };
      setUserNewReviews((prev) => [newRev, ...prev]);
      setReviewSubmitted(true);
      setReviewText('');
      setErrorMsg('');
      refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.data?.message || 'Failed to submit review.');
    }
  };

  const allReviews = [
    ...userNewReviews,
    ...(product?.reviews || []).map((r: any) => ({
      user: r.userName,
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      helpful: 0,
    })),
    ...MOCK_REVIEWS,
  ];

  const totalNumReviews = allReviews.length;
  const averageRatingVal = allReviews.length > 0
    ? allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length
    : 0;

  // Rating distribution for display
  const ratingDist = [5, 4, 3, 2, 1].map(r => {
    const count = allReviews.filter(rv => rv.rating === r).length;
    const pct = totalNumReviews > 0 ? Math.round((count / totalNumReviews) * 100) : 0;
    return { r, count, pct };
  });

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen text-[hsl(var(--foreground))] font-sans overflow-x-hidden">
      {/* Breadcrumbs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-4">
          <div className="flex gap-2 items-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">HOME</Link>
            <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
            {product.subcategoryName && (
              <>
                <Link to={`/collections/${normalizeSlug(String(product.subcategoryName))}`} className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors capitalize">
                  {product.subcategoryName}
                </Link>
                <ChevronRight size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-600" />
              </>
            )}
            <span className="text-zinc-900 dark:text-white font-extrabold line-clamp-1">{product.title || product.name}</span>
          </div>
        </div>
      </div>

      {/* Main — Two Column Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* ─── Left — Gallery (Static / Sticky on Scroll) ─── */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 self-start space-y-4">
            <div className="flex flex-col gap-3">

              {/* Main Image Container */}
              <div className="flex-1 min-w-0 group relative" ref={imageRef}>
                <div
                  onMouseMove={handleImageZoom}
                  onMouseLeave={() => setZoomLens((p) => ({ ...p, active: false }))}
                  onClick={() => openLightbox(selectedImage)}
                  className="relative w-full aspect-square max-h-[460px] sm:max-h-[500px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center cursor-crosshair shadow-lg p-4 transition-colors duration-200"
                >
                  <img
                    key={selectedImage}
                    src={displayImages[selectedImage] || displayImages[0]}
                    alt={productName || 'Product'}
                    className="max-w-full max-h-full object-contain p-4 transition-opacity duration-300 select-none bg-white rounded-xl shadow-sm"
                    draggable={false}
                  />

                  {/* Zoom lens */}
                  {zoomLens.active && (
                    <div
                      className="absolute border-2 border-orange-500 bg-orange-500/10 pointer-events-none z-30 rounded-sm"
                      style={{
                        width: `${LENS_SIZE}px`,
                        height: `${LENS_SIZE}px`,
                        left: `calc(${zoomLens.conX}% - ${LENS_SIZE / 2}px)`,
                        top: `calc(${zoomLens.conY}% - ${LENS_SIZE / 2}px)`,
                      }}
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300/60 dark:border-emerald-800 shadow-sm backdrop-blur-sm">
                      <span className="text-xs">💵</span>
                      18% GST Credit
                    </span>
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <ZoomIn size={11} strokeWidth={2} /> ZOOM
                  </div>
                </div>

                {/* Zoom preview — lg screens */}
                {zoomLens.active && (
                  <div className="hidden lg:block absolute top-0 left-full ml-6 z-[100] pointer-events-none">
                    <div className="w-[450px] h-[480px] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950">
                      <img
                        src={displayImages[selectedImage] || displayImages[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                        style={{
                          transform: `scale(${ZOOM_SCALE})`,
                          transformOrigin: `${zoomLens.imgX}% ${zoomLens.imgY}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail Carousel */}
              {displayImages.length > 0 && (
                <div className="relative flex items-center justify-center gap-2 pt-1">
                  {displayImages.length > 1 && (
                    <button
                      onClick={() => setSelectedImage((prev) => (prev - 1 + displayImages.length) % displayImages.length)}
                      className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      aria-label="Previous thumbnail"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-1">
                    {displayImages.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 cursor-pointer ${selectedImage === idx
                          ? 'border-orange-500 ring-2 ring-orange-500/40 opacity-100'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 opacity-60 hover:opacity-100'
                          }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain p-1 bg-white" />
                      </button>
                    ))}
                  </div>
                  {displayImages.length > 1 && (
                    <button
                      onClick={() => setSelectedImage((prev) => (prev + 1) % displayImages.length)}
                      className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      aria-label="Next thumbnail"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ─── Right — Product Buy Box Details & Embedded Description ─── */}
          <div className="lg:col-span-6 space-y-5">

            {/* Tag, Title & Price */}
            <div>
              {(product.subcategoryName || product.categoryName || product.category?.name) && (
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block mb-1.5">
                  {product.subcategoryName || product.categoryName || product.category?.name}
                </span>
              )}
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold leading-snug text-zinc-900 dark:text-white tracking-tight">
                {productName}
              </h1>

              {/* Price */}
              <div className="mt-3">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                  Price
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(currentSellingPrice)}
                  </span>
                  <span className="text-base text-zinc-400 dark:text-zinc-500 line-through font-medium">
                    {formatCurrency(displayOriginalPrice)}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold">
                    Bulk Rate
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex flex-col gap-1.5 pt-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 block">Quantity</span>
              <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg w-[130px] bg-zinc-50 dark:bg-black overflow-hidden h-10">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 transition-colors select-none cursor-pointer"
                >
                  <span className="text-lg font-medium leading-none mb-0.5">-</span>
                </button>
                <div className="flex-1 h-full bg-white dark:bg-black flex items-center justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={qty === 0 ? '' : qty}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                      if (cleanVal === '') {
                        setQty(0);
                      } else {
                        const val = parseInt(cleanVal, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQty(val);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (qty < 1 || isNaN(qty)) {
                        setQty(1);
                      }
                    }}
                    className="font-semibold text-zinc-900 dark:text-white w-full text-center bg-transparent focus:outline-none text-sm p-0 m-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <button
                  onClick={() => setQty((q) => (q === 0 ? 1 : q + 1))}
                  className="w-10 h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-l border-zinc-200 dark:border-zinc-800 transition-colors select-none cursor-pointer"
                >
                  <span className="text-lg font-medium leading-none mb-0.5">+</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1.5 items-center">
              <button
                onClick={handleBuyNow}
                className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                Buy Now
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-2 border-amber-500 dark:border-amber-500 text-amber-500 dark:text-amber-400 font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-amber-500/10 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                {isAdded ? 'Added' : 'Add to cart'}
              </button>
              <button
                onClick={handleWishlistToggle}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shadow-sm shrink-0 ${
                  isWishlisted
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
                aria-label="Wishlist"
              >
                <Heart className="w-[18px] h-[18px]" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
              </button>
            </div>

            {/* 4 Trust Badges Box */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3.5 shadow-md transition-colors duration-200 mt-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-1.5">
                    <Award size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase">AUTHORISED</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">Since 2014</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-1.5">
                    <Truck size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase">FREE SHIPPING</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">Pan-India</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-1.5">
                    <RotateCcw size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase">14-DAY RETURNS</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">No questions</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-1.5">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase">GENUINE PRODUCT</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">100% authorised</span>
                </div>
              </div>
            </div>

            {/* Description & Detailed Specs Panel */}
            <ProductFeaturesAndSpecs product={product} />
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-12 sm:py-16">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-8">
              YOU MIGHT ALSO LIKE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.slice(0, 4).map((relProd: any, idx: number) => (
                <ProductCard key={`${relProd._id || relProd.pid || relProd.id || 'rel'}-${idx}`} product={relProd} />
              ))}
            </div>
          </div>
        </div>
      )}






      {showWishlistPopup && (
        <WishlistLoginPopup
          product={{
            _id: productId,
            name: product.name,
            price: product.price,
            discountPrice: product.discountPrice,
            image: product?.images?.[0] || '',
          }}
          onClose={() => setShowWishlistPopup(false)}
        />
      )}

      {/* Image Lightbox */}
      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-300 ${lightboxOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="absolute inset-0 bg-black/95" onClick={() => setLightboxOpen(false)} />
        <div className="relative z-10 flex items-center justify-center w-full h-full px-4 py-8">
          {/* Close */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer z-20"
          >
            <X size={20} strokeWidth={2} />
          </button>
          {/* Prev */}
          <button
            onClick={lightboxPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer z-20"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          {/* Image */}
          <img
            src={displayImages[lightboxIdx]}
            alt={productName || 'Product'}
            className="max-h-[85vh] max-w-[90vw] object-contain select-none"
          />
          {/* Next */}
          <button
            onClick={lightboxNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer z-20"
          >
            <ChevronRight size={24} strokeWidth={2} />
          </button>
          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {displayImages.map((_, di) => (
              <button
                key={di}
                onClick={() => setLightboxIdx(di)}
                className={`h-1.5 transition-all cursor-pointer ${di === lightboxIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                  }`}
              />
            ))}
          </div>
          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-xs font-black tracking-widest z-20">
            {lightboxIdx + 1} / {displayImages.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;

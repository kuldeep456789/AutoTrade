import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetProductDetailsQuery, useCreateReviewMutation } from '../store/slices/productApiSlice';
import { addToCart } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import type { RootState } from '../store/store';
import { ShoppingBag, Heart, Star, Check, ChevronRight, ChevronLeft, X, ZoomIn, SendHorizontal, ThumbsUp, Share2, Loader2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import WishlistLoginPopup from '../components/WishlistLoginPopup';
import { getColorHex } from '../utils/colorMap';
import { getProductId } from '../lib/product';
import { formatINR } from '../lib/currency';

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
  { user: 'Rahul M.', rating: 5, comment: 'Amazing quality! The fabric is super soft and the fit is perfect. Got so many compliments.', date: '2 days ago', helpful: 24 },
  { user: 'Priya S.', rating: 4, comment: 'Great product overall. Runs slightly large so size down. Color is exactly as shown.', date: '1 week ago', helpful: 17 },
  // { user: 'Arjun K.', rating: 5, comment: 'Best streetwear brand! This is my 4th purchase and quality never disappoints. 10/10.', date: '2 weeks ago', helpful: 31 },
  // { user: 'Sneha R.', rating: 4, comment: 'Fast delivery and well packaged. The print quality is excellent, washed twice and still looks new.', date: '3 weeks ago', helpful: 12 },
  // { user: 'Dev T.', rating: 3, comment: 'Good product but shipping took longer than expected. The fit is oversized as described.', date: '1 month ago', helpful: 8 },
  // { user: 'Meera L.', rating: 5, comment: 'Love love love! The graphic print is vibrant and the cotton is breathable. Perfect summer wear.', date: '1 month ago', helpful: 19 },
];

const ProductDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(id);
  const [createReview, { isLoading: isReviewLoading }] = useCreateReviewMutation();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlistItems);
  const productId = product ? getProductId(product) || id || '' : '';
  const isWishlisted = product ? wishlistItems.some((item: any) => item._id === productId) : false;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
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
          <span className="text-4xl mb-4 block">✕</span>
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">PRODUCT NOT FOUND</h2>
          <Link to="/" className="text-sm font-bold underline underline-offset-4 uppercase tracking-wider hover:text-red-600 transition-colors">
            BACK TO SHOP
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

  const sizes =
    product?.sizes?.length
      ? product.sizes
      : [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
  const productName = String(product?.name || product?.title || '').trim();

  console.log("Product:", product);
  console.log("Variants:", product?.variants);
  console.log("Colors:", colors);
  console.log("Sizes:", sizes);

  const discountPct =
    product.discountPrice && product.price > product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      setErrorMsg('Please select a size and color');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (!userInfo) {
      const pendingItem = {
        _id: productId,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product?.images?.[0] || '',
        qty: 1,
        variant: { color: selectedColor, size: selectedSize },
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
        qty: 1,
        increment: true,
        variant: { color: selectedColor, size: selectedSize },
      })
    );
    setIsAdded(true);
    toast.success('Product added to your bag');
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedSize || !selectedColor) {
      setErrorMsg('Please select a size and color');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    dispatch(
      addToCart({
        _id: productId,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product?.images?.[0] || '',
        qty: 1,
        increment: true,
        variant: { color: selectedColor, size: selectedSize },
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
          <div className="flex gap-2 items-center text-xs font-medium text-zinc-400">
            <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">HOME</Link>
            <ChevronRight size={10} strokeWidth={2} />
            {product.gender && (
              <>
                <Link to={`/collections/${product.gender}`} className="hover:text-black dark:hover:text-white transition-colors">
                  {String(product.gender).toUpperCase()} COLLECTIONS
                </Link>
                <ChevronRight size={10} strokeWidth={2} />
              </>
            )}
            {product.subcategory && (
              <>
                <Link to={`/collections/${product.gender}/${normalizeSlug(String(product.subcategory))}`} className="hover:text-black dark:hover:text-white transition-colors">
                  {product.subcategory}
                </Link>
                <ChevronRight size={10} strokeWidth={2} />
              </>
            )}
            <span className="text-black dark:text-white line-clamp-1">{product.title || product.name}</span>
          </div>
        </div>
      </div>

      {/* Main — Two Column Layout */}
      <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row lg:flex-nowrap items-start justify-center gap-12">

          {/* ─── Left — Gallery (55%) ─── */}
          <div className="w-full lg:w-[700px] lg:min-w-[580px] lg:flex-shrink-0">
            <div className="flex gap-3">


              {/* Main Image */}
              <div className="flex-1 min-w-0 group relative" ref={imageRef}>
                <div
                  onMouseMove={handleImageZoom}
                  onMouseLeave={() => setZoomLens((p) => ({ ...p, active: false }))}
                  onClick={() => openLightbox(selectedImage)}
                  className="relative w-full max-w-[700px] h-[450px] sm:h-[620px] lg:h-[720px] bg-[#f8f8f8] rounded-[18px] overflow-hidden flex items-center justify-center cursor-crosshair"
                >
                  <img
                    key={selectedImage}
                    src={displayImages[selectedImage] || displayImages[0]}
                    alt={productName || 'Product'}
                    className="max-w-full max-h-full object-contain p-6 transition-opacity duration-300 select-none"
                    draggable={false}
                  />

                  {/* Zoom lens */}
                  {zoomLens.active && (
                    <div
                      className="absolute border-2 border-black dark:border-white bg-white/10 dark:bg-black/10 pointer-events-none z-30 rounded-sm"
                      style={{
                        width: `${LENS_SIZE}px`,
                        height: `${LENS_SIZE}px`,
                        left: `calc(${zoomLens.conX}% - ${LENS_SIZE / 2}px)`,
                        top: `calc(${zoomLens.conY}% - ${LENS_SIZE / 2}px)`,
                      }}
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {discountPct > 0 && (
                      <span className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        -{discountPct}%
                      </span>
                    )}
                    {productName.toLowerCase().includes('oversized') && (
                      <span className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        OVERSIZED
                      </span>
                    )}
                  </div>

                  {/* Floating Wishlist + Share */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistToggle();
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-90 ${isWishlisted
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-white dark:hover:bg-zinc-800'
                        }`}
                      aria-label="Wishlist"
                    >
                      <Heart className="w-[18px] h-[18px]" fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                          navigator.share({ title: productName, url: window.location.href });
                        } else {
                          navigator.clipboard?.writeText(window.location.href);
                        }
                      }}
                      className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-white dark:hover:bg-zinc-800 flex items-center justify-center backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-90"
                      aria-label="Share"
                    >
                      <Share2 className="w-[16px] h-[16px]" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Nav arrows at bottom-right (Nike-style) */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
                        }}
                        className="absolute bottom-4 right-14 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-shadow z-10 cursor-pointer"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage((prev) => (prev + 1) % displayImages.length);
                        }}
                        className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-shadow z-10 cursor-pointer"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} strokeWidth={2} />
                      </button>
                    </>
                  )}

                  {/* Zoom hint */}
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <ZoomIn size={11} strokeWidth={2} /> ZOOM
                  </div>
                </div>



                {/* Zoom preview — lg screens */}
                {zoomLens.active && (
                  <div className="hidden lg:block absolute top-0 left-full ml-6 z-[100] pointer-events-none">
                    <div className="w-[450px] xl:w-[500px] h-[620px] lg:h-[720px] overflow-hidden rounded-[18px] border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900">
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


            </div>
          </div>

          {/* ─── Right — Product Details (45%) ─── */}
          <div className="w-full lg:w-[480px] lg:min-w-[380px] lg:flex-shrink-0 lg:sticky lg:top-6 self-start pl-0 lg:pl-4 xl:pl-8">
            <div className="space-y-1">
              {/* Brand / Just In */}
              <span className="block text-base font-medium text-[#c93b3b]">
                Just In
              </span>

              {/* Product Name */}
              <h1 className="text-[26px] font-medium leading-tight text-[#111111] dark:text-white pt-1">
                {productName || 'Product'}
              </h1>
              <p className="text-base text-zinc-500 pb-2">
                Men's Heavyweight Short-Sleeve Top
              </p>

              {/* Price */}
              <div className="flex flex-col pt-2 pb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-medium text-[#111111] dark:text-white">
                    {formatINR(product.discountPrice || product.price)}
                  </span>
                  {product.discountPrice && (
                    <>
                      <span className="text-sm text-zinc-500 line-through">{formatINR(product.price)}</span>
                      <span className="text-sm font-medium text-green-600">{discountPct}% OFF</span>
                    </>
                  )}
                </div>
                <span className="text-[15px] text-zinc-500 mt-1">Inclusive of all taxes</span>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-sm font-medium p-3 rounded-xl mb-4">
                  {errorMsg}
                </div>
              )}

              {/* Colour Variants as Images */}
              {colors && colors.length > 0 && (
                <div className="pb-8">
                  <p className="text-[16px] font-medium text-[#111111] dark:text-zinc-200 mb-2">
                    Choose Color{selectedColor ? `: ${selectedColor}` : ''}
                  </p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {colors.map((color: any) => {
                      const variantImg = product.variants?.find((v: any) => v.color === color)?.variantImage 
                                         || product.variants?.find((v: any) => v.color === color)?.image 
                                         || displayImages[0];
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-[70px] h-[70px] rounded-md overflow-hidden border transition-all duration-200 cursor-pointer ${selectedColor === color
                              ? 'border-black dark:border-white ring-1 ring-black dark:ring-white'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                            }`}
                          title={color}
                        >
                          {variantImg ? (
                             <img src={variantImg} alt={color} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full" style={{ backgroundColor: getColorHex(color) }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Size */}
              <div className="pb-8">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[16px] font-medium text-[#111111] dark:text-zinc-200">Select Size</p>
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[15px] font-medium text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((size: any) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-[48px] rounded-md border text-[16px] transition-all duration-200 cursor-pointer active:scale-[0.98] ${selectedSize === size
                          ? 'border-black dark:border-white text-black dark:text-white ring-1 ring-black dark:ring-white'
                          : 'border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-white hover:border-black dark:hover:border-white'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  className={`w-full h-[62px] rounded-[31px] text-[16px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${isAdded
                      ? 'bg-green-600 text-white'
                      : 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-black/80 dark:hover:bg-white/80'
                    }`}
                >
                  {isAdded ? 'Added to Bag' : 'Add to Bag'}
                </button>
                <button
                  onClick={handleWishlistToggle}
                  className={`w-full h-[62px] rounded-[31px] border flex items-center justify-center gap-2 text-[16px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${isWishlisted
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20'
                      : 'border-zinc-300 dark:border-zinc-700 text-[#111111] dark:text-white hover:border-black dark:hover:border-white'
                    }`}
                >
                  Favourite <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
              </div>

              {/* Product Description */}
              <div className="mt-12 text-[16px] text-[#111111] dark:text-zinc-200 leading-relaxed max-w-prose">
                {product.description && (
                  <div 
                    className="[&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:mb-1 [&>ul]:mt-4" 
                    dangerouslySetInnerHTML={{ __html: product.description }} 
                  />
                )}
                <ul className="list-disc pl-5 mt-4 space-y-1">
                  <li>Colour Shown: {product.colors?.length > 0 ? product.colors.join('|') : 'Default'}</li>
                  <li>Style: {product._id?.substring(0, 8).toUpperCase() || 'N/A'}</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>




      {/* Size Guide Drawer */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${sizeGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSizeGuideOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#121212] text-zinc-900 dark:text-zinc-100 p-6 sm:p-8 transition-transform duration-300 ease-out flex flex-col justify-between shadow-2xl overflow-y-auto ${sizeGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-extrabold tracking-wider text-zinc-900 dark:text-white uppercase">SIZE GUIDE</h2>
              <button 
                onClick={() => setSizeGuideOpen(false)} 
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed uppercase tracking-wider">
              All measurements are in inches. For oversized items, we recommend ordering your typical size for the intended fit.
            </p>

            {/* Table */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#161616]">
              <div className="grid grid-cols-4 font-bold text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3.5 px-4 tracking-wider uppercase">
                <div>SIZE</div>
                <div className="text-center">CHEST</div>
                <div className="text-center">WAIST</div>
                <div className="text-center">LENGTH</div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {[
                  ['XS', '34-36', '28-30', '27'],
                  ['S', '36-38', '30-32', '28'],
                  ['M', '38-40', '32-34', '29'],
                  ['L', '40-42', '34-36', '30'],
                  ['XL', '42-44', '36-38', '31']
                ].map(([sz, ch, ws, len]) => (
                  <div key={sz} className="grid grid-cols-4 py-3.5 px-4 items-center font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="font-extrabold text-zinc-900 dark:text-white">{sz}</div>
                    <div className="text-center font-medium text-zinc-600 dark:text-zinc-300">{ch}</div>
                    <div className="text-center font-medium text-zinc-600 dark:text-zinc-300">{ws}</div>
                    <div className="text-center font-medium text-zinc-600 dark:text-zinc-300">{len}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="w-full py-3.5 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

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

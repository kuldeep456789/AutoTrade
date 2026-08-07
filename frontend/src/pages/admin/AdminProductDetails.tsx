import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Package,
  Tag,
  Layers,
  Boxes,
  Building2,
  Ruler,
  Palette,
  Hash,
  FileText,
  Copy,
  Check,
  Loader2,
  Grid3X3,
} from 'lucide-react';
import { useGetProductDetailsQuery } from '../../store/slices/productApiSlice';
import { getProductId, getProductImages } from '../../lib/product';
import { useCurrency } from '../../context/CurrencyContext';
import { getColorHex } from '../../utils/colorMap';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600?text=No+Image';

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value || value === '—' || value === '-') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
      <span className={`text-[13px] font-semibold text-zinc-900 dark:text-white text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="inline-flex items-center gap-1 text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer shrink-0"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

export default function AdminProductDetails() {
  const { pid } = useParams<{ pid: string }>();
  const { formatCurrency } = useCurrency();
  const { data: product, isLoading, error, refetch } = useGetProductDetailsQuery(pid);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);

  const images = getProductImages(product ?? {}) as string[];
  const gallery = images.length ? images : [PLACEHOLDER_IMAGE];
  const activeImage = gallery[Math.min(selectedImage, gallery.length - 1)];

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const colors = Array.isArray(product?.colors)
    ? product.colors
    : [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes
    : [...new Set(variants.map((v: any) => v.size).filter(Boolean))];

  const activeVariant = variants[Math.min(selectedVariant, Math.max(variants.length - 1, 0))];
  const stock = Number(activeVariant?.stock ?? product?.stock ?? 0);

  const price = Number(product?.discountPrice ?? product?.price ?? 0);
  const originalPrice = Number(
    product?.originalPrice ??
    (product?.discountPrice && product?.price > product?.discountPrice ? product?.price : 0),
  );
  const discountPct = originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const productId = getProductId(product ?? {});

  const tags = Array.isArray(product?.tags) ? product.tags : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Package className="h-10 w-10 text-zinc-400 mb-4" />
        <p className="text-red-500 text-sm font-semibold">Failed to load product</p>
        <button
          onClick={refetch}
          className="mt-3 text-orange-500 text-sm font-bold underline cursor-pointer"
        >
          Retry
        </button>
        <Link to="/admin/orders" className="mt-4 text-sm font-semibold text-zinc-500 hover:text-orange-500 transition-colors flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
      </div>
    );
  }

  const name = String(product?.name || product?.title || 'Untitled Product');

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-2">
            Product Details
          </h1>
        </div>
        <a
          href={`/product/${productId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
        >
          <ExternalLink size={15} />
          View on Storefront
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
        {/* Image Gallery */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <img
              src={activeImage}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-2.5">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 bg-white transition-all cursor-pointer ${selectedImage === i
                    ? 'border-orange-500 shadow-md shadow-orange-500/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
                    }`}
                  aria-label={`Image ${i + 1}`}
                >
                  <img
                    src={img}
                    alt={`${name} thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title + Price card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight max-w-[85%]">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold">
                <Grid3X3 size={12} />
                {variants.length} Variants
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
              <span className="text-[34px] font-extrabold text-[#111111] dark:text-white tracking-tight">
                {formatCurrency(price)}
              </span>
              {originalPrice > price && (
                <>
                  <span className="text-base font-semibold text-zinc-400 line-through">
                    {formatCurrency(originalPrice)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {productId && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Hash size={11} /> Product ID
                  </p>
                  <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white mt-1 flex items-center gap-1.5 break-all">
                    {productId} <CopyButton text={productId} />
                  </p>
                </div>
              )}
              {Boolean(product?.sku) && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Tag size={11} /> SKU
                  </p>
                  <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white mt-1 flex items-center gap-1.5 break-all">
                    {product.sku} <CopyButton text={product.sku} />
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Boxes size={11} /> Stock
                </p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                  {stock > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{stock.toLocaleString()} in stock</span>
                  ) : (
                    <span className="text-red-500">Out of stock</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Attribute card */}
          {Boolean(
            (product?.categoryName || product?.category) ||
            (product?.subcategoryName || product?.categoryId) ||
            (product?.collectionType || product?.collection) ||
            product?.brand
          ) && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 sm:p-6">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                <Layers size={15} className="text-orange-500" /> Attributes
              </h3>
              <InfoRow label="Category" value={product?.categoryName || product?.category} />
              <InfoRow label="Subcategory" value={product?.subcategoryName || product?.categoryId} />
              <InfoRow label="Collection" value={product?.collectionType || product?.collection} />
              <InfoRow label="Brand" value={product?.brand} />
              <InfoRow label="Condition" value={product?.condition} />
              <InfoRow label="Warranty" value={product?.warranty} />
            </div>
          )}

          {/* Variants card */}
          {(colors.length > 0 || sizes.length > 0 || variants.length > 1) && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 sm:p-6 space-y-4">
              {colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Palette size={15} className="text-orange-500" /> Color Variants
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map((color: string) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600"
                          style={{ background: getColorHex(color) || color }}
                        />
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className={colors.length > 0 ? "border-t border-zinc-100 dark:border-zinc-800 pt-4" : ""}>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Ruler size={15} className="text-orange-500" /> Size Variants
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {sizes.map((size: string) => (
                      <span
                        key={size}
                        className="px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {variants.length > 1 && (
                <div className={(colors.length > 0 || sizes.length > 0) ? "border-t border-zinc-100 dark:border-zinc-800 pt-4" : ""}>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Building2 size={15} className="text-orange-500" /> Variant List
                  </h3>
                  <div className="max-h-[220px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {variants.map((v: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(i)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors cursor-pointer ${selectedVariant === i
                          ? 'bg-orange-500/5 text-zinc-900 dark:text-white'
                          : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300'
                          }`}
                      >
                        <span className="font-semibold truncate">
                          {[v.color, v.size].filter(Boolean).join(' · ') || `Variant ${i + 1}`}
                        </span>
                        <span className="shrink-0 flex items-center gap-3">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {formatCurrency(Number(v.price) || price)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${Number(v.stock) > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-500'
                            }`}>
                            {Number(v.stock) > 0 ? `${v.stock} in stock` : 'Out of stock'}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <Tag size={15} className="text-orange-500" /> Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {Boolean(product?.description && product.description.trim()) && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 sm:p-6">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <FileText size={15} className="text-orange-500" /> Description
          </h3>
          <div
            className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  );
}

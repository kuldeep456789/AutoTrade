import { Link } from 'react-router-dom';
import { X, LogIn } from 'lucide-react';

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="100%" height="100%" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="900" fill="%23c9922f" letter-spacing="6">AutoTrade</text></svg>';

interface WishlistProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
}

interface WishlistLoginPopupProps {
  product: WishlistProduct;
  onClose: () => void;
}

export default function WishlistLoginPopup({ product, onClose }: WishlistLoginPopupProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[960px] h-[540px] max-h-[90vh] mx-auto bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-2xl shadow-2xl overflow-hidden flex animate-[popupFadeIn_250ms_ease-out]">
        {/* Left — Product Image */}
        <div className="hidden md:block w-[55%] h-full relative flex-shrink-0">
          <img
            src={product.image || FALLBACK_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 z-10">
            <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
              AutoTrade
            </h3>
            <p className="text-sm text-white/70 drop-shadow-sm leading-6 mt-2 max-w-xs normal-case tracking-normal">
              Drive Business Forward with Premium Automotive Parts & Accessories.
            </p>
          </div>
        </div>

        {/* Right — Action panel */}
        <div className="flex-1 h-full flex flex-col justify-center px-8 lg:px-10 py-8 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-20"
          >
            <X size={18} strokeWidth={2} />
          </button>

          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl font-bold tracking-tight uppercase">SIGN IN REQUIRED</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-6 normal-case tracking-normal">
              Sign in to save "{product.name}" to your wishlist, manage your bag, and enjoy a faster checkout.
            </p>

            <div className="mt-8 space-y-4">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-semibold tracking-wider transition hover:shadow-md flex items-center justify-center gap-2 cursor-pointer h-[56px]"
              >
                <LogIn size={18} />
                <span>SIGN IN TO AUTOTRADE</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer py-2"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

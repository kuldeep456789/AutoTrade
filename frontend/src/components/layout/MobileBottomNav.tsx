import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

const MobileBottomNav = () => {
  const location = useLocation();
  const cartItems = useSelector((state: RootState) => state.cart.cartItems);
  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.qty, 0);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const isHomeActive = location.pathname === '/';
  const isCategoriesActive = location.pathname.startsWith('/collections');
  const isCartActive = location.pathname.startsWith('/cart');
  const isProfileActive =
    location.pathname.startsWith('/account') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register');

  // Do not render bottom nav on checkout or admin pages
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/shipping') ||
    location.pathname.startsWith('/payment') ||
    location.pathname.startsWith('/placeorder')
  ) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-2.5 left-3 right-3 z-40">
      <nav
        aria-label="Mobile Navigation"
        className="bg-zinc-950/95 border border-zinc-800/90 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl px-2 py-1"
      >
        <div className="grid grid-cols-4 items-center justify-items-center h-14 max-w-md mx-auto">
          {/* 1. Home */}
          <Link
            to="/"
            className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1 transition-all duration-200"
          >
            {isHomeActive && (
              <span className="absolute top-0 w-8 h-[3px] bg-[#FF7A00] rounded-full shadow-[0_0_10px_rgba(255,122,0,0.9)]" />
            )}
            <Home
              className={`w-6 h-6 transition-transform duration-200 ${
                isHomeActive ? 'text-[#FF7A00] scale-105' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              strokeWidth={isHomeActive ? 2.25 : 1.75}
            />
            <span
              className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                isHomeActive ? 'text-[#FF7A00] font-bold' : 'text-zinc-400 font-medium'
              }`}
            >
              Home
            </span>
          </Link>

          {/* 2. Categories */}
          <Link
            to="/collections/all"
            className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1 transition-all duration-200"
          >
            {isCategoriesActive && (
              <span className="absolute top-0 w-8 h-[3px] bg-[#FF7A00] rounded-full shadow-[0_0_10px_rgba(255,122,0,0.9)]" />
            )}
            <LayoutGrid
              className={`w-6 h-6 transition-transform duration-200 ${
                isCategoriesActive ? 'text-[#FF7A00] scale-105' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              strokeWidth={isCategoriesActive ? 2.25 : 1.75}
            />
            <span
              className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                isCategoriesActive ? 'text-[#FF7A00] font-bold' : 'text-zinc-400 font-medium'
              }`}
            >
              Categories
            </span>
          </Link>

          {/* 3. Cart */}
          <Link
            to="/cart"
            className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1 transition-all duration-200"
          >
            {isCartActive && (
              <span className="absolute top-0 w-8 h-[3px] bg-[#FF7A00] rounded-full shadow-[0_0_10px_rgba(255,122,0,0.9)]" />
            )}
            <div className="relative">
              <ShoppingCart
                className={`w-6 h-6 transition-transform duration-200 ${
                  isCartActive ? 'text-[#FF7A00] scale-105' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                strokeWidth={isCartActive ? 2.25 : 1.75}
              />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#FF7A00] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                isCartActive ? 'text-[#FF7A00] font-bold' : 'text-zinc-400 font-medium'
              }`}
            >
              Cart
            </span>
          </Link>

          {/* 4. Profile */}
          <Link
            to={userInfo ? '/account' : '/login'}
            className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1 transition-all duration-200"
          >
            {isProfileActive && (
              <span className="absolute top-0 w-8 h-[3px] bg-[#FF7A00] rounded-full shadow-[0_0_10px_rgba(255,122,0,0.9)]" />
            )}
            <User
              className={`w-6 h-6 transition-transform duration-200 ${
                isProfileActive ? 'text-[#FF7A00] scale-105' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              strokeWidth={isProfileActive ? 2.25 : 1.75}
            />
            <span
              className={`text-[11px] tracking-tight mt-0.5 transition-colors ${
                isProfileActive ? 'text-[#FF7A00] font-bold' : 'text-zinc-400 font-medium'
              }`}
            >
              Profile
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default MobileBottomNav;

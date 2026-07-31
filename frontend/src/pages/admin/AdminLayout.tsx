import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Package, Users, RotateCcw, MessageSquare, Banknote,
  Settings, Menu, X, Store, Sparkles
} from 'lucide-react';
import type { RootState } from '../../store/store';
import ThemeToggle from '../../components/theme/ThemeToggle';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/users', label: 'Customers', icon: Users },
  { to: '/admin/commission-finance', label: 'Finance', icon: Banknote },
  { to: '/admin/returns', label: 'Return Requests', icon: RotateCcw },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/hero-banner', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Strict route protection: non-admins cannot land on admin pages
  if (!userInfo || userInfo.role !== 'admin') {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  const isActive = (item: typeof navItems[number]) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 z-40 lg:hidden backdrop-blur-md transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col z-50 text-zinc-700 dark:text-zinc-300 w-[260px] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Branding Header */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <img src="/img/logo.png" alt="AutoTrade" className="h-9 w-auto object-contain" />
            <div>
              <span className="text-xs font-extrabold text-orange-500 uppercase tracking-widest block leading-tight">
                Enterprise
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block">
                Automotive Console
              </span>
            </div>
          </div>
          <button 
            className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.01]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/80'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={active ? 2 : 1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Store className="h-4 w-4 text-orange-500" strokeWidth={2} />
            <span>Back to Storefront</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="flex justify-between items-center px-4 sm:px-6 lg:px-10 h-16 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800/80 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              className="lg:hidden p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500 hidden sm:block" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Automotive Control Center
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Dark / Light Theme Toggle Switch */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" title="Toggle Theme">
              <ThemeToggle />
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-3 sm:pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  {userInfo?.name || `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim() || 'Admin'}
                </p>
                <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center border border-orange-400/40 text-xs shadow-md shadow-orange-500/20">
                {(userInfo?.firstName?.[0] || userInfo?.name?.[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="p-4 sm:p-6 lg:p-10 flex-1 max-w-[1600px] mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

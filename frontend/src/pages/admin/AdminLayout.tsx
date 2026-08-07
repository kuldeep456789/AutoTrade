import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, Package, Users, RotateCcw, MessageSquare,
  Settings, Menu, X, Store, Sparkles, LogOut, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store/store';
import ThemeToggle from '../../components/theme/ThemeToggle';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/users', label: 'Customers', icon: Users },
  { to: '/admin/returns', label: 'Return Requests', icon: RotateCcw },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: Activity },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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

  const handleLogout = () => {
    setShowLogoutModal(true);
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
        className={`fixed left-0 top-0 h-full bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col z-50 text-zinc-700 dark:text-zinc-300 transition-all duration-300 ease-in-out ${
          desktopCollapsed ? 'lg:w-[80px]' : 'lg:w-[260px]'
        } w-[260px] ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Branding Header */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
          <div className={`flex items-center ${desktopCollapsed ? 'justify-center lg:justify-center' : 'gap-3'} w-full`}>
            <img src="/img/logo.png" alt="AutoTrade" className="h-9 w-auto object-contain shrink-0" />
            <div className={`transition-all duration-300 overflow-hidden ${desktopCollapsed ? 'w-0 opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
              <span className="text-xs font-extrabold text-orange-500 uppercase tracking-widest block leading-tight whitespace-nowrap">
                Enterprise
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block whitespace-nowrap">
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
                <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${desktopCollapsed ? 'w-0 opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${desktopCollapsed ? 'w-0 opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>Sign Out</span>
          </button>
        </div>
        
        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-20 w-7 h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white shadow-sm hover:shadow-md transition-all cursor-pointer z-50"
        >
          {desktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${desktopCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[260px]'}`}>
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                  <LogOut size={28} />
                </div>
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Confirm Logout</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to logout from the admin panel?
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    dispatch(logout());
                    setShowLogoutModal(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors shadow-lg shadow-red-500/25 cursor-pointer"
                >
                  <LogOut size={16} />
                  Confirm Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

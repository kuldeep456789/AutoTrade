import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Package, Users, RotateCcw, MessageSquare, Banknote,
  Settings, Menu, X, Store
} from 'lucide-react';
import type { RootState } from '../../store/store';

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

  // Strict route protection: non-admins cannot land on admin pages
  if (!userInfo || userInfo.role !== 'admin') {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (item: typeof navItems[number]) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };



  return (
    <div className="flex min-h-screen bg-[#f8f9ff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#213145] flex flex-col z-50 text-[#cbdbf5] w-[260px] transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="px-6 py-6 lg:py-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">VASTRA</h1>
            <p className="text-xs font-mono text-[#cbdbf5] opacity-60 uppercase tracking-widest mt-1">Enterprise Admin</p>
          </div>
          <button 
            className="lg:hidden text-white/70 hover:text-white p-2 -mr-2 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-none transition-all duration-200 ${
                isActive(item)
                  ? 'bg-white/10 text-[#dae1ff] border-l-4 border-[#0066ff] font-bold'
                  : 'font-medium hover:bg-white/5 hover:text-white border-l-4 border-transparent'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={isActive(item) ? 2 : 1.5} />
              <span className="text-[15px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="space-y-1">
            <Link
              to="/"
              className="w-full flex items-center px-3 py-2.5 gap-3 font-medium text-[#cbdbf5] hover:text-green-400 hover:bg-green-400/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all cursor-pointer"
            >
              <Store className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm">Back to Store</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="flex justify-between items-center px-4 sm:px-6 lg:px-10 h-16 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 hidden sm:block">Overview</h2>
            
            <div className="relative group hidden md:block">
              {/* Search removed as requested */}
            </div>
            

          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-base font-medium text-gray-900 leading-tight">{userInfo?.firstName || 'Admin'}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">SUPER ADMIN</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#0066ff] flex items-center justify-center text-white font-bold border border-gray-200 text-sm sm:text-base">
                {(userInfo?.firstName?.[0] || 'A').toUpperCase()}
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

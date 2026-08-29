import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AnnouncementBanner from './components/layout/AnnouncementBanner';
import Footer from './components/layout/Footer';
import SplashScreen from './components/SplashScreen';
import { useTabSync } from './hooks/useTabSync';

import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import CollectionPage from './pages/CollectionPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import ShippingPage from './pages/ShippingPage';
import PaymentPage from './pages/PaymentPage';
import PlaceOrderPage from './pages/PlaceOrderPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import ContactPage from './pages/ContactPage';
import TrackOrderPage from './pages/TrackOrderPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import ReturnsPage from './pages/ReturnsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProductDetails from './pages/admin/AdminProductDetails';

const AdminOrderDetails = lazy(() => import('./pages/admin/AdminOrderDetails'));

function AdminOrderDetailsLoader() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminOrderDetails />
    </Suspense>
  );
}
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReturnRequests from './pages/admin/AdminReturnRequests';
import AdminCustomerIssues from './pages/admin/AdminCustomerIssues';

import AdminCustomerMessages from './pages/admin/AdminCustomerMessages';
import AdminSettings from './pages/admin/AdminSettings';
import AdminActivityLogs from './pages/admin/AdminActivityLogs';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

import MobileBottomNav from './components/layout/MobileBottomNav';

function MainLayout() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-zinc-950 pb-16 md:pb-0">
      <Navbar />
      <AnnouncementBanner />
      <main className="flex-grow w-full pt-16 md:pt-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(false);
  useTabSync();

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('at_splash_done', '1');
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <Router>
        <ScrollToTop />
        <Routes>
        {/* Admin routes (separate layout, no Navbar/Footer) */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailsLoader />} />
          <Route path="products/:pid" element={<AdminProductDetails />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="returns" element={<AdminReturnRequests />} />
          <Route path="customer-issues" element={<AdminCustomerIssues />} />

          <Route path="messages" element={<AdminCustomerMessages />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="activity-logs" element={<AdminActivityLogs />} />
        </Route>

        {/* Main app routes with Navbar & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections" element={<CollectionPage />} />
          <Route path="/collections/all" element={<CollectionPage />} />
          <Route path="/collections/:subcategory" element={<CollectionPage />} />
          <Route path="/new-arrivals" element={<ProductListPage />} />
          <Route path="/accessories" element={<ProductListPage />} />
          <Route path="/search" element={<ProductListPage />} />
          <Route path="/trending" element={<ProductListPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><ShippingPage /></PrivateRoute>} />
          <Route path="/shipping" element={<PrivateRoute><ShippingPage /></PrivateRoute>} />
          <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/placeorder" element={<PrivateRoute><PlaceOrderPage /></PrivateRoute>} />
          <Route path="/order/:id" element={<PrivateRoute><OrderSuccessPage /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderTrackingPage /></PrivateRoute>} />
          <Route path="/contact" element={<PrivateRoute><ContactPage /></PrivateRoute>} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/returns" element={<PrivateRoute><ReturnsPage /></PrivateRoute>} />
        </Route>
      </Routes>
      </Router>
    </>
  );
}

export default App;


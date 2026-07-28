import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AnnouncementBanner from './components/layout/AnnouncementBanner';
import Footer from './components/layout/Footer';

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
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReturnRequests from './pages/admin/AdminReturnRequests';
import AdminCustomerIssues from './pages/admin/AdminCustomerIssues';
import AdminCommissionFinance from './pages/admin/AdminCommissionFinance';
import AdminHeroBanner from './pages/admin/AdminHeroBanner';
import AdminCustomerMessages from './pages/admin/AdminCustomerMessages';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

function MainLayout() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-zinc-950">
      <Navbar />
      <AnnouncementBanner />
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Admin routes (separate layout, no Navbar/Footer) */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="returns" element={<AdminReturnRequests />} />
          <Route path="customer-issues" element={<AdminCustomerIssues />} />
          <Route path="commission-finance" element={<AdminCommissionFinance />} />
          <Route path="hero-banner" element={<AdminHeroBanner />} />
          <Route path="messages" element={<AdminCustomerMessages />} />
        </Route>

        {/* Main app routes with Navbar & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections" element={<CollectionPage />} />
          <Route path="/collections/all" element={<CollectionPage />} />
          <Route path="/collections/:gender" element={<CollectionPage />} />
          <Route path="/collections/:gender/:subcategory" element={<CollectionPage />} />
          <Route path="/new-arrivals" element={<ProductListPage />} />
          <Route path="/men" element={<ProductListPage />} />
          <Route path="/women" element={<ProductListPage />} />
          <Route path="/accessories" element={<ProductListPage />} />
          <Route path="/search" element={<ProductListPage />} />
          <Route path="/trending" element={<ProductListPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
          <Route path="/shipping" element={<PrivateRoute><ShippingPage /></PrivateRoute>} />
          <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/placeorder" element={<PrivateRoute><PlaceOrderPage /></PrivateRoute>} />
          <Route path="/order/:id" element={<PrivateRoute><OrderSuccessPage /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderTrackingPage /></PrivateRoute>} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;


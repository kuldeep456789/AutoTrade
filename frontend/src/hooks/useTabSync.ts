import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, logout, type UserInfo } from '../store/slices/authSlice';
import { syncFromStorage as syncCart } from '../store/slices/cartSlice';
import { syncFromStorage as syncWishlist } from '../store/slices/wishlistSlice';

const AUTH_KEY = 'userInfo';
const CART_KEYS = ['cartItems', 'shippingAddress', 'appliedCoupon', 'couponDiscount'];
const WISHLIST_KEYS = ['wishlistItems'];


export function useTabSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;

      if (e.key === AUTH_KEY) {
        if (e.newValue) {
          try {
            dispatch(setCredentials(JSON.parse(e.newValue) as UserInfo));
          } catch {
            dispatch(logout());
          }
        } else {
          dispatch(logout());
        }
        return;
      }

      if (CART_KEYS.includes(e.key)) {
        dispatch(syncCart());
        return;
      }

      if (WISHLIST_KEYS.includes(e.key)) {
        dispatch(syncWishlist());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dispatch]);
}
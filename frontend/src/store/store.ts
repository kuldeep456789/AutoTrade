import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { apiSlice } from './slices/apiSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import recentlyViewedReducer from './slices/recentlyViewedSlice';
import authReducer from './slices/authSlice';

const appReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  cart: cartReducer,
  wishlist: wishlistReducer,
  recentlyViewed: recentlyViewedReducer,
  auth: authReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout' || action.type === 'auth/setCredentials') {
    // Purge session items from localStorage
    localStorage.removeItem('cartItems');
    localStorage.removeItem('shippingAddress');
    localStorage.removeItem('appliedCoupon');
    localStorage.removeItem('couponDiscount');
    localStorage.removeItem('wishlistItems');
    localStorage.removeItem('savedAddresses_undefined');

    if (action.type === 'auth/logout') {
      localStorage.removeItem('userInfo');
    }

    // Force complete reset of RTK Query cache and Redux slices for fresh user session
    state = undefined;
  }
  return appReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(apiSlice.middleware),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

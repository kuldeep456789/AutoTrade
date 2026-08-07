import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { rtkQueryErrorLogger } from './middleware/errorMiddleware';
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
  if (action.type === 'auth/logout') {
    localStorage.removeItem('cartItems');
    localStorage.removeItem('shippingAddress');
    localStorage.removeItem('appliedCoupon');
    localStorage.removeItem('couponDiscount');
    localStorage.removeItem('wishlistItems');
    localStorage.removeItem('savedAddresses_undefined');

    localStorage.removeItem('userInfo');

    state = undefined;
  }
  return appReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(apiSlice.middleware, rtkQueryErrorLogger),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

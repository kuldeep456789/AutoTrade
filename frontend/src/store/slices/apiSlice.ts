import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl, PROD_BACKEND_URL } from '@/lib/api';
import type { RootState } from '../store';

// In production builds, getApiBaseUrl() always returns PROD_BACKEND_URL.
// In dev, it may return '' — fetchBaseQuery then uses relative paths
// which are handled by the Vite dev proxy (/api → localhost:3000).
const rawBase = getApiBaseUrl();

// Safety net: if somehow empty in a production build, hard-fall to backend URL.
// import.meta.env.PROD is baked at build time (true = production).
const baseUrl: string = rawBase.length > 0 ? rawBase : (import.meta.env.PROD ? PROD_BACKEND_URL : '');

const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const userInfo = (getState() as RootState).auth?.userInfo as any;
    let token = userInfo?.accessToken || userInfo?.token;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        try {
          const saved = localStorage.getItem('userInfo');
          if (saved) {
            const parsed = JSON.parse(saved);
            token = parsed?.accessToken || parsed?.token;
          }
        } catch {}
      }
    }
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('ngrok-skip-browser-warning', 'true');
    return headers;
  },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ['Product', 'Order', 'User', 'Category', 'Cart', 'Wishlist', 'Return', 'Settings'],
  endpoints: () => ({}),
});

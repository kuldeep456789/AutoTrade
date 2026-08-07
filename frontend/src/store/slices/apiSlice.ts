import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl } from '@/lib/api';
import type { RootState } from '../store';

const baseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
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

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { getApiBaseUrl, PROD_BACKEND_URL } from '@/lib/api';
import type { RootState } from '../store';
import { updateTokens, logout } from './authSlice';

// In production builds, getApiBaseUrl() always returns PROD_BACKEND_URL.
// In dev, it may return '' — fetchBaseQuery then uses relative paths
// which are handled by the Vite dev proxy (/api → localhost:3000).
const rawBase = getApiBaseUrl();

// Safety net: if somehow empty in a production build, hard-fall to backend URL.
const baseUrl: string = rawBase.length > 0 ? rawBase : (import.meta.env.PROD ? PROD_BACKEND_URL : '');

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const userInfo = (getState() as RootState).auth?.userInfo as any;
    let token = userInfo?.accessToken || userInfo?.token;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken') || localStorage.getItem('token');
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

let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // If a refresh is currently running, wait for it before executing next request
  if (refreshPromise) {
    await refreshPromise;
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const currentRefreshToken =
      state.auth?.userInfo?.refreshToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null);

    const isAuthEndpoint =
      typeof args === 'string'
        ? args.includes('/api/auth/login') || args.includes('/api/auth/refresh') || args.includes('/api/auth/register')
        : args.url.includes('/api/auth/login') || args.url.includes('/api/auth/refresh') || args.url.includes('/api/auth/register');

    if (!isAuthEndpoint && currentRefreshToken) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResult = await rawBaseQuery(
              {
                url: '/api/auth/refresh',
                method: 'POST',
                body: { refreshToken: currentRefreshToken },
              },
              api,
              extraOptions
            );

            if (refreshResult.data && (refreshResult.data as any).accessToken) {
              const data = refreshResult.data as any;
              api.dispatch(
                updateTokens({
                  accessToken: data.accessToken,
                  refreshToken: data.refreshToken || currentRefreshToken,
                })
              );
              return true;
            } else {
              api.dispatch(logout());
              return false;
            }
          } catch {
            api.dispatch(logout());
            return false;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the original query with the new access token
        result = await rawBaseQuery(args, api, extraOptions);
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Order', 'User', 'Category', 'Cart', 'Wishlist', 'Return', 'Settings'],
  endpoints: () => ({}),
});


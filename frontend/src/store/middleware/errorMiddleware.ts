import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { MiddlewareAPI, Middleware } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

export const rtkQueryErrorLogger: Middleware =
  (api: MiddlewareAPI) => (next) => (action: any) => {
    if (isRejectedWithValue(action)) {
      const status = action.payload?.status;
      const data = action.payload?.data;

      const endpointName = action.meta?.arg?.endpointName;

      // Handle specific status codes
      if (status === 401) {
        // Trigger global logout if unauthorized, but ignore login/2fa login credentials failure
        if (endpointName !== 'login' && endpointName !== 'verify2FALogin') {
          api.dispatch({ type: 'auth/logout' });
          toast.error('Session expired. Please log in again.');
        }
      } else if (status === 403) {
        toast.error(data?.message || 'You do not have permission to perform this action.');
      } else if (status === 400 || status === 422) {
        toast.error(data?.message || 'Invalid request. Please check your inputs.');
      } else if (status === 409) {
        toast.error(data?.message || 'Conflict error.');
      } else if (status >= 500) {
        toast.error('Internal server error. Please try again later.');
      } else if (status === 'FETCH_ERROR') {
        toast.error('Network error. Please check your connection.');
      }
    }

    return next(action);
  };

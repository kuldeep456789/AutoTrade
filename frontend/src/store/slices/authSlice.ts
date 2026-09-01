import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface UserInfo {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  profileImage?: string;
  provider?: string;
  isVerified?: boolean;
  dateOfBirth?: string;
  isTwoFactorEnabled?: boolean;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
}

interface AuthState {
  userInfo: UserInfo | null;
}

const initialState: AuthState = {
  userInfo: localStorage.getItem('userInfo')
    ? JSON.parse(localStorage.getItem('userInfo') as string)
    : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<UserInfo>) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
      if (action.payload.accessToken) {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('token', action.payload.accessToken);
      }
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      if (state.userInfo) {
        state.userInfo.accessToken = action.payload.accessToken;
        state.userInfo.token = action.payload.accessToken;
        if (action.payload.refreshToken) {
          state.userInfo.refreshToken = action.payload.refreshToken;
        }
        localStorage.setItem('userInfo', JSON.stringify(state.userInfo));
      }
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('token', action.payload.accessToken);
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('shippingAddress');
    },
  },
});

export const { setCredentials, updateTokens, logout } = authSlice.actions;
export default authSlice.reducer;

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
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
      localStorage.removeItem('shippingAddress');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

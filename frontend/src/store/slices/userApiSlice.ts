import { apiSlice } from './apiSlice';

const AUTH_URL = '/api/auth';

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/login`, method: 'POST', body: data }),
    }),
    adminSecretLogin: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/admin-secret-login`, method: 'POST', body: data }),
    }),
    register: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/register`, method: 'POST', body: data }),
    }),
    sendRegisterOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/send-register-otp`, method: 'POST', body: data }),
    }),
    verifyRegisterOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/verify-register-otp`, method: 'POST', body: data }),
    }),
    sendMobileOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/send-mobile-otp`, method: 'POST', body: data }),
    }),
    verifyMobileOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/verify-mobile-otp`, method: 'POST', body: data }),
    }),
    sendEmailOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/send-email-otp`, method: 'POST', body: data }),
    }),
    verifyEmailOtp: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/verify-email-otp`, method: 'POST', body: data }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({ url: `${AUTH_URL}/reset-password`, method: 'POST', body: data }),
    }),
    getMe: builder.query({
      query: () => `${AUTH_URL}/me`,
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: `/api/users/profile`, method: 'PUT', body: data }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: `/api/users/change-password`, method: 'PUT', body: data }),
    }),
  }),
});

export const {
  useLoginMutation,
  useAdminSecretLoginMutation,
  useRegisterMutation,
  useSendRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
  useSendMobileOtpMutation,
  useVerifyMobileOtpMutation,
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useResetPasswordMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = userApiSlice;

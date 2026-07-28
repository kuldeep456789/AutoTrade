import { apiSlice } from './apiSlice';

const OTP_URL = '/api/otp';

export const otpApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendOtp: builder.mutation({
      query: (data) => ({
        url: `${OTP_URL}/send`,
        method: 'POST',
        body: data,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (data) => ({
        url: `${OTP_URL}/verify`,
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useSendOtpMutation, useVerifyOtpMutation } = otpApiSlice;

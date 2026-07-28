import { apiSlice } from './apiSlice';

const ORDERS_URL = '/api/orders';
const PAYMENTS_URL = '/api/payments';

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (order: { items: { productId: string; quantity: number }[]; totalAmount: number; paymentMethod?: string }) => ({
        url: ORDERS_URL,
        method: 'POST',
        body: order,
      }),
      invalidatesTags: ['Order'],
    }),
    getOrderDetails: builder.query({
      query: (orderId) => ({
        url: `${ORDERS_URL}/${orderId}`,
      }),
      transformResponse: (response: any) => response.order,
      providesTags: (_, __, orderId) => [{ type: 'Order' as const, id: orderId }],
      keepUnusedDataFor: 5,
    }),
    getUserOrders: builder.query({
      query: () => ({
        url: ORDERS_URL,
      }),
      transformResponse: (response: any) => response.orders ?? [],
      providesTags: ['Order'],
      keepUnusedDataFor: 5,
    }),
    createRazorpayOrder: builder.mutation({
      query: (orderId: string) => ({
        url: `${PAYMENTS_URL}/razorpay/order`,
        method: 'POST',
        body: { orderId },
      }),
    }),
    verifyRazorpayPayment: builder.mutation({
      query: (payload: {
        orderId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      }) => ({
        url: `${PAYMENTS_URL}/razorpay/verify`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_, __, { orderId }) => [{ type: 'Order' as const, id: orderId }, 'Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderDetailsQuery,
  useGetUserOrdersQuery,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
} = orderApiSlice;

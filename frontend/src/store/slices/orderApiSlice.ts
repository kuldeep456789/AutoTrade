import { apiSlice } from './apiSlice';

const ORDERS_URL = '/api/orders';
const PAYMENTS_URL = '/api/payments';

export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (order: { items: { productId: string; quantity: number }[]; totalAmount: number; paymentMethod?: string; shippingDetails?: any; currency?: string }) => ({
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
    createCheckoutSession: builder.mutation({
      query: (
        arg:
          | string
          | { orderId: string; currency?: string }
          | {
              items: {
                productId: string;
                quantity: number;
                vid?: string;
                sku?: string;
                color?: string;
                size?: string;
                name?: string;
                image?: string;
                price?: number;
              }[];
              totalAmount: number;
              currency?: string;
              shippingDetails?: Record<string, any>;
            }
      ) => {
        const body = typeof arg === 'string' ? { orderId: arg } : arg;
        return {
          url: `${PAYMENTS_URL}/create-checkout-session`,
          method: 'POST',
          body,
        };
      },
    }),
    cancelOrder: builder.mutation({
      query: (orderId: string) => ({
        url: `${ORDERS_URL}/${orderId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderDetailsQuery,
  useGetUserOrdersQuery,
  useCreateCheckoutSessionMutation,
  useCancelOrderMutation,
} = orderApiSlice;

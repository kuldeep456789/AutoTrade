import { apiSlice } from './apiSlice';

const CART_URL = '/api/cart';

export const cartApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addToCart: builder.mutation({
      query: (body: { productId: string; quantity: number }) => ({
        url: `${CART_URL}/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    getCart: builder.query({
      query: () => ({
        url: CART_URL,
      }),
      providesTags: ['Cart'],
      keepUnusedDataFor: 5,
    }),
    removeCartItem: builder.mutation({
      query: (productId: string) => ({
        url: `${CART_URL}/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useAddToCartMutation,
  useGetCartQuery,
  useRemoveCartItemMutation,
} = cartApiSlice;

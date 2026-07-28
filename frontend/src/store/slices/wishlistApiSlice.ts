import { apiSlice } from './apiSlice';

const WISHLIST_URL = '/api/wishlist';

export const wishlistApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addToWishlist: builder.mutation({
      query: (body: { productId: string }) => ({
        url: `${WISHLIST_URL}/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),
    getWishlist: builder.query({
      query: () => ({
        url: WISHLIST_URL,
      }),
      providesTags: ['Wishlist'],
      keepUnusedDataFor: 5,
    }),
    removeWishlistItem: builder.mutation({
      query: (productId: string) => ({
        url: `${WISHLIST_URL}/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),
  }),
});

export const {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveWishlistItemMutation,
} = wishlistApiSlice;

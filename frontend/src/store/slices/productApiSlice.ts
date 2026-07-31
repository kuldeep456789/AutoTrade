import { apiSlice } from './apiSlice';

const PRODUCTS_URL = '/api/products';

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Generic product listing — reads from Redis warehouse via NestJS.
     * Supports subcategoryName, q (search), page, etc.
     */
    getProducts: builder.query({
      query: (params: {
        categoryId?: string;
        collectionType?: string;
        subcategoryName?: string;
        q?: string;
        minPrice?: string;
        maxPrice?: string;
        colors?: string;
        sizes?: string;
        minRating?: string;
        pid?: string;
        sort?: string;
        pageNum?: number | string;
        pageSize?: number | string;
      } = {}) => ({
        url: PRODUCTS_URL,
        params,
      }),

      providesTags: ['Product'],
      // Keep cache for 10 minutes — warehouse refreshes hourly so this is safe
      keepUnusedDataFor: 600,
    }),

    /**
     * Single product detail (includes variant data from CJ).
     */
    getProductDetails: builder.query({
      query: (productId) => ({
        url: `${PRODUCTS_URL}/${productId}`,
      }),
      transformResponse: (response: any) => response ?? null,
      providesTags: (_, __, productId) => [{ type: 'Product' as const, id: productId }],
      keepUnusedDataFor: 600,
    }),

    /**
     * Related products for a product detail page.
     */
    getRelatedProducts: builder.query({
      query: (productId) => ({
        url: `${PRODUCTS_URL}/${productId}/related`,
      }),

      providesTags: (_, __, productId) => [{ type: 'Product' as const, id: `related-${productId}` }],
      keepUnusedDataFor: 600,
    }),

    /**
     * Post a product review.
     */
    createReview: builder.mutation({
      query: ({ productId, rating, comment }) => ({
        url: `${PRODUCTS_URL}/${productId}/reviews`,
        method: 'POST',
        body: { rating, comment },
      }),
      invalidatesTags: (_, __, { productId }) => [{ type: 'Product' as const, id: productId }, 'Product'],
    }),

    /**
     * Fetch total product count (shown in Navbar banner).
     */
    getProductCount: builder.query({
      query: () => ({
        url: '/api/cj/product-count',
      }),
      keepUnusedDataFor: 600,
    }),

    /**
     * Fetch CJ sync status — for admin dashboard health widget.
     */
    getSyncStatus: builder.query({
      query: () => ({
        url: '/api/cj/sync-status',
      }),
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductDetailsQuery,
  useGetRelatedProductsQuery,
  useCreateReviewMutation,
  useGetProductCountQuery,
  useGetSyncStatusQuery,
} = productApiSlice;

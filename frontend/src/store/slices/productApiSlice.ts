import { apiSlice } from './apiSlice';
import { filterExcluded } from '../../constants/products';

const PRODUCTS_URL = '/api/products';

const transformListResponse = (response: any) => {
  if (response?.products) {
    return { ...response, products: filterExcluded(response.products) };
  }
  return response;
};

export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Generic product listing — reads from Redis warehouse via NestJS.
     * Supports gender, subcategoryName, q (search), page, etc.
     */
    getProducts: builder.query({
      query: (params: {
        categoryId?: string;
        collectionType?: string;
        gender?: string;
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
      transformResponse: transformListResponse,
      providesTags: ['Product'],
      // Keep cache for 10 minutes — warehouse refreshes hourly so this is safe
      keepUnusedDataFor: 600,
    }),

    /**
     * Dedicated endpoints for Men's and Women's collections as per Master Prompt
     */
    getMenCollection: builder.query({
      query: (params: any = {}) => ({
        url: '/api/collections/men',
        params,
      }),
      transformResponse: transformListResponse,
      providesTags: ['Product'],
      keepUnusedDataFor: 600,
    }),

    getWomenCollection: builder.query({
      query: (params: any = {}) => ({
        url: '/api/collections/women',
        params,
      }),
      transformResponse: transformListResponse,
      providesTags: ['Product'],
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
      transformResponse: transformListResponse,
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
     * @deprecated — prefer useGetProductsQuery with { gender, subcategoryName }.
     * Kept for any legacy usage.
     */
    getProductsByCategory: builder.query({
      query: ({ categoryId, pageNum, pageSize }: { categoryId: string; pageNum?: number; pageSize?: number }) => ({
        url: `${PRODUCTS_URL}/category/${categoryId}`,
        params: { pageNum, pageSize },
      }),
      transformResponse: transformListResponse,
      providesTags: ['Product'],
      keepUnusedDataFor: 600,
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
  useGetProductsByCategoryQuery,
  useCreateReviewMutation,
  useGetProductCountQuery,
  useGetSyncStatusQuery,
  useGetMenCollectionQuery,
  useGetWomenCollectionQuery,
} = productApiSlice;

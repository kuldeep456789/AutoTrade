import { apiSlice } from './apiSlice';

const CATEGORIES_URL = '/api/categories';

export const categoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => ({
        url: CATEGORIES_URL,
      }),
      transformResponse: (response: any) =>
        Array.isArray(response)
          ? response
          : Array.isArray(response?.categories)
            ? response.categories
            : Array.isArray(response?.data?.categories)
              ? response.data.categories
              : Array.isArray(response?.data?.list)
                ? response.data.list
                : Array.isArray(response?.data?.records)
                  ? response.data.records
                  : [],
      providesTags: ['Category'],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetCategoriesQuery } = categoryApiSlice;

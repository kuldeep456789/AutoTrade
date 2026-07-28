import { apiSlice } from './apiSlice';

const RETURNS_URL = '/api/returns';

export const returnApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createReturn: builder.mutation({
      query: (data) => ({
        url: RETURNS_URL,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Return'],
    }),
    getMyReturns: builder.query({
      query: () => ({ url: RETURNS_URL }),
      providesTags: ['Return'],
      transformResponse: (response: any) =>
        Array.isArray(response?.returns) ? response.returns : [],
    }),
    getReturnById: builder.query({
      query: (id) => ({ url: `${RETURNS_URL}/${id}` }),
      transformResponse: (response: any) => response?.return,
    }),
  }),
});

export const {
  useCreateReturnMutation,
  useGetMyReturnsQuery,
  useGetReturnByIdQuery,
} = returnApiSlice;

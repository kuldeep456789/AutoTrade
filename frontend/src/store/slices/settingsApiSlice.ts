import { apiSlice } from './apiSlice';

const SETTINGS_URL = '/api/settings';

export const settingsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => ({
        url: SETTINGS_URL,
      }),
      providesTags: ['Settings' as any],
    }),
    updateSettings: builder.mutation({
      query: (data) => ({
        url: SETTINGS_URL,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Settings' as any],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApiSlice;

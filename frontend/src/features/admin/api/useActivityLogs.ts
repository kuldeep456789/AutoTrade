import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { SharedUserActivityLog } from '../../../types/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const useActivityLogs = (params: { page: number; limit: number; search: string; eventTypes: string }) => {
  return useQuery({
    queryKey: ['activityLogs', params],
    queryFn: async () => {
      const response = await axios.get<{ logs: SharedUserActivityLog[]; pagination: { total: number; pages: number } }>(
        `${API_URL}/admin/user-activity-logs`,
        {
          params,
          withCredentials: true,
        }
      );
      return response.data;
    },
    // Keep previous data while fetching new data to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });
};

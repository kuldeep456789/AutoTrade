import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { SharedUserActivityLog } from '../../../types/shared';
import { apiUrl } from '../../../lib/api';

function getToken(): string {
  try {
    const raw = localStorage.getItem('userInfo');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.accessToken || parsed?.token) {
        return parsed.accessToken || parsed.token;
      }
    }
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  } catch {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  }
}

export const useActivityLogs = (params: { page: number; limit: number; search: string; eventTypes: string }) => {
  return useQuery({
    queryKey: ['activityLogs', params],
    queryFn: async () => {
      const token = getToken();
      const response = await axios.get<{ logs: SharedUserActivityLog[]; pagination: { total: number; pages: number } }>(
        apiUrl('/api/admin/user-activity-logs'),
        {
          params,
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'ngrok-skip-browser-warning': 'true',
          },
          withCredentials: true,
        }
      );
      return response.data;
    },
    // Keep previous data while fetching new data to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });
};

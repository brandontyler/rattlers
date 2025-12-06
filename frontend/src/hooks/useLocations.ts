import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiService.getLocations({ pageSize: 500 });
      return response.success ? response.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      const response = await apiService.getLocationById(id);
      return response.success ? response.data : null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

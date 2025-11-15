import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { POOrder } from './usePOOrders';

/**
 * Optimized React Query hook for PO orders with smart caching
 * - 5 minute stale time to reduce unnecessary refetches
 * - 10 minute cache time for better performance
 * - Background refetch on window focus for fresh data when needed
 */
export const usePOOrdersQuery = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['po-orders'],
    queryFn: async (): Promise<POOrder[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch with pagination to handle large datasets
      const pageSize = 1000;
      let allOrders: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('po_orders')
          .select(`
            *,
            sunsky_sku:sunsky_skus(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allOrders as POOrder[];
    },
    enabled,
    staleTime: 0, // Always fetch fresh data to prevent stale UI
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on component mount for fresh data
    retry: 2, // Retry failed requests twice
  });
};

/**
 * Prefetch PO orders for better initial load performance
 */
export const prefetchPOOrders = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.prefetchQuery({
    queryKey: ['po-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('po_orders')
        .select('*, sunsky_sku:sunsky_skus(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); // Initial prefetch only first 100

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

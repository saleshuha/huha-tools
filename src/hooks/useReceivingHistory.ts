import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReceivingHistoryItem {
  id: string;
  user_id: string;
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  serial_number?: string;
  supplier_name?: string;
  destination_type: string;
  destination_details?: any;
  template_type?: string;
  printed: boolean;
  printer_name?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export function useReceivingHistory(pageSize: number = 50) {
  const queryClient = useQueryClient();

  // Fetch history with pagination state
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['receiving-history'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('receiving_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) throw error;
      
      return {
        items: data || [],
        hasMore: (count || 0) > pageSize,
        nextOffset: pageSize
      };
    }
  });

  // Load more function
  const loadMore = async () => {
    if (!data || !data.hasMore) return;

    const { data: moreData, error } = await supabase
      .from('receiving_history')
      .select('*')
      .order('created_at', { ascending: false })
      .range(data.nextOffset, data.nextOffset + pageSize - 1);

    if (error) {
      console.error('Failed to load more history:', error);
      return;
    }

    queryClient.setQueryData(['receiving-history'], (old: any) => ({
      ...old,
      items: [...old.items, ...(moreData || [])],
      nextOffset: old.nextOffset + pageSize,
      hasMore: (moreData?.length || 0) === pageSize
    }));
  };

  // Update print status
  const updatePrintStatus = useMutation({
    mutationFn: async ({ id, printed, printer_name }: { 
      id: string; 
      printed: boolean; 
      printer_name?: string 
    }) => {
      const { error } = await supabase
        .from('receiving_history')
        .update({ printed, printer_name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-history'] });
    }
  });

  return {
    history: data?.items || [],
    isLoading,
    error,
    loadMore,
    hasMore: data?.hasMore || false,
    updatePrintStatus: updatePrintStatus.mutate
  };
}


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

export function useReceivingHistory(
  pageSize: number = 50, 
  filterType: 'all' | 'po' | 'inventory' = 'all'
) {
  const queryClient = useQueryClient();

  // Fetch history with pagination state and filtering
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['receiving-history', filterType],
    queryFn: async () => {
      let query = supabase
        .from('receiving_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filter based on type
      if (filterType === 'po') {
        // PO fulfillments: has po_numbers in destination_details
        query = query.not('destination_details->po_numbers', 'is', null);
      } else if (filterType === 'inventory') {
        // Inventory receipts: no po_numbers or empty array
        query = query.or('destination_details->po_numbers.is.null,destination_details->po_numbers.eq.[]');
      }

      query = query.limit(pageSize);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get counts for both types
      const { count: poCount } = await supabase
        .from('receiving_history')
        .select('*', { count: 'exact', head: true })
        .not('destination_details->po_numbers', 'is', null);

      const { count: invCount } = await supabase
        .from('receiving_history')
        .select('*', { count: 'exact', head: true })
        .or('destination_details->po_numbers.is.null,destination_details->po_numbers.eq.[]');
      
      return {
        items: data || [],
        hasMore: (count || 0) > pageSize,
        nextOffset: pageSize,
        poCount: poCount || 0,
        inventoryCount: invCount || 0
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
    poCount: data?.poCount || 0,
    inventoryCount: data?.inventoryCount || 0,
    updatePrintStatus: updatePrintStatus.mutate
  };
}


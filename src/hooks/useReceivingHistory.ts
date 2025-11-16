import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoryFilterOptions {
  searchTerm?: string;
  poNumber?: string;
  supplierName?: string;
  startDate?: Date;
  endDate?: Date;
  hasSerial?: boolean;
}

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
  destination_details?: {
    po_numbers?: string[];
    priorities?: number[];
    group_names?: string[];
    group_ids?: string[];
    inventory_added?: number;
    pos_allocated?: number;
    fulfillment_source?: string;
  };
  template_type?: string;
  printed: boolean;
  printer_name?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  image_url?: string;
}

export function useReceivingHistory(
  pageSize: number = 50, 
  filterType: 'all' | 'po' | 'inventory' = 'all',
  filters: HistoryFilterOptions = {}
) {
  const queryClient = useQueryClient();

  // Fetch history with pagination state and filtering
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['receiving-history', filterType, filters],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      let query = supabase
        .from('receiving_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filter based on type
      if (filterType === 'po') {
        query = query.not('destination_details->po_numbers', 'is', null);
      } else if (filterType === 'inventory') {
        query = query.or('destination_details->po_numbers.is.null,destination_details->po_numbers.eq.[]');
      }

      // Apply search filters
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        query = query.or(`asin.ilike.%${searchTerm}%,sku_code.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      }

      if (filters.poNumber) {
        // Search in destination_details JSON for po_numbers
        query = query.like('destination_details', `%${filters.poNumber}%`);
      }

      if (filters.supplierName) {
        query = query.ilike('supplier_name', `%${filters.supplierName}%`);
      }

      if (filters.startDate) {
        const startDateStr = filters.startDate.toISOString().split('T')[0];
        query = query.gte('created_at', startDateStr);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      if (filters.hasSerial !== undefined) {
        if (filters.hasSerial) {
          query = query.not('serial_number', 'is', null);
        } else {
          query = query.is('serial_number', null);
        }
      }

      query = query.limit(pageSize);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch product images for the results
      const asins = data?.map(item => item.asin).filter(Boolean) || [];
      let imageMap: Record<string, string> = {};
      
      if (asins.length > 0 && userId) {
        const { data: imageData } = await supabase
          .from('product_images')
          .select('asin, image_url')
          .eq('user_id', userId)
          .in('asin', asins);
        
        imageData?.forEach(img => {
          if (img.asin && img.image_url) {
            imageMap[img.asin] = img.image_url;
          }
        });
      }

      // Attach images to results
      const dataWithImages = data?.map(item => ({
        ...item,
        image_url: item.asin ? imageMap[item.asin] : undefined
      }));

      // Get counts for both types (with same filters)
      let poCountQuery = supabase
        .from('receiving_history')
        .select('*', { count: 'exact', head: true })
        .not('destination_details->po_numbers', 'is', null);

      let invCountQuery = supabase
        .from('receiving_history')
        .select('*', { count: 'exact', head: true })
        .or('destination_details->po_numbers.is.null,destination_details->po_numbers.eq.[]');

      // Apply same filters to counts
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const orCondition = `asin.ilike.%${searchTerm}%,sku_code.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`;
        poCountQuery = poCountQuery.or(orCondition);
        invCountQuery = invCountQuery.or(orCondition);
      }
      if (filters.poNumber) {
        poCountQuery = poCountQuery.like('destination_details', `%${filters.poNumber}%`);
        invCountQuery = invCountQuery.like('destination_details', `%${filters.poNumber}%`);
      }
      if (filters.supplierName) {
        poCountQuery = poCountQuery.ilike('supplier_name', `%${filters.supplierName}%`);
        invCountQuery = invCountQuery.ilike('supplier_name', `%${filters.supplierName}%`);
      }
      if (filters.startDate) {
        const startDateStr = filters.startDate.toISOString().split('T')[0];
        poCountQuery = poCountQuery.gte('created_at', startDateStr);
        invCountQuery = invCountQuery.gte('created_at', startDateStr);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        poCountQuery = poCountQuery.lte('created_at', endDate.toISOString());
        invCountQuery = invCountQuery.lte('created_at', endDate.toISOString());
      }
      if (filters.hasSerial !== undefined) {
        if (filters.hasSerial) {
          poCountQuery = poCountQuery.not('serial_number', 'is', null);
          invCountQuery = invCountQuery.not('serial_number', 'is', null);
        } else {
          poCountQuery = poCountQuery.is('serial_number', null);
          invCountQuery = invCountQuery.is('serial_number', null);
        }
      }

      const { count: poCount } = await poCountQuery;
      const { count: invCount } = await invCountQuery;
      
      return {
        items: dataWithImages || [],
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

    let query = supabase
      .from('receiving_history')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply the same filters as main query
    if (filterType === 'po') {
      query = query.not('destination_details->po_numbers', 'is', null);
    } else if (filterType === 'inventory') {
      query = query.or('destination_details->po_numbers.is.null,destination_details->po_numbers.eq.[]');
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      query = query.or(`asin.ilike.%${searchTerm}%,sku_code.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
    }
    if (filters.poNumber) {
      query = query.like('destination_details', `%${filters.poNumber}%`);
    }
    if (filters.supplierName) {
      query = query.ilike('supplier_name', `%${filters.supplierName}%`);
    }
    if (filters.startDate) {
      const startDateStr = filters.startDate.toISOString().split('T')[0];
      query = query.gte('created_at', startDateStr);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    if (filters.hasSerial !== undefined) {
      if (filters.hasSerial) {
        query = query.not('serial_number', 'is', null);
      } else {
        query = query.is('serial_number', null);
      }
    }

    query = query.range(data.nextOffset, data.nextOffset + pageSize - 1);

    const { data: moreData, error } = await query;

    if (error) {
      console.error('Failed to load more history:', error);
      return;
    }

    queryClient.setQueryData(['receiving-history', filterType, filters], (old: any) => ({
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


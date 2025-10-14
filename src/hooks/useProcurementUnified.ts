import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface UnifiedProcurementItem {
  source: 'restock' | 'po' | 'sunsky';
  item_id?: string;
  po_id?: string;
  po_number?: string;
  sku: string;
  model_number?: string;
  title: string;
  quantity: number;
  status: string;
  supplier_order_number?: string;
  sunsky_order_number?: string;
  sunsky_item_status?: string;
  tracking_number?: string;
  expected_ship_date?: string;
  status_last_updated_at?: string;
  created_at: string;
}

export const useProcurementUnified = () => {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const {
    data: unifiedItems = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['procurement-unified', selectedCountry],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching unified procurement items for country:', selectedCountry);

      const { data, error } = await supabase.rpc('get_procurement_unified_items', {
        country_filter: selectedCountry || null
      });

      if (error) {
        console.error('❌ Error fetching unified items:', error);
        throw error;
      }

      console.log('📊 Unified items result:', (data as any)?.length || 0, 'items');
      return ((data || []) as any) as UnifiedProcurementItem[];
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Update item status (for inventory items marked as ordered)
  const updateRestockStatus = useCallback(async (itemId: string, inventoryType: 'asin' | 'sku', status: string) => {
    try {
      const tableName = inventoryType === 'asin' ? 'asin_inventory' : 'sku_inventory';
      
      const { error } = await supabase
        .from(tableName)
        .update({ status } as any)
        .eq('id' as any, itemId as any);

      if (error) throw error;

      await refetch();
      toast({
        title: "Success",
        description: `Item status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating restock status:', error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive"
      });
    }
  }, [refetch, toast]);

  // Update PO order status
  const updatePOStatus = useCallback(async (poId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ 
          status,
          order_date: status === 'ordered' ? new Date().toISOString() : undefined
        } as any)
        .eq('id' as any, poId as any);

      if (error) throw error;

      await refetch();
      toast({
        title: "Success",
        description: `PO status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast({
        title: "Error",
        description: "Failed to update PO status",
        variant: "destructive"
      });
    }
  }, [refetch, toast]);

  // Get summary metrics
  const metrics = {
    total: unifiedItems.length,
    restockItems: unifiedItems.filter(item => item.source === 'restock').length,
    poItems: unifiedItems.filter(item => item.source === 'po').length,
    sunskyItems: unifiedItems.filter(item => item.source === 'sunsky').length,
    pendingOrders: unifiedItems.filter(item => 
      item.source === 'po' && item.status === 'pending'
    ).length,
    orderedItems: unifiedItems.filter(item => 
      ['ordered', 'shipped'].includes(item.status)
    ).length,
    deliveredItems: unifiedItems.filter(item => 
      item.status === 'delivered'
    ).length
  };

  return {
    unifiedItems,
    isLoading,
    error,
    refetch,
    updateRestockStatus,
    updatePOStatus,
    metrics
  };
};
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface POMetrics {
  totalActiveOrders: number;
  totalActiveQuantity: number;
  uniquePONumbers: number;
  pendingOrders: number;
  orderedOrders: number;
  shippedOrders: number;
}

export interface POTotals {
  totalRecords: number;
  totalQuantity: number;
  activeRecords: number;
  activeQuantity: number;
  deliveredRecords: number;
  deliveredQuantity: number;
}

export const usePOMetrics = () => {
  const [metrics, setMetrics] = useState<POMetrics>({
    totalActiveOrders: 0,
    totalActiveQuantity: 0,
    uniquePONumbers: 0,
    pendingOrders: 0,
    orderedOrders: 0,
    shippedOrders: 0,
  });
  const [totals, setTotals] = useState<POTotals>({
    totalRecords: 0,
    totalQuantity: 0,
    activeRecords: 0,
    activeQuantity: 0,
    deliveredRecords: 0,
    deliveredQuantity: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMetrics = useCallback(async (useRawData = true) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching PO metrics from database function...');

      // Use raw or deduplicated metrics based on flag
      const functionName = useRawData ? 'get_active_po_metrics_raw' : 'get_active_po_metrics';
      const { data: metricsData, error } = await supabase.rpc(
        functionName,
        { user_id_param: user.id }
      );

      if (error) throw error;

      if (metricsData && metricsData.length > 0) {
        const result = metricsData[0];
        const newMetrics: POMetrics = {
          totalActiveOrders: Number(result.total_active_orders) || 0,
          totalActiveQuantity: Number(result.total_active_quantity) || 0,
          uniquePONumbers: Number(result.unique_po_numbers) || 0,
          pendingOrders: Number(result.pending_orders) || 0,
          orderedOrders: Number(result.ordered_orders) || 0,
          shippedOrders: Number(result.shipped_orders) || 0,
        };

        console.log(`✅ ${useRawData ? 'RAW' : 'DEDUPLICATED'} METRICS FROM DATABASE:`);
        console.log(`📦 Active Orders: ${newMetrics.totalActiveOrders}`);
        console.log(`📋 Active Quantity: ${newMetrics.totalActiveQuantity}`);
        console.log(`📄 Unique PO Numbers: ${newMetrics.uniquePONumbers}`);
        console.log(`⏳ Pending: ${newMetrics.pendingOrders}`);
        console.log(`📋 Ordered: ${newMetrics.orderedOrders}`);
        console.log(`🚚 Shipped: ${newMetrics.shippedOrders}`);

        setMetrics(newMetrics);
      }
    } catch (error) {
      console.error('Error fetching PO metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO metrics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchTotals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching PO totals...');

      const { data: totalsData, error } = await supabase.rpc(
        'get_po_totals_raw',
        { user_id_param: user.id }
      );

      if (error) throw error;

      if (totalsData && totalsData.length > 0) {
        const result = totalsData[0];
        const newTotals: POTotals = {
          totalRecords: Number(result.total_records) || 0,
          totalQuantity: Number(result.total_quantity) || 0,
          activeRecords: Number(result.active_records) || 0,
          activeQuantity: Number(result.active_quantity) || 0,
          deliveredRecords: Number(result.delivered_records) || 0,
          deliveredQuantity: Number(result.delivered_quantity) || 0,
        };

        console.log('📊 PO DATABASE TOTALS:');
        console.log(`Total Records: ${newTotals.totalRecords}, Total Quantity: ${newTotals.totalQuantity}`);
        console.log(`Active: ${newTotals.activeRecords} records, ${newTotals.activeQuantity} quantity`);
        console.log(`Delivered: ${newTotals.deliveredRecords} records, ${newTotals.deliveredQuantity} quantity`);

        setTotals(newTotals);
      }
    } catch (error) {
      console.error('Error fetching PO totals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO totals",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    metrics,
    totals,
    isLoading,
    fetchMetrics,
    fetchTotals
  };
};
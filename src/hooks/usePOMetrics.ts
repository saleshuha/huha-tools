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

export interface POReconciliation {
  totalRawRecords: number;
  totalRawQuantity: number;
  totalDeduplicatedRecords: number;
  totalDeduplicatedQuantity: number;
  duplicateRecords: number;
  quantityDifference: number;
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
  const [reconciliation, setReconciliation] = useState<POReconciliation>({
    totalRawRecords: 0,
    totalRawQuantity: 0,
    totalDeduplicatedRecords: 0,
    totalDeduplicatedQuantity: 0,
    duplicateRecords: 0,
    quantityDifference: 0,
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

  const fetchReconciliation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching PO reconciliation data...');

      const { data: reconciliationData, error } = await supabase.rpc(
        'get_po_reconciliation_summary',
        { user_id_param: user.id }
      );

      if (error) throw error;

      if (reconciliationData && reconciliationData.length > 0) {
        const result = reconciliationData[0];
        const newReconciliation: POReconciliation = {
          totalRawRecords: Number(result.total_raw_records) || 0,
          totalRawQuantity: Number(result.total_raw_quantity) || 0,
          totalDeduplicatedRecords: Number(result.total_deduplicated_records) || 0,
          totalDeduplicatedQuantity: Number(result.total_deduplicated_quantity) || 0,
          duplicateRecords: Number(result.duplicate_records) || 0,
          quantityDifference: Number(result.quantity_difference) || 0,
        };

        console.log('📊 RECONCILIATION DATA:');
        console.log(`Raw Records: ${newReconciliation.totalRawRecords}, Raw Quantity: ${newReconciliation.totalRawQuantity}`);
        console.log(`Dedup Records: ${newReconciliation.totalDeduplicatedRecords}, Dedup Quantity: ${newReconciliation.totalDeduplicatedQuantity}`);
        console.log(`Duplicates: ${newReconciliation.duplicateRecords}, Qty Difference: ${newReconciliation.quantityDifference}`);

        setReconciliation(newReconciliation);
      }
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reconciliation data",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    metrics,
    reconciliation,
    isLoading,
    fetchMetrics,
    fetchReconciliation
  };
};
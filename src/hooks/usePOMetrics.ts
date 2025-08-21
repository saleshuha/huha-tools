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

export const usePOMetrics = () => {
  const [metrics, setMetrics] = useState<POMetrics>({
    totalActiveOrders: 0,
    totalActiveQuantity: 0,
    uniquePONumbers: 0,
    pendingOrders: 0,
    orderedOrders: 0,
    shippedOrders: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching accurate PO metrics from database function...');

      // Use the new database function for accurate metrics
      const { data: metricsData, error } = await supabase.rpc(
        'get_active_po_metrics',
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

        console.log('✅ ACCURATE METRICS FROM DATABASE:');
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

  return {
    metrics,
    isLoading,
    fetchMetrics
  };
};
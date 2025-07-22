import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RestockItem {
  table_name: string;
  item_id: string;
  identifier: string;
  current_quantity: number;
  days_since_last_restock: number | null;
}

export interface SalesAnalytics {
  period: string;
  items_sold: number;
  items_restocked: number;
  avg_sell_rate_per_day: number;
  critical_items: number;
  predicted_stockout_days: number;
}

export interface InventoryMetrics {
  salesTracking: {
    [key: string]: number; // '1d', '3d', '7d', etc.
  };
  restockTracking: {
    [key: string]: number;
  };
  forecasting: {
    avgLeadTime: number;
    recommendedReorderLevel: number;
    totalActiveItems: number;
    criticalStockItems: number;
  };
}

export function useInventoryAnalytics() {
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics>({
    salesTracking: {},
    restockTracking: {},
    forecasting: {
      avgLeadTime: 0,
      recommendedReorderLevel: 0,
      totalActiveItems: 0,
      criticalStockItems: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate sales/restock tracking for different periods
  const calculateInventoryMetrics = async (country?: string) => {
    try {
      const periods = [1, 3, 7, 15, 30, 45, 60, 90];
      const salesTracking: { [key: string]: number } = {};
      const restockTracking: { [key: string]: number } = {};

      // Get current date
      const now = new Date();

      for (const days of periods) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Query ASIN inventory for sold items
        let asinQuery = supabase
          .from('asin_inventory')
          .select('id')
          .eq('status', 'sold')
          .gte('date_sold', startDate.toISOString());

        if (country) {
          asinQuery = asinQuery.eq('country', country);
        }

        const { data: asinSold } = await asinQuery;

        // Query SKU inventory for sold items
        let skuQuery = supabase
          .from('sku_inventory')
          .select('id')
          .eq('status', 'sold')
          .gte('date_sold', startDate.toISOString());

        if (country) {
          skuQuery = skuQuery.eq('country', country);
        }

        const { data: skuSold } = await skuQuery;

        // Query ASIN inventory for restocked items
        let asinRestockQuery = supabase
          .from('asin_inventory')
          .select('restock_quantity')
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        if (country) {
          asinRestockQuery = asinRestockQuery.eq('country', country);
        }

        const { data: asinRestocked } = await asinRestockQuery;

        // Query SKU inventory for restocked items
        let skuRestockQuery = supabase
          .from('sku_inventory')
          .select('restock_quantity')
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        if (country) {
          skuRestockQuery = skuRestockQuery.eq('country', country);
        }

        const { data: skuRestocked } = await skuRestockQuery;

        // Calculate totals
        const totalSold = (asinSold?.length || 0) + (skuSold?.length || 0);
        const totalRestocked = (asinRestocked?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0) +
                              (skuRestocked?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0);

        salesTracking[`${days}d`] = totalSold;
        restockTracking[`${days}d`] = totalRestocked;
      }

      // Calculate forecasting metrics
      let totalItemsQuery = supabase
        .from('asin_inventory')
        .select('id, quantity')
        .eq('status', 'in-stock');

      let totalSkuQuery = supabase
        .from('sku_inventory')
        .select('id, quantity')
        .eq('status', 'in-stock');

      if (country) {
        totalItemsQuery = totalItemsQuery.eq('country', country);
        totalSkuQuery = totalSkuQuery.eq('country', country);
      }

      const [{ data: asinItems }, { data: skuItems }] = await Promise.all([
        totalItemsQuery,
        totalSkuQuery
      ]);

      const totalActiveItems = (asinItems?.length || 0) + (skuItems?.length || 0);
      const criticalStockItems = (asinItems?.filter(item => item.quantity <= 1).length || 0) + 
                                (skuItems?.filter(item => item.quantity <= 1).length || 0);

      setInventoryMetrics({
        salesTracking,
        restockTracking,
        forecasting: {
          avgLeadTime: 14, // Default lead time
          recommendedReorderLevel: Math.ceil(salesTracking['30d'] / 30 * 14), // 14 days of stock
          totalActiveItems,
          criticalStockItems
        }
      });

    } catch (error: any) {
      toast({
        title: "Error calculating metrics",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load all analytics data for specific country
  const loadAnalytics = async (country?: string) => {
    try {
      setLoading(true);
      await calculateInventoryMetrics(country);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    restockItems,
    inventoryMetrics,
    loading,
    loadAnalytics,
  };
}
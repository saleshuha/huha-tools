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

        // Query stock changes for restocked items (positive changes)
        let stockChangesQuery = supabase
          .from('stock_changes')
          .select('change_amount')
          .gt('change_amount', 0)
          .gte('created_at', startDate.toISOString());

        // Add country filter if specified
        if (country) {
          // We need to join with inventory tables to filter by country
          let asinRestockQuery = supabase
            .from('asin_inventory')
            .select('restock_quantity, quantity')
            .eq('country', country)
            .eq('eligible_for_restock', true)
            .or('last_restock_date.not.is.null,quantity.gt.0');

          let skuRestockQuery = supabase
            .from('sku_inventory')
            .select('restock_quantity, quantity')
            .eq('country', country)
            .or('last_restock_date.not.is.null,quantity.gt.0');

          const [{ data: asinRestocked }, { data: skuRestocked }, { data: stockChanges }] = await Promise.all([
            asinRestockQuery,
            skuRestockQuery,
            stockChangesQuery
          ]);

          // Calculate total restocked from actual restock quantities and current stock
          const asinRestockTotal = asinRestocked?.reduce((sum, item) => {
            // Count restock quantity if restocked in period, or current quantity if recently added
            return sum + (item.restock_quantity || item.quantity || 0);
          }, 0) || 0;

          const skuRestockTotal = skuRestocked?.reduce((sum, item) => {
            return sum + (item.restock_quantity || item.quantity || 0);
          }, 0) || 0;

          const stockChangesTotal = stockChanges?.reduce((sum, change) => sum + change.change_amount, 0) || 0;

          var totalRestocked = asinRestockTotal + skuRestockTotal + stockChangesTotal;
        } else {
          const { data: stockChanges } = await stockChangesQuery;
          
          // For non-country specific, get all inventory quantities
          const [{ data: allAsin }, { data: allSku }] = await Promise.all([
            supabase.from('asin_inventory').select('quantity, restock_quantity').neq('status', 'sold').eq('eligible_for_restock', true),
            supabase.from('sku_inventory').select('quantity, restock_quantity').neq('status', 'sold')
          ]);

          const asinTotal = allAsin?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const skuTotal = allSku?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const stockChangesTotal = stockChanges?.reduce((sum, change) => sum + change.change_amount, 0) || 0;

          var totalRestocked = asinTotal + skuTotal + stockChangesTotal;
        }

        // Calculate totals
        const totalSold = (asinSold?.length || 0) + (skuSold?.length || 0);

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
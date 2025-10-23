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
  // Dashboard aggregate fields
  totalActiveAsins: number;
  totalActiveSkus: number;
  inStockItems: number;
  outOfStockItems: number;
  totalAsinQuantity: number;
  totalSkuQuantity: number;
  soldAsin30Days: number;
  soldSku30Days: number;
  missingSkuCount: number;
  missingTitleCount: number;
  missingImageCount: number;
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
    },
    totalActiveAsins: 0,
    totalActiveSkus: 0,
    inStockItems: 0,
    outOfStockItems: 0,
    totalAsinQuantity: 0,
    totalSkuQuantity: 0,
    soldAsin30Days: 0,
    soldSku30Days: 0,
    missingSkuCount: 0,
    missingTitleCount: 0,
    missingImageCount: 0
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

        // Query ASIN inventory for sold items (eligible for restock only)
        let asinQuery = supabase
          .from('asin_inventory')
          .select('id')
          .eq('status', 'sold')
          .eq('eligible_for_restock', true)
          .gte('date_sold', startDate.toISOString());

        if (country) {
          asinQuery = asinQuery.eq('country', country);
        }

        const { data: asinSold } = await asinQuery;

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

          const [{ data: asinRestocked }, { data: stockChanges }] = await Promise.all([
            asinRestockQuery,
            stockChangesQuery
          ]);

          // Calculate total restocked from actual restock quantities and current stock
          const asinRestockTotal = (asinRestocked as any)?.reduce((sum: number, item: any) => {
            // Count restock quantity if restocked in period, or current quantity if recently added
            return sum + (item.restock_quantity || item.quantity || 0);
          }, 0) || 0;

          const stockChangesTotal = (stockChanges as any)?.reduce((sum: number, change: any) => sum + change.change_amount, 0) || 0;

          var totalRestocked = asinRestockTotal + stockChangesTotal;
        } else {
          const { data: stockChanges } = await stockChangesQuery;
          
          // For non-country specific, get all ASIN inventory quantities only
          const [{ data: allAsin }] = await Promise.all([
            supabase.from('asin_inventory').select('quantity, restock_quantity').neq('status', 'sold').eq('eligible_for_restock', true).limit(100000)
          ]);

          const asinTotal = (allAsin as any)?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
          const stockChangesTotal = (stockChanges as any)?.reduce((sum: number, change: any) => sum + change.change_amount, 0) || 0;

          var totalRestocked = asinTotal + stockChangesTotal;
        }

        // Calculate totals (only ASIN inventory now)
        const totalSold = asinSold?.length || 0;

        salesTracking[`${days}d`] = totalSold;
        restockTracking[`${days}d`] = totalRestocked;
      }

      // Calculate forecasting metrics for ASIN inventory only
      let totalItemsQuery = supabase
        .from('asin_inventory')
        .select('id, quantity')
        .eq('status', 'in-stock')
        .eq('eligible_for_restock', true);

      if (country) {
        totalItemsQuery = totalItemsQuery.eq('country', country);
      }

      const [{ data: asinItems }] = await Promise.all([
        totalItemsQuery
      ]);

      const totalActiveItems = asinItems?.length || 0;
      const criticalStockItems = (asinItems as any)?.filter((item: any) => item.quantity <= 1).length || 0;

      // Calculate aggregate dashboard metrics
      let asinCountQuery = supabase
        .from('asin_inventory')
        .select('id, quantity, sku, title', { count: 'exact' })
        .neq('status', 'sold');
      
      let skuCountQuery = supabase
        .from('sku_inventory')
        .select('id, quantity', { count: 'exact' });

      if (country) {
        asinCountQuery = asinCountQuery.eq('country', country);
        skuCountQuery = skuCountQuery.eq('country', country);
      }

      const [
        { data: allAsins, count: totalAsins },
        { data: allSkus, count: totalSkus },
        { data: inStockAsins },
        { data: outOfStockAsins },
        { data: missingSkuAsins },
        { data: missingTitleAsins }
      ] = await Promise.all([
        asinCountQuery,
        skuCountQuery,
        supabase.from('asin_inventory').select('id').eq('status', 'in-stock').eq('country', country || ''),
        supabase.from('asin_inventory').select('id').or('quantity.eq.0,quantity.is.null').neq('status', 'sold').eq('country', country || ''),
        supabase.from('asin_inventory').select('id').or('sku.is.null,sku.eq.').eq('country', country || ''),
        supabase.from('asin_inventory').select('id').or('title.is.null,title.eq.').eq('country', country || '')
      ]);

      // Calculate total quantities
      const totalAsinQuantity = (allAsins as any)?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      const totalSkuQuantity = (allSkus as any)?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

      // Count missing images (ASINs without images in product_images table)
      const { data: asinIds } = await supabase
        .from('asin_inventory')
        .select('id')
        .eq('country', country || '');
      
      const asinIdsArray = (asinIds as any)?.map((a: any) => a.id) || [];
      
      let missingImageCount = 0;
      if (asinIdsArray.length > 0) {
        const { data: imagesData } = await supabase
          .from('product_images')
          .select('asin_id')
          .in('asin_id', asinIdsArray);
        
        const asinIdsWithImages = new Set((imagesData as any)?.map((img: any) => img.asin_id) || []);
        missingImageCount = asinIdsArray.filter((id: string) => !asinIdsWithImages.has(id)).length;
      }

      setInventoryMetrics({
        salesTracking,
        restockTracking,
        forecasting: {
          avgLeadTime: 14, // Default lead time
          recommendedReorderLevel: Math.ceil(salesTracking['30d'] / 30 * 14), // 14 days of stock
          totalActiveItems,
          criticalStockItems
        },
        totalActiveAsins: totalAsins || 0,
        totalActiveSkus: totalSkus || 0,
        inStockItems: inStockAsins?.length || 0,
        outOfStockItems: outOfStockAsins?.length || 0,
        totalAsinQuantity,
        totalSkuQuantity,
        soldAsin30Days: salesTracking['30d'] || 0,
        soldSku30Days: 0, // TODO: Implement SKU sold tracking if needed
        missingSkuCount: missingSkuAsins?.length || 0,
        missingTitleCount: missingTitleAsins?.length || 0,
        missingImageCount
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
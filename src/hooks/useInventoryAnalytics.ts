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
  product_type: string;
  total_sold: number;
  avg_days_to_sell: number;
  fastest_selling_item: string;
  slowest_selling_item: string;
  restock_frequency_days: number;
  predicted_restock_needed_items: any;
}

export function useInventoryAnalytics() {
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load items needing restock
  const loadRestockItems = async () => {
    try {
      const { data, error } = await supabase.rpc('get_items_needing_restock');
      
      if (error) throw error;
      
      setRestockItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading restock data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load sales analytics
  const loadSalesAnalytics = async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data, error } = await supabase.rpc('get_sales_analytics', params);
      
      if (error) throw error;
      
      setSalesAnalytics(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading sales analytics",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load all analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRestockItems(),
        loadSalesAnalytics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Get AI insights based on analytics
  const getAIInsights = () => {
    const insights = [];

    // Restock insights
    if (restockItems.length > 0) {
      const criticalItems = restockItems.filter(item => item.current_quantity <= 1);
      if (criticalItems.length > 0) {
        insights.push({
          type: 'critical',
          title: 'Critical Stock Alert',
          message: `${criticalItems.length} items are critically low (≤1 unit)`,
          action: 'Immediate restock required'
        });
      }

      const lowStockItems = restockItems.filter(item => item.current_quantity > 1);
      if (lowStockItems.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Low Stock Warning',
          message: `${lowStockItems.length} items below minimum stock level`,
          action: 'Plan restock within 3-5 days'
        });
      }
    }

    // Sales analytics insights
    salesAnalytics.forEach(analytics => {
      if (analytics.total_sold > 0) {
        insights.push({
          type: 'info',
          title: `${analytics.product_type} Performance`,
          message: `${analytics.total_sold} items sold, avg ${Math.round(analytics.avg_days_to_sell)} days to sell`,
          action: analytics.fastest_selling_item !== 'N/A' 
            ? `Best performer: ${analytics.fastest_selling_item}` 
            : 'Continue monitoring'
        });
      }

      if (analytics.predicted_restock_needed_items?.length > 0) {
        insights.push({
          type: 'prediction',
          title: `AI Prediction: ${analytics.product_type}`,
          message: `${analytics.predicted_restock_needed_items.length} items may need restock soon`,
          action: 'Review predicted items and prepare restock plan'
        });
      }
    });

    return insights;
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    restockItems,
    salesAnalytics,
    loading,
    loadAnalytics,
    loadRestockItems,
    loadSalesAnalytics,
    getAIInsights,
  };
}
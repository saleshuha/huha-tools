import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface VelocityItem {
  table_name: string;
  item_id: string;
  identifier: string;
  current_quantity: number;
  total_sales: number;
  days_since_last_sale: number;
  days_since_last_restock: number;
  average_days_between_sales: number;
  sales_velocity: number;
  velocity_category: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales';
  recommended_reorder_quantity: number;
  reorder_point: number;
  stock_days_remaining: number | null;
  urgency_score: number;
}

export interface VelocityMetrics {
  fastMovingItems: number;
  mediumMovingItems: number;
  slowMovingItems: number;
  noSalesItems: number;
  avgVelocity: number;
  totalUrgentItems: number;
  avgStockDays: number;
  topPerformers: VelocityItem[];
  criticalItems: VelocityItem[];
}

export function useVelocityAnalytics() {
  const [velocityItems, setVelocityItems] = useState<VelocityItem[]>([]);
  const [velocityMetrics, setVelocityMetrics] = useState<VelocityMetrics>({
    fastMovingItems: 0,
    mediumMovingItems: 0,
    slowMovingItems: 0,
    noSalesItems: 0,
    avgVelocity: 0,
    totalUrgentItems: 0,
    avgStockDays: 0,
    topPerformers: [],
    criticalItems: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadVelocityAnalysis = async (country?: string, lookbackDays: number = 90) => {
    try {
      setLoading(true);
      
      // Call the database function for velocity analysis
      const { data, error } = await supabase.rpc('get_inventory_velocity_analysis', {
        country_filter: country || selectedCountry,
        lookback_days: lookbackDays
      });

      if (error) {
        throw error;
      }

      const items = (data || []) as VelocityItem[];
      setVelocityItems(items);

      // Calculate metrics
      const fastMoving = items.filter(item => item.velocity_category === 'Fast Moving').length;
      const mediumMoving = items.filter(item => item.velocity_category === 'Medium Moving').length;
      const slowMoving = items.filter(item => item.velocity_category === 'Slow Moving').length;
      const noSales = items.filter(item => item.velocity_category === 'No Sales').length;
      const urgentItems = items.filter(item => item.urgency_score >= 70).length;
      
      const avgVelocity = items.length > 0 
        ? items.reduce((sum, item) => sum + item.sales_velocity, 0) / items.length 
        : 0;
      
      const itemsWithStockDays = items.filter(item => item.stock_days_remaining !== null);
      const avgStockDays = itemsWithStockDays.length > 0
        ? itemsWithStockDays.reduce((sum, item) => sum + (item.stock_days_remaining || 0), 0) / itemsWithStockDays.length
        : 0;

      const topPerformers = items
        .filter(item => item.sales_velocity > 0)
        .sort((a, b) => b.sales_velocity - a.sales_velocity)
        .slice(0, 10);

      const criticalItems = items
        .filter(item => item.urgency_score >= 90)
        .sort((a, b) => b.urgency_score - a.urgency_score);

      setVelocityMetrics({
        fastMovingItems: fastMoving,
        mediumMovingItems: mediumMoving,
        slowMovingItems: slowMoving,
        noSalesItems: noSales,
        avgVelocity,
        totalUrgentItems: urgentItems,
        avgStockDays,
        topPerformers,
        criticalItems
      });

    } catch (error: any) {
      console.error('Error loading velocity analysis:', error);
      toast({
        title: "Error loading velocity analysis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedOrderQuantity = (item: VelocityItem): number => {
    return item.recommended_reorder_quantity;
  };

  const shouldReorder = (item: VelocityItem): boolean => {
    return item.current_quantity <= item.reorder_point;
  };

  const getUrgencyColor = (score: number): "default" | "destructive" | "secondary" | "outline" => {
    if (score >= 90) return 'destructive';
    if (score >= 70) return 'secondary';
    if (score >= 50) return 'default';
    return 'outline';
  };

  const getVelocityColor = (category: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (category) {
      case 'Fast Moving': return 'default';
      case 'Medium Moving': return 'secondary';
      case 'Slow Moving': return 'outline';
      case 'No Sales': return 'destructive';
      default: return 'outline';
    }
  };

  useEffect(() => {
    loadVelocityAnalysis();
  }, [selectedCountry]);

  return {
    velocityItems,
    velocityMetrics,
    loading,
    loadVelocityAnalysis,
    getRecommendedOrderQuantity,
    shouldReorder,
    getUrgencyColor,
    getVelocityColor
  };
}
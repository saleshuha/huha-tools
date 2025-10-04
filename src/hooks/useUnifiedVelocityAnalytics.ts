import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface UnifiedVelocityItem {
  table_name: string;
  item_id: string;
  identifier: string;
  asin: string;
  sku: string;
  title: string;
  current_quantity: number;
  total_sales: number;
  days_since_last_sale: number;
  days_since_last_restock: number;
  average_days_between_sales: number;
  sales_velocity: number;
  velocity_30d: number;
  velocity_60d: number;
  velocity_90d: number;
  velocity_category: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales';
  velocity_trend: 'trending_up' | 'stable' | 'trending_down';
  recommended_reorder_quantity: number;
  safety_stock: number;
  reorder_point: number;
  stock_days_remaining: number | null;
  days_until_stockout: number | null;
  urgency_score: number;
  recommendation_confidence: number;
  quarterly_q1_sold: number;
  quarterly_q1_added: number;
  quarterly_q2_sold: number;
  quarterly_q2_added: number;
  quarterly_q3_sold: number;
  quarterly_q3_added: number;
  quarterly_q4_sold: number;
  quarterly_q4_added: number;
}

export interface VelocityMetrics {
  totalItems: number;
  fastMovingItems: number;
  mediumMovingItems: number;
  slowMovingItems: number;
  noSalesItems: number;
  avgVelocity: number;
  totalUrgentItems: number;
  avgStockDays: number;
  avgConfidence: number;
  trendingUpItems: number;
  trendingDownItems: number;
  stableItems: number;
  criticalStockItems: number;
  totalRecommendedValue: number;
}

export function useUnifiedVelocityAnalytics() {
  const [velocityItems, setVelocityItems] = useState<UnifiedVelocityItem[]>([]);
  const [velocityMetrics, setVelocityMetrics] = useState<VelocityMetrics>({
    totalItems: 0,
    fastMovingItems: 0,
    mediumMovingItems: 0,
    slowMovingItems: 0,
    noSalesItems: 0,
    avgVelocity: 0,
    totalUrgentItems: 0,
    avgStockDays: 0,
    avgConfidence: 0,
    trendingUpItems: 0,
    trendingDownItems: 0,
    stableItems: 0,
    criticalStockItems: 0,
    totalRecommendedValue: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadVelocityAnalysis = async (country?: string, lookbackDays: number = 90) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_unified_velocity_analysis', {
        country_filter: country || selectedCountry,
        lookback_days: lookbackDays
      });

      if (error) {
        throw error;
      }

      const items = (data || []) as UnifiedVelocityItem[];
      setVelocityItems(items);

      // Calculate comprehensive metrics
      const fastMoving = items.filter(item => item.velocity_category === 'Fast Moving').length;
      const mediumMoving = items.filter(item => item.velocity_category === 'Medium Moving').length;
      const slowMoving = items.filter(item => item.velocity_category === 'Slow Moving').length;
      const noSales = items.filter(item => item.velocity_category === 'No Sales').length;
      const urgentItems = items.filter(item => item.urgency_score >= 70).length;
      const trendingUp = items.filter(item => item.velocity_trend === 'trending_up').length;
      const trendingDown = items.filter(item => item.velocity_trend === 'trending_down').length;
      const stable = items.filter(item => item.velocity_trend === 'stable').length;
      const criticalStock = items.filter(item => 
        item.days_until_stockout !== null && item.days_until_stockout <= 7
      ).length;
      
      const avgVelocity = items.length > 0 
        ? items.reduce((sum, item) => sum + item.sales_velocity, 0) / items.length 
        : 0;
      
      const itemsWithStockDays = items.filter(item => item.stock_days_remaining !== null);
      const avgStockDays = itemsWithStockDays.length > 0
        ? itemsWithStockDays.reduce((sum, item) => sum + (item.stock_days_remaining || 0), 0) / itemsWithStockDays.length
        : 0;

      const avgConfidence = items.length > 0
        ? items.reduce((sum, item) => sum + item.recommendation_confidence, 0) / items.length
        : 0;

      setVelocityMetrics({
        totalItems: items.length,
        fastMovingItems: fastMoving,
        mediumMovingItems: mediumMoving,
        slowMovingItems: slowMoving,
        noSalesItems: noSales,
        avgVelocity,
        totalUrgentItems: urgentItems,
        avgStockDays,
        avgConfidence,
        trendingUpItems: trendingUp,
        trendingDownItems: trendingDown,
        stableItems: stable,
        criticalStockItems: criticalStock,
        totalRecommendedValue: 0 // Will be calculated with cost data
      });

    } catch (error: any) {
      console.error('Error loading unified velocity analysis:', error);
      toast({
        title: "Error loading velocity analysis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveManualOverride = async (
    itemId: string,
    manualQuantity: number,
    systemRecommendation: number,
    reason?: string
  ) => {
    try {
      const item = velocityItems.find(i => i.item_id === itemId);
      if (!item) return;

      const { error } = await supabase.from('velocity_history').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        item_id: itemId,
        item_type: 'asin_inventory',
        system_recommendation: systemRecommendation,
        manual_override: manualQuantity,
        override_reason: reason,
        confidence_score: item.recommendation_confidence,
        velocity_at_time: item.sales_velocity
      });

      if (error) throw error;

      toast({
        title: "Manual override saved",
        description: "Your custom quantity has been recorded for future analysis.",
      });
    } catch (error: any) {
      console.error('Error saving manual override:', error);
      toast({
        title: "Error saving override",
        description: error.message,
        variant: "destructive",
      });
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
    saveManualOverride
  };
}

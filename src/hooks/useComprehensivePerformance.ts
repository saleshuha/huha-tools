import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';

export interface ComprehensivePerformanceItem {
  item_id: string;
  asin: string;
  sku: string | null;
  title: string | null;
  current_quantity: number;
  total_units_sold_lifetime: number;
  total_units_restocked: number;
  po_units_sold: number;
  b2b_units_sold: number;
  first_stock_date: string | null;
  last_sale_date: string | null;
  first_sale_date: string | null;
  days_in_inventory: number;
  avg_days_to_sellout: number;
  sales_velocity_7d: number;
  sales_velocity_30d: number;
  sales_velocity_90d: number;
  sales_velocity_lifetime: number;
  turnover_ratio: number;
  performance_score: number;
  performance_category: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'No Sales';
  stock_days_remaining: number | null;
}

export function useComprehensivePerformance() {
  const [performanceData, setPerformanceData] = useState<ComprehensivePerformanceItem[]>([]);
  const [performanceMap, setPerformanceMap] = useState<Map<string, ComprehensivePerformanceItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const { selectedCountry } = useCountry();

  const loadPerformanceData = useCallback(async (country?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_comprehensive_performance_analysis', {
        country_filter: country || selectedCountry
      });

      if (error) {
        console.error('Error loading comprehensive performance:', error);
        return;
      }

      const items = (data || []) as ComprehensivePerformanceItem[];
      setPerformanceData(items);
      
      // Create a map for quick lookup by item_id
      const map = new Map<string, ComprehensivePerformanceItem>();
      items.forEach(item => {
        map.set(item.item_id, item);
      });
      setPerformanceMap(map);

    } catch (error) {
      console.error('Error loading comprehensive performance:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  const getPerformanceForItem = useCallback((itemId: string): ComprehensivePerformanceItem | null => {
    return performanceMap.get(itemId) || null;
  }, [performanceMap]);

  const getPerformanceCategoryColor = (category: string): string => {
    switch (category) {
      case 'Excellent': return 'from-emerald-500 to-green-600';
      case 'Good': return 'from-blue-500 to-indigo-600';
      case 'Average': return 'from-amber-500 to-orange-600';
      case 'Poor': return 'from-red-400 to-red-500';
      case 'No Sales': return 'from-gray-400 to-gray-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getPerformanceScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  return {
    performanceData,
    performanceMap,
    loading,
    loadPerformanceData,
    getPerformanceForItem,
    getPerformanceCategoryColor,
    getPerformanceScoreColor
  };
}

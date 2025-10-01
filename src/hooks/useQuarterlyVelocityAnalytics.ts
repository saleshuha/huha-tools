import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface QuarterlyData {
  added: number;
  sold: number;
  net: number;
}

export interface VelocityAnalyticsItem {
  asin_id: string;
  asin: string;
  sku: string;
  title: string;
  serial_number: string;
  current_quantity: number;
  total_added: number;
  total_sold: number;
  first_added_date: string;
  quarterly_data: Record<string, QuarterlyData>;
  recommended_quantity: number;
  velocity_score: number;
  manual_override?: number;
  status?: string;
}

export function useQuarterlyVelocityAnalytics() {
  const [items, setItems] = useState<VelocityAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadAnalytics = async (lookbackYears: number = 2) => {
    try {
      setLoading(true);
      
      // Call the database function for quarterly analytics
      const { data, error } = await supabase.rpc('get_quarterly_velocity_analysis', {
        country_filter: selectedCountry,
        lookback_years: lookbackYears
      });

      if (error) throw error;

      // Fetch manual overrides
      const { data: overrides } = await supabase
        .from('velocity_quantity_overrides')
        .select('asin_id, recommended_quantity');

      const overridesMap = new Map(
        overrides?.map(o => [o.asin_id, o.recommended_quantity]) || []
      );

      // Merge overrides with analytics data
      const itemsWithOverrides = (data || []).map((item: any) => ({
        ...item,
        manual_override: overridesMap.get(item.asin_id)
      }));

      setItems(itemsWithOverrides);

    } catch (error: any) {
      console.error('Error loading quarterly velocity analytics:', error);
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveManualOverride = async (asinId: string, quantity: number, systemRecommendation: number) => {
    try {
      const { error } = await supabase
        .from('velocity_quantity_overrides')
        .upsert({
          asin_id: asinId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          recommended_quantity: quantity,
          system_recommendation: systemRecommendation
        }, {
          onConflict: 'user_id,asin_id'
        });

      if (error) throw error;

      // Update local state
      setItems(prev => prev.map(item => 
        item.asin_id === asinId 
          ? { ...item, manual_override: quantity }
          : item
      ));

      toast({
        title: "Quantity updated",
        description: "Manual override saved successfully",
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

  const clearManualOverride = async (asinId: string) => {
    try {
      const { error } = await supabase
        .from('velocity_quantity_overrides')
        .delete()
        .eq('asin_id', asinId);

      if (error) throw error;

      // Update local state
      setItems(prev => prev.map(item => 
        item.asin_id === asinId 
          ? { ...item, manual_override: undefined }
          : item
      ));

      toast({
        title: "Override cleared",
        description: "Using system recommendation",
      });
    } catch (error: any) {
      console.error('Error clearing override:', error);
      toast({
        title: "Error clearing override",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedCountry]);

  return {
    items,
    loading,
    loadAnalytics,
    saveManualOverride,
    clearManualOverride
  };
}

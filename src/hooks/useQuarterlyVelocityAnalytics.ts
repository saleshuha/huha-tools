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
  serial_number?: string;
  current_quantity: number;
  total_added: number;
  total_sold: number;
  first_added_date: string;
  quarterly_data: Record<string, QuarterlyData>;
  recommended_quantity: number;
  velocity_score: number;
  manual_override?: number;
  status?: string;
  export_mode?: 'global' | 'local';
  velocity_order_ref?: string;
  sunsky_order_number?: string;
  ordered_quantity?: number;
  ordered_at?: string;
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

      // Fetch export mode preferences
      const { data: exportModes } = await ((supabase as any)
        .from('export_mode_preferences')
        .select('item_id, export_mode')
        .eq('item_type', 'asin_inventory'));

      const overridesMap = new Map(
        ((overrides as any) || []).map((o: any) => [o.asin_id, o.recommended_quantity])
      );

      const exportModesMap = new Map(
        ((exportModes as any) || []).map((m: any) => [m.item_id, m.export_mode])
      );

      // Merge overrides and export modes with analytics data, filter to only global items
      const itemsWithOverrides = ((data || []) as any)
        .map((item: any) => ({
          ...item,
          manual_override: overridesMap.get(item.asin_id),
          export_mode: exportModesMap.get(item.asin_id) || 'global'
        }))
        .filter((item: any) => item.export_mode === 'global');

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

  const saveManualOverride = async (asinId: string, quantity: number, systemRecommendation: number, skipToast: boolean = false) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('velocity_quantity_overrides')
        .upsert({
          asin_id: asinId,
          user_id: user.id,
          recommended_quantity: quantity,
          system_recommendation: systemRecommendation
        } as any, {
          onConflict: 'user_id,asin_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Update local state
      setItems(prev => prev.map(item => 
        item.asin_id === asinId 
          ? { ...item, manual_override: quantity }
          : item
      ));

      if (!skipToast) {
        toast({
          title: "Quantity updated",
          description: "Manual override saved successfully",
        });
      }
    } catch (error: any) {
      console.error('Error saving manual override:', error);
      if (!skipToast) {
        toast({
          title: "Error saving override",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error; // Re-throw to handle in calling code
    }
  };

  const clearManualOverride = async (asinId: string) => {
    try {
      const { error } = await ((supabase as any)
        .from('velocity_quantity_overrides')
        .delete()
        .eq('asin_id', asinId));

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

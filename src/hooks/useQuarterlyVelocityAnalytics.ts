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
      
      // Parallelize all data fetching for better performance (~50% faster)
      const [velocityResult, overridesResult, exportModesResult, orderInfoResult, allOrderedItemsResult] = await Promise.all([
        supabase.rpc('get_quarterly_velocity_analysis', {
          country_filter: selectedCountry,
          lookback_years: lookbackYears
        }),
        supabase.from('velocity_quantity_overrides').select('asin_id, recommended_quantity'),
        ((supabase as any)
          .from('export_mode_preferences')
          .select('item_id, export_mode')
          .eq('item_type', 'asin_inventory')),
        // Fetch order-related fields from asin_inventory
        supabase.from('asin_inventory').select('id, velocity_order_ref, sunsky_order_number, ordered_quantity, ordered_at'),
        // Fetch ALL ordered items directly (bypassing velocity filters)
        supabase
          .from('asin_inventory')
          .select('id, asin, sku, title, serial_number, quantity, sunsky_order_number, ordered_quantity, ordered_at, velocity_order_ref, status')
          .not('sunsky_order_number', 'is', null)
          .eq('country', selectedCountry)
      ]);

      if (velocityResult.error) throw velocityResult.error;

      // Log any errors but don't block execution
      if (overridesResult.error) {
        console.error('Error loading manual overrides:', overridesResult.error);
      }
      if (exportModesResult.error) {
        console.error('Error loading export modes:', exportModesResult.error);
      }
      if (orderInfoResult.error) {
        console.error('Error loading order info:', orderInfoResult.error);
      }
      if (allOrderedItemsResult.error) {
        console.error('Error loading all ordered items:', allOrderedItemsResult.error);
      }

      // Create maps for quick lookup
      const overridesMap = new Map(
        ((overridesResult.data as any) || []).map((o: any) => [o.asin_id, o.recommended_quantity])
      );

      const exportModesMap = new Map(
        ((exportModesResult.data as any) || []).map((m: any) => [m.item_id, m.export_mode])
      );

      // Create map for order information by asin_id
      const orderInfoMap = new Map<string, {
        velocity_order_ref?: string;
        sunsky_order_number?: string;
        ordered_quantity?: number;
        ordered_at?: string;
      }>(
        ((orderInfoResult.data as any) || []).map((o: any) => [o.id, {
          velocity_order_ref: o.velocity_order_ref,
          sunsky_order_number: o.sunsky_order_number,
          ordered_quantity: o.ordered_quantity,
          ordered_at: o.ordered_at
        }])
      );

      // Merge all data with analytics data, filter to only global items
      const itemsWithOverrides = ((velocityResult.data || []) as any)
        .map((item: any) => {
          const orderInfo = orderInfoMap.get(item.asin_id) || {
            velocity_order_ref: undefined,
            sunsky_order_number: undefined,
            ordered_quantity: undefined,
            ordered_at: undefined
          };
          return {
            ...item,
            manual_override: overridesMap.get(item.asin_id),
            export_mode: exportModesMap.get(item.asin_id) || 'global',
            velocity_order_ref: orderInfo.velocity_order_ref,
            sunsky_order_number: orderInfo.sunsky_order_number,
            ordered_quantity: orderInfo.ordered_quantity,
            ordered_at: orderInfo.ordered_at
          };
        })
        .filter((item: any) => item.export_mode === 'global');

      // Get IDs of items already in velocity analysis
      const velocityItemIds = new Set(itemsWithOverrides.map((item: any) => item.asin_id));

      // Add ordered items that aren't in velocity analysis (directly ordered items)
      const additionalOrderedItems = ((allOrderedItemsResult.data || []) as any)
        .filter((orderedItem: any) => !velocityItemIds.has(orderedItem.id))
        .map((orderedItem: any) => ({
          asin_id: orderedItem.id,
          asin: orderedItem.asin,
          sku: orderedItem.sku || '',
          title: orderedItem.title || '',
          serial_number: orderedItem.serial_number || '',
          current_quantity: orderedItem.quantity || 0,
          total_added: 0,
          total_sold: 0,
          first_added_date: null,
          quarterly_data: {},
          recommended_quantity: 0,
          velocity_score: 0,
          manual_override: overridesMap.get(orderedItem.id),
          export_mode: exportModesMap.get(orderedItem.id) || 'global',
          status: orderedItem.status,
          velocity_order_ref: orderedItem.velocity_order_ref,
          sunsky_order_number: orderedItem.sunsky_order_number,
          ordered_quantity: orderedItem.ordered_quantity,
          ordered_at: orderedItem.ordered_at
        }));

      // Combine velocity items with additional ordered items
      const allItems = [...itemsWithOverrides, ...additionalOrderedItems];

      setItems(allItems);

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

  // Removed auto-load useEffect - let useDashboardMetrics orchestrate loading to prevent race conditions

  return {
    items,
    loading,
    loadAnalytics,
    saveManualOverride,
    clearManualOverride
  };
}

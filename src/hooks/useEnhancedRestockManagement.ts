import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface EnhancedRestockItem {
  table_name: string;
  item_id: string;
  identifier: string;
  current_quantity: number;
  status: string;
  last_restock_quantity: number;
  units_sold_since_restock: number;
  days_since_last_restock: number;
  recommended_order_quantity: number;
  replenishment_reason: string;
  sku: string;
  asin: string;
  urgency_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
}

export function useEnhancedRestockManagement() {
  const [items, setItems] = useState<EnhancedRestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadReplenishmentItems = async () => {
    try {
      setLoading(true);
      console.log('Loading replenishment items for country:', selectedCountry);

      const { data, error } = await supabase.rpc('get_items_needing_replenishment', {
        country_filter: selectedCountry,
        lookback_days: 30
      });

      if (error) {
        console.error('Error loading replenishment items:', error);
        throw error;
      }

      console.log('Loaded replenishment items:', data);
      setItems((data || []).map(item => ({
        ...item,
        urgency_level: item.urgency_level as 'Critical' | 'High' | 'Medium' | 'Low' | 'None'
      })));
    } catch (error: any) {
      console.error('Error in loadReplenishmentItems:', error);
      toast({
        title: "Error loading replenishment data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get items by urgency level
  const getCriticalItems = () => items.filter(item => item.urgency_level === 'Critical');
  const getHighPriorityItems = () => items.filter(item => item.urgency_level === 'High');
  const getMediumPriorityItems = () => items.filter(item => item.urgency_level === 'Medium');
  const getLowPriorityItems = () => items.filter(item => item.urgency_level === 'Low');

  // Get items by reason
  const getOutOfStockItems = () => items.filter(item => item.replenishment_reason === 'Out of Stock');
  const getReplenishmentItems = () => items.filter(item => item.replenishment_reason === 'Sold Units - Needs Replenishment');

  // Calculate total recommended order value (assuming we had cost data)
  const getTotalRecommendedQuantity = () => 
    items.reduce((sum, item) => sum + item.recommended_order_quantity, 0);

  // Prepare items for Sunsky ordering with the double quantity formula
  const prepareForSunskyOrder = (selectedItemIds: string[]) => {
    return items
      .filter(item => selectedItemIds.includes(item.item_id))
      .map(item => ({
        sku: item.sku,
        quantity: item.recommended_order_quantity, // Already calculated with 2x formula
        asin: item.asin,
        identifier: item.identifier,
        reason: item.replenishment_reason,
        current_stock: item.current_quantity,
        units_sold: item.units_sold_since_restock
      }));
  };

  // Mark items as ordered in the database
  const markItemsAsOrdered = async (itemIds: string[]) => {
    try {
      const { error } = await supabase
        .from('asin_inventory')
        .update({ 
          status: 'ordered',
          updated_at: new Date().toISOString()
        })
        .in('id', itemIds);

      if (error) throw error;

      toast({
        title: "Items marked as ordered",
        description: `${itemIds.length} items marked as ordered successfully`,
      });

      // Reload data
      await loadReplenishmentItems();
    } catch (error: any) {
      console.error('Error marking items as ordered:', error);
      toast({
        title: "Error updating items",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadReplenishmentItems();
  }, [selectedCountry]);

  return {
    items,
    loading,
    loadReplenishmentItems,
    getCriticalItems,
    getHighPriorityItems,
    getMediumPriorityItems,
    getLowPriorityItems,
    getOutOfStockItems,
    getReplenishmentItems,
    getTotalRecommendedQuantity,
    prepareForSunskyOrder,
    markItemsAsOrdered,
  };
}
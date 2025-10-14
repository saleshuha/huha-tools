import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface StockLifecycleEvent {
  id: string;
  event_type: 'addition' | 'sale' | 'order_placed' | 'restock' | 'adjustment';
  date: string;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  days_from_previous: number | null;
  event_details: {
    reason?: string;
    po_number?: string;
    order_id?: string;
    supplier?: string;
  };
}

export interface EnhancedStockMetrics {
  // Lifecycle metrics
  avg_days_to_first_sale: number;
  avg_days_from_sale_to_order: number;
  avg_days_from_order_to_restock: number;
  total_lifecycle_days: number;
  
  // Velocity metrics
  sales_velocity: number; // items per day
  restock_frequency: number; // days between restocks
  
  // Performance metrics
  stock_turnover_rate: number;
  optimal_stock_level: number;
  recommended_reorder_point: number;
  
  // Categories
  velocity_category: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'Dead Stock';
  performance_grade: 'A' | 'B' | 'C' | 'D';
  
  // Predictions
  predicted_stockout_date: string | null;
  recommended_order_quantity: number;
  next_restock_suggestion: string | null;
}

export interface InventoryItemAnalysis {
  id: string;
  identifier: string;
  table_name: 'asin_inventory' | 'sku_inventory';
  
  // Basic info
  current_quantity: number;
  date_added: string;
  status: string;
  
  // Lifecycle events
  lifecycle_events: StockLifecycleEvent[];
  
  // Metrics
  metrics: EnhancedStockMetrics;
  
  // Related data
  po_orders: any[];
  stock_changes: any[];
}

export function useEnhancedStockAnalytics() {
  const [asinAnalytics, setAsinAnalytics] = useState<InventoryItemAnalysis[]>([]);
  const [skuAnalytics, setSkuAnalytics] = useState<InventoryItemAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadItemAnalysis = async (itemId: string, inventoryType: 'asin' | 'sku') => {
    try {
      setLoading(true);
      
      const tableName = inventoryType === 'asin' ? 'asin_inventory' : 'sku_inventory';
      
      // Load basic item info
      const { data: itemData, error: itemError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      // Load stock changes
      const { data: stockChanges, error: stockError } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id', itemId)
        .eq('inventory_type', inventoryType)
        .order('created_at', { ascending: true });

      if (stockError) throw stockError;

      // Load related PO orders
      const poField = inventoryType === 'asin' ? 'asin' : 'sku_code';
      let itemIdentifier: string;
      
      if (inventoryType === 'asin') {
        itemIdentifier = (itemData as any).asin || (itemData as any).sku || '';
      } else {
        itemIdentifier = (itemData as any).sku_number || (itemData as any).bin_serial_number || '';
      }
      
      let poQuery = supabase
        .from('po_orders')
        .select('*')
        .eq(poField, itemIdentifier)
        .order('created_at', { ascending: true });

      const { data: poOrders } = await poQuery;

      // Build lifecycle timeline
      const lifecycleEvents = buildLifecycleTimeline(itemData, stockChanges || [], poOrders || []);
      
      // Calculate enhanced metrics
      const metrics = calculateEnhancedMetrics(lifecycleEvents, stockChanges || [], itemData);

      const analysis: InventoryItemAnalysis = {
        id: itemId,
        identifier: itemIdentifier,
        table_name: tableName as 'asin_inventory' | 'sku_inventory',
        current_quantity: (itemData as any).quantity,
        date_added: (itemData as any).date_added,
        status: (itemData as any).status,
        lifecycle_events: lifecycleEvents,
        metrics,
        po_orders: poOrders || [],
        stock_changes: stockChanges || []
      };

      return analysis;

    } catch (error: any) {
      console.error('Error loading item analysis:', error);
      toast({
        title: "Error loading analysis",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const buildLifecycleTimeline = (
    itemData: any, 
    stockChanges: any[], 
    poOrders: any[]
  ): StockLifecycleEvent[] => {
    const events: StockLifecycleEvent[] = [];
    let previousDate: Date | null = null;

    // 1. Initial addition
    const additionDate = new Date(itemData.date_added);
    events.push({
      id: `addition-${itemData.id}`,
      event_type: 'addition',
      date: itemData.date_added,
      quantity_before: 0,
      quantity_after: itemData.quantity,
      quantity_change: itemData.quantity,
      days_from_previous: null,
      event_details: { reason: 'Initial stock addition' }
    });
    previousDate = additionDate;

    // 2. Process stock changes (sales, adjustments, restocks)
    stockChanges.forEach((change, index) => {
      const changeDate = new Date(change.created_at);
      const daysFromPrevious = previousDate 
        ? Math.round((changeDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const eventType = change.change_amount < 0 ? 'sale' : 
                       change.change_reason?.toLowerCase().includes('restock') ? 'restock' : 'adjustment';

      events.push({
        id: change.id,
        event_type: eventType,
        date: change.created_at,
        quantity_before: change.previous_quantity,
        quantity_after: change.new_quantity,
        quantity_change: change.change_amount,
        days_from_previous: daysFromPrevious,
        event_details: { reason: change.change_reason }
      });
      previousDate = changeDate;
    });

    // 3. Add PO order events
    poOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const daysFromPrevious = previousDate 
        ? Math.round((orderDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      events.push({
        id: `po-${order.id}`,
        event_type: 'order_placed',
        date: order.created_at,
        quantity_before: 0, // Unknown for PO orders
        quantity_after: order.quantity,
        quantity_change: order.quantity,
        days_from_previous: daysFromPrevious,
        event_details: { 
          po_number: order.po_number,
          supplier: 'Sunsky',
          reason: `Purchase order for ${order.quantity} units`
        }
      });
    });

    // Sort all events by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateEnhancedMetrics = (
    events: StockLifecycleEvent[], 
    stockChanges: any[], 
    itemData: any
  ): EnhancedStockMetrics => {
    // Calculate lifecycle phases
    const saleEvents = events.filter(e => e.event_type === 'sale');
    const orderEvents = events.filter(e => e.event_type === 'order_placed');
    const restockEvents = events.filter(e => e.event_type === 'restock');

    // Calculate averages
    const daysToFirstSale = saleEvents.length > 0 ? 
      Math.round((new Date(saleEvents[0].date).getTime() - new Date(itemData.date_added).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const avgDaysSaleToOrder = calculateAverageDaysBetween(saleEvents, orderEvents);
    const avgDaysOrderToRestock = calculateAverageDaysBetween(orderEvents, restockEvents);

    // Sales velocity (items per day)
    const totalDaysActive = Math.round((new Date().getTime() - new Date(itemData.date_added).getTime()) / (1000 * 60 * 60 * 24));
    const totalItemsSold = saleEvents.reduce((sum, event) => sum + Math.abs(event.quantity_change), 0);
    const salesVelocity = totalDaysActive > 0 ? totalItemsSold / totalDaysActive : 0;

    // Restock frequency
    const restockFrequency = restockEvents.length > 1 ?
      totalDaysActive / restockEvents.length : 0;

    // Performance categorization
    const velocityCategory = categorizeVelocity(salesVelocity);
    const performanceGrade = calculatePerformanceGrade(salesVelocity, restockFrequency, stockChanges.length);

    // Predictions
    const currentRate = salesVelocity;
    const daysUntilStockout = currentRate > 0 ? itemData.quantity / currentRate : null;
    const predictedStockoutDate = daysUntilStockout ? 
      new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString() : null;

    return {
      avg_days_to_first_sale: daysToFirstSale,
      avg_days_from_sale_to_order: avgDaysSaleToOrder,
      avg_days_from_order_to_restock: avgDaysOrderToRestock,
      total_lifecycle_days: totalDaysActive,
      sales_velocity: salesVelocity,
      restock_frequency: restockFrequency,
      stock_turnover_rate: totalItemsSold / (itemData.quantity || 1),
      optimal_stock_level: Math.ceil(salesVelocity * 30), // 30 days worth
      recommended_reorder_point: Math.ceil(salesVelocity * 14), // 2 weeks worth
      velocity_category: velocityCategory,
      performance_grade: performanceGrade,
      predicted_stockout_date: predictedStockoutDate,
      recommended_order_quantity: Math.max(1, Math.ceil(salesVelocity * 21)), // 3 weeks worth
      next_restock_suggestion: daysUntilStockout && daysUntilStockout < 14 ? 
        `Restock recommended within ${Math.ceil(daysUntilStockout)} days` : null
    };
  };

  const calculateAverageDaysBetween = (fromEvents: StockLifecycleEvent[], toEvents: StockLifecycleEvent[]): number => {
    if (fromEvents.length === 0 || toEvents.length === 0) return 0;
    
    let totalDays = 0;
    let pairCount = 0;

    fromEvents.forEach(fromEvent => {
      const nextToEvent = toEvents.find(toEvent => 
        new Date(toEvent.date) > new Date(fromEvent.date)
      );
      
      if (nextToEvent) {
        const days = Math.round((new Date(nextToEvent.date).getTime() - new Date(fromEvent.date).getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
        pairCount++;
      }
    });

    return pairCount > 0 ? totalDays / pairCount : 0;
  };

  const categorizeVelocity = (velocity: number): 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'Dead Stock' => {
    if (velocity > 0.1) return 'Fast Moving';
    if (velocity > 0.05) return 'Medium Moving';
    if (velocity > 0) return 'Slow Moving';
    return 'Dead Stock';
  };

  const calculatePerformanceGrade = (velocity: number, restockFreq: number, changeCount: number): 'A' | 'B' | 'C' | 'D' => {
    const velocityScore = velocity > 0.1 ? 4 : velocity > 0.05 ? 3 : velocity > 0.01 ? 2 : 1;
    const activityScore = changeCount > 10 ? 4 : changeCount > 5 ? 3 : changeCount > 2 ? 2 : 1;
    const avgScore = (velocityScore + activityScore) / 2;
    
    if (avgScore >= 3.5) return 'A';
    if (avgScore >= 2.5) return 'B';
    if (avgScore >= 1.5) return 'C';
    return 'D';
  };

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load ASIN items
      let asinQuery = supabase
        .from('asin_inventory')
        .select('id')
        .eq('eligible_for_restock', true);
      
      if (selectedCountry) {
        asinQuery = asinQuery.eq('country', selectedCountry);
      }
      
      const { data: asinItems } = await asinQuery;
      
      // Load SKU items
      let skuQuery = supabase
        .from('sku_inventory')
        .select('id');
      
      if (selectedCountry) {
        skuQuery = skuQuery.eq('country', selectedCountry);
      }
      
      const { data: skuItems } = await skuQuery;

      // Process ASIN items (limit to first 20 for performance)
      const asinAnalytics = await Promise.all(
        ((asinItems as any)?.slice(0, 20) || []).map((item: any) => loadItemAnalysis(item.id, 'asin'))
      );

      // Process SKU items (limit to first 20 for performance)
      const skuAnalytics = await Promise.all(
        ((skuItems as any)?.slice(0, 20) || []).map((item: any) => loadItemAnalysis(item.id, 'sku'))
      );

      setAsinAnalytics(asinAnalytics.filter(Boolean) as InventoryItemAnalysis[]);
      setSkuAnalytics(skuAnalytics.filter(Boolean) as InventoryItemAnalysis[]);

    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedCountry]);

  return {
    asinAnalytics,
    skuAnalytics,
    loading,
    loadItemAnalysis,
    loadAllAnalytics
  };
}
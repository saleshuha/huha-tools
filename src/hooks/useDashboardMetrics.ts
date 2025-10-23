import { useState, useEffect } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from './useInventoryAnalytics';
import { useQuarterlyVelocityAnalytics } from './useQuarterlyVelocityAnalytics';
import { usePOMetrics } from './usePOMetrics';
import { useAmazonOrders } from './useAmazonOrders';
import { usePaymentTerms } from './usePaymentTerms';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardMetrics() {
  const { selectedCountry } = useCountry();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load all data sources
  const { inventoryMetrics, loading: inventoryLoading, loadAnalytics: reloadInventory } = useInventoryAnalytics();
  const { items: velocityItems, loading: velocityLoading, loadAnalytics: reloadVelocity } = useQuarterlyVelocityAnalytics();
  const { metrics: poMetrics, totals: poTotals, isLoading: poLoading, fetchMetrics: reloadPO, fetchTotals: reloadPOTotals } = usePOMetrics();
  const { metrics: fulfillmentMetrics, loading: fulfillmentLoading, refetch: reloadFulfillment } = useAmazonOrders();
  const { paymentTerms } = usePaymentTerms();

  const isLoading = inventoryLoading || velocityLoading || poLoading || fulfillmentLoading;

  // Load all data on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        reloadInventory(selectedCountry),
        reloadVelocity(2), // Load 2 years of velocity data
        reloadPO(),
        reloadPOTotals(),
        reloadFulfillment()
      ]);
      setLastUpdated(new Date());
    };
    
    initializeData();
  }, [selectedCountry]);

  // Process inventory metrics
  const inventoryData = inventoryMetrics ? {
    totalAsins: inventoryMetrics.totalActiveAsins || 0,
    totalSkus: inventoryMetrics.totalActiveSkus || 0,
    inStockCount: inventoryMetrics.inStockItems || 0,
    outOfStockCount: inventoryMetrics.outOfStockItems || 0,
    totalAsinUnits: inventoryMetrics.totalAsinQuantity || 0,
    totalSkuUnits: inventoryMetrics.totalSkuQuantity || 0,
    soldAsinUnits: inventoryMetrics.soldAsin30Days || 0,
    soldSkuUnits: inventoryMetrics.soldSku30Days || 0,
    missingSku: inventoryMetrics.missingSkuCount || 0,
    missingTitle: inventoryMetrics.missingTitleCount || 0,
    missingImage: inventoryMetrics.missingImageCount || 0,
  } : null;

  // Process velocity metrics
  const velocityData = velocityItems ? {
    fastMoving: velocityItems.filter(item => (item.velocity_score || 0) > 70).length,
    mediumMoving: velocityItems.filter(item => {
      const score = item.velocity_score || 0;
      return score >= 40 && score <= 70;
    }).length,
    slowMoving: velocityItems.filter(item => (item.velocity_score || 0) < 40 && (item.velocity_score || 0) > 0).length,
    noSales: velocityItems.filter(item => !item.velocity_score || item.velocity_score === 0).length,
    urgentRestocks: velocityItems
      .filter(item => (item.manual_override || item.recommended_quantity || 0) > 0)
      .sort((a, b) => (b.manual_override || b.recommended_quantity || 0) - (a.manual_override || a.recommended_quantity || 0))
      .slice(0, 10)
      .map(item => ({
        asin_id: item.asin_id,
        title: item.title || '',
        recommendation: item.manual_override || item.recommended_quantity || 0
      })),
    weekSales: velocityItems.reduce((sum, item) => sum + (item.total_sold || 0), 0),
    avgDailySales: velocityItems.reduce((sum, item) => sum + (item.total_sold || 0), 0) / 7,
  } : null;

  // Process PO metrics
  const [poTimeline, setPoTimeline] = useState({ thisWeek: 0, thisMonth: 0, delayed: 0 });

  // Calculate PO timeline on mount and when metrics change
  useEffect(() => {
    const calculatePOTimeline = async () => {
      try {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [
          { count: thisWeekCount },
          { count: thisMonthCount },
          { count: delayedCount }
        ] = await Promise.all([
          supabase
            .from('po_orders')
            .select('*', { count: 'exact', head: true })
            .gte('expected_delivery_date', now.toISOString())
            .lte('expected_delivery_date', weekFromNow.toISOString())
            .neq('status', 'delivered'),
          supabase
            .from('po_orders')
            .select('*', { count: 'exact', head: true })
            .gte('expected_delivery_date', now.toISOString())
            .lte('expected_delivery_date', monthFromNow.toISOString())
            .neq('status', 'delivered'),
          supabase
            .from('po_orders')
            .select('*', { count: 'exact', head: true })
            .lt('expected_delivery_date', now.toISOString())
            .neq('status', 'delivered')
        ]);

        setPoTimeline({
          thisWeek: thisWeekCount || 0,
          thisMonth: thisMonthCount || 0,
          delayed: delayedCount || 0
        });
      } catch (error) {
        console.error('Error calculating PO timeline:', error);
      }
    };

    if (poMetrics) {
      calculatePOTimeline();
    }
  }, [poMetrics]);

  const poData = poMetrics && poTotals ? {
    activeOrders: poTotals.activeRecords || 0,
    activeQuantity: poTotals.activeQuantity || 0,
    uniquePOs: poMetrics.uniquePONumbers || 0,
    statusBreakdown: {
      pending: { 
        count: poMetrics.pendingOrders || 0, 
        value: 0 // Would need to calculate from DB
      },
      ordered: { 
        count: poMetrics.orderedOrders || 0, 
        value: 0 
      },
      shipped: { 
        count: poMetrics.shippedOrders || 0, 
        value: 0 
      },
      delivered: { 
        count: poTotals.deliveredRecords || 0, 
        value: 0 
      },
    },
    timeline: poTimeline,
  } : null;

  // Process fulfillment metrics
  const creditDays = selectedCountry === 'UAE' ? 60 : 45;
  const fulfillmentData = fulfillmentMetrics ? {
    totalValue: fulfillmentMetrics.totalValue || 0,
    paidValue: fulfillmentMetrics.paidValue || 0,
    paidCount: fulfillmentMetrics.paidPayments || 0,
    pendingValue: fulfillmentMetrics.pendingValue || 0,
    pendingCount: fulfillmentMetrics.pendingPayments || 0,
    overdueValue: fulfillmentMetrics.overdueValue || 0,
    overdueCount: fulfillmentMetrics.overduePayments || 0,
    upcomingPayments: {
      next7Days: { 
        count: fulfillmentMetrics.upcomingPayments?.next7Days || 0, 
        value: 0 
      },
      next30Days: { 
        count: fulfillmentMetrics.upcomingPayments?.next30Days || 0, 
        value: 0 
      },
      next90Days: { 
        count: fulfillmentMetrics.upcomingPayments?.next90Days || 0, 
        value: 0 
      },
    },
    creditDays,
  } : null;

  const refreshAll = async () => {
    await Promise.all([
      reloadInventory(selectedCountry),
      reloadVelocity(2),
      reloadPO(),
      reloadPOTotals(),
      reloadFulfillment()
    ]);
    setLastUpdated(new Date());
  };

  return {
    inventoryMetrics: inventoryData,
    velocityMetrics: velocityData,
    poMetrics: poData,
    fulfillmentMetrics: fulfillmentData,
    isLoading,
    lastUpdated,
    refreshAll
  };
}

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
  const [loadSecondary, setLoadSecondary] = useState(false);

  // Load inventory data immediately (priority)
  const { inventoryMetrics, loading: inventoryLoading, loadAnalytics: reloadInventory } = useInventoryAnalytics();
  
  // Load secondary data sources only after inventory
  const { items: velocityItems, loading: velocityLoading, loadAnalytics: reloadVelocity } = useQuarterlyVelocityAnalytics();
  const { metrics: poMetrics, totals: poTotals, isLoading: poLoading, fetchMetrics: reloadPO, fetchTotals: reloadPOTotals } = usePOMetrics();
  const { metrics: fulfillmentMetrics, loading: fulfillmentLoading, refetch: reloadFulfillment } = useAmazonOrders();

  const isLoadingInventory = inventoryLoading;
  const isLoadingSecondary = velocityLoading || poLoading || fulfillmentLoading;

  // Load inventory first, then secondary data
  useEffect(() => {
    const initializeData = async () => {
      // Load inventory first (fastest query)
      await reloadInventory(selectedCountry);
      
      // Then load secondary data in background
      setLoadSecondary(true);
    };
    
    initializeData();
  }, [selectedCountry]);

  // Load secondary data after inventory is ready
  useEffect(() => {
    if (loadSecondary && !inventoryLoading) {
      Promise.all([
        reloadVelocity(1), // Load 1 year instead of 2 years
        reloadPO(),
        reloadPOTotals(),
        reloadFulfillment()
      ]);
    }
  }, [loadSecondary, inventoryLoading]);

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

  // Calculate 7-day sales from stock_changes (not cumulative total_sold)
  const [weekSales, setWeekSales] = useState({ total: 0, daily: 0 });

  useEffect(() => {
    const calculate7DaySales = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from('stock_changes')
          .select('change_amount')
          .lt('change_amount', 0) // Sales are negative stock changes
          .gte('created_at', sevenDaysAgo.toISOString());
        
        if (!error && data) {
          const total = data.reduce((sum, item) => sum + Math.abs(item.change_amount || 0), 0);
          setWeekSales({ total, daily: total / 7 });
        }
      } catch (error) {
        console.error('Error calculating 7-day sales:', error);
      }
    };
    
    calculate7DaySales();
  }, []);

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
    weekSales: weekSales.total,
    avgDailySales: weekSales.daily,
  } : null;

  // Process PO metrics with monetary values
  const [poTimeline, setPoTimeline] = useState({ thisWeek: 0, thisMonth: 0, delayed: 0 });
  const [poStatusValues, setPoStatusValues] = useState({
    pending: 0,
    ordered: 0,
    shipped: 0,
    delivered: 0
  });

  // Calculate PO timeline and status values
  useEffect(() => {
    const calculatePOData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Parallel queries for timeline
        const [weekData, monthData, delayedData] = await Promise.all([
          supabase
            .from('po_orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('expected_delivery_date', now.toISOString())
            .lte('expected_delivery_date', weekFromNow.toISOString())
            .neq('status', 'delivered'),
          supabase
            .from('po_orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('expected_delivery_date', now.toISOString())
            .lte('expected_delivery_date', monthFromNow.toISOString())
            .neq('status', 'delivered'),
          supabase
            .from('po_orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lt('expected_delivery_date', now.toISOString())
            .neq('status', 'delivered')
        ]);

        setPoTimeline({
          thisWeek: weekData.count || 0,
          thisMonth: monthData.count || 0,
          delayed: delayedData.count || 0
        });

        // Calculate monetary values for each status
        const statusQueries = await Promise.all([
          supabase
            .from('po_orders')
            .select('price, quantity')
            .eq('user_id', user.id)
            .eq('status', 'pending'),
          supabase
            .from('po_orders')
            .select('price, quantity')
            .eq('user_id', user.id)
            .eq('status', 'ordered'),
          supabase
            .from('po_orders')
            .select('price, quantity')
            .eq('user_id', user.id)
            .eq('status', 'shipped'),
          supabase
            .from('po_orders')
            .select('price, quantity')
            .eq('user_id', user.id)
            .eq('status', 'delivered')
        ]);

        const calculateValue = (data: any[]) => 
          data?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0;

        setPoStatusValues({
          pending: calculateValue(statusQueries[0].data),
          ordered: calculateValue(statusQueries[1].data),
          shipped: calculateValue(statusQueries[2].data),
          delivered: calculateValue(statusQueries[3].data)
        });
      } catch (error) {
        console.error('Error calculating PO data:', error);
      }
    };

    if (poMetrics) {
      calculatePOData();
    }
  }, [poMetrics]);

  const poData = poMetrics && poTotals ? {
    activeOrders: poTotals.activeRecords || 0,
    activeQuantity: poTotals.activeQuantity || 0,
    uniquePOs: poMetrics.uniquePONumbers || 0,
    statusBreakdown: {
      pending: { 
        count: poMetrics.pendingOrders || 0, 
        value: poStatusValues.pending
      },
      ordered: { 
        count: poMetrics.orderedOrders || 0, 
        value: poStatusValues.ordered
      },
      shipped: { 
        count: poMetrics.shippedOrders || 0, 
        value: poStatusValues.shipped
      },
      delivered: { 
        count: poTotals.deliveredRecords || 0, 
        value: poStatusValues.delivered
      },
    },
    timeline: poTimeline,
  } : null;

  // Process fulfillment metrics with upcoming payment values
  const [upcomingPaymentValues, setUpcomingPaymentValues] = useState({
    next7Days: 0,
    next30Days: 0,
    next90Days: 0
  });

  useEffect(() => {
    const calculateUpcomingPayments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const creditDays = selectedCountry === 'UAE' ? 60 : 45;
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        // Calculate payment due dates
        const [data7, data30, data90] = await Promise.all([
          supabase
            .from('orders')
            .select('invoice_amount')
            .eq('user_id', user.id)
            .eq('country', selectedCountry)
            .neq('payment_status', 'Paid')
            .not('invoice_date', 'is', null)
            .gte('invoice_date', new Date(now.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString())
            .lte('invoice_date', new Date(next7Days.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('orders')
            .select('invoice_amount')
            .eq('user_id', user.id)
            .eq('country', selectedCountry)
            .neq('payment_status', 'Paid')
            .not('invoice_date', 'is', null)
            .gte('invoice_date', new Date(now.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString())
            .lte('invoice_date', new Date(next30Days.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('orders')
            .select('invoice_amount')
            .eq('user_id', user.id)
            .eq('country', selectedCountry)
            .neq('payment_status', 'Paid')
            .not('invoice_date', 'is', null)
            .gte('invoice_date', new Date(now.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString())
            .lte('invoice_date', new Date(next90Days.getTime() - creditDays * 24 * 60 * 60 * 1000).toISOString())
        ]);

        const sumInvoices = (data: any) => 
          data?.reduce((sum: number, item: any) => sum + (item.invoice_amount || 0), 0) || 0;

        setUpcomingPaymentValues({
          next7Days: sumInvoices(data7.data),
          next30Days: sumInvoices(data30.data),
          next90Days: sumInvoices(data90.data)
        });
      } catch (error) {
        console.error('Error calculating upcoming payment values:', error);
      }
    };

    if (fulfillmentMetrics) {
      calculateUpcomingPayments();
    }
  }, [fulfillmentMetrics, selectedCountry]);

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
        value: upcomingPaymentValues.next7Days
      },
      next30Days: { 
        count: fulfillmentMetrics.upcomingPayments?.next30Days || 0, 
        value: upcomingPaymentValues.next30Days
      },
      next90Days: { 
        count: fulfillmentMetrics.upcomingPayments?.next90Days || 0, 
        value: upcomingPaymentValues.next90Days
      },
    },
    creditDays,
  } : null;

  const refreshAll = async () => {
    await reloadInventory(selectedCountry);
    await Promise.all([
      reloadVelocity(1),
      reloadPO(),
      reloadPOTotals(),
      reloadFulfillment()
    ]);
  };

  return {
    inventoryMetrics: inventoryData,
    velocityMetrics: velocityData,
    poMetrics: poData,
    fulfillmentMetrics: fulfillmentData,
    isLoadingInventory,
    isLoadingSecondary,
    refreshAll
  };
}

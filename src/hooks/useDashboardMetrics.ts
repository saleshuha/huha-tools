import { useState, useEffect } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from './useInventoryAnalytics';
import { useQuarterlyVelocityAnalytics } from './useQuarterlyVelocityAnalytics';
import { usePOMetrics } from './usePOMetrics';
import { useAmazonOrders } from './useAmazonOrders';
import { usePaymentTerms } from './usePaymentTerms';

export function useDashboardMetrics() {
  const { selectedCountry } = useCountry();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load all data sources
  const { inventoryMetrics, loading: inventoryLoading, loadAnalytics: reloadInventory } = useInventoryAnalytics();
  const { items: velocityItems, loading: velocityLoading, loadAnalytics: reloadVelocity } = useQuarterlyVelocityAnalytics();
  const { metrics: poMetrics, totals: poTotals, isLoading: poLoading, fetchMetrics: reloadPO } = usePOMetrics();
  const { metrics: fulfillmentMetrics, loading: fulfillmentLoading, refetch: reloadFulfillment } = useAmazonOrders();
  const { paymentTerms } = usePaymentTerms();

  const isLoading = inventoryLoading || velocityLoading || poLoading || fulfillmentLoading;

  // Process inventory metrics
  const inventoryData = inventoryMetrics ? {
    totalAsins: inventoryMetrics.salesTracking?.totalActiveAsins || 0,
    totalSkus: inventoryMetrics.salesTracking?.totalActiveSkus || 0,
    inStockCount: inventoryMetrics.restockTracking?.inStockItems || 0,
    outOfStockCount: inventoryMetrics.restockTracking?.outOfStockItems || 0,
    totalAsinUnits: inventoryMetrics.salesTracking?.totalAsinQuantity || 0,
    totalSkuUnits: inventoryMetrics.salesTracking?.totalSkuQuantity || 0,
    soldAsinUnits: inventoryMetrics.salesTracking?.soldAsin30Days || 0,
    soldSkuUnits: inventoryMetrics.salesTracking?.soldSku30Days || 0,
    missingSku: 0, // Not available in current metrics
    missingTitle: 0,
    missingImage: 0,
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
  const poData = poMetrics && poTotals ? {
    activeOrders: poTotals.totalRecords || 0,
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
    timeline: {
      thisWeek: 0, // Would need to calculate from DB
      thisMonth: 0,
      delayed: 0,
    },
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
      next7Days: { count: 0, value: 0 },
      next30Days: { count: 0, value: 0 },
      next90Days: { count: 0, value: 0 },
    },
    creditDays,
  } : null;

  const refreshAll = async () => {
    await Promise.all([
      reloadInventory(selectedCountry),
      reloadVelocity(2),
      reloadPO(),
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

import { useMemo } from 'react';
import { POOrder } from './usePOOrders';

export interface VolumeByDateData {
  date: string;
  count: number;
  quantity: number;
}

export interface StatusDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface MatchingStatsData {
  matched: number;
  unmatched: number;
  rate: number;
}

export interface PrintCompletionData {
  printed: number;
  notPrinted: number;
  rate: number;
}

export interface TopPOData {
  poNumber: string;
  quantity: number;
  itemCount: number;
}

export interface LocationDistributionData {
  location: string;
  count: number;
}

export interface POAnalyticsData {
  volumeByDate: VolumeByDateData[];
  statusDistribution: StatusDistributionData[];
  matchingStats: MatchingStatsData;
  printCompletion: PrintCompletionData;
  topPOs: TopPOData[];
  locationDistribution: LocationDistributionData[];
  totalOrders: number;
  totalQuantity: number;
  totalMatched: number;
  totalPrinted: number;
}

const STATUS_COLORS: Record<string, string> = {
  'pending': 'hsl(var(--chart-1))',
  'placed': 'hsl(var(--chart-2))',
  'received': 'hsl(var(--chart-3))',
  'cancelled': 'hsl(var(--chart-4))',
  'closed': 'hsl(var(--chart-5))',
};

export const usePOAnalytics = (orders: POOrder[]): POAnalyticsData => {
  return useMemo(() => {
    // Volume by Date
    const volumeByDate = calculateVolumeByDate(orders);
    
    // Status Distribution
    const statusDistribution = calculateStatusDistribution(orders);
    
    // Matching Stats
    const matchingStats = calculateMatchingRate(orders);
    
    // Print Completion
    const printCompletion = calculatePrintCompletion(orders);
    
    // Top POs
    const topPOs = calculateTopPOs(orders);
    
    // Location Distribution
    const locationDistribution = calculateLocationDistribution(orders);
    
    return {
      volumeByDate,
      statusDistribution,
      matchingStats,
      printCompletion,
      topPOs,
      locationDistribution,
      totalOrders: orders.length,
      totalQuantity: orders.reduce((sum, o) => sum + (o.quantity || 0), 0),
      totalMatched: orders.filter(o => o.sunsky_sku?.id).length,
      totalPrinted: orders.filter(o => o.is_printed).length,
    };
  }, [orders]);
};

function calculateVolumeByDate(orders: POOrder[]): VolumeByDateData[] {
  const grouped = orders.reduce((acc, order) => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, count: 0, quantity: 0 };
    }
    acc[date].count += 1;
    acc[date].quantity += order.quantity || 0;
    return acc;
  }, {} as Record<string, VolumeByDateData>);
  
  return Object.values(grouped)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 days
}

function calculateStatusDistribution(orders: POOrder[]): StatusDistributionData[] {
  const statusCount: Record<string, number> = {};
  
  orders.forEach(order => {
    const status = order.status || 'pending';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return Object.entries(statusCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name.toLowerCase()] || 'hsl(var(--chart-1))',
  }));
}

function calculateMatchingRate(orders: POOrder[]): MatchingStatsData {
  const matched = orders.filter(o => o.sunsky_sku?.id).length;
  const total = orders.length;
  
  return {
    matched,
    unmatched: total - matched,
    rate: total > 0 ? Math.round((matched / total) * 100) : 0,
  };
}

function calculatePrintCompletion(orders: POOrder[]): PrintCompletionData {
  const printed = orders.filter(o => o.is_printed).length;
  const total = orders.length;
  
  return {
    printed,
    notPrinted: total - printed,
    rate: total > 0 ? Math.round((printed / total) * 100) : 0,
  };
}

function calculateTopPOs(orders: POOrder[]): TopPOData[] {
  const poGroups = orders.reduce((acc, order) => {
    const poNumber = order.po_number || 'Unknown';
    if (!acc[poNumber]) {
      acc[poNumber] = { poNumber, quantity: 0, itemCount: 0 };
    }
    acc[poNumber].quantity += order.quantity || 0;
    acc[poNumber].itemCount += 1;
    return acc;
  }, {} as Record<string, TopPOData>);
  
  return Object.values(poGroups)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}

function calculateLocationDistribution(orders: POOrder[]): LocationDistributionData[] {
  const locationCount: Record<string, number> = {};
  
  orders.forEach(order => {
    const location = order.ship_to_location || 'Unknown';
    locationCount[location] = (locationCount[location] || 0) + 1;
  });
  
  return Object.entries(locationCount)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

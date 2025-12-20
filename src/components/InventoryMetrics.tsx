import { useState, useEffect, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, CheckCircle, XCircle, Download, RefreshCw, Activity, Radio, TrendingUp, CalendarIcon, Filter, LayoutDashboard, BarChart3, AlertTriangle, ShoppingCart, DollarSign, CalendarPlus, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdvancedMetricCard } from './inventory/AdvancedMetricCard';
import { InventoryHealthScore, calculateHealthScore } from './inventory/InventoryHealthScore';
import { StockDistributionChart } from './inventory/StockDistributionChart';
import { DataQualitySummary } from './inventory/DataQualitySummary';
import { MetricsSectionHeader } from './inventory/MetricsSectionHeader';

interface InventoryItem {
  id: string;
  asin?: string;
  sku?: string;
  title?: string;
  quantity: number;
  status: string;
  date_added: string;
  date_sold?: string;
  country: string;
  serial_number?: string;
  eligible_for_restock?: boolean;
  is_active?: boolean;
}

interface InventoryStats {
  totalAsins: number;
  totalUnits: number;
  inStockCount: number;
  outOfStockCount: number;
  missingSku: number;
  missingTitle: number;
  missingImages: number;
  restockEligible: number;
  soldUnits: number;
  orderedCount: number;
  addedLast7Days: number;
  addedLast30Days: number;
  lastUpdated: Date;
}

interface InventoryMetricsProps {
  showOnlyAsin?: boolean;
  showOnlySku?: boolean;
  activeStatusFilter?: string;
}

export const InventoryMetrics = memo(function InventoryMetrics({
  showOnlyAsin = false,
  showOnlySku = false,
  activeStatusFilter = 'all'
}: InventoryMetricsProps) {
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isLive, setIsLive] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [soldDateFrom, setSoldDateFrom] = useState<Date>();
  const [soldDateTo, setSoldDateTo] = useState<Date>();
  const [showSoldModal, setShowSoldModal] = useState(false);
  
  const isFiltered = activeStatusFilter && activeStatusFilter !== 'all';

  // Convert loadMetrics to a React Query queryFn
  const fetchMetrics = async (): Promise<InventoryStats> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (showOnlyAsin) {
      // Use RPC for accurate server-side calculation
      const { data: metrics, error: metricsError } = await supabase.rpc(
        'get_inventory_metrics',
        { p_country: selectedCountry, p_user_id: user.id }
      );

      if (metricsError) throw metricsError;

      console.log('📊 RPC Metrics:', metrics);

      // Get unique ASINs for missing images calculation
      const { data: inventoryAsins } = await supabase
        .from('asin_inventory')
        .select('asin')
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .neq('is_active', false);

      const uniqueAsins = [...new Set(inventoryAsins?.map(i => i.asin) || [])];

      // Get ASINs with images
      const { data: productImages } = await supabase
        .from('product_images')
        .select('asin')
        .eq('user_id', user.id);

      const asinsWithImages = new Set(productImages?.map(i => i.asin) || []);
      const missingImages = uniqueAsins.filter(asin => !asinsWithImages.has(asin)).length;

      // Calculate sold units with date filters
      let soldQuery = supabase
        .from('asin_inventory')
        .select('quantity')
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .neq('is_active', false);

      if (soldDateFrom) {
        soldQuery = soldQuery.gte('date_sold', soldDateFrom.toISOString());
      }
      if (soldDateTo) {
        const endDate = new Date(soldDateTo);
        endDate.setHours(23, 59, 59, 999);
        soldQuery = soldQuery.lte('date_sold', endDate.toISOString());
      }

      const { data: soldData } = await soldQuery;
      const soldUnits = (soldData || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Count ordered items
      const { count: orderedCount } = await supabase
        .from('asin_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .eq('status', 'ordered')
        .neq('is_active', false);

      // Count items added in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: addedLast7Days } = await supabase
        .from('asin_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .neq('is_active', false)
        .gte('date_added', sevenDaysAgo.toISOString());

      // Count items added in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: addedLast30Days } = await supabase
        .from('asin_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .neq('is_active', false)
        .gte('date_added', thirtyDaysAgo.toISOString());

      console.log('✅ Final Metrics:', {
        totalAsins: metrics.total_asins,
        totalUnits: metrics.total_units,
        inStockCount: metrics.in_stock_count,
        outOfStockCount: metrics.out_of_stock_count,
        missingSku: metrics.missing_sku,
        missingTitle: metrics.missing_title,
        missingImages,
        restockEligible: metrics.restock_eligible,
        soldUnits,
        orderedCount,
        addedLast7Days,
        addedLast30Days
      });

      return {
        totalAsins: metrics.total_asins || 0,
        totalUnits: metrics.total_units || 0,
        inStockCount: metrics.in_stock_count || 0,
        outOfStockCount: metrics.out_of_stock_count || 0,
        missingSku: metrics.missing_sku || 0,
        missingTitle: metrics.missing_title || 0,
        missingImages,
        restockEligible: metrics.restock_eligible || 0,
        soldUnits,
        orderedCount: orderedCount || 0,
        addedLast7Days: addedLast7Days || 0,
        addedLast30Days: addedLast30Days || 0,
        lastUpdated: new Date()
      };
    } else if (showOnlySku) {
      // SKU logic (simplified for now)
      const { data: skuData } = await supabase
        .from('sku_inventory')
        .select('*')
        .eq('country', selectedCountry);

      const skuItems = skuData || [];
      const totalSkus = skuItems.length;
      const totalUnits = skuItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const inStock = skuItems.filter(item => (item.quantity || 0) > 0).length;
      const outOfStock = skuItems.filter(item => (item.quantity || 0) === 0).length;

      return {
        totalAsins: totalSkus,
        totalUnits,
        inStockCount: inStock,
        outOfStockCount: outOfStock,
        missingSku: 0,
        missingTitle: 0,
        missingImages: 0,
        restockEligible: 0,
        soldUnits: 0,
        orderedCount: 0,
        addedLast7Days: 0,
        addedLast30Days: 0,
        lastUpdated: new Date()
      };
    }

    throw new Error('Invalid metric type');
  };

  // Use React Query with aggressive caching
  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['inventory-metrics', selectedCountry, showOnlyAsin, showOnlySku, soldDateFrom?.toISOString(), soldDateTo?.toISOString()],
    queryFn: fetchMetrics,
    enabled: !!selectedCountry,
    staleTime: 10 * 60 * 1000, // 10 minutes - metrics are relatively stable
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    // Disable automatic refetches - only refetch on manual refresh or cache invalidation
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading metrics",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const loadDetailedItems = async (metric: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('asin_inventory')
        .select('*')
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .neq('is_active', false);

      // Apply metric-specific filters
      if (metric === 'instock') {
        query = query.gt('quantity', 0);  // FIXED: Only check quantity > 0
      } else if (metric === 'outofstock') {
        query = query.eq('quantity', 0);  // FIXED: Only check quantity = 0
      } else if (metric === 'missing-sku') {
        query = query.or('sku.is.null,sku.eq.');
      } else if (metric === 'missing-title') {
        query = query.or('title.is.null,title.eq.');
      } else if (metric === 'restock-eligible') {
        query = query.eq('eligible_for_restock', true);
      } else if (metric === 'missing-images') {
        // Get all items first, then filter by missing images
        const { data: allItems } = await query;
        const { data: productImages } = await supabase
          .from('product_images')
          .select('asin')
          .eq('user_id', user.id);
        
        const asinsWithImages = new Set(productImages?.map(i => i.asin) || []);
        const itemsWithoutImages = (allItems || []).filter(item => !asinsWithImages.has(item.asin));
        setInventoryItems(itemsWithoutImages);
        return;
      } else if (metric === 'ordered') {
        query = query.eq('status', 'ordered');
      } else if (metric === 'added-7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('date_added', sevenDaysAgo.toISOString());
      } else if (metric === 'added-30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('date_added', thirtyDaysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setInventoryItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadSoldItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('asin_inventory')
        .select('*')
        .eq('country', selectedCountry)
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .neq('is_active', false);

      if (soldDateFrom) {
        query = query.gte('date_sold', soldDateFrom.toISOString());
      }
      if (soldDateTo) {
        const endDate = new Date(soldDateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('date_sold', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setInventoryItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading sold items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMetricClick = (metric: string) => {
    setSelectedMetric(metric);
    if (metric === 'sold') {
      setShowSoldModal(true);
      loadSoldItems();
    } else {
      loadDetailedItems(metric);
    }
  };

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const exportData = filteredItems.map(item => ({
        ASIN: item.asin || '',
        'Serial Number': item.serial_number || '',
        SKU: item.sku || '',
        Title: item.title || '',
        Quantity: item.quantity,
        Status: item.status,
        'Date Added': item.date_added ? format(new Date(item.date_added), 'yyyy-MM-dd') : '',
        'Date Sold': item.date_sold ? format(new Date(item.date_sold), 'yyyy-MM-dd') : '',
        Country: item.country
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

      const fileName = `inventory_${selectedMetric}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} items`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Set up real-time subscription - only listen to actual data changes
  useEffect(() => {
    if (!selectedCountry) return;

    // Subscribe to real-time changes - separate listeners for INSERT, UPDATE, DELETE
    const channel = supabase
      .channel(`inventory-metrics-${selectedCountry}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('📡 Real-time INSERT detected:', payload);
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('📡 Real-time UPDATE detected:', payload);
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('📡 Real-time DELETE detected:', payload);
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCountry, queryClient]);

  const filteredItems = inventoryItems.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.asin?.toLowerCase().includes(search) ||
      item.sku?.toLowerCase().includes(search) ||
      item.title?.toLowerCase().includes(search) ||
      item.serial_number?.toLowerCase().includes(search)
    );
  });

  // Calculate health score
  const healthScore = useMemo(() => {
    if (!stats) return 0;
    return calculateHealthScore({
      inStockCount: stats.inStockCount,
      outOfStockCount: stats.outOfStockCount,
      missingSku: stats.missingSku,
      missingTitle: stats.missingTitle,
      missingImages: stats.missingImages,
      totalAsins: stats.totalAsins,
      restockEligible: stats.restockEligible
    });
  }, [stats]);

  // Mock sparkline data (in production, this would come from historical data)
  const mockSparklineData = useMemo(() => {
    return [65, 72, 68, 85, 82, 90, stats?.totalUnits || 0].slice(-7);
  }, [stats?.totalUnits]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Indicator Banner */}
      {isFiltered && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Filtered View: {activeStatusFilter === 'instock' ? 'In Stock Items Only' : 
                            activeStatusFilter === 'outofstock' ? 'Out of Stock Items Only' : 
                            activeStatusFilter === 'sold' ? 'Sold Items Only' :
                            activeStatusFilter === 'ordered' ? 'Ordered Items Only' :
                            'Custom Filter Active'}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            Metrics may be limited
          </Badge>
        </div>
      )}

      {/* Header with live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Inventory Metrics</h3>
          {isLive && (
            <Badge variant="default" className="animate-pulse">
              <Radio className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>Last updated: {format(stats.lastUpdated, 'HH:mm:ss')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* HERO SECTION - Overview */}
      <div className="space-y-2">
        <MetricsSectionHeader icon={LayoutDashboard} title="Overview" description="Key health indicators" />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Health Score */}
          <InventoryHealthScore
            score={healthScore}
            onClick={() => handleMetricClick('active')}
          />

          {/* Total ASINs - Hero */}
          <AdvancedMetricCard
            title="Total ASINs"
            value={stats.totalAsins}
            subtitle="Active inventory items"
            icon={Package}
            color="blue"
            size="hero"
            sparklineData={mockSparklineData}
            onClick={() => handleMetricClick('active')}
          />

          {/* Stock Distribution Chart */}
          <StockDistributionChart
            inStock={stats.inStockCount}
            outOfStock={stats.outOfStockCount}
            onClick={() => handleMetricClick('instock')}
          />
        </div>
      </div>

      {/* STOCK METRICS SECTION */}
      <div className="space-y-2">
        <MetricsSectionHeader icon={BarChart3} title="Stock Metrics" description="Inventory levels" />
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {/* Total Units */}
          <AdvancedMetricCard
            title="Total Units"
            value={stats.totalUnits}
            subtitle="Sum of quantities"
            icon={TrendingUp}
            color="purple"
            sparklineData={mockSparklineData}
            onClick={() => handleMetricClick('active')}
          />

          {/* In Stock - Hide when filtering by out of stock */}
          {activeStatusFilter !== 'outofstock' && (
            <AdvancedMetricCard
              title="In Stock"
              value={stats.inStockCount}
              subtitle="Available ASINs"
              icon={CheckCircle}
              color="green"
              progress={{ 
                value: stats.inStockCount, 
                max: stats.inStockCount + stats.outOfStockCount,
                showPercentage: true 
              }}
              onClick={() => handleMetricClick('instock')}
            />
          )}

          {/* Out of Stock - Hide when filtering by in stock */}
          {activeStatusFilter !== 'instock' && (
            <AdvancedMetricCard
              title="Out of Stock"
              value={stats.outOfStockCount}
              subtitle="Unavailable ASINs"
              icon={XCircle}
              color="red"
              progress={{ 
                value: stats.outOfStockCount, 
                max: stats.inStockCount + stats.outOfStockCount,
                showPercentage: true 
              }}
              onClick={() => handleMetricClick('outofstock')}
            />
          )}

          {/* Restock Eligible */}
          <AdvancedMetricCard
            title="Restock Eligible"
            value={stats.restockEligible}
            subtitle="Ready for reorder"
            icon={Activity}
            color="cyan"
            badge={stats.restockEligible > 0 ? "Action" : undefined}
            onClick={() => handleMetricClick('restock-eligible')}
          />
        </div>
      </div>

      {/* DATA QUALITY SECTION */}
      <div className="space-y-2">
        <MetricsSectionHeader icon={AlertTriangle} title="Data Quality" description="Items needing attention" />
        <DataQualitySummary
          missingSku={stats.missingSku}
          missingTitle={stats.missingTitle}
          missingImages={stats.missingImages}
          totalAsins={stats.totalAsins}
          onClickSku={() => handleMetricClick('missing-sku')}
          onClickTitle={() => handleMetricClick('missing-title')}
          onClickImages={() => handleMetricClick('missing-images')}
        />
      </div>

      {/* ACTIVITY & STATUS SECTION */}
      <div className="space-y-2">
        <MetricsSectionHeader icon={Activity} title="Activity & Status" description="Recent activity" />
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <AdvancedMetricCard
            title="Ordered"
            value={stats.orderedCount}
            subtitle="Items on order"
            icon={ShoppingCart}
            color="blue"
            onClick={() => handleMetricClick('ordered')}
          />
          <AdvancedMetricCard
            title="Sold"
            value={stats.soldUnits}
            subtitle="Units sold"
            icon={DollarSign}
            color="green"
            onClick={() => handleMetricClick('sold')}
          />
          <AdvancedMetricCard
            title="Added (7d)"
            value={stats.addedLast7Days}
            subtitle="Last 7 days"
            icon={CalendarPlus}
            color="cyan"
            onClick={() => handleMetricClick('added-7d')}
          />
          <AdvancedMetricCard
            title="Added (30d)"
            value={stats.addedLast30Days}
            subtitle="Last 30 days"
            icon={CalendarDays}
            color="purple"
            onClick={() => handleMetricClick('added-30d')}
          />
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedMetric !== null && !showSoldModal} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedMetric?.replace('-', ' ').toUpperCase()} Items</span>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button onClick={exportToExcel} disabled={exportLoading}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                    <TableCell className="font-mono text-xs">{item.serial_number}</TableCell>
                    <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.title || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.date_added ? format(new Date(item.date_added), 'yyyy-MM-dd') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items found
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sold Items Dialog with Date Filters */}
      <Dialog open={showSoldModal} onOpenChange={setShowSoldModal}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Sold Items ({stats.soldUnits.toLocaleString()} units)</span>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {soldDateFrom ? format(soldDateFrom, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={soldDateFrom} onSelect={setSoldDateFrom} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {soldDateTo ? format(soldDateTo, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={soldDateTo} onSelect={setSoldDateTo} />
                  </PopoverContent>
                </Popover>
                <Button onClick={() => { setSoldDateFrom(undefined); setSoldDateTo(undefined); }} variant="ghost" size="sm">
                  Clear
                </Button>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
                <Button onClick={exportToExcel} disabled={exportLoading}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                    <TableCell className="font-mono text-xs">{item.serial_number}</TableCell>
                    <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.title || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.date_sold ? format(new Date(item.date_sold), 'yyyy-MM-dd') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sold items found
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  return prevProps.showOnlyAsin === nextProps.showOnlyAsin &&
         prevProps.showOnlySku === nextProps.showOnlySku;
});

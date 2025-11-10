import { useState, useEffect } from 'react';
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
import { Package, CheckCircle, XCircle, Search, Download, FileText, RefreshCw, Activity, Radio, TrendingUp, ImageIcon, CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  lastUpdated: Date;
}

interface InventoryMetricsProps {
  showOnlyAsin?: boolean;
  showOnlySku?: boolean;
}

export function InventoryMetrics({
  showOnlyAsin = false,
  showOnlySku = false
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

      console.log('✅ Final Metrics:', {
        totalAsins: metrics.total_asins,
        totalUnits: metrics.total_units,
        inStockCount: metrics.in_stock_count,
        outOfStockCount: metrics.out_of_stock_count,
        missingSku: metrics.missing_sku,
        missingTitle: metrics.missing_title,
        missingImages,
        restockEligible: metrics.restock_eligible,
        soldUnits
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
    retry: 2
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
        query = query.eq('status', 'in-stock').gt('quantity', 0);
      } else if (metric === 'outofstock') {
        query = query.or('status.eq.out-of-stock,quantity.eq.0');
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

  // Set up real-time subscription - optimized to invalidate cache instead of immediate fetch
  useEffect(() => {
    if (!selectedCountry) return;

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`inventory-metrics-${selectedCountry}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('📡 Real-time update detected:', payload);
          setIsLive(true);
          // Invalidate cache instead of immediate fetch - lets React Query decide when to refetch
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

      {/* Metrics Grid - Single Row with Colored Borders */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-3">
        {/* Total ASINs */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-blue-500"
          onClick={() => handleMetricClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Total ASINs
              </CardTitle>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {stats.totalAsins.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Active inventory</p>
          </CardContent>
        </Card>

        {/* Total Units */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-purple-500"
          onClick={() => handleMetricClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Total Units
              </CardTitle>
              <div className="text-xl font-bold text-purple-600 mt-1">
                {stats.totalUnits.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Sum of quantities</p>
          </CardContent>
        </Card>

        {/* In Stock */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-green-500"
          onClick={() => handleMetricClick('instock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                In Stock
              </CardTitle>
              <div className="text-xl font-bold text-green-600 mt-1">
                {stats.inStockCount.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Available ASINs</p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-red-500"
          onClick={() => handleMetricClick('outofstock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Out of Stock
              </CardTitle>
              <div className="text-xl font-bold text-red-600 mt-1">
                {stats.outOfStockCount.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Unavailable ASINs</p>
          </CardContent>
        </Card>

        {/* Missing SKU */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-orange-500"
          onClick={() => handleMetricClick('missing-sku')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Missing SKU
              </CardTitle>
              <div className="text-xl font-bold text-orange-600 mt-1">
                {stats.missingSku.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">ASINs without SKU</p>
          </CardContent>
        </Card>

        {/* Missing Title */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-yellow-500"
          onClick={() => handleMetricClick('missing-title')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Missing Title
              </CardTitle>
              <div className="text-xl font-bold text-yellow-600 mt-1">
                {stats.missingTitle.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">ASINs without title</p>
          </CardContent>
        </Card>

        {/* Missing Images */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-pink-500"
          onClick={() => handleMetricClick('missing-images')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Missing Images
              </CardTitle>
              <div className="text-xl font-bold text-pink-600 mt-1">
                {stats.missingImages.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-pink-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-4 w-4 text-pink-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">ASINs without images</p>
          </CardContent>
        </Card>

        {/* Restock Eligible */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-cyan-500"
          onClick={() => handleMetricClick('restock-eligible')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                Restock Eligible
              </CardTitle>
              <div className="text-xl font-bold text-cyan-600 mt-1">
                {stats.restockEligible.toLocaleString()}
              </div>
            </div>
            <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Activity className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Ready for reorder</p>
          </CardContent>
        </Card>
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
}

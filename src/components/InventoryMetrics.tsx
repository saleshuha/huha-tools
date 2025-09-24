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
import { Package, CheckCircle, XCircle, Search, Download, FileText, RefreshCw, Activity, BarChart3, TrendingDown, CalendarIcon, Plus, TrendingUp, ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
interface InventoryItem {
  id: string;
  identifier: string;
  type: 'asin' | 'sku';
  quantity: number;
  status: string;
  date_added: string;
  date_sold?: string;
  country: string;
  serial_number?: string;
  bin_serial_number?: string;
}
interface InventoryStats {
  activeItems: number;
  inStockItems: number;
  outOfStockItems: number;
  asinTotalUnits: number;
  asinSoldUnits: number;
  skuTotalUnits: number;
  skuSoldUnits: number;
  missingSku: number;
  missingTitles: number;
  missingImages: number;
  restockEligible: number;
  nonRestockEligible: number;
}
interface InventoryMetricsProps {
  showOnlyAsin?: boolean;
  showOnlySku?: boolean;
}
export function InventoryMetrics({
  showOnlyAsin = false,
  showOnlySku = false
}: InventoryMetricsProps) {
  const {
    selectedCountry
  } = useCountry();
  const {
    toast
  } = useToast();
  const [stats, setStats] = useState<InventoryStats>({
    activeItems: 0,
    inStockItems: 0,
    outOfStockItems: 0,
    asinTotalUnits: 0,
    asinSoldUnits: 0,
    skuTotalUnits: 0,
    skuSoldUnits: 0,
    missingSku: 0,
    missingTitles: 0,
    missingImages: 0,
    restockEligible: 0,
    nonRestockEligible: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'active' | 'instock' | 'outofstock' | 'sold' | 'missing-sku' | 'missing-titles' | 'missing-images' | 'restock-eligible' | 'non-restock-eligible' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [soldDateFrom, setSoldDateFrom] = useState<Date>();
  const [soldDateTo, setSoldDateTo] = useState<Date>();
  const [showSoldModal, setShowSoldModal] = useState(false);
  const loadMetrics = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Loading metrics for country: ${selectedCountry}`);
      
      if (showOnlyAsin) {
        // Load only ASIN data
        const {
          data: asinData,
          count,
          error
        } = await supabase
          .from('asin_inventory')
          .select('*', { count: 'exact' })
          .eq('country', selectedCountry)
          .limit(50000); // Explicit high limit to override Supabase default 1000
        
        console.log(`📊 ASIN Query Results:`, { 
          dataLength: asinData?.length || 0, 
          totalCount: count,
          error: error?.message,
          country: selectedCountry 
        });
        if (error) {
          console.error('❌ ASIN query error:', error);
          throw error;
        }
        
        const asinItems = asinData || [];
        const activeItems = asinItems.length;
        const inStockItems = asinItems.filter(item => item.quantity > 0).length;
        const outOfStockItems = asinItems.filter(item => item.quantity === 0).length;
        const asinTotalUnits = asinItems.reduce((sum, item) => sum + item.quantity, 0);
        
        console.log(`📈 ASIN Metrics:`, {
          totalRecords: activeItems,
          inStock: inStockItems,
          outOfStock: outOfStockItems,
          totalUnits: asinTotalUnits,
          actualCount: count
        });

        // Calculate restock eligibility
        const restockEligible = asinItems.filter(item => item.eligible_for_restock === true).length;
        const nonRestockEligible = asinItems.filter(item => item.eligible_for_restock === false || item.eligible_for_restock === null).length;

        // Filter sold units based on date filters
        let soldItems = asinItems.filter(item => item.status === 'sold');
        if (soldDateFrom || soldDateTo) {
          soldItems = soldItems.filter(item => {
            if (!item.date_sold) return false;
            const soldDate = new Date(item.date_sold);
            if (soldDateFrom && soldDate < soldDateFrom) return false;
            if (soldDateTo) {
              const endDate = new Date(soldDateTo);
              endDate.setHours(23, 59, 59, 999);
              if (soldDate > endDate) return false;
            }
            return true;
          });
        }
        const asinSoldUnits = soldItems.reduce((sum, item) => sum + item.quantity, 0);
        
        // Calculate items with missing SKU
        const missingSku = asinItems.filter(item => !item.sku || item.sku.trim() === '').length;
        
        // Calculate items with missing titles
        const missingTitles = asinItems.filter(item => !item.title || item.title.trim() === '').length;
        
        // Calculate items with missing images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('asin')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        const existingImageAsins = new Set((productImages || []).map(img => img.asin));
        const missingImages = asinItems.filter(item => !existingImageAsins.has(item.asin)).length;
        
        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          skuTotalUnits: 0,
          skuSoldUnits: 0,
          missingSku,
          missingTitles,
          missingImages,
          restockEligible,
          nonRestockEligible
        });
      } else if (showOnlySku) {
        // Load only SKU data
        const {
          data: skuData
        } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry).limit(50000);
        const skuItems = skuData || [];
        const activeItems = skuItems.length;
        const inStockItems = skuItems.filter(item => item.quantity > 0).length;
        const outOfStockItems = skuItems.filter(item => item.quantity === 0).length;
        const skuTotalUnits = skuItems.reduce((sum, item) => sum + item.quantity, 0);

        // SKU items don't have restock eligibility
        const restockEligible = 0;
        const nonRestockEligible = 0;

        // Filter sold units based on date filters
        let soldItems = skuItems.filter(item => item.status === 'sold');
        if (soldDateFrom || soldDateTo) {
          soldItems = soldItems.filter(item => {
            if (!item.date_sold) return false;
            const soldDate = new Date(item.date_sold);
            if (soldDateFrom && soldDate < soldDateFrom) return false;
            if (soldDateTo) {
              const endDate = new Date(soldDateTo);
              endDate.setHours(23, 59, 59, 999);
              if (soldDate > endDate) return false;
            }
            return true;
          });
        }
        const skuSoldUnits = soldItems.reduce((sum, item) => sum + item.quantity, 0);
        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits: 0,
          asinSoldUnits: 0,
          skuTotalUnits,
          skuSoldUnits,
          missingSku: 0,
          missingTitles: 0,
          missingImages: 0,
          restockEligible,
          nonRestockEligible
        });
      } else {
        // Load both ASIN and SKU data
        const [asinData, skuData] = await Promise.all([supabase.from('asin_inventory').select('*').eq('country', selectedCountry).limit(50000), supabase.from('sku_inventory').select('*').eq('country', selectedCountry).limit(50000)]);

        // Calculate metrics
        const allItems = [...(asinData.data || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...(skuData.data || []).map(item => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }))];
        const activeItems = allItems.length;
        const inStockItems = allItems.filter(item => item.quantity > 0).length;
        const outOfStockItems = allItems.filter(item => item.quantity === 0).length;

        // Calculate separate totals for ASIN and SKU
        const asinItems = asinData.data || [];
        const skuItems = skuData.data || [];
        const asinTotalUnits = asinItems.reduce((sum, item) => sum + item.quantity, 0);
        const asinSoldUnits = asinItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);
        const skuTotalUnits = skuItems.reduce((sum, item) => sum + item.quantity, 0);
        const skuSoldUnits = skuItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);
        
        // Calculate restock eligibility (only ASIN items have this field)
        const restockEligible = asinItems.filter(item => item.eligible_for_restock === true).length;
        const nonRestockEligible = asinItems.filter(item => item.eligible_for_restock === false || item.eligible_for_restock === null).length;
        
        // Calculate items with missing SKU (only for ASIN)
        const missingSku = asinItems.filter(item => !item.sku || item.sku.trim() === '').length;
        
        // Calculate items with missing titles (only for ASIN)
        const missingTitles = asinItems.filter(item => !item.title || item.title.trim() === '').length;
        
        // Calculate items with missing images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('asin')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        const existingImageAsins = new Set((productImages || []).map(img => img.asin));
        const missingImages = asinItems.filter(item => !existingImageAsins.has(item.asin)).length;
        
        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          skuTotalUnits,
          skuSoldUnits,
          missingSku,
          missingTitles,
          missingImages,
          restockEligible,
          nonRestockEligible
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading metrics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadMissingSkuItems = async () => {
    try {
      if (showOnlyAsin || !showOnlySku) {
        // Load ASIN data with missing SKUs
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry)
          .or('sku.is.null,sku.eq.')
          .limit(50000);
        
        const allItems = (asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));
        
        setInventoryItems(allItems);
      } else {
        setInventoryItems([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading missing SKU items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadDetailedItems = async (metric: 'active' | 'instock' | 'outofstock' | 'restock-eligible' | 'non-restock-eligible') => {
    try {
      if (showOnlyAsin) {
        // Load only ASIN data
        const {
          data: asinData
        } = await supabase.from('asin_inventory').select('*').eq('country', selectedCountry).limit(50000); // Explicit high limit to override default 1000
        let allItems = (asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0);
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0);
        } else if (metric === 'restock-eligible') {
          allItems = allItems.filter(item => item.eligible_for_restock === true);
        } else if (metric === 'non-restock-eligible') {
          allItems = allItems.filter(item => item.eligible_for_restock === false || item.eligible_for_restock === null);
        }
        setInventoryItems(allItems);
      } else if (showOnlySku) {
        // Load only SKU data
        const {
          data: skuData
        } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry);
        let allItems = (skuData || []).map(item => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }));

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0);
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0);
        } else if (metric === 'restock-eligible') {
          allItems = allItems.filter(item => false); // SKU items don't have restock eligibility
        } else if (metric === 'non-restock-eligible') {
          allItems = allItems.filter(item => false); // SKU items don't have restock eligibility
        }
        setInventoryItems(allItems);
      } else {
        // Load both ASIN and SKU data
        const [asinData, skuData] = await Promise.all([supabase.from('asin_inventory').select('*').eq('country', selectedCountry).limit(50000), supabase.from('sku_inventory').select('*').eq('country', selectedCountry).limit(50000)]);
        let allItems = [...(asinData.data || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...(skuData.data || []).map(item => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }))];

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0);
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0);
        } else if (metric === 'restock-eligible') {
          allItems = allItems.filter(item => item.type === 'asin' && item.eligible_for_restock === true);
        } else if (metric === 'non-restock-eligible') {
          allItems = allItems.filter(item => item.type === 'asin' && (item.eligible_for_restock === false || item.eligible_for_restock === null));
        }
        setInventoryItems(allItems);
      }
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
      if (showOnlyAsin) {
        // Load only ASIN data
        let query = supabase.from('asin_inventory').select('*').eq('country', selectedCountry).eq('status', 'sold').limit(50000);

        // Apply date filters if set
        if (soldDateFrom) {
          query = query.gte('date_sold', soldDateFrom.toISOString());
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('date_sold', endDate.toISOString());
        }
        const {
          data: asinData
        } = await query;
        const allItems = (asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));
        setInventoryItems(allItems);
      } else if (showOnlySku) {
        // Load only SKU data
        let query = supabase.from('sku_inventory').select('*').eq('country', selectedCountry).eq('status', 'sold');

        // Apply date filters if set
        if (soldDateFrom) {
          query = query.gte('date_sold', soldDateFrom.toISOString());
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('date_sold', endDate.toISOString());
        }
        const {
          data: skuData
        } = await query;
        const allItems = (skuData || []).map(item => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }));
        setInventoryItems(allItems);
      } else {
        // Load both ASIN and SKU data
        let asinQuery = supabase.from('asin_inventory').select('*').eq('country', selectedCountry).eq('status', 'sold').limit(50000);
        let skuQuery = supabase.from('sku_inventory').select('*').eq('country', selectedCountry).eq('status', 'sold').limit(50000);

        // Apply date filters if set
        if (soldDateFrom) {
          asinQuery = asinQuery.gte('date_sold', soldDateFrom.toISOString());
          skuQuery = skuQuery.gte('date_sold', soldDateFrom.toISOString());
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          asinQuery = asinQuery.lte('date_sold', endDate.toISOString());
          skuQuery = skuQuery.lte('date_sold', endDate.toISOString());
        }
        const [asinData, skuData] = await Promise.all([asinQuery, skuQuery]);
        const allItems = [...(asinData.data || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...(skuData.data || []).map(item => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }))];
        setInventoryItems(allItems);
      }
    } catch (error: any) {
      toast({
        title: "Error loading sold items",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleMetricClick = async (metric: 'active' | 'instock' | 'outofstock' | 'restock-eligible' | 'non-restock-eligible') => {
    setSelectedMetric(metric);
    await loadDetailedItems(metric);
  };

  const loadMissingTitleItems = async () => {
    try {
      if (showOnlyAsin || !showOnlySku) {
        // Load ASIN data with missing titles
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry)
          .or('title.is.null,title.eq.')
          .limit(50000);
        
        const allItems = (asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));
        
        setInventoryItems(allItems);
      } else {
        setInventoryItems([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading missing title items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadMissingImageItems = async () => {
    try {
      if (showOnlyAsin || !showOnlySku) {
        // Get current user's product images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('asin')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        const existingImageAsins = new Set((productImages || []).map(img => img.asin));
        
        // Load ASIN data and filter for missing images
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*') 
          .eq('country', selectedCountry)
          .limit(50000);
        
        const allItems = (asinData || [])
          .filter(item => !existingImageAsins.has(item.asin))
          .map(item => ({
            ...item,
            type: 'asin' as const,
            identifier: `${item.asin} (${item.serial_number})`
          }));
        
        setInventoryItems(allItems);
      } else {
        setInventoryItems([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading missing image items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMissingTitlesClick = async () => {
    setSelectedMetric('missing-titles');
    await loadMissingTitleItems();
  };

  const handleMissingSkuClick = async () => {
    setSelectedMetric('missing-sku');
    await loadMissingSkuItems();
  };

  const handleMissingImagesClick = async () => {
    setSelectedMetric('missing-images');
    await loadMissingImageItems();
  };

  const handleRestockEligibleClick = async () => {
    setSelectedMetric('restock-eligible');
    await loadDetailedItems('restock-eligible');
  };

  const handleNonRestockEligibleClick = async () => {
    setSelectedMetric('non-restock-eligible');
    await loadDetailedItems('non-restock-eligible');
  };
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const exportData = filteredItems.map(item => ({
        'Type': item.type.toUpperCase(),
        'Identifier': item.identifier,
        'Quantity': item.quantity,
        'Status': item.status,
        'Country': item.country,
        'Date Added': new Date(item.date_added).toLocaleDateString(),
        'Date Sold': item.date_sold ? new Date(item.date_sold).toLocaleDateString() : ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedMetric}_inventory`);
      const filename = `${selectedMetric}_inventory_${selectedCountry}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast({
        title: "Export successful",
        description: `Exported ${filteredItems.length} items to ${filename}`
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
  useEffect(() => {
    if (selectedCountry) {
      loadMetrics();
    }
  }, [selectedCountry, soldDateFrom, soldDateTo]);
  const filteredItems = inventoryItems.filter(item => item.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || item.status.toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>;
  }
  return <>
      {/* Date Filter for Sold Units - Show only in ASIN mode */}
      {showOnlyAsin}

      <div className="grid gap-1 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 mb-3">
        {/* Active Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-primary"
          onClick={() => handleMetricClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                {showOnlyAsin ? 'Total ASINs' : showOnlySku ? 'Total SKUs' : 'Total Items'}
              </CardTitle>
              <div className="text-lg font-bold text-primary mt-1">{stats.activeItems}</div>
            </div>
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Activity className="h-3 w-3 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">
              {showOnlyAsin ? 'All ASIN records' : showOnlySku ? 'All SKU records' : 'All records'}
            </p>
          </CardContent>
        </Card>

        {/* Total Units */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-purple-500"
          onClick={() => setShowSoldModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Total Units</CardTitle>
              <div className="text-lg font-bold text-purple-600 mt-1">
                {showOnlyAsin ? stats.asinTotalUnits : showOnlySku ? stats.skuTotalUnits : stats.asinTotalUnits + stats.skuTotalUnits}
              </div>
            </div>
            <div className="w-6 h-6 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-3 w-3 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Inventory count</p>
          </CardContent>
        </Card>

        {/* In Stock */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-green-500"
          onClick={() => handleMetricClick('instock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">In Stock</CardTitle>
              <div className="text-lg font-bold text-green-600 mt-1">{stats.inStockItems}</div>
            </div>
            <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Available items</p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-red-500"
          onClick={() => handleMetricClick('outofstock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Out of Stock</CardTitle>
              <div className="text-lg font-bold text-red-600 mt-1">{stats.outOfStockItems}</div>
            </div>
            <div className="w-6 h-6 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-3 w-3 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Need restock</p>
          </CardContent>
        </Card>

        {/* Restock Eligible */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-blue-500"
          onClick={() => handleRestockEligibleClick()}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Restock Eligible</CardTitle>
              <div className="text-lg font-bold text-blue-600 mt-1">{stats.restockEligible}</div>
            </div>
            <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-3 w-3 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-1 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Ready to restock</p>
          </CardContent>
        </Card>

        {/* Non-Restock Eligible - Only show when viewing ASIN or combined view */}
        {(!showOnlySku) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-gray-500"
            onClick={() => handleNonRestockEligibleClick()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">Non-Restock</CardTitle>
                <div className="text-lg font-bold text-gray-600 mt-1">{stats.nonRestockEligible}</div>
              </div>
              <div className="w-6 h-6 bg-gray-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-3 w-3 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">Not for restock</p>
            </CardContent>
          </Card>
        )}

        {/* Missing SKU - Only show when viewing ASIN or combined view */}
        {(!showOnlySku) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-orange-500"
            onClick={handleMissingSkuClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">Missing SKU</CardTitle>
                <div className="text-lg font-bold text-orange-600 mt-1">{stats.missingSku}</div>
              </div>
              <div className="w-6 h-6 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="h-3 w-3 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">ASIN without SKU</p>
            </CardContent>
          </Card>
        )}

        {/* Missing Titles - Only show when viewing ASIN or combined view */}
        {(!showOnlySku) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-yellow-500"
            onClick={handleMissingTitlesClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">Missing Title</CardTitle>
                <div className="text-lg font-bold text-yellow-600 mt-1">{stats.missingTitles}</div>
              </div>
              <div className="w-6 h-6 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="h-3 w-3 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">ASIN without Title</p>
            </CardContent>
          </Card>
        )}

        {/* Missing Images - Only show when viewing ASIN or combined view */}
        {(!showOnlySku) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-pink-500"
            onClick={handleMissingImagesClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">Missing Images</CardTitle>
                <div className="text-lg font-bold text-pink-600 mt-1">{stats.missingImages}</div>
              </div>
              <div className="w-6 h-6 bg-pink-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-3 w-3 text-pink-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">ASIN without Images</p>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {selectedMetric === 'active' && 'All Active Items'}
              {selectedMetric === 'instock' && 'In Stock Items'}
              {selectedMetric === 'outofstock' && 'Out of Stock Items'}
              {selectedMetric === 'missing-sku' && 'Items with Missing SKU'}
              {selectedMetric === 'missing-titles' && 'Items with Missing Titles'}
              {selectedMetric === 'missing-images' && 'Items with Missing Images'}
              {selectedMetric === 'restock-eligible' && 'Restock Eligible Items'}
              {selectedMetric === 'non-restock-eligible' && 'Non-Restock Eligible Items'}
              <Badge variant="outline" className="ml-2">
                {filteredItems.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 border-2 focus:border-primary/50" />
            </div>
            <Button onClick={exportToExcel} disabled={exportLoading || filteredItems.length === 0} className="gap-2">
              {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Date Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.type === 'asin' ? 'default' : 'secondary'}>
                        {item.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.identifier}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' ? 'secondary' : item.status === 'ordered' ? 'outline' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.date_added).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {item.date_sold ? new Date(item.date_sold).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sold Units Modal */}
      <Dialog open={showSoldModal} onOpenChange={setShowSoldModal}>
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Sold Units
              <Badge variant="outline" className="ml-2">
                {inventoryItems.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {soldDateFrom ? format(soldDateFrom, "PPP") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={soldDateFrom} onSelect={setSoldDateFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {soldDateTo ? format(soldDateTo, "PPP") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={soldDateTo} onSelect={setSoldDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Button onClick={loadSoldItems}>
                Apply Filters
              </Button>

              <Button variant="outline" onClick={() => {
              setSoldDateFrom(undefined);
              setSoldDateTo(undefined);
              loadSoldItems();
            }}>
                Clear Dates
              </Button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search sold items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 border-2 focus:border-primary/50" />
            </div>

            <Button onClick={exportToExcel} disabled={exportLoading || filteredItems.length === 0} className="gap-2">
              {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Date Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.type === 'asin' ? 'default' : 'secondary'}>
                        {item.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.identifier}</TableCell>
                    <TableCell>
                      <span className="font-medium text-orange-600">
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.date_added).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {item.date_sold ? new Date(item.date_sold).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>;
}
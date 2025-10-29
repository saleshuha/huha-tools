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
    restockEligible: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'active' | 'instock' | 'outofstock' | 'sold' | 'missing-sku' | 'missing-titles' | 'missing-images' | 'restock-eligible' | 'no-stock' | 'ordered' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [soldDateFrom, setSoldDateFrom] = useState<Date>();
  const [soldDateTo, setSoldDateTo] = useState<Date>();
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showStockedOnly, setShowStockedOnly] = useState(false);
  const [catalogStats, setCatalogStats] = useState({
    noStock: 0,
    ordered: 0,
    sold: 0
  });
  const loadMetrics = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Loading metrics for country: ${selectedCountry}`);
      
      if (showOnlyAsin) {
        // Use count queries to get exact totals without data limits
        const [
          { count: totalCount, error: countError },
          { count: inStockCount, error: inStockError },  
          { count: outOfStockCount, error: outOfStockError },
          { data: soldData, error: soldError },
          { data: productImages, error: imagesError }
        ] = await Promise.all([
          // Total active count (exclude disabled items, optionally exclude no-stock)
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .neq('is_active', false as any)
            .not('status', 'eq', showStockedOnly ? 'no-stock' : null as any),
          
          // In stock count (quantity > 0 AND status = 'in-stock')
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .eq('status', 'in-stock' as any)
            .gt('quantity', 0 as any)
            .neq('is_active', false as any),
            
          // Out of stock count (quantity = 0 OR status out-of-stock/sold)
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .or('quantity.eq.0,status.eq.out-of-stock,status.eq.sold')
            .neq('is_active', false as any),
            
          // Sold items data (need actual data for quantity sum and date filtering)
          supabase
            .from('asin_inventory')
            .select('quantity, date_sold')
            .eq('country', selectedCountry as any)
            .eq('status', 'sold' as any),
            
          // Product images for missing images calculation
          supabase
            .from('product_images')
            .select('asin')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id as any)
        ]);
        
        if (countError) throw countError;
        if (inStockError) throw inStockError;
        if (outOfStockError) throw outOfStockError;
        if (soldError) throw soldError;
        if (imagesError) throw imagesError;
        
        console.log(`📊 Count Results:`, { 
          totalCount, 
          inStockCount, 
          outOfStockCount,
          soldItemsCount: soldData?.length || 0,
          country: selectedCountry 
        });
        
        // Get additional metrics that require data queries
        const [
          { count: missingSkuCount },
          { count: missingTitlesCount },
          { count: restockEligibleCount },
          { data: totalUnitsData }
        ] = await Promise.all([
          // Missing SKU count (only active items)
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .or('sku.is.null,sku.eq.')
            .neq('is_active', false as any),
            
          // Missing titles count (only active items)
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .or('title.is.null,title.eq.')
            .neq('is_active', false as any),
            
          // Restock eligible count (only active items)
          supabase
            .from('asin_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('country', selectedCountry as any)
            .eq('eligible_for_restock', true as any)
            .neq('is_active', false as any),
            
          // Get all quantities to calculate total units (only active items, optionally exclude no-stock) - FIXED
          supabase
            .from('asin_inventory')
            .select('quantity')
            .eq('country', selectedCountry as any)
            .neq('is_active', false as any)
            .not('status', 'eq', showStockedOnly ? 'no-stock' : null as any)
        ]);
        
        // Calculate metrics
        const activeItems = totalCount || 0;
        const inStockItems = inStockCount || 0;
        const outOfStockItems = outOfStockCount || 0;
        // Fixed: Sum all quantities without deduplication issues
        const asinTotalUnits = ((totalUnitsData as any) || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        
        // Filter sold units based on date filters
        let filteredSoldItems: any[] = (soldData as any) || [];
        if (soldDateFrom || soldDateTo) {
          filteredSoldItems = filteredSoldItems.filter((item: any) => {
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
        const asinSoldUnits = filteredSoldItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        
        // Calculate missing images
        // Calculate catalog stats (no-stock, ordered, sold) - only when NOT in stocked-only mode
        if (!showStockedOnly) {
          const [
            { count: noStockCount },
            { count: orderedCount }
          ] = await Promise.all([
            supabase
              .from('asin_inventory')
              .select('*', { count: 'exact', head: true })
              .eq('country', selectedCountry as any)
              .eq('status', 'no-stock' as any)
              .neq('is_active', false as any),
            supabase
              .from('asin_inventory')
              .select('*', { count: 'exact', head: true })
              .eq('country', selectedCountry as any)
              .eq('status', 'ordered' as any)
              .neq('is_active', false as any)
          ]);
          
          setCatalogStats({
            noStock: noStockCount || 0,
            ordered: orderedCount || 0,
            sold: soldData?.length || 0
          });
        }
        
        // Get unique ASINs from all data for missing images calculation
        const { data: allAsinsData } = await supabase
          .from('asin_inventory')
          .select('asin')
          .eq('country', selectedCountry as any)
          .neq('is_active', false as any);
        
        const existingImageAsins = new Set(((productImages as any) || []).map((img: any) => img.asin));
        const uniqueAsins = [...new Set(((allAsinsData as any) || []).map((item: any) => item.asin))];
        const missingImages = uniqueAsins.filter(asin => !existingImageAsins.has(asin)).length;
        
        console.log(`📈 Final ASIN Metrics:`, {
          activeItems,
          inStockItems, 
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          missingSkuCount: missingSkuCount || 0,
          missingTitlesCount: missingTitlesCount || 0,
          missingImages,
          showStockedOnly
        });
        
        // Set catalog stats - keep existing values if stocked-only mode
        if (!showStockedOnly) {
          // Catalog stats already set above
        }
        
        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          skuTotalUnits: 0,
          skuSoldUnits: 0,
          missingSku: missingSkuCount || 0,
          missingTitles: missingTitlesCount || 0,
          missingImages,
          restockEligible: restockEligibleCount || 0
        });
      } else if (showOnlySku) {
        // Load only SKU data (exclude disabled items)
        const {
          data: skuData
        } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any).limit(50000);
        const skuItems: any[] = (skuData as any) || [];
        const activeItems = skuItems.length;
        const inStockItems = skuItems.filter((item: any) => item.quantity > 0 && item.status === 'in-stock').length;
        const outOfStockItems = skuItems.filter((item: any) => item.quantity === 0 || item.status === 'out-of-stock' || item.status === 'sold').length;
        const skuTotalUnits = skuItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

        // Filter sold units based on date filters
        let soldItems = skuItems.filter((item: any) => item.status === 'sold');
        if (soldDateFrom || soldDateTo) {
          soldItems = soldItems.filter((item: any) => {
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
        const skuSoldUnits = soldItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
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
          restockEligible: 0
        });
      } else {
        // Load both ASIN and SKU data (exclude disabled items)
        const [asinData, skuData] = await Promise.all([
          supabase.from('asin_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any).limit(50000), 
          supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any).limit(50000)
        ]);

        // Calculate metrics
        const allItems = [...((asinData.data as any) || []).map((item: any) => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...((skuData.data as any) || []).map((item: any) => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }))];
        const activeItems = allItems.length;
        const inStockItems = allItems.filter((item: any) => item.quantity > 0 && item.status === 'in-stock').length;
        const outOfStockItems = allItems.filter((item: any) => item.quantity === 0 || item.status === 'out-of-stock' || item.status === 'sold').length;

        // Calculate separate totals for ASIN and SKU
        const asinItems: any[] = (asinData.data as any) || [];
        const skuItems: any[] = (skuData.data as any) || [];
        const asinTotalUnits = asinItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const asinSoldUnits = asinItems.filter((item: any) => item.status === 'sold').reduce((sum: number, item: any) => sum + item.quantity, 0);
        const skuTotalUnits = skuItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const skuSoldUnits = skuItems.filter((item: any) => item.status === 'sold').reduce((sum: number, item: any) => sum + item.quantity, 0);
        
        // Calculate items with missing SKU (only for ASIN)
        const missingSku = asinItems.filter(item => !item.sku || item.sku.trim() === '').length;
        
        // Calculate items with missing titles (only for ASIN)
        const missingTitles = asinItems.filter(item => !item.title || item.title.trim() === '').length;
        
        // Calculate items with missing images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('asin')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id as any);
        
        const existingImageAsins = new Set(((productImages as any) || []).map((img: any) => img.asin));
        const missingImages = asinItems.filter((item: any) => !existingImageAsins.has(item.asin)).length;
        
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
          restockEligible: 0
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
          .eq('country', selectedCountry as any)
          .or('sku.is.null,sku.eq.')
          .neq('is_active', false as any)
          .limit(50000);
        
        const allItems = ((asinData as any) || []).map((item: any) => ({
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

  const loadDetailedItems = async (metric: 'active' | 'instock' | 'outofstock' | 'restock-eligible') => {
    try {
      if (showOnlyAsin) {
        // Build base query
        let query = supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry as any)
          .neq('is_active', false as any);
        
        // Apply stocked filter if enabled
        if (showStockedOnly) {
          query = query.not('status', 'eq', 'no-stock');
        }
        
        const { data: asinData } = await query.limit(50000);
        
        let allItems = ((asinData as any) || []).map((item: any) => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0 && item.status === 'in-stock');
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0 || item.status === 'out-of-stock' || item.status === 'sold');
        } else if (metric === 'restock-eligible') {
          allItems = allItems.filter(item => item.eligible_for_restock === true);
        }
        setInventoryItems(allItems);
      } else if (showOnlySku) {
        // Load only SKU data (exclude disabled items)
        const {
          data: skuData
        } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any);
        let allItems = ((skuData as any) || []).map((item: any) => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }));

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0 && item.status === 'in-stock');
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0 || item.status === 'out-of-stock' || item.status === 'sold');
        }
        setInventoryItems(allItems);
      } else {
        // Load both ASIN and SKU data (exclude disabled items)
        const [asinData, skuData] = await Promise.all([
          supabase.from('asin_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any).limit(50000), 
          supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).neq('is_active', false as any).limit(50000)
        ]);
        let allItems = [...((asinData.data as any) || []).map((item: any) => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...((skuData.data as any) || []).map((item: any) => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }))];

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0 && item.status === 'in-stock');
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0 || item.status === 'out-of-stock' || item.status === 'sold');
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
        // Load only ASIN data (exclude disabled items)
        let query = supabase.from('asin_inventory').select('*').eq('country', selectedCountry as any).eq('status', 'sold' as any).neq('is_active', false as any).limit(50000);

        // Apply date filters if set
        if (soldDateFrom) {
          query = query.gte('date_sold', soldDateFrom.toISOString() as any);
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('date_sold', endDate.toISOString() as any);
        }
        const {
          data: asinData
        } = await query;
        const allItems = ((asinData as any) || []).map((item: any) => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));
        setInventoryItems(allItems);
      } else if (showOnlySku) {
        // Load only SKU data (exclude disabled items)
        let query = supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).eq('status', 'sold' as any).neq('is_active', false as any).limit(50000);

        // Apply date filters if set
        if (soldDateFrom) {
          query = query.gte('date_sold', soldDateFrom.toISOString() as any);
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('date_sold', endDate.toISOString() as any);
        }
        const {
          data: skuData
        } = await query;
        const allItems = ((skuData as any) || []).map((item: any) => ({
          ...item,
          type: 'sku' as const,
          identifier: `${item.sku_number} (${item.bin_serial_number})`
        }));
        setInventoryItems(allItems);
      } else {
        // Load both ASIN and SKU data (exclude disabled items)
        let asinQuery = supabase.from('asin_inventory').select('*').eq('country', selectedCountry as any).eq('status', 'sold' as any).neq('is_active', false as any).limit(50000);
        let skuQuery = supabase.from('sku_inventory').select('*').eq('country', selectedCountry as any).eq('status', 'sold' as any).neq('is_active', false as any).limit(50000);

        // Apply date filters if set
        if (soldDateFrom) {
          asinQuery = asinQuery.gte('date_sold', soldDateFrom.toISOString() as any);
          skuQuery = skuQuery.gte('date_sold', soldDateFrom.toISOString() as any);
        }
        if (soldDateTo) {
          const endDate = new Date(soldDateTo);
          endDate.setHours(23, 59, 59, 999);
          asinQuery = asinQuery.lte('date_sold', endDate.toISOString() as any);
          skuQuery = skuQuery.lte('date_sold', endDate.toISOString() as any);
        }
        const [asinData, skuData] = await Promise.all([asinQuery, skuQuery]);
        const allItems = [...((asinData.data as any) || []).map((item: any) => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        })), ...((skuData.data as any) || []).map((item: any) => ({
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
  const handleMetricClick = async (metric: 'active' | 'instock' | 'outofstock' | 'restock-eligible') => {
    setSelectedMetric(metric);
    await loadDetailedItems(metric);
  };

  const loadMissingTitleItems = async () => {
    try {
      if (showOnlyAsin || !showOnlySku) {
        // Load ASIN data with missing titles (exclude disabled items)
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry as any)
          .or('title.is.null,title.eq.')
          .neq('is_active', false as any)
          .limit(50000);
        
        const allItems = ((asinData as any) || []).map((item: any) => ({
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
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id as any);
        
        const existingImageAsins = new Set(((productImages as any) || []).map((img: any) => img.asin));
        
        // Load ASIN data and filter for missing images (exclude disabled items)
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*') 
          .eq('country', selectedCountry as any)
          .neq('is_active', false as any)
          .limit(50000);
        
        const allItems: any[] = ((asinData as any) || [])
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

  const loadNoStockItems = async () => {
    try {
      if (showOnlyAsin) {
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry as any)
          .eq('status', 'no-stock' as any)
          .neq('is_active', false as any)
          .limit(50000);
        
        const allItems = ((asinData as any) || []).map((item: any) => ({
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
        title: "Error loading no-stock items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadOrderedItems = async () => {
    try {
      if (showOnlyAsin) {
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry as any)
          .eq('status', 'ordered' as any)
          .neq('is_active', false as any)
          .limit(50000);
        
        const allItems = ((asinData as any) || []).map((item: any) => ({
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
        title: "Error loading ordered items",
        description: error.message,
        variant: "destructive"
      });
    }
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
  }, [selectedCountry, soldDateFrom, soldDateTo, showStockedOnly]);
  const filteredItems = inventoryItems.filter(item => item.identifier.toLowerCase().includes(searchTerm.toLowerCase()) || item.status.toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>;
  }
  // Calculate stocked items count (items that have or had physical inventory)
  const stockedItemsCount = stats.inStockItems + stats.outOfStockItems;
  const totalCatalogItems = stats.activeItems;
  
  return <>
      {/* Filter Toggle */}
      {showOnlyAsin && (
        <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base font-semibold">
                📍 {selectedCountry}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {showStockedOnly 
                  ? `${stockedItemsCount} Stocked Products` 
                  : `${totalCatalogItems} Total Products`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showStockedOnly ? "outline" : "default"}
              size="sm"
              onClick={() => setShowStockedOnly(false)}
              className="gap-2"
            >
              <Package className="w-4 h-4" />
              All Products
            </Button>
            <Button
              variant={showStockedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStockedOnly(true)}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Stocked Only
            </Button>
          </div>
        </div>
      )}

      {/* Inventory Overview Section */}
      {showOnlyAsin && !showStockedOnly && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Physical Inventory Overview
          </h3>
        </div>
      )}

      <div className="grid gap-1 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 mb-3">
        {/* Active Items */}
        {!showStockedOnly && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-primary"
            onClick={() => handleMetricClick('active')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                  {showOnlyAsin ? 'Total Products' : showOnlySku ? 'Total SKUs' : 'Total Items'}
                </CardTitle>
                <div className="text-lg font-bold text-primary mt-1">{stats.activeItems}</div>
              </div>
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="h-3 w-3 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">
                {showOnlyAsin ? 'In catalog' : showOnlySku ? 'All SKU records' : 'All records'}
              </p>
            </CardContent>
          </Card>
        )}

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

        {/* Restock Eligible - Only show when viewing ASIN or combined view */}
        {(!showOnlySku) && (
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-cyan-500"
            onClick={() => handleMetricClick('restock-eligible')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">Restock Eligible</CardTitle>
                <div className="text-lg font-bold text-cyan-600 mt-1">{stats.restockEligible}</div>
              </div>
              <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-3 w-3 text-cyan-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground truncate">Ready to reorder</p>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Catalog Overview Section - Only show in All Products view */}
      {showOnlyAsin && !showStockedOnly && (
        <>
          <div className="mt-6 mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Catalog Status Overview
            </h3>
          </div>
          
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-6">
            {/* No Stock Items */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20 h-24 flex flex-col border-l-4 border-l-amber-500"
              onClick={async () => {
                setSelectedMetric('no-stock');
                await loadNoStockItems();
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate">Never Stocked</CardTitle>
                  <div className="text-xl font-bold text-amber-600 mt-1">{catalogStats.noStock}</div>
                </div>
                <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 flex-shrink-0">
                <p className="text-xs text-muted-foreground truncate">Awaiting first stock</p>
              </CardContent>
            </Card>

            {/* Ordered Items */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 h-24 flex flex-col border-l-4 border-l-blue-500"
              onClick={async () => {
                setSelectedMetric('ordered');
                await loadOrderedItems();
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate">In Transit</CardTitle>
                  <div className="text-xl font-bold text-blue-600 mt-1">{catalogStats.ordered}</div>
                </div>
                <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 flex-shrink-0">
                <p className="text-xs text-muted-foreground truncate">Ordered, awaiting delivery</p>
              </CardContent>
            </Card>

            {/* Sold Items */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-slate-500/30 bg-gradient-to-br from-slate-50/50 to-background dark:from-slate-950/20 h-24 flex flex-col border-l-4 border-l-slate-500"
              onClick={() => setShowSoldModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate">Historical</CardTitle>
                  <div className="text-xl font-bold text-slate-600 mt-1">{catalogStats.sold}</div>
                </div>
                <div className="w-8 h-8 bg-slate-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 flex-shrink-0">
                <p className="text-xs text-muted-foreground truncate">Previously sold out</p>
              </CardContent>
            </Card>

            {/* Stock Distribution Summary */}
            <Card className="border-2 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate">Stocked Rate</CardTitle>
                  <div className="text-xl font-bold text-primary mt-1">
                    {totalCatalogItems > 0 ? Math.round((stockedItemsCount / totalCatalogItems) * 100) : 0}%
                  </div>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 flex-shrink-0">
                <p className="text-xs text-muted-foreground truncate">
                  {stockedItemsCount} of {totalCatalogItems}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

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
              {selectedMetric === 'no-stock' && 'Never Stocked Items (Awaiting First Stock)'}
              {selectedMetric === 'ordered' && 'Items In Transit (Ordered)'}
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
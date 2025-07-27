import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  Download,
  RefreshCw,
  Search,
  BarChart3,
  Clock,
  ShoppingCart,
  Activity,
  DollarSign,
  Database,
  PieChart,
  LineChart,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Truck,
  ArrowRight,
  Target,
  Zap
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  Legend
} from 'recharts';

interface RestockItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  days_since_last_restock: number | null;
  status: string; // Added status from database
}

interface SalesData {
  period: string;
  asin_sold: number;
  sku_sold: number;
  total_sold: number;
  asin_restocked: number;
  sku_restocked: number;
  total_restocked: number;
  sell_rate: number;
}

interface DialogData {
  isOpen: boolean;
  title: string;
  items: RestockItem[];
  type: 'critical' | 'ordered' | 'active' | 'sales' | 'restocks';
}

interface TrendsItem {
  id: string;
  identifier: string;
  table_name: string;
  current_quantity: number;
  sold_quantity: number;
  last_sold_date: string | null;
  days_since_last_restock: number | null;
  sell_rate: number;
}

export function Replenishment() {
  const { selectedCountry } = useCountry();
  const { inventoryMetrics, loading: analyticsLoading, loadAnalytics } = useInventoryAnalytics();
  const { toast } = useToast();
  
  const [dialogData, setDialogData] = useState<DialogData>({ isOpen: false, title: '', items: [], type: 'critical' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Trends state
  const [trendsSearchTerm, setTrendsSearchTerm] = useState('');
  const [trendsDateRange, setTrendsDateRange] = useState('30d');
  const [trendsItemType, setTrendsItemType] = useState('all');
  const [trendsSortBy, setTrendsSortBy] = useState('sold_desc');
  const [trendsItems, setTrendsItems] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // AI Forecasting state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Load restock items needing attention (excludes already ordered items)
  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);
      const { data, error } = await supabase.rpc('get_items_needing_restock', { 
        country_filter: selectedCountry 
      });
      if (error) throw error;
      
      console.log('Raw restock data from function:', data);
      
      // The database function now excludes ordered items and returns status
      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id, // Use item_id directly from the database function
        // status comes directly from database now
      })).filter(item => item.status !== 'ordered'); // Extra filter to ensure no ordered items
      
      console.log('First item structure:', itemsWithStatus[0]);
      setRestockItems(itemsWithStatus);
      console.log('Set restock items for', selectedCountry, ':', itemsWithStatus.length, 'items');
    } catch (error: any) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error loading restock items",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load ordered items separately for analytics and display
  const loadOrderedItems = async () => {
    try {
      const [asinOrdered, skuOrdered] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('id, asin, serial_number, quantity, status, days_since_last_restock:last_restock_date')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .eq('quantity', 0),
        supabase
          .from('sku_inventory')
          .select('id, sku_number, bin_serial_number, quantity, status, days_since_last_restock:last_restock_date')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .eq('quantity', 0)
      ]);

      if (asinOrdered.error) throw asinOrdered.error;
      if (skuOrdered.error) throw skuOrdered.error;

      const orderedItemsData = [
        ...(asinOrdered.data || []).map(item => ({
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: 'asin_inventory',
          status: item.status,
          days_since_last_restock: item.days_since_last_restock ? 
            Math.floor((Date.now() - new Date(item.days_since_last_restock).getTime()) / (1000 * 60 * 60 * 24)) : null
        })),
        ...(skuOrdered.data || []).map(item => ({
          id: item.id,
          identifier: `${item.sku_number} (${item.bin_serial_number})`,
          current_quantity: item.quantity,
          table_name: 'sku_inventory',
          status: item.status,
          days_since_last_restock: item.days_since_last_restock ? 
            Math.floor((Date.now() - new Date(item.days_since_last_restock).getTime()) / (1000 * 60 * 60 * 24)) : null
        }))
      ];

      return orderedItemsData;
    } catch (error: any) {
      console.error('Error loading ordered items:', error);
      return [];
    }
  };

  // Calculate sales data for different periods
  const calculateSalesData = async () => {
    try {
      const periods = [1, 3, 7, 15, 30, 45, 60, 90];
      const salesAnalytics: SalesData[] = [];

      for (const days of periods) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Query ASIN inventory for sales data
        let asinSalesQuery = supabase
          .from('asin_inventory')
          .select('*')
          .eq('status', 'sold')
          .eq('country', selectedCountry)  // Filter by selected country
          .gte('date_sold', startDate.toISOString());

        let asinRestockQuery = supabase
          .from('asin_inventory')
          .select('restock_quantity')
          .eq('country', selectedCountry)  // Filter by selected country
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        let skuSalesQuery = supabase
          .from('sku_inventory')
          .select('*')
          .eq('status', 'sold')
          .eq('country', selectedCountry)  // Filter by selected country
          .gte('date_sold', startDate.toISOString());

        let skuRestockQuery = supabase
          .from('sku_inventory')
          .select('restock_quantity')
          .eq('country', selectedCountry)  // Filter by selected country
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        const [asinSalesData, asinRestockData, skuSalesData, skuRestockData] = await Promise.all([
          asinSalesQuery,
          asinRestockQuery,
          skuSalesQuery,
          skuRestockQuery
        ]);

        if (asinSalesData.error) throw asinSalesData.error;
        if (asinRestockData.error) throw asinRestockData.error;
        if (skuSalesData.error) throw skuSalesData.error;
        if (skuRestockData.error) throw skuRestockData.error;

        const asinSoldCount = asinSalesData.data?.length || 0;
        const skuSoldCount = skuSalesData.data?.length || 0;
        const totalSold = asinSoldCount + skuSoldCount;

        const asinRestockedQty = asinRestockData.data?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0;
        const skuRestockedQty = skuRestockData.data?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0;
        const totalRestocked = asinRestockedQty + skuRestockedQty;

        salesAnalytics.push({
          period: `${days}d`,
          asin_sold: asinSoldCount,
          sku_sold: skuSoldCount,
          total_sold: totalSold,
          asin_restocked: asinRestockedQty,
          sku_restocked: skuRestockedQty,
          total_restocked: totalRestocked,
          sell_rate: totalSold / days
        });
      }

      setSalesData(salesAnalytics);
    } catch (error: any) {
      toast({
        title: "Error calculating sales data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load all data with optimized parallel loading
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load critical data first (restock items), then load analytics in background
      await loadRestockItems();
      
      // Load analytics data in parallel without blocking the UI
      Promise.all([
        calculateSalesData(),
        loadAnalytics(selectedCountry)
      ]).catch(error => {
        console.error('Error loading analytics data:', error);
        toast({
          title: "Analytics Error",
          description: "Some analytics data may not be available",
          variant: "destructive",
        });
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter restock items - show all critical stock items (qty=0) regardless of status
  const filteredRestockItems = restockItems.filter(item => {
    if (!searchTerm.trim()) return true;
    
    // Support bulk search - split by space and search for any match
    const searchTerms = searchTerm.toLowerCase().split(' ').map(term => term.trim()).filter(Boolean);
    
    return searchTerms.some(term => 
      item.identifier.toLowerCase().includes(term)
    );
  });

  // Since database function now excludes ordered items, all filtered items are pending
  const pendingItems = filteredRestockItems;
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);

  // Bulk selection handlers - only allow selection of pending items
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = pendingItems.map(item => item.id);
      setSelectedItems(new Set(allItemIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    console.log('handleSelectItem called with:', { itemId, checked, currentSelected: Array.from(selectedItems) });
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      console.log('New selected items:', Array.from(newSelected));
      return newSelected;
    });
  };

  const handleBulkMarkAsOrdered = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      // Update each item in database
      const updatePromises = Array.from(selectedItems).map(async (itemId) => {
        const item = restockItems.find(i => i.id === itemId);
        if (!item) return;

        if (item.table_name === 'asin_inventory') {
          return supabase
            .from('asin_inventory')
            .update({ status: 'ordered' })
            .eq('id', itemId);
        } else if (item.table_name === 'sku_inventory') {
          return supabase
            .from('sku_inventory')
            .update({ status: 'ordered' })
            .eq('id', itemId);
        }
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result?.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items`);
      }

      // Remove items from restock list and add to ordered items
      const updatedItems = Array.from(selectedItems).map(itemId => {
        const item = restockItems.find(i => i.id === itemId);
        return item ? { ...item, status: 'ordered' } : null;
      }).filter(Boolean) as RestockItem[];

      setRestockItems(prev => prev.filter(item => !selectedItems.has(item.id)));
      setOrderedItems(prev => [...prev, ...updatedItems]);
      setSelectedItems(new Set());
      
      toast({
        title: "Bulk Order Status Updated",
        description: `${selectedItems.size} items marked as ordered from supplier`,
      });
    } catch (error) {
      console.error('Error bulk updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update some items",
        variant: "destructive",
      });
    }
  };

  // Mark item as ordered from supplier
  const markAsOrdered = async (itemId: string) => {
    const item = restockItems.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      toast({
        title: "Error",
        description: "Item not found",
        variant: "destructive",
      });
      return;
    }

    console.log('Marking item as ordered:', { itemId, tableType: item.table_name, item });

    try {
      let updateResult;
      
      // Update status in database using the correct ID
      if (item.table_name === 'asin_inventory') {
        updateResult = await supabase
          .from('asin_inventory')
          .update({ status: 'ordered' })
          .eq('id', itemId);
        console.log('ASIN update result:', updateResult);
      } else if (item.table_name === 'sku_inventory') {
        updateResult = await supabase
          .from('sku_inventory')
          .update({ status: 'ordered' })
          .eq('id', itemId);
        console.log('SKU update result:', updateResult);
      } else {
        throw new Error(`Unknown table type: ${item.table_name}`);
      }

      if (updateResult.error) {
        console.error('Database update error:', updateResult.error);
        throw updateResult.error;
      }

      console.log('Database update successful, updating local state...');

      // Remove item from restock list and add to ordered items
      const updatedItem = restockItems.find(i => i.id === itemId);
      if (updatedItem) {
        setRestockItems(prev => prev.filter(item => item.id !== itemId));
        setOrderedItems(prev => [...prev, { ...updatedItem, status: 'ordered' }]);
      }
      
      toast({
        title: "Order Status Updated",
        description: "Item marked as ordered from supplier",
      });

    } catch (error: any) {
      console.error('Error marking item as ordered:', error);
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Export data functions
  const exportSalesData = () => {
    const csvContent = [
      ['Period', 'ASIN Sold', 'SKU Sold', 'Total Sold', 'ASIN Restocked', 'SKU Restocked', 'Total Restocked', 'Daily Sell Rate'],
      ...salesData.map(item => [
        item.period,
        item.asin_sold,
        item.sku_sold, 
        item.total_sold,
        item.asin_restocked,
        item.sku_restocked,
        item.total_restocked,
        item.sell_rate.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `sales-data-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportRestockData = () => {
    const filteredItems = restockItems.filter(item => 
      item.status === 'pending' &&
      item.identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const csvContent = [
      ['Type', 'Identifier', 'Current Quantity', 'Days Since Restock', 'Status'],
      ...filteredItems.map(item => [
        item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
        item.identifier,
        item.current_quantity,
        item.days_since_last_restock || 'Never',
        item.status
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `restock-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportOrderedData = () => {
    const orderedItemsList = orderedItems.filter(item => item.status === 'ordered');

    const csvContent = [
      ['Type', 'Identifier', 'Current Quantity', 'Days Since Restock', 'Order Status', 'Date Marked'],
      ...orderedItemsList.map(item => [
        item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
        item.identifier,
        item.current_quantity,
        item.days_since_last_restock || 'Never',
        item.status,
        new Date().toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `ordered-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Data exported as ${filename}`,
    });
  };

  // Load trends data
  const loadTrendsData = async () => {
    setTrendsLoading(true);
    try {
      const daysNum = parseInt(trendsDateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // Get ASIN data
      const asinQuery = supabase
        .from('asin_inventory')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('country', selectedCountry);

      // Get SKU data
      const skuQuery = supabase
        .from('sku_inventory')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('country', selectedCountry);

      const [asinResult, skuResult] = await Promise.all([asinQuery, skuQuery]);

      if (asinResult.error) throw asinResult.error;
      if (skuResult.error) throw skuResult.error;

      // Process ASIN items
      const asinItems: TrendsItem[] = (asinResult.data || []).map(item => {
        const soldInPeriod = item.date_sold && new Date(item.date_sold) >= startDate ? 1 : 0;
        const sellRate = soldInPeriod / daysNum;

        return {
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          table_name: 'asin_inventory',
          current_quantity: item.quantity || 0,
          sold_quantity: soldInPeriod,
          last_sold_date: item.date_sold,
          days_since_last_restock: item.last_restock_date ? 
            Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          sell_rate: sellRate
        };
      });

      // Process SKU items
      const skuItems: TrendsItem[] = (skuResult.data || []).map(item => {
        const soldInPeriod = item.date_sold && new Date(item.date_sold) >= startDate ? 1 : 0;
        const sellRate = soldInPeriod / daysNum;

        return {
          id: item.id,
          identifier: `${item.sku_number} (${item.bin_serial_number})`,
          table_name: 'sku_inventory',
          current_quantity: item.quantity || 0,
          sold_quantity: soldInPeriod,
          last_sold_date: item.date_sold,
          days_since_last_restock: item.last_restock_date ? 
            Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          sell_rate: sellRate
        };
      });

      // Combine and filter by type
      let combinedItems = [...asinItems, ...skuItems];
      
      if (trendsItemType === 'asin') {
        combinedItems = asinItems;
      } else if (trendsItemType === 'sku') {
        combinedItems = skuItems;
      }

      setTrendsItems(combinedItems);
    } catch (error: any) {
      console.error('Error loading trends data:', error);
      toast({
        title: "Error loading trends data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTrendsLoading(false);
    }
  };

  // Filter and sort trends items
  const filteredTrendsItems = trendsItems
    .filter(item => {
      if (!trendsSearchTerm.trim()) return true;
      const searchLower = trendsSearchTerm.toLowerCase();
      return item.identifier.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => {
      switch (trendsSortBy) {
        case 'sold_desc':
          return b.sold_quantity - a.sold_quantity;
        case 'sold_asc':
          return a.sold_quantity - b.sold_quantity;
        case 'recent':
          if (!a.last_sold_date && !b.last_sold_date) return 0;
          if (!a.last_sold_date) return 1;
          if (!b.last_sold_date) return -1;
          return new Date(b.last_sold_date).getTime() - new Date(a.last_sold_date).getTime();
        case 'quantity_low':
          return a.current_quantity - b.current_quantity;
        default:
          return 0;
      }
    });

  // Export trends data
  const exportTrendsData = () => {
    const csvContent = [
      ['Type', 'Identifier', 'Current Stock', 'Sold Quantity', 'Sell Rate/Day', 'Last Sold', 'Days Since Restock', 'Stock Status'],
      ...filteredTrendsItems.map(item => [
        item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
        item.identifier,
        item.current_quantity,
        item.sold_quantity,
        item.sell_rate.toFixed(2),
        item.last_sold_date ? new Date(item.last_sold_date).toLocaleDateString() : 'Never',
        item.days_since_last_restock || 'Never',
        item.current_quantity <= 5 ? 'Critical' : 
        item.current_quantity <= 10 ? 'Low' : 'Good'
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `trends-analysis-${selectedCountry}-${trendsDateRange}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // AI Forecasting functions
  const generateForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-inventory-forecast', {
        body: {
          country: selectedCountry,
          itemType: 'all',
          analysisDepth: 'standard'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setForecastData(data);
      toast({
        title: "AI Forecast Generated",
        description: `Analysis completed for ${data?.items_analyzed || 0} items`,
      });
    } catch (error: any) {
      console.error('Error generating forecast:', error);
      setForecastError(error.message);
      toast({
        title: "Forecast Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setForecastLoading(false);
    }
  };

  const exportForecastData = () => {
    if (!forecastData?.forecasts) return;

    const csvContent = [
      ['Item', 'Current Stock', 'Days Until Stockout', 'Reorder Point', 'Risk Level', 'Confidence', 'Trend', 'Key Insights'],
      ...forecastData.forecasts.map((item: any) => [
        item.identifier,
        item.current_stock,
        item.predicted_days_until_stockout,
        item.recommended_reorder_point,
        item.risk_level,
        `${item.confidence_score}%`,
        item.seasonal_trend,
        (item.insights || []).join('; ')
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `ai-forecast-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Dialog handlers for metric cards
  const openCriticalStockDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Critical Stock Items (0 Units)',
      items: filteredRestockItems, // Show all critical items regardless of status
      type: 'critical'
    });
  };

  const openOrderedItemsDialog = async () => {
    const orderedItemsData = await loadOrderedItems();
    setDialogData({
      isOpen: true,
      title: 'Items Ordered from Supplier',
      items: orderedItemsData,
      type: 'ordered'
    });
  };

  const openActiveItemsDialog = async () => {
    try {
      // Get all active items from both tables
      const [asinData, skuData] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry)
          .eq('status', 'in-stock'),
        supabase
          .from('sku_inventory')
          .select('*')
          .eq('country', selectedCountry)
          .eq('status', 'in-stock')
      ]);

      if (asinData.error) throw asinData.error;
      if (skuData.error) throw skuData.error;

      const activeItemsData = [
        ...(asinData.data || []).map(item => ({
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: 'asin_inventory',
          status: item.status,
          days_since_last_restock: item.last_restock_date ? 
            Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
        })),
        ...(skuData.data || []).map(item => ({
          id: item.id,
          identifier: `${item.sku_number} (${item.bin_serial_number})`,
          current_quantity: item.quantity,
          table_name: 'sku_inventory',
          status: item.status,
          days_since_last_restock: item.last_restock_date ? 
            Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
        }))
      ];

      setDialogData({
        isOpen: true,
        title: 'Active Inventory Items',
        items: activeItemsData,
        type: 'active'
      });
    } catch (error: any) {
      toast({
        title: "Error loading active items",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Optimized real-time subscriptions - only reload specific data that changed
  useEffect(() => {
    if (!selectedCountry) return;

    const channels = [
      supabase
        .channel('asin-inventory-realtime')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        }, () => {
          // Only reload critical stock items on quantity changes
          loadRestockItems();
        }),
      supabase
        .channel('sku-inventory-realtime')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sku_inventory',
          filter: `country=eq.${selectedCountry}`
        }, () => {
          // Only reload critical stock items on quantity changes
          loadRestockItems();
        })
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [selectedCountry]);

  // Load data on country change
  useEffect(() => {
    const loadData = async () => {
      await loadAllData();
      const orderedItemsData = await loadOrderedItems();
      setOrderedItems(orderedItemsData);
    };
    loadData();
  }, [selectedCountry]);

  // Load trends data when filters change
  useEffect(() => {
    loadTrendsData();
  }, [selectedCountry, trendsDateRange, trendsItemType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading sales & replenishment data...</p>
        </div>
      </div>
    );
  }


  // Chart configurations with updated SKU color scheme
  const chartConfig = {
    total_sold: { label: "Total Sold", color: "hsl(var(--primary))" },
    total_restocked: { label: "Total Restocked", color: "hsl(var(--secondary))" },
    asin_sold: { label: "ASIN Sold", color: "hsl(var(--chart-1))" },
    sku_sold: { label: "SKU Sold", color: "hsl(220, 70%, 50%)" }, // Changed to blue scheme
    sell_rate: { label: "Daily Rate", color: "hsl(var(--accent))" }
  };

  const selectedPeriodData = salesData.find(d => d.period === selectedPeriod);
  const totalSales30d = salesData.find(d => d.period === '30d')?.total_sold || 0;
  const totalRestocks30d = salesData.find(d => d.period === '30d')?.total_restocked || 0;

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-none">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales & Replenishment Dashboard</h2>
          <p className="text-muted-foreground">Real-time analytics for {selectedCountry}</p>
        </div>
        <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Critical Stock Items */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-destructive" onClick={openCriticalStockDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-medium text-muted-foreground">Critical Stock</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{pendingItems.length}</p>
                <p className="text-xs text-destructive">Out of stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Ordered */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4" style={{ borderLeftColor: 'hsl(220, 70%, 50%)' }} onClick={openOrderedItemsDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4" style={{ color: 'hsl(220, 70%, 50%)' }} />
                  <p className="text-xs font-medium text-muted-foreground">Ordered</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{orderedItems.length}</p>
                <p className="text-xs" style={{ color: 'hsl(220, 70%, 50%)' }}>From supplier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales (30 days) */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-primary" onClick={openActiveItemsDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Sales (30d)</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalSales30d}</p>
                <p className="text-xs text-primary">Units sold</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Restocks (30 days) */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-secondary" />
                  <p className="text-xs font-medium text-muted-foreground">Restocks (30d)</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalRestocks30d}</p>
                <p className="text-xs text-secondary">Units restocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Sell Rate */}
        <Card className="glass-container hover-scale transition-all duration-300 hover:shadow-glow border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-accent" />
                  <p className="text-xs font-medium text-muted-foreground">Daily Rate</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'}
                </p>
                <p className="text-xs text-accent">Units/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Ratio */}
        <Card className="glass-container hover-scale transition-all duration-300 hover:shadow-glow border-l-4 border-l-chart-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-chart-1" />
                  <p className="text-xs font-medium text-muted-foreground">Stock Ratio</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {totalRestocks30d > 0 ? ((totalSales30d / totalRestocks30d) * 100).toFixed(0) : '0'}%
                </p>
                <p className="text-xs text-chart-1">Efficiency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 p-2 bg-gradient-subtle rounded-xl shadow-elegant">
          <TabsTrigger value="sales" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">📊 Sales Analytics</TabsTrigger>
          <TabsTrigger value="restock" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">📦 Restock Management</TabsTrigger>
          <TabsTrigger value="trends" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">📈 Trends & Forecasting</TabsTrigger>
        </TabsList>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Sales Performance Analytics</h3>
              <p className="text-muted-foreground">Track sales across different time periods</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="15d">15 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="45d">45 Days</SelectItem>
                  <SelectItem value="60d">60 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportSalesData} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold mb-2">Visual Analytics</h4>
              <p className="text-sm text-muted-foreground">Choose your preferred chart layout and style</p>
            </div>
            <Select value="default" onValueChange={() => {}}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chart Layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Side by Side</SelectItem>
                <SelectItem value="stacked">Stacked View</SelectItem>
                <SelectItem value="grid">Grid Layout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Sales vs Restocks Compact Chart */}
            <Card className="glass-container hover-scale transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LineChart className="w-4 h-4" />
                  Sales vs Restocks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer config={chartConfig} className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="period" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total_sold" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                        name="Sold"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total_restocked" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--secondary))", strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 4, fill: "hsl(var(--secondary))" }}
                        name="Restocked"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* ASIN vs SKU Compact Bar Chart */}
            <Card className="glass-container hover-scale transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  ASIN vs SKU Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer config={chartConfig} className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={salesData.slice(-6)} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="period" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="asin_sold" 
                        fill="hsl(var(--chart-1))" 
                        name="ASIN" 
                        radius={[2, 2, 0, 0]} 
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="sku_sold" 
                        fill="hsl(220, 70%, 50%)" 
                        name="SKU" 
                        radius={[2, 2, 0, 0]} 
                        maxBarSize={40}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Daily Sell Rate Compact Area Chart */}
            <Card className="glass-container hover-scale transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  Sell Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer config={chartConfig} className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <defs>
                        <linearGradient id="sellRateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="period" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sell_rate" 
                        stroke="hsl(var(--accent))" 
                        fill="url(#sellRateGradient)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--accent))", strokeWidth: 0, r: 2 }}
                        name="Rate/Day"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Performance Distribution Mini Pie Chart */}
            <Card className="glass-container hover-scale transition-all duration-300 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChart className="w-4 h-4" />
                  Sales Split ({selectedPeriod})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedPeriodData && (
                  <ChartContainer config={chartConfig} className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <Pie
                          data={[
                            { name: 'ASIN', value: selectedPeriodData.asin_sold, fill: 'hsl(var(--chart-1))' },
                            { name: 'SKU', value: selectedPeriodData.sku_sold, fill: 'hsl(220, 70%, 50%)' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={70}
                          dataKey="value"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        >
                          {[
                            { name: 'ASIN', value: selectedPeriodData.asin_sold, fill: 'hsl(var(--chart-1))' },
                            { name: 'SKU', value: selectedPeriodData.sku_sold, fill: 'hsl(220, 70%, 50%)' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics Mini Cards */}
            <Card className="glass-container hover-scale transition-all duration-300 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2 h-44">
                  <div className="flex flex-col justify-center items-center p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md border border-primary/20">
                    <div className="text-lg font-bold text-primary mb-1">
                      {salesData.find(d => d.period === selectedPeriod)?.sell_rate?.toFixed(1) || '0'}
                    </div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">Daily Sell Rate</div>
                  </div>
                  
                  <div className="flex flex-col justify-center items-center p-2 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-md border border-secondary/20">
                    <div className="text-lg font-bold text-secondary mb-1">
                      {totalRestocks30d > 0 ? Math.round((totalSales30d / totalRestocks30d) * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">Stock Efficiency</div>
                  </div>
                  
                  <div className="flex flex-col justify-center items-center p-2 bg-gradient-to-br from-chart-1/10 to-chart-1/5 rounded-md border border-chart-1/20">
                    <div className="text-lg font-bold text-chart-1 mb-1">
                      {salesData.length > 0 ? Math.round(salesData.reduce((sum, d) => sum + d.total_sold, 0) / salesData.length) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">Avg Period Sales</div>
                  </div>
                  
                  <div className="flex flex-col justify-center items-center p-2 bg-gradient-to-br from-accent/10 to-accent/5 rounded-md border border-accent/20">
                    <div className="text-lg font-bold text-accent mb-1">
                      {salesData.find(d => d.period === '7d')?.total_sold || 0}
                    </div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">Weekly Sales</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Sales Table */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle>Detailed Analytics Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Period</th>
                      <th className="text-center p-3">ASIN Sold</th>
                      <th className="text-center p-3">SKU Sold</th>
                      <th className="text-center p-3">Total Sold</th>
                      <th className="text-center p-3">Total Restocked</th>
                      <th className="text-center p-3">Daily Rate</th>
                      <th className="text-center p-3">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((data, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium">{data.period}</td>
                        <td className="text-center p-3">{data.asin_sold}</td>
                        <td className="text-center p-3">{data.sku_sold}</td>
                        <td className="text-center p-3 font-semibold">{data.total_sold}</td>
                        <td className="text-center p-3">{data.total_restocked}</td>
                        <td className="text-center p-3">{data.sell_rate.toFixed(2)}/day</td>
                        <td className="text-center p-3">
                          {data.total_sold > data.total_restocked ? (
                            <Badge variant="destructive" className="text-xs">Undersupplied</Badge>
                          ) : data.total_sold === data.total_restocked ? (
                            <Badge variant="default" className="text-xs">Balanced</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Well Stocked</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restock Management Tab with Separate Tabs */}
        <TabsContent value="restock" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Restock Management Dashboard</h3>
              <p className="text-muted-foreground">Manage items that need restocking and track order status</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportRestockData} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Restock Data
              </Button>
              <Button onClick={exportOrderedData} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Ordered Items
              </Button>
            </div>
          </div>
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Restock Management
              </CardTitle>
              <p className="text-muted-foreground">Manage critical stock items and track orders</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="critical" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="critical" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Stock ({pendingItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="ordered" className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Ordered Items ({orderedItems.length})
                  </TabsTrigger>
                </TabsList>

                {/* Critical Stock Tab */}
                <TabsContent value="critical" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search ASINs, SKUs, or serials... (use spaces for multiple)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Badge variant="outline" className="text-sm whitespace-nowrap">
                      {pendingItems.length} items need attention
                    </Badge>
                  </div>

                  {/* Bulk Actions for Critical Items */}
                  {pendingItems.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                         <div className="flex items-center space-x-2">
                           <Checkbox
                             id="select-all"
                             checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                             onCheckedChange={handleSelectAll}
                           />
                           <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                             Select All ({pendingItems.length})
                           </label>
                         </div>
                         {selectedItems.size > 0 && (
                           <Badge variant="secondary" className="text-xs">
                             {selectedItems.size} selected
                           </Badge>
                         )}
                      </div>
                      <Button 
                        onClick={handleBulkMarkAsOrdered}
                        disabled={selectedItems.size === 0}
                        size="sm"
                        className="gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Mark {selectedItems.size || 'Selected'} as Ordered
                      </Button>
                    </div>
                  )}

                  {searchTerm.trim() && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
                      <strong>Search Active:</strong> {searchTerm.split(' ').map(term => term.trim()).filter(Boolean).join(', ')}
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pendingItems.length > 0 ? (
                      pendingItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              id={`item-${item.id}`}
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                            />
                            <div className="p-2 rounded-lg bg-destructive/20">
                              {item.table_name === 'asin_inventory' ? (
                                <Package className="w-4 h-4 text-destructive" />
                              ) : (
                                <Database className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.identifier}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Qty: {item.current_quantity}</span>
                                <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                                <Badge variant="destructive" className="text-xs">
                                  Out of Stock
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => markAsOrdered(item.id)}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Mark as Ordered
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No critical stock items</p>
                        <p className="text-sm">All items are well stocked!</p>
                      </div>
                    )}
                  </div>

                  {/* Export button for critical items */}
                  {pendingItems.length > 0 && (
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={exportRestockData} 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Critical Items
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Ordered Items Tab */}
                <TabsContent value="ordered" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Items that have been ordered from suppliers
                    </div>
                    {orderedItems.length > 0 && (
                      <Button 
                        onClick={() => exportOrderedData()} 
                        size="sm" 
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Ordered Items
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orderedItems.length > 0 ? (
                      orderedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 opacity-80">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              {item.table_name === 'asin_inventory' ? (
                                <Package className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Database className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.identifier}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Qty: {item.current_quantity}</span>
                                <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  Order Placed
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="gap-2 opacity-60"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Ordered
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No ordered items</p>
                        <p className="text-sm">Items you mark as ordered will appear here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Trends & Forecasting Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Trends & Forecasting Analytics</h3>
              <p className="text-muted-foreground">Track item-level sales trends and forecast replenishment needs</p>
            </div>
            <Button onClick={exportTrendsData} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export Trends
            </Button>
          </div>

          {/* Sub-tabs for Trends & Forecasting features */}
          <Tabs defaultValue="item-trends" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-gradient-subtle rounded-lg shadow-elegant">
              <TabsTrigger value="item-trends" className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">
                📊 Item Trends
              </TabsTrigger>
              <TabsTrigger value="forecasting" className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">
                🔮 AI Forecasting
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">
                📈 Analytics
              </TabsTrigger>
            </TabsList>

            {/* Item Trends Tab */}
            <TabsContent value="item-trends" className="space-y-6 mt-6">
              {/* Trends Filters */}
              <Card className="glass-container">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items by ASIN, SKU, or serial number..."
                        value={trendsSearchTerm}
                        onChange={(e) => setTrendsSearchTerm(e.target.value)}
                        className="w-80"
                      />
                    </div>
                    <Select value={trendsDateRange} onValueChange={setTrendsDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="14d">Last 14 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="60d">Last 60 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={trendsItemType} onValueChange={setTrendsItemType}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="asin">ASIN Only</SelectItem>
                        <SelectItem value="sku">SKU Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={trendsSortBy} onValueChange={setTrendsSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sold_desc">Most Sold</SelectItem>
                        <SelectItem value="sold_asc">Least Sold</SelectItem>
                        <SelectItem value="recent">Recently Sold</SelectItem>
                        <SelectItem value="quantity_low">Low Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={loadTrendsData}
                      variant="outline"
                      size="sm"
                      disabled={trendsLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${trendsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items Trends Table */}
              <Card className="glass-container">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Item Sales Trends ({trendsDateRange})
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{filteredTrendsItems.length} items found</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading trends data...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTrendsItems.length > 0 ? (
                        <div className="space-y-2">
                          {filteredTrendsItems.slice(0, 50).map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${
                                  item.table_name === 'asin_inventory' 
                                    ? 'bg-primary/20' 
                                    : 'bg-secondary/20'
                                }`}>
                                  {item.table_name === 'asin_inventory' ? (
                                    <Package className={`w-4 h-4 text-primary`} />
                                  ) : (
                                    <Database className={`w-4 h-4 text-secondary`} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-foreground">{item.identifier}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>Current Stock: {item.current_quantity}</span>
                                    <span>Sold: {item.sold_quantity} units</span>
                                    {item.last_sold_date && (
                                      <span>Last Sold: {new Date(item.last_sold_date).toLocaleDateString()}</span>
                                    )}
                                    {item.days_since_last_restock && (
                                      <span>Last Restock: {item.days_since_last_restock}d ago</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-foreground">
                                    {item.sold_quantity || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Units Sold
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-semibold ${
                                    item.current_quantity <= 5 ? 'text-destructive' : 
                                    item.current_quantity <= 10 ? 'text-amber-600' : 'text-chart-1'
                                  }`}>
                                    {item.current_quantity}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    In Stock
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-accent">
                                    {item.sell_rate?.toFixed(1) || '0.0'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Rate/Day
                                  </div>
                                </div>
                                <Badge 
                                  variant={
                                    item.current_quantity <= 5 ? "destructive" : 
                                    item.current_quantity <= 10 ? "default" : "secondary"
                                  } 
                                  className="text-xs"
                                >
                                  {item.current_quantity <= 5 ? "Critical" : 
                                   item.current_quantity <= 10 ? "Low" : "Good"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {filteredTrendsItems.length > 50 && (
                            <div className="text-center py-4 text-muted-foreground">
                              <p>Showing first 50 items. Use filters to narrow down results.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No trends data found</p>
                          <p className="text-sm">Try adjusting your filters or date range</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Forecasting Tab */}
            <TabsContent value="forecasting" className="space-y-6 mt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-semibold">AI-Powered Inventory Forecasting</h4>
                  <p className="text-muted-foreground">Advanced machine learning analysis of your inventory patterns</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={generateForecast} 
                    disabled={forecastLoading}
                    className="gap-2"
                  >
                    <Zap className={`w-4 h-4 ${forecastLoading ? 'animate-pulse' : ''}`} />
                    {forecastLoading ? 'Analyzing...' : 'Generate Forecast'}
                  </Button>
                  {forecastData && (
                    <Button onClick={exportForecastData} variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  )}
                </div>
              </div>

              {forecastError && (
                <Card className="glass-container border-destructive/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Forecast Generation Failed</p>
                        <p className="text-sm">{forecastError}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {forecastLoading && (
                <Card className="glass-container">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Zap className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
                      <h3 className="text-lg font-semibold mb-2">AI Analysis in Progress</h3>
                      <p className="text-muted-foreground mb-4">
                        Analyzing inventory patterns, sales history, and market trends...
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing {selectedCountry} inventory data</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!forecastLoading && !forecastData && !forecastError && (
                <Card className="glass-container">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Ready for AI Analysis</h3>
                      <p className="text-muted-foreground mb-6">
                        Click "Generate Forecast" to analyze your inventory with advanced AI algorithms
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="font-medium">Predictive Analytics</p>
                          <p className="text-muted-foreground">Forecast stockout dates</p>
                        </div>
                        <div className="p-4 bg-secondary/10 rounded-lg">
                          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-secondary" />
                          <p className="font-medium">Trend Analysis</p>
                          <p className="text-muted-foreground">Identify seasonal patterns</p>
                        </div>
                        <div className="p-4 bg-accent/10 rounded-lg">
                          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-accent" />
                          <p className="font-medium">Risk Assessment</p>
                          <p className="text-muted-foreground">Prioritize critical items</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {forecastData && (
                <div className="space-y-6">
                  {/* Overall Insights */}
                  <Card className="glass-container">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Overall Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {forecastData.overall_insights?.total_items_analyzed || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Items Analyzed</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg">
                          <div className="text-2xl font-bold text-destructive">
                            {forecastData.overall_insights?.high_risk_items || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">High Risk Items</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-chart-1/10 to-chart-1/5 rounded-lg">
                          <div className="text-2xl font-bold text-chart-1">
                            {forecastData.overall_insights?.avg_turnover_rate || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Turnover (Days)</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg">
                          <div className="text-2xl font-bold text-accent">
                            {new Date(forecastData.analysis_timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Analysis Date</div>
                        </div>
                      </div>

                      {forecastData.overall_insights?.recommendations && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3">AI Recommendations</h4>
                          <div className="space-y-2">
                            {forecastData.overall_insights.recommendations.map((rec: string, index: number) => (
                              <div key={index} className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg">
                                <ArrowRight className="w-4 h-4 mt-0.5 text-accent" />
                                <span className="text-sm">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Forecast Results */}
                  <Card className="glass-container">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Item Forecasts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {forecastData.forecasts?.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/30 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                item.risk_level === 'critical' ? 'bg-destructive/20' :
                                item.risk_level === 'high' ? 'bg-amber-500/20' :
                                item.risk_level === 'medium' ? 'bg-blue-500/20' : 'bg-chart-1/20'
                              }`}>
                                <Package className={`w-4 h-4 ${
                                  item.risk_level === 'critical' ? 'text-destructive' :
                                  item.risk_level === 'high' ? 'text-amber-600' :
                                  item.risk_level === 'medium' ? 'text-blue-600' : 'text-chart-1'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-foreground">{item.identifier}</p>
                                  <Badge 
                                    variant={
                                      item.risk_level === 'critical' ? 'destructive' :
                                      item.risk_level === 'high' ? 'default' : 'secondary'
                                    } 
                                    className="text-xs"
                                  >
                                    {item.risk_level}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Stock: {item.current_stock}</span>
                                  <span>Stockout: {item.predicted_days_until_stockout}d</span>
                                  <span>Reorder: {item.recommended_reorder_point}</span>
                                  <span>Trend: {item.seasonal_trend}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-foreground">
                                {item.confidence_score}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Confidence
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 mt-6">
              <InventoryAnalytics />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Dialog for displaying filtered items */}
      <Dialog open={dialogData.isOpen} onOpenChange={(open) => setDialogData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-background border border-border">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {dialogData.type === 'critical' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                {dialogData.type === 'ordered' && <Truck className="w-5 h-5" style={{ color: 'hsl(220, 70%, 50%)' }} />}
                {dialogData.type === 'active' && <Activity className="w-5 h-5 text-primary" />}
                {dialogData.title}
              </span>
              <Badge variant="outline" className="text-sm">
                {dialogData.items.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 pt-4">
            {dialogData.items.length > 0 ? (
              dialogData.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    dialogData.type === 'critical' 
                      ? 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20' 
                      : dialogData.type === 'ordered'
                      ? 'bg-blue-50/50 border-blue-200/50'
                      : 'bg-primary/5 hover:bg-primary/10 border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        dialogData.type === 'critical' 
                          ? 'bg-destructive/20' 
                          : dialogData.type === 'ordered'
                          ? 'bg-blue-500/20'
                          : 'bg-primary/20'
                      }`}>
                        {item.table_name === 'asin_inventory' ? (
                          <Package className={`w-4 h-4 ${
                            dialogData.type === 'critical' 
                              ? 'text-destructive' 
                              : dialogData.type === 'ordered'
                              ? 'text-blue-600'
                              : 'text-primary'
                          }`} />
                        ) : (
                          <Database className={`w-4 h-4 ${
                            dialogData.type === 'critical' 
                              ? 'text-destructive' 
                              : dialogData.type === 'ordered'
                              ? 'text-blue-600'
                              : 'text-primary'
                          }`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.identifier}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Quantity: {item.current_quantity}</span>
                          <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dialogData.type === 'critical' && (
                        <>
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                          <Button size="sm" onClick={() => markAsOrdered(item.id)}>
                            Mark as Ordered
                          </Button>
                        </>
                      )}
                      {dialogData.type === 'ordered' && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          Order Placed
                        </Badge>
                      )}
                      {dialogData.type === 'active' && (
                        <Badge 
                          variant={item.current_quantity <= 5 ? "destructive" : "default"} 
                          className="text-xs"
                        >
                          {item.current_quantity <= 5 ? "Low Stock" : "In Stock"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No items found</p>
                <p className="text-sm">No items match the current criteria</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
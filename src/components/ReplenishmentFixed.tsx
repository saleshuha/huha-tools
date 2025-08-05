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
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, Calendar, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, Legend } from 'recharts';
import { EnhancedAnalyticsDashboard } from './EnhancedAnalyticsDashboard';

interface RestockItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  days_since_last_restock: number | null;
  status: string;
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
  
  const [dialogData, setDialogData] = useState<DialogData>({
    isOpen: false,
    title: '',
    items: [],
    type: 'critical'
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);
  
  // Trends state
  const [trendsSearchTerm, setTrendsSearchTerm] = useState('');
  const [trendsDateRange, setTrendsDateRange] = useState('30d');
  const [trendsItemType, setTrendsItemType] = useState('all');
  const [trendsSortBy, setTrendsSortBy] = useState('sold_desc');
  const [trendsItems, setTrendsItems] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  
  // Pagination state for trends
  const [trendsCurrentPage, setTrendsCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Visual Analytics layout state
  const [chartLayout, setChartLayout] = useState('default');

  // Reset pagination when filters change
  useEffect(() => {
    setTrendsCurrentPage(1);
  }, [trendsSearchTerm, trendsDateRange, trendsItemType, trendsSortBy]);

  // AI Forecasting state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Load restock items that need attention
  const loadRestockItems = async () => {
    try {
      const { data, error } = await supabase.rpc('get_items_needing_restock', {
        country_filter: selectedCountry
      });

      if (error) throw error;

      console.log('Raw restock data from function:', data);

      // The database function now excludes ordered items and returns status
      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id // Use item_id directly from the database function
        // status comes directly from database now
      })).filter(item => item.status !== 'ordered'); // Extra filter to ensure no ordered items

      console.log('First item structure:', itemsWithStatus[0]);

      setRestockItems(itemsWithStatus);
    } catch (error: any) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Load ordered items separately for analytics and display
  const loadOrderedItems = async () => {
    try {
      const [asinOrdered, skuOrdered] = await Promise.all([
        supabase.from('asin_inventory')
          .select('id, asin, serial_number, quantity, status, days_since_last_restock:last_restock_date')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .eq('quantity', 0),
        supabase.from('sku_inventory')
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

  // Function to automatically remove ordered items that are back in stock
  const removeRestockedOrderedItems = async () => {
    try {
      // Get all ordered items that now have quantity > 0
      const [asinRestocked, skuRestocked] = await Promise.all([
        supabase.from('asin_inventory')
          .select('id, asin, serial_number, quantity, status')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .gt('quantity', 0),
        supabase.from('sku_inventory')
          .select('id, sku_number, bin_serial_number, quantity, status')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .gt('quantity', 0)
      ]);

      if (asinRestocked.error) throw asinRestocked.error;
      if (skuRestocked.error) throw skuRestocked.error;

      const restockedItems = [
        ...(asinRestocked.data || []),
        ...(skuRestocked.data || [])
      ];

      if (restockedItems.length > 0) {
        // Update status to 'in-stock' for these items
        const asinUpdates = asinRestocked.data?.map(item => 
          supabase.from('asin_inventory')
            .update({ status: 'in-stock' })
            .eq('id', item.id)
        ) || [];

        const skuUpdates = skuRestocked.data?.map(item => 
          supabase.from('sku_inventory')
            .update({ status: 'in-stock' })
            .eq('id', item.id)
        ) || [];

        // Execute all updates
        await Promise.all([...asinUpdates, ...skuUpdates]);

        // Remove from local ordered items state
        const restockedIds = restockedItems.map(item => item.id);
        setOrderedItems(prev => prev.filter(item => !restockedIds.includes(item.id)));

        if (restockedItems.length > 0) {
          toast({
            title: "Items Restocked",
            description: `${restockedItems.length} ordered items are now back in stock and removed from restock management`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error removing restocked ordered items:', error);
    }
  };

  // Load sales data for analytics
  const loadSalesData = async () => {
    try {
      const periods = ['7d', '15d', '30d', '45d', '60d', '90d'];
      const salesPromises = periods.map(async (period) => {
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [asinSales, skuSales, asinRestocks, skuRestocks] = await Promise.all([
          supabase.from('asin_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .eq('status', 'sold')
            .gte('date_sold', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .eq('status', 'sold')
            .gte('date_sold', startDate.toISOString()),
          supabase.from('asin_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .gte('last_restock_date', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .gte('last_restock_date', startDate.toISOString())
        ]);

        const asinSold = asinSales.data?.length || 0;
        const skuSold = skuSales.data?.length || 0;
        const asinRestocked = asinRestocks.data?.length || 0;
        const skuRestocked = skuRestocks.data?.length || 0;

        return {
          period,
          asin_sold: asinSold,
          sku_sold: skuSold,
          total_sold: asinSold + skuSold,
          asin_restocked: asinRestocked,
          sku_restocked: skuRestocked,
          total_restocked: asinRestocked + skuRestocked,
          sell_rate: (asinSold + skuSold) / days
        };
      });

      const salesResults = await Promise.all(salesPromises);
      setSalesData(salesResults);
    } catch (error: any) {
      console.error('Error loading sales data:', error);
      toast({
        title: "Error loading sales data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Main data loading function
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRestockItems(),
        loadSalesData(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark item as ordered from supplier
  const markAsOrdered = async (itemId: string) => {
    const item = restockItems.find(i => i.id === itemId);
    if (!item) {
      toast({
        title: "Error",
        description: "Item not found",
        variant: "destructive"
      });
      return;
    }

    try {
      let updateResult;
      
      if (item.table_name === 'asin_inventory') {
        updateResult = await supabase
          .from('asin_inventory')
          .update({ status: 'ordered' })
          .eq('id', itemId);
      } else if (item.table_name === 'sku_inventory') {
        updateResult = await supabase
          .from('sku_inventory')
          .update({ status: 'ordered' })
          .eq('id', itemId);
      }

      if (updateResult?.error) {
        throw updateResult.error;
      }

      // Remove item from restock list and add to ordered items
      const updatedItem = restockItems.find(i => i.id === itemId);
      if (updatedItem) {
        setRestockItems(prev => prev.filter(item => item.id !== itemId));
        setOrderedItems(prev => [...prev, { ...updatedItem, status: 'ordered' }]);
      }

      toast({
        title: "Order Status Updated",
        description: "Item marked as ordered from supplier"
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Filter items based on search
  const filteredRestockItems = restockItems.filter(item => {
    if (!searchTerm.trim()) return true;
    const searchTerms = searchTerm.toLowerCase().split(' ').map(term => term.trim()).filter(Boolean);
    return searchTerms.some(term => item.identifier.toLowerCase().includes(term));
  });

  const pendingItems = filteredRestockItems;

  // Export functions
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportSalesData = () => {
    const csvContent = [
      ['Period', 'ASIN Sold', 'SKU Sold', 'Total Sold', 'ASIN Restocked', 'SKU Restocked', 'Total Restocked', 'Sell Rate'],
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

    downloadCSV(csvContent, `sales-analytics-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Optimized real-time subscriptions
  useEffect(() => {
    if (!selectedCountry) return;

    const channels = [
      supabase.channel('asin-inventory-realtime')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        }, async () => {
          loadRestockItems();
          await removeRestockedOrderedItems();
        }),
      supabase.channel('sku-inventory-realtime')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sku_inventory',
          filter: `country=eq.${selectedCountry}`
        }, async () => {
          loadRestockItems();
          await removeRestockedOrderedItems();
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
      await removeRestockedOrderedItems();
    };
    loadData();
  }, [selectedCountry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  const totalSales30d = salesData.find(d => d.period === '30d')?.total_sold || 0;
  const totalRestocks30d = salesData.find(d => d.period === '30d')?.total_restocked || 0;

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-none">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 glass-container rounded-xl border backdrop-blur-lg">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Advanced Sales & Replenishment Analytics
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Real-time intelligence for {selectedCountry} operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2 hover-scale">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
          <Button onClick={exportSalesData} variant="outline" size="sm" className="gap-2 hover-scale">
            <Download className="w-4 h-4" />
            Export Analytics
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Critical Stock Items */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-destructive group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-destructive/10 group-hover:bg-destructive/20 transition-colors duration-300">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <Badge variant="destructive" className="animate-pulse">Critical</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">{pendingItems.length}</p>
              <p className="text-sm text-muted-foreground">Items Out of Stock</p>
              <div className="w-full bg-destructive/20 rounded-full h-2">
                <div 
                  className="bg-destructive h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((pendingItems.length / (pendingItems.length + orderedItems.length + 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Ordered */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-blue-500 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors duration-300">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-700 border-blue-300">In Transit</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">{orderedItems.length}</p>
              <p className="text-sm text-muted-foreground">Items Ordered</p>
              <div className="w-full bg-blue-500/20 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((orderedItems.length / (pendingItems.length + orderedItems.length + 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales Enhanced */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-primary group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-300">
                +{((totalSales30d / (totalSales30d + 1)) * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">{totalSales30d}</p>
              <p className="text-sm text-muted-foreground">Sales (30 Days)</p>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>Growth trend</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Restocks Enhanced */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-secondary group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors duration-300">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <Badge variant="secondary">Restocked</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">{totalRestocks30d}</p>
              <p className="text-sm text-muted-foreground">Units Restocked</p>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Activity className="w-3 h-3" />
                <span>Active restocking</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Velocity Metric */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-accent group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors duration-300">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <Badge variant="outline" className="border-accent text-accent">Velocity</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">
                {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'}
              </p>
              <p className="text-sm text-muted-foreground">Units/Day Rate</p>
              <div className="flex items-center gap-2 text-xs text-accent">
                <Clock className="w-3 h-3" />
                <span>Daily average</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Score */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl hover:scale-105 border-l-4 border-l-purple-500 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors duration-300">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <Badge className="bg-purple-500/20 text-purple-700 border-purple-300">Score</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-foreground">
                {Math.round(((totalRestocks30d / (totalSales30d + 1)) * 100))}%
              </p>
              <p className="text-sm text-muted-foreground">Efficiency Rate</p>
              <div className="w-full bg-purple-500/20 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(((totalRestocks30d / (totalSales30d + 1)) * 100), 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analytics Dashboard */}
      <EnhancedAnalyticsDashboard 
        salesData={salesData}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        chartLayout={chartLayout}
        setChartLayout={setChartLayout}
        totalSales30d={totalSales30d}
        totalRestocks30d={totalRestocks30d}
      />

      {/* Restock Management Section */}
      <Card className="glass-container border backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            Critical Restock Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {filteredRestockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No critical items found</p>
                <p className="text-sm">All items are adequately stocked</p>
              </div>
            ) : (
              filteredRestockItems.map((item) => (
                <Card key={item.id} className="hover-scale transition-all duration-300 border-l-4 border-l-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="destructive" className="text-xs">
                            {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                          </Badge>
                          <p className="font-medium">{item.identifier}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Quantity: {item.current_quantity}</span>
                          {item.days_since_last_restock && (
                            <span>Last restock: {item.days_since_last_restock} days ago</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => markAsOrdered(item.id)} 
                        size="sm" 
                        className="gap-2 hover-scale"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Mark as Ordered
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
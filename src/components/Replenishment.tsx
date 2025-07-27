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

  // Load restock items needing attention - Real-time data
  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);
      const { data, error } = await supabase.rpc('get_items_needing_restock', { 
        country_filter: selectedCountry 
      });
      if (error) throw error;
      
      console.log('Raw restock data from function:', data);
      
      // The database function now returns status from database
      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id, // Use item_id directly from the database function
        // status comes directly from database now
      }));
      
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

  // Separate items by status for better UX
  const pendingItems = filteredRestockItems.filter(item => item.status === 'in-stock' || item.status === 'sold');
  const orderedItems = filteredRestockItems.filter(item => item.status === 'ordered');

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

      // Update local state - don't remove items, just update their status
      setRestockItems(prev => 
        prev.map(item => 
          selectedItems.has(item.id)
            ? { ...item, status: 'ordered' }
            : item
        )
      );
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

      // Update local state
      setRestockItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, status: 'ordered' }
            : item
        )
      );
      
      toast({
        title: "Order Status Updated",
        description: "Item marked as ordered from supplier",
      });

      // Refresh the data immediately since database function now excludes ordered items
      loadRestockItems();

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
    const orderedItems = restockItems.filter(item => item.status === 'ordered');

    const csvContent = [
      ['Type', 'Identifier', 'Current Quantity', 'Days Since Restock', 'Order Status', 'Date Marked'],
      ...orderedItems.map(item => [
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

  // Dialog handlers for metric cards
  const openCriticalStockDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Critical Stock Items (0 Units)',
      items: filteredRestockItems, // Show all critical items regardless of status
      type: 'critical'
    });
  };

  const openOrderedItemsDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Items Ordered from Supplier',
      items: orderedItems, // Show only ordered items
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

      const activeItems: RestockItem[] = [
        ...(asinData.data || []).map(item => ({
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: 'asin_inventory' as const,
          days_since_last_restock: item.last_restock_date 
            ? Math.floor((new Date().getTime() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          status: 'in-stock' as const
        })),
        ...(skuData.data || []).map(item => ({
          id: item.id,
          identifier: `${item.sku_number} (${item.bin_serial_number})`,
          current_quantity: item.quantity,
          table_name: 'sku_inventory' as const,
          days_since_last_restock: item.last_restock_date 
            ? Math.floor((new Date().getTime() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          status: 'in-stock' as const
        }))
      ];

      setDialogData({
        isOpen: true,
        title: 'Active Inventory Items',
        items: activeItems,
        type: 'active'
      });
    } catch (error) {
      console.error('Error loading active items:', error);
      toast({
        title: "Error",
        description: "Failed to load active items",
        variant: "destructive",
      });
    }
  };

  const exportDialogData = () => {
    const { items, type, title } = dialogData;
    const csvContent = [
      ['Type', 'Identifier', 'Current Quantity', 'Days Since Restock', 'Status'],
      ...items.map(item => [
        item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
        item.identifier,
        item.current_quantity,
        item.days_since_last_restock || 'Never',
        item.status
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(csvContent, `${type}-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
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
          // Only reload restock items, not all data
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
          // Only reload restock items, not all data
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
    loadAllData();
  }, [selectedCountry]);

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
          <p className="text-muted-foreground">Real-time inventory analytics for {selectedCountry}</p>
        </div>
        <Button onClick={loadAllData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">30-Day Sales</p>
                <p className="text-3xl font-bold text-foreground">{totalSales30d}</p>
                <p className="text-sm text-primary">{(totalSales30d / 30).toFixed(1)} per day</p>
              </div>
              <div className="p-3 rounded-full bg-primary/20">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">30-Day Restocks</p>
                <p className="text-3xl font-bold text-foreground">{totalRestocks30d}</p>
                <p className="text-sm text-secondary">{(totalRestocks30d / 30).toFixed(1)} per day</p>
              </div>
              <div className="p-3 rounded-full bg-secondary/20">
                <Package className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale cursor-pointer transition-all hover:shadow-lg" onClick={openCriticalStockDialog}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Stock (0 Units)</p>
                <p className="text-3xl font-bold text-foreground">{filteredRestockItems.length}</p>
                <p className="text-sm text-destructive">Out of stock</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/20">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale cursor-pointer transition-all hover:shadow-lg" onClick={openOrderedItemsDialog}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items Ordered</p>
                <p className="text-3xl font-bold text-foreground">{orderedItems.length}</p>
                <p className="text-sm" style={{ color: 'hsl(220, 70%, 50%)' }}>From supplier</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.2)' }}>
                <Truck className="w-6 h-6" style={{ color: 'hsl(220, 70%, 50%)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale cursor-pointer transition-all hover:shadow-lg" onClick={openActiveItemsDialog}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                <p className="text-3xl font-bold text-foreground">{inventoryMetrics.forecasting?.totalActiveItems || 0}</p>
                <p className="text-sm text-accent">In inventory</p>
              </div>
              <div className="p-3 rounded-full bg-accent/20">
                <Database className="w-6 h-6 text-accent" />
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
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesData.map(item => (
                    <SelectItem key={item.period} value={item.period}>
                      {item.period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportSalesData} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Sales Performance Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {salesData.map((period, index) => (
              <Card key={period.period} className={`glass-container hover-scale cursor-pointer transition-all ${selectedPeriod === period.period ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedPeriod(period.period)}>
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">{period.period}</div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-primary">{period.total_sold}</div>
                      <div className="text-xs text-muted-foreground">Total Sold</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-secondary">{period.total_restocked}</div>
                      <div className="text-xs text-muted-foreground">Restocked</div>
                    </div>
                    <div className="text-xs text-accent">{period.sell_rate.toFixed(1)}/day</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Period Details */}
          {selectedPeriodData && (
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Detailed Analytics for {selectedPeriod}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-primary">ASIN Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                        <span className="text-sm">Items Sold</span>
                        <span className="font-bold text-primary">{selectedPeriodData.asin_sold}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                        <span className="text-sm">Restocked</span>
                        <span className="font-bold text-primary">{selectedPeriodData.asin_restocked}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                        <span className="text-sm">Daily Rate</span>
                        <span className="font-bold text-primary">{(selectedPeriodData.asin_sold / parseInt(selectedPeriod)).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium" style={{ color: 'hsl(220, 70%, 50%)' }}>SKU Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.1)' }}>
                        <span className="text-sm">Items Sold</span>
                        <span className="font-bold" style={{ color: 'hsl(220, 70%, 50%)' }}>{selectedPeriodData.sku_sold}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.1)' }}>
                        <span className="text-sm">Restocked</span>
                        <span className="font-bold" style={{ color: 'hsl(220, 70%, 50%)' }}>{selectedPeriodData.sku_restocked}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.1)' }}>
                        <span className="text-sm">Daily Rate</span>
                        <span className="font-bold" style={{ color: 'hsl(220, 70%, 50%)' }}>{(selectedPeriodData.sku_sold / parseInt(selectedPeriod)).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-accent">Overall Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-accent/10">
                        <span className="text-sm">Total Performance</span>
                        <span className="font-bold text-accent">{selectedPeriodData.total_sold}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-accent/10">
                        <span className="text-sm">Efficiency Rate</span>
                        <span className="font-bold text-accent">{selectedPeriodData.total_restocked > 0 ? ((selectedPeriodData.total_sold / selectedPeriodData.total_restocked) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-accent/10">
                        <span className="text-sm">Sales Velocity</span>
                        <span className="font-bold text-accent">{selectedPeriodData.sell_rate.toFixed(2)}/day</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Comparison Table */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Sales Comparison Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Period</th>
                      <th className="text-center p-2">ASIN Sold</th>
                      <th className="text-center p-2">SKU Sold</th>
                      <th className="text-center p-2">Total Sold</th>
                      <th className="text-center p-2">Restocked</th>
                      <th className="text-center p-2">Daily Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((item) => (
                      <tr key={item.period} className={`border-b hover:bg-muted/50 ${selectedPeriod === item.period ? 'bg-primary/10' : ''}`}>
                        <td className="p-2 font-medium">{item.period}</td>
                        <td className="p-2 text-center">{item.asin_sold}</td>
                        <td className="p-2 text-center">{item.sku_sold}</td>
                        <td className="p-2 text-center font-bold">{item.total_sold}</td>
                        <td className="p-2 text-center">{item.total_restocked}</td>
                        <td className="p-2 text-center">{item.sell_rate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restock Management Tab */}
        <TabsContent value="restock" className="space-y-6">
          <Card className="glass-container">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Items Needing Restock
                </CardTitle>
                <p className="text-muted-foreground">Manage items that require replenishment (≤5 units)</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={exportOrderedData} variant="outline" size="sm" className="gap-2" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.1)', borderColor: 'hsl(220, 70%, 50%)', color: 'hsl(220, 70%, 50%)' }}>
                  <Download className="w-4 h-4" />
                  Export Ordered Items
                </Button>
                <Button onClick={exportRestockData} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Restock Data
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search items (separate multiple terms with spaces: ASIN123 SKU456 serial789)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Badge variant="outline" className="text-sm whitespace-nowrap">
                  {filteredRestockItems.length} items need attention
                </Badge>
                <div className="text-xs text-muted-foreground">
                  Critical stock (0 units)
                </div>
              </div>

              {/* Bulk Actions */}
              {filteredRestockItems.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                     <div className="flex items-center space-x-2">
                       <Checkbox
                         id="select-all"
                         checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                         onCheckedChange={handleSelectAll}
                       />
                       <label htmlFor="select-all" className="text-sm font-medium">
                         Select All ({pendingItems.length} pending items)
                       </label>
                     </div>
                    {selectedItems.size > 0 && (
                      <Badge variant="secondary">
                        {selectedItems.size} selected
                      </Badge>
                    )}
                  </div>
                  {selectedItems.size > 0 && (
                    <Button
                      onClick={handleBulkMarkAsOrdered}
                      className="gap-2"
                      style={{ backgroundColor: 'hsl(220, 70%, 50%)', color: 'white' }}
                    >
                      <Truck className="w-4 h-4" />
                      Mark {selectedItems.size} as Ordered
                    </Button>
                  )}
                </div>
              )}

              {/* Search Guide */}
              {searchTerm && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
                  <strong>Bulk Search Active:</strong> Searching for: {searchTerm.split(',').map(term => term.trim()).filter(Boolean).join(', ')}
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRestockItems.length > 0 ? (
                  <>
                    {/* Pending Items Section */}
                    {pendingItems.length > 0 && (
                      <>
                        <div className="text-sm font-medium text-muted-foreground mb-2 px-2">
                          Items Needing Order ({pendingItems.length})
                        </div>
                        {pendingItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <Checkbox
                                id={`select-${item.id}`}
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => {
                                  console.log('Individual checkbox clicked:', { itemId: item.id, checked });
                                  handleSelectItem(item.id, checked as boolean);
                                }}
                              />
                              <div className="p-2 rounded-lg bg-destructive/20">
                                {item.table_name === 'asin_inventory' ? (
                                  <Package className="w-4 h-4 text-destructive" />
                                ) : (
                                  <Database className="w-4 h-4 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{item.identifier}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="font-medium text-destructive">Critical: {item.current_quantity} units</span>
                                  {item.days_since_last_restock !== null ? (
                                    <span>Last restock: {item.days_since_last_restock} days ago</span>
                                  ) : (
                                    <span>Never restocked</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                Critical Stock
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => markAsOrdered(item.id)}
                                className="gap-2"
                              >
                                <Truck className="w-4 h-4" />
                                Mark as Ordered
                              </Button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Ordered Items Section */}
                    {orderedItems.length > 0 && (
                      <>
                        <div className="text-sm font-medium text-muted-foreground mb-2 px-2 mt-6">
                          Items Already Ordered ({orderedItems.length})
                        </div>
                        {orderedItems.map((item) => (
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
                                <p className="font-medium text-muted-foreground">{item.identifier}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="font-medium">Ordered: {item.current_quantity} units</span>
                                  {item.days_since_last_restock !== null ? (
                                    <span>Last restock: {item.days_since_last_restock} days ago</span>
                                  ) : (
                                    <span>Never restocked</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(220, 70%, 50%)', color: 'hsl(220, 70%, 50%)' }}>
                                Order Placed
                              </Badge>
                              <Button
                                size="sm"
                                disabled
                                className="gap-2"
                                style={{ backgroundColor: 'hsl(220, 70%, 50%)', opacity: 0.6 }}
                              >
                                <Truck className="w-4 h-4" />
                                Ordered
                              </Button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium">
                      {searchTerm ? 'No matching items found' : 'All items are well stocked!'}
                    </p>
                    <p>
                      {searchTerm ? 'Try adjusting your search terms' : 'No items currently have critical stock (0 units)'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Trends & Forecasting Tab */}
        <TabsContent value="trends" className="space-y-6">
          <InventoryAnalytics />
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
                {dialogData.type === 'active' && <Database className="w-5 h-5 text-accent" />}
                {dialogData.title}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{dialogData.items.length} items</Badge>
                <Button onClick={exportDialogData} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {dialogData.items.length > 0 ? (
              <div className="overflow-y-auto flex-1 space-y-3 p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {dialogData.items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Checkbox for selection */}
                      <Checkbox
                        id={`dialog-item-${item.id}`}
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        className="flex-shrink-0"
                      />
                      
                      {/* Item icon */}
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        dialogData.type === 'critical' ? 'bg-destructive/20' :
                        dialogData.type === 'ordered' ? 'bg-blue-500/20' :
                        'bg-accent/20'
                      }`}>
                        {item.table_name === 'asin_inventory' ? (
                          <Package className={`w-4 h-4 ${
                            dialogData.type === 'critical' ? 'text-destructive' :
                            dialogData.type === 'ordered' ? 'text-blue-500' :
                            'text-accent'
                          }`} />
                        ) : (
                          <Database className={`w-4 h-4 ${
                            dialogData.type === 'critical' ? 'text-destructive' :
                            dialogData.type === 'ordered' ? 'text-blue-500' :
                            'text-accent'
                          }`} />
                        )}
                      </div>
                      
                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.identifier}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className={`font-medium ${
                            dialogData.type === 'critical' ? 'text-destructive' :
                            dialogData.type === 'ordered' ? 'text-blue-500' :
                            'text-foreground'
                          }`}>
                            Quantity: {dialogData.type === 'ordered' && item.status === 'ordered' ? 0 : item.current_quantity} units
                          </span>
                          {item.days_since_last_restock !== null ? (
                            <span>Last restock: {item.days_since_last_restock} days ago</span>
                          ) : (
                            <span>Never restocked</span>
                          )}
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={
                        dialogData.type === 'critical' ? 'destructive' :
                        dialogData.type === 'ordered' ? 'outline' :
                        'secondary'
                      } className="text-xs">
                        {dialogData.type === 'critical' ? 'Critical Stock' :
                         dialogData.type === 'ordered' ? 'Ordered' :
                         'Active'}
                      </Badge>
                      {dialogData.type === 'critical' && (
                        <Button
                          size="sm"
                          onClick={() => markAsOrdered(item.id)}
                          disabled={item.status === 'ordered'}
                          className="gap-2"
                        >
                          <Truck className="w-4 h-4" />
                          {item.status === 'ordered' ? 'Ordered' : 'Mark as Ordered'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center py-12">
                <div>
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium text-foreground">No items found</p>
                  <p className="text-muted-foreground">No items match the current criteria</p>
                </div>
              </div>
            )}
            
            {/* Bulk actions footer */}
            {selectedItems.size > 0 && dialogData.type === 'critical' && (
              <div className="flex-shrink-0 border-t bg-muted/30 p-4 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    onClick={handleBulkMarkAsOrdered}
                    className="gap-2"
                    style={{ backgroundColor: 'hsl(220, 70%, 50%)', color: 'white' }}
                  >
                    <Truck className="w-4 h-4" />
                    Mark {selectedItems.size} as Ordered
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
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
  status: 'pending' | 'ordered' | 'in-stock';
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

export function Replenishment() {
  const { selectedCountry } = useCountry();
  const { inventoryMetrics, loading: analyticsLoading, loadAnalytics } = useInventoryAnalytics();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);

  // Load restock items needing attention - Real-time data
  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);
      const { data, error } = await supabase.rpc('get_items_needing_restock');
      if (error) throw error;
      
      console.log('Raw restock data from function:', data);
      
      // The database function now filters by user and quantity = 0
      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        status: 'pending' as const
      }));
      
      setRestockItems(itemsWithStatus);
      console.log('Set restock items:', itemsWithStatus.length, 'items');
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
          .gte('date_sold', startDate.toISOString());

        let asinRestockQuery = supabase
          .from('asin_inventory')
          .select('restock_quantity')
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        if (selectedCountry) {
          asinSalesQuery = asinSalesQuery.eq('country', selectedCountry);
          asinRestockQuery = asinRestockQuery.eq('country', selectedCountry);
        }

        // Query SKU inventory for sales data
        let skuSalesQuery = supabase
          .from('sku_inventory')
          .select('*')
          .eq('status', 'sold')
          .gte('date_sold', startDate.toISOString());

        let skuRestockQuery = supabase
          .from('sku_inventory')
          .select('restock_quantity')
          .not('last_restock_date', 'is', null)
          .gte('last_restock_date', startDate.toISOString());

        if (selectedCountry) {
          skuSalesQuery = skuSalesQuery.eq('country', selectedCountry);
          skuRestockQuery = skuRestockQuery.eq('country', selectedCountry);
        }

        const [asinSales, asinRestocks, skuSales, skuRestocks] = await Promise.all([
          asinSalesQuery,
          asinRestockQuery,
          skuSalesQuery,
          skuRestockQuery
        ]);

        const asinSoldCount = asinSales.data?.length || 0;
        const skuSoldCount = skuSales.data?.length || 0;
        const totalSold = asinSoldCount + skuSoldCount;

        const asinRestockedQty = asinRestocks.data?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0;
        const skuRestockedQty = skuRestocks.data?.reduce((sum, item) => sum + (item.restock_quantity || 0), 0) || 0;
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

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRestockItems(),
        calculateSalesData(),
        loadAnalytics(selectedCountry)
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Mark item as ordered from supplier
  const markAsOrdered = async (itemId: string) => {
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

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedCountry) return;

    const channels = [
      supabase
        .channel('asin-inventory-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        }, () => loadAllData()),
        
      supabase
        .channel('sku-inventory-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sku_inventory', 
          filter: `country=eq.${selectedCountry}`
        }, () => loadAllData()),
        
      supabase
        .channel('stock-changes-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_changes'
        }, () => loadAllData())
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

  // Filter restock items with bulk search support
  const filteredRestockItems = restockItems.filter(item => {
    if (item.status !== 'pending') return false;
    
    if (!searchTerm.trim()) return true;
    
    // Support bulk search - split by comma and search for any match
    const searchTerms = searchTerm.toLowerCase().split(',').map(term => term.trim()).filter(Boolean);
    
    return searchTerms.some(term => 
      item.identifier.toLowerCase().includes(term)
    );
  });

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

        <Card className="glass-container hover-scale">
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

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items Ordered</p>
                <p className="text-3xl font-bold text-foreground">{restockItems.filter(item => item.status === 'ordered').length}</p>
                <p className="text-sm" style={{ color: 'hsl(220, 70%, 50%)' }}>From supplier</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'hsl(220, 70%, 50%, 0.2)' }}>
                <Truck className="w-6 h-6" style={{ color: 'hsl(220, 70%, 50%)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                <p className="text-3xl font-bold text-foreground">{inventoryMetrics.forecasting.totalActiveItems}</p>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">📊 Sales Analytics</TabsTrigger>
          <TabsTrigger value="restock">📦 Restock Management</TabsTrigger>
          <TabsTrigger value="trends">📈 Trends & Forecasting</TabsTrigger>
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
                    placeholder="Search items (separate multiple terms with commas: ASIN123, SKU456, serial789)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Badge variant="outline" className="text-sm whitespace-nowrap">
                  {filteredRestockItems.length} items need attention
                </Badge>
                <div className="text-xs text-muted-foreground">
                  Items with ≤5 units in stock
                </div>
              </div>

              {/* Search Guide */}
              {searchTerm && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
                  <strong>Bulk Search Active:</strong> Searching for: {searchTerm.split(',').map(term => term.trim()).filter(Boolean).join(', ')}
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRestockItems.length > 0 ? filteredRestockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
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
                          <span className="font-medium text-destructive">Current: {item.current_quantity} units</span>
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
                        disabled={item.status === 'ordered'}
                        className="gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        {item.status === 'ordered' ? 'Ordered' : 'Mark as Ordered'}
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium">
                      {searchTerm ? 'No matching items found' : 'All items are well stocked!'}
                    </p>
                    <p>
                      {searchTerm ? 'Try adjusting your search terms' : 'No items currently need restocking (≤5 units)'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends & Forecasting Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Stock Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: inventoryMetrics.forecasting.criticalStockItems, fill: 'hsl(var(--destructive))' },
                            { name: 'Normal', value: Math.max(0, inventoryMetrics.forecasting.totalActiveItems - inventoryMetrics.forecasting.criticalStockItems), fill: 'hsl(var(--primary))' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Critical', value: inventoryMetrics.forecasting.criticalStockItems, fill: 'hsl(var(--destructive))' },
                            { name: 'Normal', value: Math.max(0, inventoryMetrics.forecasting.totalActiveItems - inventoryMetrics.forecasting.criticalStockItems), fill: 'hsl(var(--primary))' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Inventory Health</span>
                      <span>{Math.round(100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100))}%</span>
                    </div>
                    <Progress value={100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Sales Velocity (30d)</span>
                      <span>{((totalSales30d / 30) * 100 / Math.max(1, inventoryMetrics.forecasting.totalActiveItems)).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(100, (totalSales30d / 30) * 100 / Math.max(1, inventoryMetrics.forecasting.totalActiveItems))} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Restock Efficiency</span>
                      <span>{totalRestocks30d > 0 ? Math.min(100, (totalRestocks30d / Math.max(1, totalSales30d)) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <Progress value={totalRestocks30d > 0 ? Math.min(100, (totalRestocks30d / Math.max(1, totalSales30d)) * 100) : 0} className="h-2" />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{inventoryMetrics.forecasting.avgLeadTime}</p>
                      <p className="text-xs text-muted-foreground">Avg Lead Time (days)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-secondary">{inventoryMetrics.forecasting.recommendedReorderLevel}</p>
                      <p className="text-xs text-muted-foreground">Recommended Reorder</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-medium text-primary">Sales Trend</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {totalSales30d > 0 ? 'Active sales momentum detected' : 'Low sales activity'}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-secondary" />
                      <span className="font-medium text-secondary">Stock Status</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {inventoryMetrics.forecasting.criticalStockItems > 0 
                        ? `${inventoryMetrics.forecasting.criticalStockItems} items need attention`
                        : 'All items adequately stocked'
                      }
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="font-medium text-accent">Next Action</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filteredRestockItems.length > 0 
                        ? `Place orders for ${filteredRestockItems.length} items`
                        : 'Monitor sales patterns'
                      }
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2">Smart Recommendations</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {inventoryMetrics.forecasting.criticalStockItems > 0 && (
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-destructive" />
                        <span>Immediate action required for {inventoryMetrics.forecasting.criticalStockItems} critical items</span>
                      </li>
                    )}
                    {totalSales30d > 0 && (
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <span>Maintain current stock levels for top-selling items</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-secondary" />
                      <span>Review restock thresholds weekly based on sales velocity</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
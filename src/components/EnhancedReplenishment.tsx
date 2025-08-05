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
  TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, 
  Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, 
  PieChart, LineChart, Calendar, CheckCircle, XCircle, Eye, Truck, 
  ArrowRight, Target, Zap, ChevronLeft, ChevronRight, Sparkles, Brain, 
  Star, Filter, Users, Boxes, Layers, Workflow, AreaChart 
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, AreaChart as RechartsAreaChart, Area, 
  BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, 
  Cell, Pie, Legend, ComposedChart 
} from 'recharts';

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

export function EnhancedReplenishment() {
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

  // Chart configuration
  const chartConfig = {
    total_sold: {
      label: "Units Sold",
      color: "hsl(var(--primary))",
    },
    total_restocked: {
      label: "Units Restocked",
      color: "hsl(var(--secondary))",
    },
    asin_sold: {
      label: "ASIN Sales",
      color: "hsl(var(--chart-1))",
    },
    sku_sold: {
      label: "SKU Sales",
      color: "hsl(var(--chart-2))",
    },
    sell_rate: {
      label: "Daily Rate",
      color: "hsl(var(--accent))",
    },
  };

  // Load restock items
  const loadRestockItems = async () => {
    try {
      const { data, error } = await supabase.rpc('get_items_needing_restock', {
        country_filter: selectedCountry
      });
      if (error) throw error;

      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id
      })).filter(item => item.status !== 'ordered');

      setRestockItems(itemsWithStatus);
    } catch (error: any) {
      toast({
        title: "Error loading restock items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Calculate sales data
  const calculateSalesData = async () => {
    try {
      const periods = [1, 3, 7, 15, 30, 45, 60, 90];
      const salesAnalytics: SalesData[] = [];
      
      for (const days of periods) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [asinSalesData, asinRestockData, skuSalesData, skuRestockData] = await Promise.all([
          supabase.from('asin_inventory')
            .select('*')
            .eq('status', 'sold')
            .eq('country', selectedCountry)
            .gte('date_sold', startDate.toISOString()),
          supabase.from('asin_inventory')
            .select('restock_quantity')
            .eq('country', selectedCountry)
            .not('last_restock_date', 'is', null)
            .gte('last_restock_date', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('*')
            .eq('status', 'sold')
            .eq('country', selectedCountry)
            .gte('date_sold', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('restock_quantity')
            .eq('country', selectedCountry)
            .not('last_restock_date', 'is', null)
            .gte('last_restock_date', startDate.toISOString())
        ]);

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
        variant: "destructive"
      });
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadRestockItems();
      Promise.all([calculateSalesData(), loadAnalytics(selectedCountry)]).catch(error => {
        console.error('Error loading analytics data:', error);
      });
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportAllData = async () => {
    toast({
      title: "Exporting Data",
      description: "Preparing analytics export...",
    });
  };

  const refreshData = () => {
    loadAllData();
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCountry]);

  // Calculate key metrics
  const criticalItems = restockItems.filter(item => item.current_quantity === 0).length;
  const totalSales30d = salesData.find(d => d.period === '30d')?.total_sold || 0;
  const totalRestocks30d = salesData.find(d => d.period === '30d')?.total_restocked || 0;
  const selectedPeriodData = salesData.find(d => d.period === selectedPeriod);

  // Dialog handlers
  const openCriticalItemsDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Critical Items Requiring Immediate Attention',
      items: restockItems.filter(item => item.current_quantity === 0),
      type: 'critical'
    });
  };

  const openOrderedItemsDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Items Ordered from Suppliers',
      items: orderedItems,
      type: 'ordered'
    });
  };

  const openActiveItemsDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Sales Performance Details',
      items: [],
      type: 'sales'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Hero Section with Enhanced Visual Appeal */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b border-primary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="glass-container mx-6 my-4 p-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Sales & Replenishment Hub
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    AI-powered analytics for optimal inventory management
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Real-time tracking
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI insights
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Smart forecasting
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={refreshData} variant="outline" size="sm" className="gap-2 hover-scale glass-container" disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              <Button onClick={exportAllData} variant="default" size="sm" className="gap-2 hover-scale shadow-glow">
                <Download className="w-4 h-4" />
                Export Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Loading State */}
      {loading && (
        <div className="glass-container mx-6 my-4 p-12 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-3 max-w-md">
              <h3 className="text-xl font-bold text-foreground">Processing Analytics Data</h3>
              <p className="text-muted-foreground">
                Our AI is analyzing your sales patterns, inventory levels, and market trends to provide actionable insights
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Key Metrics Dashboard */}
      {!loading && (
        <div className="glass-container mx-6 my-4 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Performance Overview</h2>
            <p className="text-muted-foreground">Real-time insights into your inventory performance</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Critical Items */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20 hover:border-destructive/40 transition-all duration-300 hover-scale cursor-pointer" onClick={openCriticalItemsDialog}>
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                  </div>
                  <Badge variant="destructive" className="text-xs px-2 py-1">Urgent</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{criticalItems}</p>
                  <p className="text-xs font-medium text-muted-foreground">Critical Items</p>
                  <p className="text-xs text-destructive">Immediate attention required</p>
                </div>
              </CardContent>
            </Card>

            {/* Ordered Items */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-chart-2/5 to-chart-2/10 border-chart-2/20 hover:border-chart-2/40 transition-all duration-300 hover-scale cursor-pointer" onClick={openOrderedItemsDialog}>
              <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg">
                    <Truck className="w-4 h-4 text-chart-2" />
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-1">In Transit</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{orderedItems.length}</p>
                  <p className="text-xs font-medium text-muted-foreground">Ordered Items</p>
                  <p className="text-xs text-chart-2">En route from suppliers</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Sales */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale cursor-pointer" onClick={openActiveItemsDialog}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <Badge className="text-xs px-2 py-1">30 Days</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{totalSales30d}</p>
                  <p className="text-xs font-medium text-muted-foreground">Units Sold</p>
                  <p className="text-xs text-primary">Revenue performance</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Restocks */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:border-secondary/40 transition-all duration-300 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Package className="w-4 h-4 text-secondary" />
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-1">Restocked</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{totalRestocks30d}</p>
                  <p className="text-xs font-medium text-muted-foreground">Units Restocked</p>
                  <p className="text-xs text-secondary">Inventory replenishment</p>
                </div>
              </CardContent>
            </Card>

            {/* Daily Sell Rate */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:border-accent/40 transition-all duration-300 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                  <Badge variant="outline" className="text-xs px-2 py-1">Velocity</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">Daily Rate</p>
                  <p className="text-xs text-accent">Units per day</p>
                </div>
              </CardContent>
            </Card>

            {/* Stock Efficiency */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-chart-1/5 to-chart-1/10 border-chart-1/20 hover:border-chart-1/40 transition-all duration-300 hover-scale">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-chart-1/10 rounded-lg">
                    <Target className="w-4 h-4 text-chart-1" />
                  </div>
                  <Badge variant="outline" className="text-xs px-2 py-1">Efficiency</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {totalRestocks30d > 0 ? (totalSales30d / totalRestocks30d * 100).toFixed(0) : '0'}%
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">Stock Ratio</p>
                  <p className="text-xs text-chart-1">Operational efficiency</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Main Navigation Tabs */}
      {!loading && (
        <div className="glass-container mx-6 my-4">
          <Tabs defaultValue="sales" className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-3 h-16 p-2 bg-gradient-to-r from-background via-primary/5 to-background rounded-xl border border-primary/10 shadow-elegant backdrop-blur-md">
                <TabsTrigger 
                  value="sales" 
                  className="relative text-sm font-semibold px-6 py-4 rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all duration-300 hover:bg-primary/10 group"
                >
                  <div className="flex items-center gap-2">
                    <AreaChart className="w-4 h-4" />
                    <span>Sales Analytics</span>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse group-data-[state=active]:bg-white"></div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="restock" 
                  className="relative text-sm font-semibold px-6 py-4 rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all duration-300 hover:bg-primary/10 group"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4" />
                    <span>Restock Hub</span>
                    {criticalItems > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0.5">{criticalItems}</Badge>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="trends" 
                  className="text-sm font-semibold px-6 py-4 rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all duration-300 hover:bg-primary/10"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span>AI Insights</span>
                    <Star className="w-3 h-3 text-yellow-400" />
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sales Analytics Tab */}
            <TabsContent value="sales" className="p-6 space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Sales Performance Analytics</h3>
                    <p className="text-muted-foreground">Track performance across different time periods with advanced insights</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-32 glass-container">
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
                  </div>
                </div>

                {/* Advanced Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sales vs Restocks Chart */}
                  <Card className="glass-container hover-scale transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-primary" />
                        Sales vs Restocks Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="total_sold" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                              name="Sold"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total_restocked" 
                              stroke="hsl(var(--secondary))" 
                              strokeWidth={3}
                              dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                              name="Restocked"
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* ASIN vs SKU Performance */}
                  <Card className="glass-container hover-scale transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-chart-1" />
                        ASIN vs SKU Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={salesData.slice(-6)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="asin_sold" fill="hsl(var(--chart-1))" name="ASIN" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="sku_sold" fill="hsl(var(--chart-2))" name="SKU" radius={[4, 4, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Velocity Trend */}
                <Card className="glass-container hover-scale transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      Sales Velocity Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsAreaChart data={salesData}>
                          <defs>
                            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area 
                            type="monotone" 
                            dataKey="sell_rate" 
                            stroke="hsl(var(--accent))" 
                            fill="url(#velocityGradient)"
                            strokeWidth={2}
                            name="Daily Rate"
                          />
                        </RechartsAreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Restock Management Tab */}
            <TabsContent value="restock" className="p-6 space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Restock Management Hub</h3>
                    <p className="text-muted-foreground">Manage critical inventory and supplier orders</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 glass-container"
                      />
                    </div>
                  </div>
                </div>

                {criticalItems === 0 ? (
                  <Card className="glass-container p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-green-500/10 rounded-full">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground">All Items Well Stocked!</h3>
                        <p className="text-muted-foreground">No critical stock issues detected at this time</p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {restockItems.filter(item => item.current_quantity === 0).slice(0, 10).map((item) => (
                        <Card key={item.id} className="glass-container hover-scale transition-all duration-300 border-l-4 border-l-destructive">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-destructive/10 rounded-lg">
                                  <AlertTriangle className="w-4 h-4 text-destructive" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{item.identifier}</p>
                                  <p className="text-sm text-muted-foreground">Stock: {item.current_quantity}</p>
                                </div>
                              </div>
                              <Badge variant="destructive">Critical</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="trends" className="p-6">
              <InventoryAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Enhanced Dialog */}
      <Dialog open={dialogData.isOpen} onOpenChange={(open) => setDialogData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-container">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {dialogData.type === 'critical' && <AlertTriangle className="w-5 h-5 text-destructive" />}
              {dialogData.type === 'ordered' && <Truck className="w-5 h-5 text-chart-2" />}
              {dialogData.type === 'sales' && <TrendingUp className="w-5 h-5 text-primary" />}
              {dialogData.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogData.items.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No items to display</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dialogData.items.map((item) => (
                  <Card key={item.id} className="glass-container">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.identifier}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.current_quantity} | Table: {item.table_name}
                          </p>
                        </div>
                        <Badge variant={item.current_quantity === 0 ? "destructive" : "secondary"}>
                          {item.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
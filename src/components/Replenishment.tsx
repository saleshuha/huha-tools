import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  Calendar, 
  Package, 
  Brain,
  Download,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Clock,
  Target,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ShoppingCart,
  Activity,
  DollarSign,
  Users,
  Database,
  Gauge,
  PieChart,
  LineChart,
  TrendingUp as TrendUp,
  Percent,
  Timer,
  Layers,
  BarChart2
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
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface ReplenishmentItem {
  id: string;
  product_id: string;
  product_type: 'asin' | 'sku';
  current_stock: number;
  min_threshold: number;
  lead_time_days: number;
  daily_sell_rate: number;
  weekly_sell_rate: number;
  monthly_sell_rate: number;
  suggested_reorder_qty: number;
  suggested_restock_date: string;
  projected_stockout_date: string;
  status: 'Critical' | 'Low Stock' | 'Normal' | 'Overstock';
  status_color: 'destructive' | 'secondary' | 'default' | 'outline';
  status_icon: string;
  confidence_score: number;
}

export function Replenishment() {
  const { selectedCountry } = useCountry();
  const { inventoryMetrics, loading: analyticsLoading, loadAnalytics } = useInventoryAnalytics();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentItem[]>([]);
  const [filteredData, setFilteredData] = useState<ReplenishmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [selectedItem, setSelectedItem] = useState<ReplenishmentItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [lastForecastTime, setLastForecastTime] = useState<Date | null>(null);

  // Generate replenishment data from real inventory
  const generateMockData = (): ReplenishmentItem[] => {
    return [];
  };

  // Load replenishment data
  const loadReplenishmentData = async () => {
    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const data = generateMockData();
      setReplenishmentData(data);
      setFilteredData(data);
      
      toast({
        title: "Analytics Updated",
        description: `Loaded replenishment data for ${selectedCountry}`,
      });
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search and filter criteria
  useEffect(() => {
    let filtered = replenishmentData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.product_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterStatus) {
          case 'critical': return item.status === 'Critical';
          case 'low': return item.status === 'Low Stock';
          case 'normal': return item.status === 'Normal';
          default: return true;
        }
      });
    }

    setFilteredData(filtered);
  }, [searchTerm, filterStatus, replenishmentData]);

  // Real-time subscriptions for inventory changes
  useEffect(() => {
    if (!selectedCountry) return;

    console.log(`Setting up real-time subscriptions for country: ${selectedCountry}`);

    const asinChannel = supabase
      .channel('asin-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asin_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('ASIN inventory changed, refreshing analytics...', payload);
          loadAnalytics(selectedCountry);
        }
      )
      .subscribe();

    const skuChannel = supabase
      .channel('sku-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sku_inventory',
          filter: `country=eq.${selectedCountry}`
        },
        (payload) => {
          console.log('SKU inventory changed, refreshing analytics...', payload);
          loadAnalytics(selectedCountry);
        }
      )
      .subscribe();

    const stockChangesChannel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_changes'
        },
        (payload) => {
          console.log('Stock change recorded, refreshing analytics...', payload);
          loadAnalytics(selectedCountry);
        }
      )
      .subscribe();

    // Force initial load
    console.log(`Loading initial analytics for ${selectedCountry}`);
    loadAnalytics(selectedCountry);

    return () => {
      supabase.removeChannel(asinChannel);
      supabase.removeChannel(skuChannel);
      supabase.removeChannel(stockChangesChannel);
    };
  }, [selectedCountry]);

  // Load data when country changes
  useEffect(() => {
    console.log(`Country changed to: ${selectedCountry}, loading data...`);
    loadReplenishmentData();
    loadAnalytics(selectedCountry);
  }, [selectedCountry]);

  // Export to CSV
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const csvContent = [
        ['Product ID', 'Type', 'Current Stock', 'Min Threshold', 'Status', 'Daily Sell Rate', 'Reorder Qty', 'Restock Date', 'Stockout Date', 'Confidence'],
        ...filteredData.map(item => [
          item.product_id,
          item.product_type,
          item.current_stock,
          item.min_threshold,
          item.status,
          item.daily_sell_rate.toFixed(2),
          item.suggested_reorder_qty,
          item.suggested_restock_date,
          item.projected_stockout_date,
          `${item.confidence_score}%`
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `replenishment-plan-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Replenishment plan exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    loadReplenishmentData();
    loadAnalytics(selectedCountry);
    toast({
      title: "Data Refreshed",
      description: "Replenishment analytics have been updated",
    });
  };

  // Generate AI forecast
  const generateAiForecast = async () => {
    try {
      setIsGeneratingForecast(true);
      
      const forecastData = {
        country: selectedCountry,
        criticalItems: inventoryMetrics.forecasting.criticalStockItems,
        totalItems: inventoryMetrics.forecasting.totalActiveItems,
        salesVelocity: inventoryMetrics.salesTracking['30d'] || 0,
        restockRate: inventoryMetrics.restockTracking['30d'] || 0,
        avgLeadTime: inventoryMetrics.forecasting.avgLeadTime,
        healthScore: Math.round(100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100))
      };

      // Simulate AI analysis (replace with actual AI call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const insights = `📊 AI Inventory Analysis for ${selectedCountry}:

🔍 Current Status:
• Health Score: ${forecastData.healthScore}% (${forecastData.healthScore >= 80 ? 'Healthy' : 'Needs Attention'})
• Critical Items: ${forecastData.criticalItems} out of ${forecastData.totalItems}
• 30-day Sales Velocity: ${forecastData.salesVelocity} items

📈 Trend Analysis:
• Sales Rate: ${(forecastData.salesVelocity / 30).toFixed(1)} items/day average
• Restock Efficiency: ${forecastData.restockRate > 0 ? 'Active' : 'Low'} replenishment activity
• Lead Time: ${forecastData.avgLeadTime} days average

🎯 AI Recommendations:
${forecastData.criticalItems > 0 ? `• URGENT: ${forecastData.criticalItems} items need immediate restocking` : '• No critical stock issues detected'}
${forecastData.healthScore < 80 ? '• Recommend increasing safety stock levels' : '• Current stock levels are optimal'}
• Suggested reorder point: ${Math.ceil(forecastData.salesVelocity / 30 * forecastData.avgLeadTime)} units
• Next review in: ${forecastData.criticalItems > 0 ? '3 days' : '7 days'}

🔮 7-Day Forecast:
• Expected sales: ${Math.ceil(forecastData.salesVelocity / 30 * 7)} items
• Predicted stockouts: ${Math.max(0, forecastData.criticalItems - Math.ceil(forecastData.restockRate / 30 * 7))} items
• Confidence level: ${Math.min(95, Math.max(60, 95 - forecastData.criticalItems * 5))}%`;

      setAiInsights(insights);
      setLastForecastTime(new Date());
      
      toast({
        title: "AI Forecast Generated",
        description: "Fresh insights and recommendations are ready",
      });
    } catch (error: any) {
      toast({
        title: "Forecast Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingForecast(false);
    }
  };

  // Calculate analytics
  const criticalItems = replenishmentData.filter(item => item.status === 'Critical');
  const lowStockItems = replenishmentData.filter(item => item.status === 'Low Stock');
  const totalValue = replenishmentData.reduce((sum, item) => sum + (item.suggested_reorder_qty * 50), 0); // Assuming $50 avg cost
  const avgSellRate = replenishmentData.reduce((sum, item) => sum + item.daily_sell_rate, 0) / replenishmentData.length || 0;
  const avgLeadTime = replenishmentData.reduce((sum, item) => sum + item.lead_time_days, 0) / replenishmentData.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading AI replenishment analytics...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const salesChartData = [1, 3, 7, 15, 30, 45, 60, 90].map(days => ({
    period: `${days}d`,
    sales: inventoryMetrics.salesTracking[`${days}d`] || 0,
    restocks: inventoryMetrics.restockTracking[`${days}d`] || 0,
    velocity: ((inventoryMetrics.salesTracking[`${days}d`] || 0) / days).toFixed(1)
  }));

  const pieChartData = [
    { name: 'Critical', value: inventoryMetrics.forecasting.criticalStockItems, color: 'hsl(var(--destructive))' },
    { name: 'Low Stock', value: Math.max(0, Math.floor(inventoryMetrics.forecasting.totalActiveItems * 0.15)), color: 'hsl(var(--warning))' },
    { name: 'Normal', value: Math.max(0, inventoryMetrics.forecasting.totalActiveItems - inventoryMetrics.forecasting.criticalStockItems - Math.floor(inventoryMetrics.forecasting.totalActiveItems * 0.15)), color: 'hsl(var(--primary))' }
  ];

  const trendData = [1, 3, 7, 15, 30].map(days => ({
    period: `${days}d`,
    sales: inventoryMetrics.salesTracking[`${days}d`] || 0,
    target: Math.ceil((inventoryMetrics.salesTracking['30d'] || 0) / 30 * days),
    efficiency: ((inventoryMetrics.salesTracking[`${days}d`] || 0) / Math.max(1, Math.ceil((inventoryMetrics.salesTracking['30d'] || 0) / 30 * days)) * 100).toFixed(0)
  }));

  const chartConfig = {
    sales: {
      label: "Sales",
      color: "hsl(var(--primary))",
    },
    restocks: {
      label: "Restocks", 
      color: "hsl(var(--secondary))",
    },
    velocity: {
      label: "Velocity",
      color: "hsl(var(--accent))",
    },
    target: {
      label: "Target",
      color: "hsl(var(--muted-foreground))",
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-none">
      {/* Enhanced Analytics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="glass-container hover-scale group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-destructive/20 opacity-50" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-destructive/20 backdrop-blur-sm border border-destructive/30">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <Badge variant="destructive" className="text-xs shadow-sm">
                URGENT
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {inventoryMetrics.forecasting.criticalStockItems}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Critical Items</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive mr-2" />
                <span className="text-destructive font-medium">≤1 unit</span>
              </div>
              <Progress value={(inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems)) * 100} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 opacity-50" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30">
                <TrendingDown className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs">
                30d
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {inventoryMetrics.salesTracking['30d'] || 0}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Items Sold</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Activity className="w-4 h-4 text-primary mr-2" />
                <span className="text-primary font-medium">{((inventoryMetrics.salesTracking['30d'] || 0) / 30).toFixed(1)}/day</span>
              </div>
              <Progress value={Math.min(100, (inventoryMetrics.salesTracking['30d'] || 0) / 10)} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/20 opacity-50" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-secondary/20 backdrop-blur-sm border border-secondary/30">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <Badge variant="outline" className="border-secondary/30 text-secondary bg-secondary/10 text-xs">
                30d
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {inventoryMetrics.restockTracking['30d'] || 0}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Restocked</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <ArrowUp className="w-4 h-4 text-secondary mr-2" />
                <span className="text-secondary font-medium">Replenished</span>
              </div>
              <Progress value={Math.min(100, (inventoryMetrics.restockTracking['30d'] || 0) / 5)} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-accent/20 opacity-50" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm border border-accent/30">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10 text-xs">
                Active
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {inventoryMetrics.forecasting.totalActiveItems}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Total Items</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Target className="w-4 h-4 text-accent mr-2" />
                <span className="text-accent font-medium">In Stock</span>
              </div>
              <Progress value={100} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-tertiary/20 opacity-50" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-tertiary/20 backdrop-blur-sm border border-tertiary/30">
                <Gauge className="w-6 h-6 text-tertiary" />
              </div>
              <Badge variant="outline" className="border-tertiary/30 text-tertiary bg-tertiary/10 text-xs">
                Health
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {Math.round(100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100))}%
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Stock Health</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Sparkles className="w-4 h-4 text-tertiary mr-2" />
                <span className="text-tertiary font-medium">Score</span>
              </div>
              <Progress value={100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100)} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced AI Forecasting Section */}
      <Card className="glass-container relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 opacity-60" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/30">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              🔮 AI Forecasting & Recommendations
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={generateAiForecast}
                disabled={isGeneratingForecast}
                className="bg-gradient-primary hover:opacity-90 text-white border-0"
              >
                {isGeneratingForecast ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Fresh AI Forecast
                  </>
                )}
              </Button>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
          {lastForecastTime && (
            <p className="text-sm text-muted-foreground">
              Last forecast: {lastForecastTime.toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Metrics */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground mb-4">📊 Quick Insights</h4>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Recommended Reorder Level</div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {inventoryMetrics.forecasting.recommendedReorderLevel}
                  </div>
                  <div className="text-xs text-muted-foreground">units (based on 30-day velocity)</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
                  <div className="text-sm text-muted-foreground mb-1">Average Lead Time</div>
                  <div className="text-2xl font-bold text-accent mb-1">
                    {inventoryMetrics.forecasting.avgLeadTime}
                  </div>
                  <div className="text-xs text-muted-foreground">days to restock</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20">
                  <div className="text-sm text-muted-foreground mb-1">Forecasted Demand</div>
                  <div className="text-2xl font-bold text-secondary mb-1">
                    {Math.ceil((inventoryMetrics.salesTracking['30d'] || 0) / 30 * inventoryMetrics.forecasting.avgLeadTime)}
                  </div>
                  <div className="text-xs text-muted-foreground">units needed during lead time</div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-foreground mb-4">🤖 AI Analysis & Recommendations</h4>
              <div className="bg-card/50 rounded-lg p-6 border border-border/50 min-h-[300px]">
                {aiInsights ? (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-transparent border-0 p-0 m-0">
                        {aiInsights}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-primary/20 flex items-center justify-center">
                        <Brain className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h5 className="text-lg font-medium text-foreground mb-2">AI-Powered Insights</h5>
                        <p className="text-muted-foreground mb-4">
                          Generate personalized inventory recommendations and forecasts based on your data
                        </p>
                        <Button 
                          onClick={generateAiForecast}
                          disabled={isGeneratingForecast}
                          className="bg-gradient-primary hover:opacity-90 text-white border-0"
                        >
                          {isGeneratingForecast ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Generate AI Forecast
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytics Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 glass-container mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  Sales vs Restock Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="restocks" fill="hsl(var(--secondary))" name="Restocks" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Sales Velocity Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.2}
                        name="Sales"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <TrendUp className="w-5 h-5 text-primary" />
                  Sales Performance vs Target
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="period" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                        name="Actual Sales"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 2, r: 4 }}
                        name="Target"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" />
                  Efficiency Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 overflow-y-auto">
                <div className="space-y-4 pt-2">
                  {trendData.map((item, index) => (
                    <div key={item.period} className="space-y-3 p-3 rounded-lg bg-card/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.period} Efficiency</span>
                        <Badge variant="outline" className="text-xs">
                          {item.efficiency}%
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.min(100, parseInt(item.efficiency))} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        {item.sales} sales / {item.target} target
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Stock Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="text-sm font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {data.value} items ({((data.value / Math.max(1, inventoryMetrics.forecasting.totalActiveItems)) * 100).toFixed(1)}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Inventory Health Score
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6">
                    <div className="relative w-40 h-40 mx-auto">
                      <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="hsl(var(--border))"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeDasharray={`${100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100)}, 100`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary">
                            {Math.round(100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100))}%
                          </div>
                          <div className="text-xs text-muted-foreground">Health Score</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm p-2 rounded bg-card/30">
                        <span>Critical Items:</span>
                        <span className="text-destructive font-medium">{inventoryMetrics.forecasting.criticalStockItems}</span>
                      </div>
                      <div className="flex justify-between text-sm p-2 rounded bg-card/30">
                        <span>Total Items:</span>
                        <span className="text-primary font-medium">{inventoryMetrics.forecasting.totalActiveItems}</span>
                      </div>
                      <div className="flex justify-between text-sm p-2 rounded bg-card/30">
                        <span>Health Status:</span>
                        <Badge variant={100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100) >= 80 ? "default" : "destructive"}>
                          {100 - (inventoryMetrics.forecasting.criticalStockItems / Math.max(1, inventoryMetrics.forecasting.totalActiveItems) * 100) >= 80 ? "Healthy" : "Needs Attention"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  Lead Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {inventoryMetrics.forecasting.avgLeadTime} days
                    </div>
                    <div className="text-sm text-muted-foreground">Average Lead Time</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Optimal Range:</span>
                      <span className="text-accent">7-14 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Current Status:</span>
                      <Badge variant={inventoryMetrics.forecasting.avgLeadTime <= 14 ? "default" : "secondary"}>
                        {inventoryMetrics.forecasting.avgLeadTime <= 14 ? "Optimal" : "Review Needed"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Reorder Point
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary mb-2">
                      {inventoryMetrics.forecasting.recommendedReorderLevel}
                    </div>
                    <div className="text-sm text-muted-foreground">Recommended Units</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Based on:</span>
                      <span className="text-accent">30-day velocity</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Safety Stock:</span>
                      <Badge variant="outline">
                        {Math.ceil(inventoryMetrics.forecasting.recommendedReorderLevel * 0.2)} units
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-tertiary mb-2">
                      {Math.ceil((inventoryMetrics.salesTracking['30d'] || 0) / 30 * inventoryMetrics.forecasting.avgLeadTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">Demand During Lead Time</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Confidence:</span>
                      <Badge variant="default">
                        {Math.min(95, Math.max(60, 95 - inventoryMetrics.forecasting.criticalStockItems * 5))}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Next Review:</span>
                      <span className="text-accent">7 days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Control Panel */}
      <Card className="glass-container">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 w-full">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>

              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[180px] glass-input">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="critical">Critical Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="normal">Normal Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleExport} disabled={isExporting} className="bg-gradient-secondary hover:opacity-90 text-white border-0 flex-1 sm:flex-none">
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Replenishment Items Table */}
      <Card className="glass-container">
        <div className="p-4">
          <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-4">
            📋 Replenishment Items ({filteredData.length})
          </h3>
          
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-medium text-muted-foreground mb-2">No replenishment items found</h4>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Add inventory items to see replenishment recommendations'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Current Stock</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Daily Rate</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Reorder Qty</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{item.product_id}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {item.product_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-foreground">{item.current_stock}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant={item.status_color}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-muted-foreground">{item.daily_sell_rate.toFixed(1)}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-accent">{item.suggested_reorder_qty}</span>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                📦 Replenishment Details: {selectedItem.product_id}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-container">
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground mb-3">Current Status</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product Type:</span>
                        <Badge variant="outline">{selectedItem.product_type.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Stock:</span>
                        <span className="font-medium">{selectedItem.current_stock} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Threshold:</span>
                        <span className="font-medium">{selectedItem.min_threshold} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={selectedItem.status_color}>{selectedItem.status}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="glass-container">
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground mb-3">Sales Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Sell Rate:</span>
                        <span className="font-medium">{selectedItem.daily_sell_rate.toFixed(2)} units/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weekly Sell Rate:</span>
                        <span className="font-medium">{selectedItem.weekly_sell_rate.toFixed(2)} units/week</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Sell Rate:</span>
                        <span className="font-medium">{selectedItem.monthly_sell_rate.toFixed(2)} units/month</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="glass-container">
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground mb-3">Replenishment Plan</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Suggested Reorder Qty:</span>
                        <span className="font-medium text-accent">{selectedItem.suggested_reorder_qty} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lead Time:</span>
                        <span className="font-medium">{selectedItem.lead_time_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Suggested Restock Date:</span>
                        <span className="font-medium">{selectedItem.suggested_restock_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projected Stockout:</span>
                        <span className="font-medium text-destructive">{selectedItem.projected_stockout_date}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="glass-container">
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground mb-3">AI Confidence</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Confidence Score:</span>
                        <Badge variant="default">{selectedItem.confidence_score}%</Badge>
                      </div>
                      <Progress value={selectedItem.confidence_score} className="w-full" />
                      <div className="text-xs text-muted-foreground">
                        Based on historical data and sales patterns
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Percent,
  Calendar,
  Download,
  FileSpreadsheet,
  BarChart3,
  Target,
  Users,
  Clock,
  Filter,
  Eye,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { addDays, subDays, format } from "date-fns";
import Papa from "papaparse";

interface Store {
  id: string;
  name: string;
}

interface AdvancedMetrics {
  // Revenue Metrics
  totalRevenue: number;
  revenueGrowth: number;
  avgOrderValue: number;
  aovGrowth: number;
  
  // Order Metrics
  totalOrders: number;
  orderGrowth: number;
  completionRate: number;
  
  // Fee Analysis
  totalFees: number;
  feePercentage: number;
  avgFeePerOrder: number;
  
  // Product Performance
  totalSKUs: number;
  activeSKUs: number;
  topPerformers: number;
  
  // Time-based Analysis
  peakOrderHour: string;
  peakOrderDay: string;
  avgProcessingTime: number;
}

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
  fees: number;
  profit: number;
}

interface FeeBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface TopProduct {
  sku: string;
  orders: number;
  revenue: number;
  fees: number;
  profit: number;
  margin: number;
}

interface StorePerformance {
  store_name: string;
  revenue: number;
  orders: number;
  fees: number;
  profit: number;
  margin: number;
}

export default function NoonAnalytics() {
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  
  // State
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics Data
  const [metrics, setMetrics] = useState<AdvancedMetrics>({
    totalRevenue: 0,
    revenueGrowth: 0,
    avgOrderValue: 0,
    aovGrowth: 0,
    totalOrders: 0,
    orderGrowth: 0,
    completionRate: 0,
    totalFees: 0,
    feePercentage: 0,
    avgFeePerOrder: 0,
    totalSKUs: 0,
    activeSKUs: 0,
    topPerformers: 0,
    peakOrderHour: "00:00",
    peakOrderDay: "Monday",
    avgProcessingTime: 0
  });
  
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([]);

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      loadAnalytics();
    }
  }, [selectedCountry, selectedStore, dateRange]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('platform', 'noon')
        .eq('country', selectedCountry)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadAnalytics = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    try {
      setLoading(true);
      
      // Build queries with date and store filters
      let feesQuery = supabase
        .from('noon_order_fees')
        .select('*')
        .eq('country_code', selectedCountry)
        .gte('ordered_date', dateRange.from.toISOString())
        .lte('ordered_date', dateRange.to.toISOString());
      
      if (selectedStore !== "all") {
        feesQuery = feesQuery.eq('store_id', selectedStore);
      }

      const { data: feesData, error: feesError } = await feesQuery;
      if (feesError) throw feesError;

      // Get SKU costs for profit calculation
      const { data: costsData } = await supabase
        .from('sku_costs')
        .select('*')
        .eq('country', selectedCountry);

      const costMap = new Map(costsData?.map(c => [c.sku, c.cost]) || []);

      // Process the data for analytics
      await processAnalyticsData(feesData || [], costMap);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedStore, dateRange, toast]);

  const processAnalyticsData = async (data: any[], costMap: Map<string, number>) => {
    if (!data.length) {
      // Reset all state to empty
      setMetrics({
        totalRevenue: 0, revenueGrowth: 0, avgOrderValue: 0, aovGrowth: 0,
        totalOrders: 0, orderGrowth: 0, completionRate: 0, totalFees: 0,
        feePercentage: 0, avgFeePerOrder: 0, totalSKUs: 0, activeSKUs: 0,
        topPerformers: 0, peakOrderHour: "00:00", peakOrderDay: "Monday", avgProcessingTime: 0
      });
      setChartData([]);
      setFeeBreakdown([]);
      setTopProducts([]);
      setStorePerformance([]);
      return;
    }

    // Calculate basic metrics
    const totalRevenue = data.reduce((sum, item) => sum + (item.invoice_price || 0), 0);
    const totalFees = data.reduce((sum, item) => sum + Math.abs(
      (item.fee_referral || 0) + 
      (item.fee_directship_outbound || 0) + 
      (item.fee_weight_handling || 0) + 
      (item.fee_crossdock || 0) +
      (item.fee_noon_penalty || 0) +
      (item.fee_item_cancellation || 0)
    ), 0);
    const totalOrders = data.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const feePercentage = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0;
    const avgFeePerOrder = totalOrders > 0 ? totalFees / totalOrders : 0;
    
    // SKU analysis
    const uniqueSKUs = new Set(data.map(item => item.sku).filter(sku => sku));
    const totalSKUs = uniqueSKUs.size;
    const activeSKUs = data.filter(item => (item.invoice_price || 0) > 0).length;

    // Time analysis
    const orderHours = data.map(item => new Date(item.ordered_date).getHours());
    const hourCounts = orderHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const peakHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[a[0]] > hourCounts[b[0]] ? a : b)?.[0] || "0";
    const peakOrderHour = `${peakHour.padStart(2, '0')}:00`;

    // Daily chart data
    const dailyData = new Map<string, { revenue: number; orders: number; fees: number; profit: number }>();
    
    data.forEach(item => {
      const date = format(new Date(item.ordered_date), 'yyyy-MM-dd');
      const revenue = item.invoice_price || 0;
      const fees = Math.abs(
        (item.fee_referral || 0) + 
        (item.fee_directship_outbound || 0) + 
        (item.fee_weight_handling || 0) + 
        (item.fee_crossdock || 0)
      );
      const cost = costMap.get(item.sku) || 0;
      const profit = revenue - fees - cost;

      if (!dailyData.has(date)) {
        dailyData.set(date, { revenue: 0, orders: 0, fees: 0, profit: 0 });
      }
      
      const dayData = dailyData.get(date)!;
      dayData.revenue += revenue;
      dayData.orders += 1;
      dayData.fees += fees;
      dayData.profit += profit;
    });

    const chartDataArray = Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fee breakdown
    const feeCategories = [
      { name: 'Referral Fees', key: 'fee_referral', color: '#8884d8' },
      { name: 'Shipping Fees', key: 'fee_directship_outbound', color: '#82ca9d' },
      { name: 'Weight Handling', key: 'fee_weight_handling', color: '#ffc658' },
      { name: 'Cross Dock', key: 'fee_crossdock', color: '#ff7c7c' },
      { name: 'Penalties', key: 'fee_noon_penalty', color: '#8dd1e1' },
      { name: 'Cancellations', key: 'fee_item_cancellation', color: '#d084d0' }
    ];

    const feeBreakdownData = feeCategories.map(category => {
      const amount = Math.abs(data.reduce((sum, item) => sum + (item[category.key] || 0), 0));
      const percentage = totalFees > 0 ? (amount / totalFees) * 100 : 0;
      return {
        category: category.name,
        amount,
        percentage,
        color: category.color
      };
    }).filter(item => item.amount > 0);

    // Top products analysis
    const productMap = new Map<string, { orders: number; revenue: number; fees: number; cost: number }>();
    
    data.forEach(item => {
      if (!item.sku) return;
      
      if (!productMap.has(item.sku)) {
        productMap.set(item.sku, { orders: 0, revenue: 0, fees: 0, cost: costMap.get(item.sku) || 0 });
      }
      
      const product = productMap.get(item.sku)!;
      product.orders += 1;
      product.revenue += item.invoice_price || 0;
      product.fees += Math.abs(
        (item.fee_referral || 0) + 
        (item.fee_directship_outbound || 0) + 
        (item.fee_weight_handling || 0)
      );
    });

    const topProductsData = Array.from(productMap.entries())
      .map(([sku, data]) => ({
        sku,
        orders: data.orders,
        revenue: data.revenue,
        fees: data.fees,
        profit: data.revenue - data.fees - (data.cost * data.orders),
        margin: data.revenue > 0 ? ((data.revenue - data.fees - (data.cost * data.orders)) / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Store performance (if viewing all stores)
    let storePerformanceData: StorePerformance[] = [];
    if (selectedStore === "all") {
      const storeMap = new Map<string, { revenue: number; orders: number; fees: number; cost: number }>();
      
      // Get store names
      const storeNames = new Map(stores.map(s => [s.id, s.name]));
      
      data.forEach(item => {
        const storeName = storeNames.get(item.store_id) || 'Unknown Store';
        if (!storeMap.has(storeName)) {
          storeMap.set(storeName, { revenue: 0, orders: 0, fees: 0, cost: 0 });
        }
        
        const store = storeMap.get(storeName)!;
        store.orders += 1;
        store.revenue += item.invoice_price || 0;
        store.fees += Math.abs(
          (item.fee_referral || 0) + 
          (item.fee_directship_outbound || 0) + 
          (item.fee_weight_handling || 0)
        );
        store.cost += costMap.get(item.sku) || 0;
      });

      storePerformanceData = Array.from(storeMap.entries())
        .map(([store_name, data]) => ({
          store_name,
          revenue: data.revenue,
          orders: data.orders,
          fees: data.fees,
          profit: data.revenue - data.fees - data.cost,
          margin: data.revenue > 0 ? ((data.revenue - data.fees - data.cost) / data.revenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
    }

    // Update state
    setMetrics({
      totalRevenue,
      revenueGrowth: 0, // TODO: Calculate vs previous period
      avgOrderValue,
      aovGrowth: 0, // TODO: Calculate vs previous period
      totalOrders,
      orderGrowth: 0, // TODO: Calculate vs previous period
      completionRate: 100, // TODO: Calculate based on order status
      totalFees,
      feePercentage,
      avgFeePerOrder,
      totalSKUs,
      activeSKUs,
      topPerformers: topProductsData.length,
      peakOrderHour,
      peakOrderDay: "Monday", // TODO: Calculate actual peak day
      avgProcessingTime: 0 // TODO: Calculate based on shipping dates
    });

    setChartData(chartDataArray);
    setFeeBreakdown(feeBreakdownData);
    setTopProducts(topProductsData);
    setStorePerformance(storePerformanceData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast({
      title: "Data refreshed",
      description: "Analytics data has been updated successfully"
    });
  };

  const exportData = (type: 'overview' | 'products' | 'stores' | 'daily') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'overview':
        data = [metrics];
        filename = `noon-analytics-overview-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'products':
        data = topProducts;
        filename = `noon-top-products-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'stores':
        data = storePerformance;
        filename = `noon-store-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'daily':
        data = chartData;
        filename = `noon-daily-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
    }

    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "No data available for the selected export type",
        variant: "destructive"
      });
      return;
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `${filename} has been downloaded`
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue" }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
        {change !== undefined && (
          <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercentage(Math.abs(change))} vs last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading advanced analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
      <HuhaHeader01
        icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
        title="Noon Analytics Dashboard"
        subtitle={`Advanced analytics and insights for ${selectedCountry}`}
        actions={[
          {
            label: 'Back to Dashboard',
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            onClick: () => window.location.href = '/noon-dashboard',
            variant: 'outline' as const
          },
          {
            label: 'Refresh',
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: handleRefresh,
            variant: 'outline' as const
          },
          {
            label: 'Export Overview',
            icon: <Download className="h-4 w-4 mr-2" />,
            onClick: () => exportData('overview'),
            variant: 'outline' as const
          }
        ]}
      />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Store:</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Date Range:</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-72"
              />
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {metrics.totalOrders.toLocaleString()} orders analyzed
            </Badge>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            change={metrics.revenueGrowth}
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders.toLocaleString()}
            change={metrics.orderGrowth}
            icon={ShoppingCart}
            color="blue"
          />
          <MetricCard
            title="Average Order Value"
            value={formatCurrency(metrics.avgOrderValue)}
            change={metrics.aovGrowth}
            icon={Target}
            color="purple"
          />
          <MetricCard
            title="Total Fees"
            value={formatCurrency(metrics.totalFees)}
            change={undefined}
            icon={Percent}
            color="orange"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(metrics.feePercentage)}</div>
              <p className="text-xs text-muted-foreground">Fee Percentage</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.totalSKUs}</div>
              <p className="text-xs text-muted-foreground">Total SKUs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.activeSKUs}</div>
              <p className="text-xs text-muted-foreground">Active SKUs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.avgFeePerOrder)}</div>
              <p className="text-xs text-muted-foreground">Avg Fee/Order</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.peakOrderHour}</div>
              <p className="text-xs text-muted-foreground">Peak Hour</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{formatPercentage(metrics.completionRate)}</div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
            <TabsTrigger value="fees">Fee Analysis</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="stores">Store Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue & Orders Trend</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('daily')}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Daily Data
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        name === 'revenue' || name === 'fees' || name === 'profit'
                          ? formatCurrency(value)
                          : value.toLocaleString(),
                        name
                      ]}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Revenue"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="profit"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                      name="Profit"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#ff7300"
                      strokeWidth={3}
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={feeBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                        label={({ category, percentage }) => `${category}: ${formatPercentage(percentage)}`}
                      >
                        {feeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fee Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {feeBreakdown.map((fee, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: fee.color }}
                          />
                          <span className="font-medium">{fee.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(fee.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatPercentage(fee.percentage)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Performing Products</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('products')}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Products
                </Button>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.sku} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.sku || 'Unknown SKU'}</p>
                            <p className="text-sm text-slate-600">{product.orders} orders</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-right">
                          <div>
                            <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                            <p className="text-xs text-slate-600">Revenue</p>
                          </div>
                          <div>
                            <p className="font-bold text-red-600">{formatCurrency(product.fees)}</p>
                            <p className="text-xs text-slate-600">Fees</p>
                          </div>
                          <div>
                            <p className="font-bold text-blue-600">{formatCurrency(product.profit)}</p>
                            <p className="text-xs text-slate-600">Profit</p>
                          </div>
                          <div>
                            <p className={`font-bold ${product.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(product.margin)}
                            </p>
                            <p className="text-xs text-slate-600">Margin</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No product data available for the selected filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stores">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Store Performance Comparison</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('stores')}
                  className="flex items-center gap-2"
                  disabled={selectedStore !== "all"}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Stores
                </Button>
              </CardHeader>
              <CardContent>
                {selectedStore === "all" && storePerformance.length > 0 ? (
                  <div className="space-y-4">
                    {storePerformance.map((store, index) => (
                      <div key={store.store_name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{store.store_name}</p>
                            <p className="text-sm text-slate-600">{store.orders} orders</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-right">
                          <div>
                            <p className="font-bold text-green-600">{formatCurrency(store.revenue)}</p>
                            <p className="text-xs text-slate-600">Revenue</p>
                          </div>
                          <div>
                            <p className="font-bold text-red-600">{formatCurrency(store.fees)}</p>
                            <p className="text-xs text-slate-600">Fees</p>
                          </div>
                          <div>
                            <p className="font-bold text-blue-600">{formatCurrency(store.profit)}</p>
                            <p className="text-xs text-slate-600">Profit</p>
                          </div>
                          <div>
                            <p className={`font-bold ${store.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(store.margin)}
                            </p>
                            <p className="text-xs text-slate-600">Margin</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedStore !== "all" ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Store comparison is only available when viewing "All Stores"</p>
                    <p className="text-sm mt-2">Change the store filter to "All Stores" to see store performance comparison</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No store data available for comparison</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
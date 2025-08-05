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

export function EnhancedAnalyticsDashboard({ 
  salesData, 
  selectedPeriod, 
  setSelectedPeriod, 
  chartLayout, 
  setChartLayout,
  totalSales30d,
  totalRestocks30d 
}: {
  salesData: SalesData[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  chartLayout: string;
  setChartLayout: (layout: string) => void;
  totalSales30d: number;
  totalRestocks30d: number;
}) {
  const chartConfig = {
    total_sold: { label: "Total Sold", color: "hsl(var(--primary))" },
    total_restocked: { label: "Total Restocked", color: "hsl(var(--secondary))" },
    sell_rate: { label: "Sell Rate", color: "hsl(var(--accent))" },
    asin_sold: { label: "ASIN", color: "hsl(var(--chart-1))" },
    sku_sold: { label: "SKU", color: "hsl(220, 70%, 50%)" }
  };

  const selectedPeriodData = salesData.find(d => d.period === selectedPeriod);

  return (
    <div className="space-y-8">
      {/* Enhanced Control Panel */}
      <Card className="glass-container border backdrop-blur-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-r from-primary to-secondary">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                Advanced Analytics Dashboard
              </h3>
              <p className="text-muted-foreground">Intelligent insights and predictive analytics for your inventory</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40 hover-scale transition-all duration-300">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="15d">Last 15 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="45d">Last 45 Days</SelectItem>
                    <SelectItem value="60d">Last 60 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-muted-foreground" />
                <Select value={chartLayout} onValueChange={setChartLayout}>
                  <SelectTrigger className="w-48 hover-scale transition-all duration-300">
                    <SelectValue placeholder="Chart Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">📊 Side by Side</SelectItem>
                    <SelectItem value="stacked">📈 Stacked View</SelectItem>
                    <SelectItem value="grid">🔲 Grid Layout</SelectItem>
                    <SelectItem value="advanced">⚡ Advanced Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gradient-to-r from-background/50 to-background/80 rounded-xl border">
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-primary">{totalSales30d}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-secondary">{totalRestocks30d}</p>
              <p className="text-xs text-muted-foreground">Restocks</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-accent">
                {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'}
              </p>
              <p className="text-xs text-muted-foreground">Daily Rate</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-purple-500">
                {Math.round(((totalRestocks30d / (totalSales30d + 1)) * 100))}%
              </p>
              <p className="text-xs text-muted-foreground">Efficiency</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Charts Grid */}
      <div className={
        chartLayout === 'default' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' :
        chartLayout === 'stacked' ? 'space-y-6' :
        chartLayout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' :
        chartLayout === 'advanced' ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' :
        'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
      }>
        
        {/* Primary Sales Trend Chart */}
        <Card className={`glass-container hover-scale transition-all duration-500 hover:shadow-xl overflow-hidden group ${
          chartLayout === 'advanced' ? 'xl:col-span-2' : ''
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <LineChart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Sales Performance</h4>
                  <p className="text-sm text-muted-foreground">Sales vs Restock Analysis</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Trending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <ChartContainer config={chartConfig} className={chartLayout === 'advanced' ? 'h-80' : 'h-64'}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={salesData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="restockGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                    width={40} 
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_sold" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#salesGradient)"
                    strokeWidth={3}
                    name="Units Sold" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_restocked" 
                    stroke="hsl(var(--secondary))" 
                    fill="url(#restockGradient)"
                    strokeWidth={3}
                    name="Units Restocked" 
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ASIN vs SKU Performance */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold">Product Performance</h4>
                <p className="text-sm text-muted-foreground">ASIN vs SKU Comparison</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={salesData.slice(-6)} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                    width={40} 
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="asin_sold" 
                    fill="hsl(var(--chart-1))" 
                    name="ASIN Sales" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50}
                  />
                  <Bar 
                    dataKey="sku_sold" 
                    fill="hsl(220, 70%, 50%)" 
                    name="SKU Sales" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Velocity Analysis */}
        <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent/10">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="text-lg font-semibold">Velocity Trends</h4>
                <p className="text-sm text-muted-foreground">Daily sell rate analysis</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    axisLine={false} 
                    tickLine={false} 
                    width={40} 
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="sell_rate" 
                    stroke="hsl(var(--accent))" 
                    fill="url(#velocityGradient)"
                    strokeWidth={3}
                    name="Units/Day" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Sales Distribution */}
        {selectedPeriodData && (
          <Card className="glass-container hover-scale transition-all duration-500 hover:shadow-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <PieChart className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Sales Distribution</h4>
                  <p className="text-sm text-muted-foreground">{selectedPeriod} breakdown</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 relative z-10">
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <Pie 
                      data={[
                        { name: 'ASIN', value: selectedPeriodData.asin_sold, fill: 'hsl(var(--chart-1))' },
                        { name: 'SKU', value: selectedPeriodData.sku_sold, fill: 'hsl(220, 70%, 50%)' }
                      ]} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={40} 
                      outerRadius={80} 
                      dataKey="value"
                      stroke="hsl(var(--background))" 
                      strokeWidth={3}
                    >
                      {[
                        { name: 'ASIN', value: selectedPeriodData.asin_sold, fill: 'hsl(var(--chart-1))' },
                        { name: 'SKU', value: selectedPeriodData.sku_sold, fill: 'hsl(220, 70%, 50%)' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
            </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Insights Panel */}
      <Card className="glass-container border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-semibold">Performance Insights</h4>
              <p className="text-muted-foreground">AI-powered analytics and recommendations</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h5 className="font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top Performers
              </h5>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium">ASIN Sales</p>
                  <p className="text-xs text-muted-foreground">
                    {((selectedPeriodData?.asin_sold || 0) / ((selectedPeriodData?.total_sold || 1)) * 100).toFixed(1)}% 
                    of total sales
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium">Daily Velocity</p>
                  <p className="text-xs text-muted-foreground">
                    {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'} units/day average
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-medium text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Optimization Areas
              </h5>
              <div className="space-y-2">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium">Restock Ratio</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((totalRestocks30d / (totalSales30d + 1)) * 100))}% efficiency score
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium">SKU Performance</p>
                  <p className="text-xs text-muted-foreground">
                    {((selectedPeriodData?.sku_sold || 0) / ((selectedPeriodData?.total_sold || 1)) * 100).toFixed(1)}% 
                    contribution
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-medium text-purple-600 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Recommendations
              </h5>
              <div className="space-y-2">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium">Forecasting</p>
                  <p className="text-xs text-muted-foreground">
                    Expect {Math.round((salesData.find(d => d.period === '30d')?.sell_rate || 0) * 7)} units next week
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm font-medium">Stock Planning</p>
                  <p className="text-xs text-muted-foreground">
                    Maintain {Math.round((salesData.find(d => d.period === '30d')?.sell_rate || 0) * 14)} units buffer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
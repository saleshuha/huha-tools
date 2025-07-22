import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
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
  Activity
} from 'lucide-react';

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
  priority_level: 'high' | 'medium' | 'low';
  movement_type: 'fast' | 'normal' | 'slow';
  last_analyzed: string;
}

interface AnalyticsData {
  totalItems: number;
  highPriorityItems: number;
  fastMovingItems: number;
  slowMovingItems: number;
  averageTurnover: number;
}

export function Replenishment() {
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalItems: 0,
    highPriorityItems: 0,
    fastMovingItems: 0,
    slowMovingItems: 0,
    averageTurnover: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReplenishmentItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  // Load existing replenishment data
  const loadReplenishmentData = async () => {
    if (!selectedCountry) return;
    
    try {
      setLoading(true);
      
      // For now, we'll generate mock data since we don't have historical sales data
      // In a real implementation, this would query actual sales history
      const mockData: ReplenishmentItem[] = [
        {
          id: '1',
          product_id: 'B08N5WRWNW-SN001',
          product_type: 'asin',
          current_stock: 15,
          min_threshold: 20,
          lead_time_days: 14,
          daily_sell_rate: 2.5,
          weekly_sell_rate: 17.5,
          monthly_sell_rate: 75,
          suggested_reorder_qty: 100,
          suggested_restock_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          projected_stockout_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'high',
          movement_type: 'fast',
          last_analyzed: new Date().toISOString()
        },
        {
          id: '2',
          product_id: 'SKU-12345-BIN-A1',
          product_type: 'sku',
          current_stock: 45,
          min_threshold: 30,
          lead_time_days: 10,
          daily_sell_rate: 1.2,
          weekly_sell_rate: 8.4,
          monthly_sell_rate: 36,
          suggested_reorder_qty: 60,
          suggested_restock_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          projected_stockout_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'medium',
          movement_type: 'normal',
          last_analyzed: new Date().toISOString()
        },
        {
          id: '3',
          product_id: 'B07XYZ123-SN002',
          product_type: 'asin',
          current_stock: 80,
          min_threshold: 25,
          lead_time_days: 21,
          daily_sell_rate: 0.5,
          weekly_sell_rate: 3.5,
          monthly_sell_rate: 15,
          suggested_reorder_qty: 40,
          suggested_restock_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          projected_stockout_date: new Date(Date.now() + 160 * 24 * 60 * 60 * 1000).toISOString(),
          priority_level: 'low',
          movement_type: 'slow',
          last_analyzed: new Date().toISOString()
        }
      ];
      
      setReplenishmentData(mockData);
      
      // Calculate analytics
      const analytics: AnalyticsData = {
        totalItems: mockData.length,
        highPriorityItems: mockData.filter(item => item.priority_level === 'high').length,
        fastMovingItems: mockData.filter(item => item.movement_type === 'fast').length,
        slowMovingItems: mockData.filter(item => item.movement_type === 'slow').length,
        averageTurnover: mockData.reduce((acc, item) => acc + item.monthly_sell_rate, 0) / mockData.length
      };
      
      setAnalyticsData(analytics);
      
    } catch (error) {
      console.error('Error loading replenishment data:', error);
      toast({
        title: "Error",
        description: "Failed to load replenishment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // AI Analysis function (mock implementation)
  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, this would call an AI service
      toast({
        title: "AI Analysis Complete",
        description: "Inventory forecasting and recommendations have been updated",
      });
      
      // Refresh data
      await loadReplenishmentData();
      
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete AI analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export replenishment plan
  const exportReplenishmentPlan = () => {
    const csvHeaders = [
      'Product ID', 'Type', 'Current Stock', 'Min Threshold', 'Lead Time (Days)',
      'Daily Sell Rate', 'Weekly Sell Rate', 'Monthly Sell Rate',
      'Suggested Reorder Qty', 'Suggested Restock Date', 'Projected Stockout Date',
      'Priority', 'Movement Type'
    ];
    
    const csvData = [
      csvHeaders,
      ...filteredData.map(item => [
        item.product_id,
        item.product_type.toUpperCase(),
        item.current_stock.toString(),
        item.min_threshold.toString(),
        item.lead_time_days.toString(),
        item.daily_sell_rate.toFixed(2),
        item.weekly_sell_rate.toFixed(2),
        item.monthly_sell_rate.toFixed(2),
        item.suggested_reorder_qty.toString(),
        new Date(item.suggested_restock_date).toLocaleDateString(),
        new Date(item.projected_stockout_date).toLocaleDateString(),
        item.priority_level,
        item.movement_type
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `replenishment-plan-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Exported ${filteredData.length} replenishment recommendations`,
    });
  };

  // Filter data based on search and filters
  const filteredData = replenishmentData.filter(item => {
    const matchesSearch = item.product_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || item.priority_level === priorityFilter;
    const matchesMovement = movementFilter === 'all' || item.movement_type === movementFilter;
    
    return matchesSearch && matchesPriority && matchesMovement;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMovementColor = (movement: string) => {
    switch (movement) {
      case 'fast': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'normal': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'slow': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockLevel = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage <= 100) return { level: 'critical', color: 'bg-red-500' };
    if (percentage <= 150) return { level: 'low', color: 'bg-yellow-500' };
    return { level: 'healthy', color: 'bg-green-500' };
  };

  const getDaysUntilStockout = (stockoutDate: string) => {
    const days = Math.ceil((new Date(stockoutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDaysUntilRestock = (restockDate: string) => {
    const days = Math.ceil((new Date(restockDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  useEffect(() => {
    if (selectedCountry) {
      loadReplenishmentData();
    }
  }, [selectedCountry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading replenishment data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Analytics Dashboard */}
      <div className="glass-container p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-0 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-primary shadow-lg">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  AI Inventory Intelligence
                </h2>
                <p className="text-muted-foreground">Real-time analytics and smart recommendations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Live</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Last updated: {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="relative overflow-hidden group hover-scale bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-3">
                <Package className="w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <ArrowUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">{analyticsData.totalItems}</div>
              <div className="text-sm font-medium text-blue-700">Total Items Monitored</div>
              <div className="text-xs text-blue-600 mt-1">+5% from last week</div>
            </div>
          </Card>
          
          <Card className="relative overflow-hidden group hover-scale bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle className="w-10 h-10 text-red-600 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-900 mb-1">{analyticsData.highPriorityItems}</div>
              <div className="text-sm font-medium text-red-700">Critical Priority</div>
              <div className="text-xs text-red-600 mt-1">Requires immediate attention</div>
            </div>
          </Card>
          
          <Card className="relative overflow-hidden group hover-scale bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-900 mb-1">{analyticsData.fastMovingItems}</div>
              <div className="text-sm font-medium text-green-700">Fast Moving Items</div>
              <div className="text-xs text-green-600 mt-1">High velocity products</div>
            </div>
          </Card>
          
          <Card className="relative overflow-hidden group hover-scale bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingDown className="w-10 h-10 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
                <ArrowDown className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-1">{analyticsData.slowMovingItems}</div>
              <div className="text-sm font-medium text-orange-700">Slow Moving Items</div>
              <div className="text-xs text-orange-600 mt-1">Consider promotions</div>
            </div>
          </Card>
          
          <Card className="relative overflow-hidden group hover-scale bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                <Star className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-1">{analyticsData.averageTurnover.toFixed(1)}</div>
              <div className="text-sm font-medium text-purple-700">Avg Monthly Sales</div>
              <div className="text-xs text-purple-600 mt-1">Units per month</div>
            </div>
          </Card>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-8 p-4 bg-white/50 rounded-xl border border-white/20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Quick Actions:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-300"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Generate Purchase Orders
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200 text-green-700 hover:text-green-800 transition-all duration-300"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve All High Priority
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200 text-purple-700 hover:text-purple-800 transition-all duration-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Auto-Reorder
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls Section */}
      <Card className="glass-container p-8 rounded-2xl shadow-xl border-0 bg-gradient-to-r from-background via-background/95 to-background">
        <div className="space-y-6">
          {/* Search and AI Section */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  placeholder="🔍 Search by Product ID, ASIN, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-lg bg-white/70 border-2 border-muted hover:border-primary/30 focus:border-primary transition-all duration-300 rounded-xl"
                />
                {searchTerm && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setSearchTerm('')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-11 bg-white/70 border-2 hover:border-primary/30 transition-all duration-300 rounded-lg">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="all">🎯 All Priorities</SelectItem>
                    <SelectItem value="high">🔥 High Priority</SelectItem>
                    <SelectItem value="medium">⚡ Medium Priority</SelectItem>
                    <SelectItem value="low">📋 Low Priority</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={movementFilter} onValueChange={setMovementFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-11 bg-white/70 border-2 hover:border-primary/30 transition-all duration-300 rounded-lg">
                    <Activity className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by Movement" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="all">🌟 All Movement Types</SelectItem>
                    <SelectItem value="fast">🚀 Fast Moving</SelectItem>
                    <SelectItem value="normal">📊 Normal Moving</SelectItem>
                    <SelectItem value="slow">🐌 Slow Moving</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <Button
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                size="lg"
                className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl h-12 px-8"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    🧠 AI Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-3" />
                    🚀 Run AI Analysis
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={exportReplenishmentPlan}
                size="lg"
                className="border-2 hover:bg-accent/10 transition-all duration-300 rounded-xl h-12 px-8"
              >
                <Download className="w-5 h-5 mr-3" />
                📊 Export Plan
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  Showing {filteredData.length} of {replenishmentData.length} items
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {filteredData.filter(item => item.priority_level === 'high').length} Critical
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  {filteredData.filter(item => item.priority_level === 'medium').length} Medium
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Enhanced Replenishment Data Table */}
      <Card className="glass-container rounded-2xl shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 p-6 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Smart Replenishment Grid</h3>
                <p className="text-sm text-muted-foreground">AI-powered inventory optimization dashboard</p>
              </div>
            </div>
            <Badge className="bg-gradient-primary text-primary-foreground border-0 px-4 py-2">
              {filteredData.length} Items
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted/30 to-muted/20 sticky top-0">
              <tr>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Product Details
                  </div>
                </th>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Stock Health
                  </div>
                </th>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Sales Velocity
                  </div>
                </th>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI Recommendation
                  </div>
                </th>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timeline
                  </div>
                </th>
                <th className="text-left p-6 font-bold text-foreground border-r border-muted/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Level
                  </div>
                </th>
                <th className="text-center p-6 font-bold text-foreground">
                  <div className="flex items-center gap-2 justify-center">
                    <Eye className="w-4 h-4" />
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-12">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="p-6 bg-muted/20 rounded-full">
                        <Brain className="w-12 h-12" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No replenishment data available</h3>
                        <p className="text-sm">Run AI analysis to generate smart recommendations</p>
                      </div>
                      <Button 
                        onClick={runAIAnalysis}
                        disabled={isAnalyzing}
                        className="bg-gradient-primary hover:bg-gradient-primary/90 mt-4"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Start AI Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const stockLevel = getStockLevel(item.current_stock, item.min_threshold);
                  const daysUntilStockout = getDaysUntilStockout(item.projected_stockout_date);
                  const daysUntilRestock = getDaysUntilRestock(item.suggested_restock_date);
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`group hover:bg-gradient-to-r hover:from-primary/3 hover:to-accent/3 transition-all duration-300 animate-fade-in border-b border-muted/10 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Product Details */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-mono text-sm font-bold text-foreground">{item.product_id}</div>
                              <Badge variant="outline" className={`mt-1 ${
                                item.product_type === 'asin' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {item.product_type.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stock Health */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-foreground">{item.current_stock}</span>
                            <span className="text-sm text-muted-foreground">/ {item.min_threshold} min</span>
                          </div>
                          <Progress 
                            value={Math.min((item.current_stock / item.min_threshold) * 100, 100)} 
                            className="h-3 rounded-full"
                          />
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stockLevel.color}`}></div>
                            <span className="text-xs font-medium capitalize text-muted-foreground">
                              {stockLevel.level} Stock
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sales Velocity */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">Daily: {item.daily_sell_rate.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">Weekly: {item.weekly_sell_rate.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium">Monthly: {item.monthly_sell_rate.toFixed(0)}</span>
                          </div>
                          <Badge className={getMovementColor(item.movement_type)}>
                            {item.movement_type === 'fast' && '🚀'}
                            {item.movement_type === 'normal' && '📊'}
                            {item.movement_type === 'slow' && '🐌'}
                            {' '}{item.movement_type}
                          </Badge>
                        </div>
                      </td>

                      {/* AI Recommendation */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-lg text-foreground">{item.suggested_reorder_qty}</span>
                            <span className="text-sm text-muted-foreground">units</span>
                          </div>
                          <div className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
                            <div className="text-xs font-medium text-primary">AI Confidence: High</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Based on {item.lead_time_days}d lead time
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="text-sm font-medium">{new Date(item.suggested_restock_date).toLocaleDateString()}</div>
                              <div className="text-xs text-blue-600">
                                {daysUntilRestock > 0 ? `In ${daysUntilRestock} days` : `${Math.abs(daysUntilRestock)} days overdue`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <div>
                              <div className="text-sm font-medium">{new Date(item.projected_stockout_date).toLocaleDateString()}</div>
                              <div className={`text-xs font-medium ${
                                daysUntilStockout <= 7 ? 'text-red-600' : 
                                daysUntilStockout <= 14 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                Stockout in {daysUntilStockout} days
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="p-6 border-r border-muted/10">
                        <div className="space-y-2">
                          <Badge className={`${getPriorityColor(item.priority_level)} px-3 py-1 font-medium`}>
                            {item.priority_level === 'high' && '🔥'}
                            {item.priority_level === 'medium' && '⚡'}
                            {item.priority_level === 'low' && '📋'}
                            {' '}{item.priority_level.toUpperCase()}
                          </Badge>
                          {daysUntilStockout <= 7 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs font-medium">URGENT</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-6 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailDialogOpen(true);
                          }}
                          className="bg-white/70 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all duration-300 rounded-lg group"
                        >
                          <Eye className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Enhanced Item Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="border-b border-muted/20 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-primary rounded-xl">
                  <Package className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {selectedItem?.product_id}
                  </DialogTitle>
                  <p className="text-muted-foreground">Advanced replenishment analytics</p>
                </div>
              </div>
              {selectedItem && (
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedItem.priority_level)}>
                    {selectedItem.priority_level.toUpperCase()}
                  </Badge>
                  <Badge className={getMovementColor(selectedItem.movement_type)}>
                    {selectedItem.movement_type.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedItem && (
            <Tabs defaultValue="overview" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-xl p-1">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  📊 Overview
                </TabsTrigger>
                <TabsTrigger value="forecast" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  📈 Forecast
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  🎯 AI Insights
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  📜 History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="w-6 h-6 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Current Stock</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">{selectedItem.current_stock}</div>
                    <div className="text-sm text-blue-600 mt-1">units available</div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Min Threshold</span>
                    </div>
                    <div className="text-3xl font-bold text-red-900">{selectedItem.min_threshold}</div>
                    <div className="text-sm text-red-600 mt-1">safety level</div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-6 h-6 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Lead Time</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900">{selectedItem.lead_time_days}</div>
                    <div className="text-sm text-green-600 mt-1">days</div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover-scale">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Monthly Sales</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900">{selectedItem.monthly_sell_rate.toFixed(0)}</div>
                    <div className="text-sm text-purple-600 mt-1">units/month</div>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      Sell-Through Analysis
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Daily Rate:</span>
                        </div>
                        <span className="text-lg font-bold text-green-700">{selectedItem.daily_sell_rate.toFixed(2)} units</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">Weekly Rate:</span>
                        </div>
                        <span className="text-lg font-bold text-blue-700">{selectedItem.weekly_sell_rate.toFixed(1)} units</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="font-medium">Monthly Rate:</span>
                        </div>
                        <span className="text-lg font-bold text-purple-700">{selectedItem.monthly_sell_rate.toFixed(0)} units</span>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Key Timeline
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Suggested Restock:</span>
                        </div>
                        <span className="text-sm font-bold text-blue-700">{new Date(selectedItem.suggested_restock_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="font-medium">Projected Stockout:</span>
                        </div>
                        <span className="text-sm font-bold text-red-700">{new Date(selectedItem.projected_stockout_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">Last Analyzed:</span>
                        </div>
                        <span className="text-sm font-bold text-purple-700">{new Date(selectedItem.last_analyzed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="forecast" className="space-y-6 mt-6 animate-fade-in">
                <Card className="p-8 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <h4 className="font-bold text-xl">90-Day Demand Forecast</h4>
                  </div>
                  <div className="text-center py-16 bg-white/30 rounded-xl border-2 border-dashed border-primary/20">
                    <div className="space-y-4">
                      <BarChart3 className="w-16 h-16 text-primary/40 mx-auto" />
                      <h3 className="text-lg font-semibold text-muted-foreground">Interactive Forecast Chart</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Advanced time-series analysis and demand forecasting visualization would be displayed here with projected trends, seasonality patterns, and confidence intervals.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-6 mt-6 animate-fade-in">
                <div className="space-y-4">
                  <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover-scale">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-600 rounded-xl">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-blue-900 mb-2">Optimal Reorder Quantity</h4>
                        <p className="text-blue-800 mb-3">
                          Order <span className="font-bold text-xl">{selectedItem.suggested_reorder_qty} units</span> to maintain optimal stock levels while minimizing carrying costs.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <CheckCircle className="w-4 h-4" />
                          <span>AI Confidence: 94% (High)</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover-scale">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-600 rounded-xl">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-green-900 mb-2">Optimal Timing</h4>
                        <p className="text-green-800 mb-3">
                          Place order by <span className="font-bold">{new Date(selectedItem.suggested_restock_date).toLocaleDateString()}</span> to avoid stockout and maintain service levels.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Clock className="w-4 h-4" />
                          <span>Optimal order window: Next 3-5 days</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 hover-scale">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-yellow-600 rounded-xl">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-yellow-900 mb-2">AI Risk Assessment</h4>
                        <p className="text-yellow-800 mb-3">
                          Account for {selectedItem.lead_time_days} days supplier lead time plus 3-day safety buffer to mitigate supply chain risks.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-yellow-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Risk Level: {selectedItem.priority_level === 'high' ? 'Critical' : selectedItem.priority_level === 'medium' ? 'Moderate' : 'Low'}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-6 mt-6 animate-fade-in">
                <Card className="p-8 bg-gradient-to-br from-muted/20 to-muted/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-6 h-6 text-primary" />
                    <h4 className="font-bold text-xl">Stock Movement History</h4>
                  </div>
                  <div className="text-center py-16 bg-white/30 rounded-xl border-2 border-dashed border-muted/30">
                    <div className="space-y-4">
                      <Activity className="w-16 h-16 text-muted-foreground/40 mx-auto" />
                      <h3 className="text-lg font-semibold text-muted-foreground">Historical Analytics</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Detailed stock movement timeline, reorder history, and performance metrics would be displayed here with interactive charts and trend analysis.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
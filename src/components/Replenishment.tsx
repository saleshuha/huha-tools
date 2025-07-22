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
  Target
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
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{analyticsData.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{analyticsData.highPriorityItems}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{analyticsData.fastMovingItems}</div>
              <div className="text-sm text-muted-foreground">Fast Moving</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{analyticsData.slowMovingItems}</div>
              <div className="text-sm text-muted-foreground">Slow Moving</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{analyticsData.averageTurnover.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Monthly Sales</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by Product ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={movementFilter} onValueChange={setMovementFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Movement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movement Types</SelectItem>
                <SelectItem value="fast">Fast Moving</SelectItem>
                <SelectItem value="normal">Normal Moving</SelectItem>
                <SelectItem value="slow">Slow Moving</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-primary hover:bg-gradient-primary/90"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={exportReplenishmentPlan}>
              <Download className="w-4 h-4 mr-2" />
              Export Plan
            </Button>
          </div>
        </div>
      </Card>

      {/* Replenishment Data */}
      <Card className="glass-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-4 font-semibold">Product ID</th>
                <th className="text-left p-4 font-semibold">Type</th>
                <th className="text-left p-4 font-semibold">Stock Level</th>
                <th className="text-left p-4 font-semibold">Sell Rate</th>
                <th className="text-left p-4 font-semibold">Reorder Qty</th>
                <th className="text-left p-4 font-semibold">Restock Date</th>
                <th className="text-left p-4 font-semibold">Stockout Risk</th>
                <th className="text-left p-4 font-semibold">Priority</th>
                <th className="text-left p-4 font-semibold">Movement</th>
                <th className="text-center p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-muted-foreground">
                    No replenishment data available. Run AI analysis to generate recommendations.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const stockLevel = getStockLevel(item.current_stock, item.min_threshold);
                  const daysUntilStockout = getDaysUntilStockout(item.projected_stockout_date);
                  const daysUntilRestock = getDaysUntilRestock(item.suggested_restock_date);
                  
                  return (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-4 font-mono text-sm font-semibold">{item.product_id}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="uppercase">
                          {item.product_type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.current_stock}</span>
                            <span className="text-muted-foreground text-sm">/ {item.min_threshold} min</span>
                          </div>
                          <Progress 
                            value={Math.min((item.current_stock / item.min_threshold) * 100, 100)} 
                            className="h-2"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm space-y-1">
                          <div>Daily: {item.daily_sell_rate.toFixed(1)}</div>
                          <div>Weekly: {item.weekly_sell_rate.toFixed(1)}</div>
                          <div>Monthly: {item.monthly_sell_rate.toFixed(0)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-lg">{item.suggested_reorder_qty}</div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm">{new Date(item.suggested_restock_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {daysUntilRestock > 0 ? `In ${daysUntilRestock} days` : `${Math.abs(daysUntilRestock)} days overdue`}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm">{new Date(item.projected_stockout_date).toLocaleDateString()}</div>
                          <div className={`text-xs font-medium ${daysUntilStockout <= 7 ? 'text-red-600' : daysUntilStockout <= 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {daysUntilStockout > 0 ? `${daysUntilStockout} days left` : `${Math.abs(daysUntilStockout)} days overdue`}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getPriorityColor(item.priority_level)}>
                          {item.priority_level}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getMovementColor(item.movement_type)}>
                          {item.movement_type}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          Details
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

      {/* Item Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Replenishment Details - {selectedItem?.product_id}</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Current Stock</div>
                    <div className="text-2xl font-bold">{selectedItem.current_stock}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Min Threshold</div>
                    <div className="text-2xl font-bold">{selectedItem.min_threshold}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Lead Time</div>
                    <div className="text-2xl font-bold">{selectedItem.lead_time_days}d</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Monthly Sales</div>
                    <div className="text-2xl font-bold">{selectedItem.monthly_sell_rate.toFixed(0)}</div>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Sell-Through Rates</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Daily:</span>
                        <span className="font-semibold">{selectedItem.daily_sell_rate.toFixed(2)} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weekly:</span>
                        <span className="font-semibold">{selectedItem.weekly_sell_rate.toFixed(1)} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly:</span>
                        <span className="font-semibold">{selectedItem.monthly_sell_rate.toFixed(0)} units</span>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Key Dates</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Suggested Restock:</span>
                        <span className="font-semibold">{new Date(selectedItem.suggested_restock_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Projected Stockout:</span>
                        <span className="font-semibold text-red-600">{new Date(selectedItem.projected_stockout_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Analyzed:</span>
                        <span className="font-semibold">{new Date(selectedItem.last_analyzed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="forecast" className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-4">Demand Forecast (Next 90 Days)</h4>
                  <div className="text-center text-muted-foreground py-8">
                    Forecast chart would be displayed here with projected demand trends
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-4">AI Recommendations</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-semibold">Optimal Reorder Quantity</div>
                        <div className="text-sm text-muted-foreground">
                          Order {selectedItem.suggested_reorder_qty} units to maintain optimal stock levels
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-semibold">Timing Recommendation</div>
                        <div className="text-sm text-muted-foreground">
                          Place order by {new Date(selectedItem.suggested_restock_date).toLocaleDateString()} to avoid stockout
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-semibold">Lead Time Buffer</div>
                        <div className="text-sm text-muted-foreground">
                          Account for {selectedItem.lead_time_days} days supplier lead time plus 2-3 days safety buffer
                        </div>
                      </div>
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
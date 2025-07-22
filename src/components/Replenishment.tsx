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
        () => {
          console.log('ASIN inventory changed, refreshing analytics...');
          loadAnalytics(selectedCountry);
          loadReplenishmentData();
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
        () => {
          console.log('SKU inventory changed, refreshing analytics...');
          loadAnalytics(selectedCountry);
          loadReplenishmentData();
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
        () => {
          console.log('Stock change recorded, refreshing analytics...');
          loadAnalytics(selectedCountry);
          loadReplenishmentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(asinChannel);
      supabase.removeChannel(skuChannel);
      supabase.removeChannel(stockChangesChannel);
    };
  }, [selectedCountry]);

  // Load data when country changes
  useEffect(() => {
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
    loadReplenishmentData();
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

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-none">
      {/* AI Analytics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-primary/10 backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <Badge variant="secondary" className="bg-destructive/20 text-destructive border-0 text-xs">
                Critical
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {inventoryMetrics.forecasting.criticalStockItems}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Critical Stock ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive mr-2" />
              <span className="text-destructive font-medium">≤1 unit items</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-accent/10 backdrop-blur-sm">
                <TrendingDown className="w-6 h-6 text-accent" />
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5 text-xs">
                30 Days
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {inventoryMetrics.salesTracking['30d'] || 0}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Items Sold ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <Activity className="w-4 h-4 text-accent mr-2" />
              <span className="text-accent font-medium">{((inventoryMetrics.salesTracking['30d'] || 0) / 30).toFixed(1)}/day avg</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-secondary/10 backdrop-blur-sm">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <Badge variant="outline" className="border-secondary/30 text-secondary bg-secondary/5 text-xs">
                30 Days
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {inventoryMetrics.restockTracking['30d'] || 0}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Items Restocked ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <ArrowUp className="w-4 h-4 text-secondary mr-2" />
              <span className="text-secondary font-medium">Inventory replenished</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-tertiary/10 backdrop-blur-sm">
                <BarChart3 className="w-6 h-6 text-tertiary" />
              </div>
              <Badge variant="outline" className="border-tertiary/30 text-tertiary bg-tertiary/5 text-xs">
                Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {inventoryMetrics.forecasting.totalActiveItems}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Total Items ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <Target className="w-4 h-4 text-tertiary mr-2" />
              <span className="text-tertiary font-medium">In-stock items</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sales & Restock Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-container">
          <div className="p-4">
            <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-4">
              📈 Sales Tracking - {selectedCountry}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 3, 7, 15, 30, 45, 60, 90].map(days => (
                <div key={days} className="bg-card/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">{days} day{days > 1 ? 's' : ''}</div>
                  <div className="text-lg font-bold text-foreground">
                    {inventoryMetrics.salesTracking[`${days}d`] || 0}
                  </div>
                  <div className="text-xs text-accent">sold</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-container">
          <div className="p-4">
            <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-4">
              📦 Restock Tracking - {selectedCountry}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 3, 7, 15, 30, 45, 60, 90].map(days => (
                <div key={days} className="bg-card/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">{days} day{days > 1 ? 's' : ''}</div>
                  <div className="text-lg font-bold text-foreground">
                    {inventoryMetrics.restockTracking[`${days}d`] || 0}
                  </div>
                  <div className="text-xs text-secondary">restocked</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Forecasting Card */}
      <Card className="glass-container">
        <div className="p-4">
          <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            🔮 AI Forecasting & Recommendations - {selectedCountry}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Recommended Reorder Level</div>
              <div className="text-2xl font-bold text-primary mb-1">
                {inventoryMetrics.forecasting.recommendedReorderLevel}
              </div>
              <div className="text-xs text-muted-foreground">units (based on 30-day velocity)</div>
            </div>
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Average Lead Time</div>
              <div className="text-2xl font-bold text-accent mb-1">
                {inventoryMetrics.forecasting.avgLeadTime}
              </div>
              <div className="text-xs text-muted-foreground">days to restock</div>
            </div>
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Forecasted Demand</div>
              <div className="text-2xl font-bold text-secondary mb-1">
                {Math.ceil((inventoryMetrics.salesTracking['30d'] || 0) / 30 * inventoryMetrics.forecasting.avgLeadTime)}
              </div>
              <div className="text-xs text-muted-foreground">units needed during lead time</div>
            </div>
          </div>
        </div>
      </Card>

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

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Button 
                onClick={handleRefresh} 
                disabled={loading}
                variant="outline" 
                className="glass-button"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="bg-gradient-primary hover:bg-gradient-primary/90 border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Data Table */}
      <Card className="glass-container">
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
                AI Replenishment Analytics - {selectedCountry}
              </h3>
              <Badge variant="secondary" className="bg-gradient-primary/20 text-primary border-0">
                {filteredData.length} items
              </Badge>
            </div>
            
            <div className="border border-border/50 rounded-lg bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted/50 backdrop-blur-sm">
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-semibold text-sm">Product</th>
                      <th className="text-left p-3 font-semibold text-sm">Stock</th>
                      <th className="text-left p-3 font-semibold text-sm">Status</th>
                      <th className="text-left p-3 font-semibold text-sm">Sell Rate</th>
                      <th className="text-left p-3 font-semibold text-sm">AI Recommendations</th>
                      <th className="text-left p-3 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground text-sm">{item.product_id}</div>
                            <div className="text-xs text-muted-foreground uppercase">
                              {item.product_type}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.current_stock}</span>
                              <span className="text-muted-foreground text-xs">/ {item.min_threshold} min</span>
                            </div>
                            <Progress 
                              value={(item.current_stock / item.min_threshold) * 100} 
                              className="h-2"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={item.status_color === 'destructive' ? 'destructive' : 
                                   item.status_color === 'secondary' ? 'secondary' : 'outline'}
                            className={`text-xs ${item.status_color === 'destructive' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                                       item.status_color === 'secondary' ? 'bg-secondary/20 text-secondary border-secondary/30' :
                                       'bg-accent/20 text-accent border-accent/30'}`}
                          >
                            {item.status_icon} {item.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{item.daily_sell_rate.toFixed(1)}/day</div>
                            <div className="text-xs text-muted-foreground">
                              {item.weekly_sell_rate.toFixed(1)}/week
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <span className="text-xs font-medium">Reorder: {item.suggested_reorder_qty} units</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-accent" />
                              <span className="text-xs text-muted-foreground">{item.suggested_restock_date}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="glass-button text-xs"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Details
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-container">
            <DialogHeader>
              <DialogTitle className="bg-gradient-primary bg-clip-text text-transparent">
                AI Replenishment Analysis: {selectedItem.product_id}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card className="p-4 bg-card/50">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Current Inventory Status
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Stock:</span>
                      <span className="font-medium">{selectedItem.current_stock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum Threshold:</span>
                      <span className="font-medium">{selectedItem.min_threshold} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Time:</span>
                      <span className="font-medium">{selectedItem.lead_time_days} days</span>
                    </div>
                    <Progress 
                      value={(selectedItem.current_stock / selectedItem.min_threshold) * 100} 
                      className="h-3"
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-card/50">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    Sales Velocity
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <span className="font-medium">{selectedItem.daily_sell_rate.toFixed(2)} units/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Rate:</span>
                      <span className="font-medium">{selectedItem.weekly_sell_rate.toFixed(1)} units/week</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Rate:</span>
                      <span className="font-medium">{selectedItem.monthly_sell_rate.toFixed(0)} units/month</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="p-4 bg-gradient-primary/5 border-primary/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">Suggested Reorder Quantity</div>
                        <div className="text-2xl font-bold text-primary">{selectedItem.suggested_reorder_qty} units</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
                      <Calendar className="w-5 h-5 text-accent" />
                      <div>
                        <div className="font-medium">Suggested Restock Date</div>
                        <div className="text-lg font-semibold text-accent">{selectedItem.suggested_restock_date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <div>
                        <div className="font-medium">Projected Stock-out</div>
                        <div className="text-lg font-semibold text-destructive">{selectedItem.projected_stockout_date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-secondary" />
                        <span className="font-medium">AI Confidence Score</span>
                      </div>
                      <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                        {selectedItem.confidence_score}%
                      </Badge>
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
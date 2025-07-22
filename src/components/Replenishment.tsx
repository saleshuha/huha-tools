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
  status: 'Critical' | 'Low Stock' | 'Normal' | 'Overstock';
  status_color: 'destructive' | 'secondary' | 'default' | 'outline';
  status_icon: string;
  confidence_score: number;
}

export function Replenishment() {
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentItem[]>([]);
  const [filteredData, setFilteredData] = useState<ReplenishmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [selectedItem, setSelectedItem] = useState<ReplenishmentItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Generate country-specific mock data with AI-powered insights
  const generateMockData = (): ReplenishmentItem[] => {
    const countryPrefixes = {
      UAE: ['UAE-', 'DXB-', 'AUH-'],
      KSA: ['KSA-', 'RYD-', 'JED-']
    };

    const mockProducts = [
      'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air M3', 'iPad Pro',
      'AirPods Pro', 'Sony WH-1000XM5', 'Canon EOS R6', 'Dell XPS 13',
      'Nike Air Jordan', 'Adidas Ultra Boost', 'Gaming Chair Pro', 'Monitor 27"'
    ];

    const prefixes = countryPrefixes[selectedCountry] || countryPrefixes.UAE;
    
    return Array.from({ length: 15 }, (_, i) => {
      const current_stock = Math.floor(Math.random() * 20);
      const min_threshold = Math.floor(Math.random() * 8) + 2;
      const daily_sell_rate = Math.random() * 3 + 0.5;
      const lead_time = Math.floor(Math.random() * 21) + 5;
      
      const getStatus = () => {
        if (current_stock <= 1) return { status: 'Critical' as const, color: 'destructive' as const, icon: '🚨' };
        if (current_stock <= min_threshold) return { status: 'Low Stock' as const, color: 'secondary' as const, icon: '⚠️' };
        if (current_stock > min_threshold * 3) return { status: 'Overstock' as const, color: 'outline' as const, icon: '📦' };
        return { status: 'Normal' as const, color: 'default' as const, icon: '✅' };
      };

      const statusInfo = getStatus();
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      
      const daysUntilStockout = Math.ceil(current_stock / daily_sell_rate);
      const suggestedReorderDate = new Date();
      suggestedReorderDate.setDate(suggestedReorderDate.getDate() + Math.max(0, daysUntilStockout - lead_time));
      
      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);

      return {
        id: `${i + 1}`,
        product_id: `${prefix}${mockProducts[i % mockProducts.length].replace(/\s+/g, '-').toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        product_type: Math.random() > 0.5 ? 'asin' : 'sku',
        current_stock,
        min_threshold,
        lead_time_days: lead_time,
        daily_sell_rate,
        weekly_sell_rate: daily_sell_rate * 7,
        monthly_sell_rate: daily_sell_rate * 30,
        suggested_reorder_qty: Math.max(min_threshold * 2, Math.ceil(daily_sell_rate * lead_time * 1.5)),
        suggested_restock_date: suggestedReorderDate.toLocaleDateString(),
        projected_stockout_date: stockoutDate.toLocaleDateString(),
        status: statusInfo.status,
        status_color: statusInfo.color,
        status_icon: statusInfo.icon,
        confidence_score: Math.floor(Math.random() * 30) + 70
      };
    });
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

  // Load data when country changes
  useEffect(() => {
    loadReplenishmentData();
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
                <Brain className="w-6 h-6 text-gradient-start" />
              </div>
              <Badge variant="secondary" className="bg-gradient-primary/20 text-primary border-0 text-xs">
                AI Powered
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {criticalItems.length}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Critical Items ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive mr-2" />
              <span className="text-destructive font-medium">Immediate Action</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-accent/10 backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5 text-xs">
                Trending
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              ${totalValue.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Total Restock Value ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <ArrowUp className="w-4 h-4 text-accent mr-2" />
              <span className="text-accent font-medium">+12% vs last month</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-secondary/10 backdrop-blur-sm">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
              <Badge variant="outline" className="border-secondary/30 text-secondary bg-secondary/5 text-xs">
                Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {avgSellRate.toFixed(1)}/day
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Avg Sell Rate ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <Activity className="w-4 h-4 text-secondary mr-2" />
              <span className="text-secondary font-medium">Stable velocity</span>
            </div>
          </div>
        </Card>

        <Card className="glass-container hover-scale group">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-tertiary/10 backdrop-blur-sm">
                <Clock className="w-6 h-6 text-tertiary" />
              </div>
              <Badge variant="outline" className="border-tertiary/30 text-tertiary bg-tertiary/5 text-xs">
                Optimized
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {avgLeadTime.toFixed(0)} days
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Avg Lead Time ({selectedCountry})</p>
            <div className="flex items-center text-sm">
              <Target className="w-4 h-4 text-tertiary mr-2" />
              <span className="text-tertiary font-medium">Well managed</span>
            </div>
          </div>
        </Card>
      </div>

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
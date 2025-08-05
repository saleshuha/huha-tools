import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, Calendar, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight, Grid, Users, TrendingUp as Trend, Gauge } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

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

export function Replenishment() {
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

  // Load restock items needing attention
  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);
      const { data, error } = await supabase.rpc('get_items_needing_restock', {
        country_filter: selectedCountry
      });
      
      if (error) throw error;
      console.log('Raw restock data from function:', data);

      const itemsWithStatus = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id
      })).filter(item => item.status !== 'ordered');

      console.log('First item structure:', itemsWithStatus[0]);
      setRestockItems(itemsWithStatus);
      console.log('Set restock items for', selectedCountry, ':', itemsWithStatus.length, 'items');
    } catch (error: any) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error loading restock items",
        description: error.message,
        variant: "destructive"
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

        const [asinSalesData, asinRestockData, skuSalesData, skuRestockData] = await Promise.all([
          supabase.from('asin_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry).gte('date_sold', startDate.toISOString()),
          supabase.from('asin_inventory').select('restock_quantity').eq('country', selectedCountry).not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString()),
          supabase.from('sku_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry).gte('date_sold', startDate.toISOString()),
          supabase.from('sku_inventory').select('restock_quantity').eq('country', selectedCountry).not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString())
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
        toast({
          title: "Analytics Error",
          description: "Some analytics data may not be available",
          variant: "destructive"
        });
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter restock items
  const filteredRestockItems = restockItems.filter(item => {
    if (!searchTerm.trim()) return true;
    const searchTerms = searchTerm.toLowerCase().split(' ').map(term => term.trim()).filter(Boolean);
    return searchTerms.some(term => item.identifier.toLowerCase().includes(term));
  });

  const pendingItems = filteredRestockItems;

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = pendingItems.map(item => item.id);
      setSelectedItems(new Set(allItemIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      return newSelected;
    });
  };

  const handleBulkMarkAsOrdered = async () => {
    if (selectedItems.size === 0) return;
    try {
      const updatePromises = Array.from(selectedItems).map(async itemId => {
        const item = restockItems.find(i => i.id === itemId);
        if (!item) return;
        
        if (item.table_name === 'asin_inventory') {
          return supabase.from('asin_inventory').update({ status: 'ordered' }).eq('id', itemId);
        } else if (item.table_name === 'sku_inventory') {
          return supabase.from('sku_inventory').update({ status: 'ordered' }).eq('id', itemId);
        }
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result?.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items`);
      }

      const updatedItems = Array.from(selectedItems).map(itemId => {
        const item = restockItems.find(i => i.id === itemId);
        return item ? { ...item, status: 'ordered' } : null;
      }).filter(Boolean) as RestockItem[];

      setRestockItems(prev => prev.filter(item => !selectedItems.has(item.id)));
      setOrderedItems(prev => [...prev, ...updatedItems]);
      setSelectedItems(new Set());
      
      toast({
        title: "Bulk Order Status Updated",
        description: `${selectedItems.size} items marked as ordered from supplier`
      });
    } catch (error) {
      console.error('Error bulk updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update some items",
        variant: "destructive"
      });
    }
  };

  // Mark item as ordered
  const markAsOrdered = async (itemId: string) => {
    const item = restockItems.find(i => i.id === itemId);
    if (!item) {
      toast({
        title: "Error",
        description: "Item not found",
        variant: "destructive"
      });
      return;
    }

    try {
      let updateResult;
      
      if (item.table_name === 'asin_inventory') {
        updateResult = await supabase.from('asin_inventory').update({ status: 'ordered' }).eq('id', itemId);
      } else if (item.table_name === 'sku_inventory') {
        updateResult = await supabase.from('sku_inventory').update({ status: 'ordered' }).eq('id', itemId);
      } else {
        throw new Error(`Unknown table type: ${item.table_name}`);
      }

      if (updateResult.error) {
        throw updateResult.error;
      }

      const updatedItem = restockItems.find(i => i.id === itemId);
      if (updatedItem) {
        setRestockItems(prev => prev.filter(item => item.id !== itemId));
        setOrderedItems(prev => [...prev, { ...updatedItem, status: 'ordered' }]);
      }
      
      toast({
        title: "Order Status Updated",
        description: "Item marked as ordered from supplier"
      });
    } catch (error: any) {
      console.error('Error marking item as ordered:', error);
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Export functions
  const exportSalesData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Period,ASIN Sold,SKU Sold,Total Sold,ASIN Restocked,SKU Restocked,Total Restocked,Sell Rate\n" +
      salesData.map(row => 
        `${row.period},${row.asin_sold},${row.sku_sold},${row.total_sold},${row.asin_restocked},${row.sku_restocked},${row.total_restocked},${row.sell_rate.toFixed(2)}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_data_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRestockData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Identifier,Current Quantity,Status,Days Since Last Restock,Table\n" +
      restockItems.map(item => 
        `"${item.identifier}",${item.current_quantity},${item.status},${item.days_since_last_restock || 'N/A'},${item.table_name}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restock_items_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCountry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="management">Restock Management</TabsTrigger>
          <TabsTrigger value="analytics">Visual Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          {/* Management Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Restock Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search items (space-separated for bulk search)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={loadAllData} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportRestockData} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedItems.size} items selected
                  </span>
                  <Button onClick={handleBulkMarkAsOrdered} size="sm">
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Ordered
                  </Button>
                  <Button onClick={() => setSelectedItems(new Set())} variant="outline" size="sm">
                    Clear Selection
                  </Button>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                {pendingItems.length > 0 && (
                  <div className="flex items-center gap-2 p-2 border-b">
                    <Checkbox
                      checked={selectedItems.size === pendingItems.length && pendingItems.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">Select All ({pendingItems.length} items)</span>
                  </div>
                )}

                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                      <div>
                        <p className="font-medium">{item.identifier}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.current_quantity} | 
                          Status: {item.status} | 
                          Days since restock: {item.days_since_last_restock || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => markAsOrdered(item.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Mark Ordered
                    </Button>
                  </div>
                ))}

                {pendingItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items need restocking at the moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Critical Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {pendingItems.length}
                </div>
                <p className="text-xs text-muted-foreground">Items need immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-warning" />
                  Ordered Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  {orderedItems.length}
                </div>
                <p className="text-xs text-muted-foreground">Items ordered from suppliers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Performance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {pendingItems.length === 0 ? '100%' : Math.max(0, 100 - (pendingItems.length * 10)).toFixed(0) + '%'}
                </div>
                <p className="text-xs text-muted-foreground">Inventory health rating</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-success" />
                  Active Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {(inventoryMetrics?.forecasting?.totalActiveItems || 0) - pendingItems.length - orderedItems.length}
                </div>
                <p className="text-xs text-muted-foreground">Items in good stock</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Stock Distribution Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Critical Stock</span>
                    <span className="text-sm font-medium text-destructive">{pendingItems.length}</span>
                  </div>
                  <Progress 
                    value={(pendingItems.length / (inventoryMetrics?.forecasting?.totalActiveItems || 1)) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ordered Stock</span>
                    <span className="text-sm font-medium text-warning">{orderedItems.length}</span>
                  </div>
                  <Progress 
                    value={(orderedItems.length / (inventoryMetrics?.forecasting?.totalActiveItems || 1)) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Healthy Stock</span>
                    <span className="text-sm font-medium text-success">
                      {(inventoryMetrics?.forecasting?.totalActiveItems || 0) - pendingItems.length - orderedItems.length}
                    </span>
                  </div>
                  <Progress 
                    value={((inventoryMetrics?.forecasting?.totalActiveItems || 0) - pendingItems.length - orderedItems.length) / (inventoryMetrics?.forecasting?.totalActiveItems || 1) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.slice(0, 5).map((data, index) => (
                  <div key={data.period} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Last {data.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.total_sold} items sold • {data.total_restocked} items restocked
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{data.sell_rate.toFixed(1)}/day</p>
                      <p className="text-xs text-muted-foreground">Sell rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Health Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Inventory Health Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold text-destructive">{pendingItems.filter(item => item.current_quantity === 0).length}</p>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <p className="text-2xl font-bold text-warning">{pendingItems.filter(item => item.current_quantity > 0 && item.current_quantity <= 5).length}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{orderedItems.length}</p>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {(inventoryMetrics?.forecasting?.totalActiveItems || 0) - pendingItems.length - orderedItems.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Healthy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                High Priority Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive"></div>
                      <div>
                        <p className="font-medium">{item.identifier}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.current_quantity === 0 ? 'Out of stock' : `${item.current_quantity} remaining`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                ))}
                {pendingItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">All items are well stocked!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={exportSalesData} variant="outline" className="h-auto p-4 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <span className="font-medium">Export Sales Data</span>
                  <span className="text-xs text-muted-foreground">Download sales analytics</span>
                </Button>
                <Button onClick={exportRestockData} variant="outline" className="h-auto p-4 flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  <span className="font-medium">Export Restock List</span>
                  <span className="text-xs text-muted-foreground">Download items needing restock</span>
                </Button>
                <Button onClick={loadAllData} variant="outline" className="h-auto p-4 flex-col">
                  <RefreshCw className="h-6 w-6 mb-2" />
                  <span className="font-medium">Refresh Data</span>
                  <span className="text-xs text-muted-foreground">Update all analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryAnalytics />
        </TabsContent>
      </Tabs>

      {/* Dialog for item details */}
      <Dialog open={dialogData.isOpen} onOpenChange={(open) => setDialogData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogData.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogData.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.identifier}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.current_quantity} | 
                    Status: {item.status} | 
                    Days since restock: {item.days_since_last_restock || 'N/A'}
                  </p>
                </div>
                {dialogData.type === 'critical' && (
                  <Button onClick={() => markAsOrdered(item.id)} size="sm">
                    Mark Ordered
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
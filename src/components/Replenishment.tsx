import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { HuhaTab01 } from './ui/huha-tab-01';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Label } from './ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, CalendarIcon, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Settings, Gauge, Star, Minus, Timer, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, Legend } from 'recharts';
import { SunskyOrderDialog } from './SunskyOrderDialog';

interface RestockItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  days_since_last_restock: number | null;
  status: string;
  date_sold?: string | null;
  last_restock_date?: string | null;
  restock_quantity?: number | null;
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
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  
  // State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingItems, setPendingItems] = useState<RestockItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<RestockItem[]>([]);
  const [sunskyDialogOpen, setSunskyDialogOpen] = useState(false);
  const [sunskyOrderItems, setSunskyOrderItems] = useState<RestockItem[]>([]);
  const [dialogData, setDialogData] = useState<DialogData>({
    isOpen: false,
    title: '',
    items: [],
    type: 'critical'
  });

  // Load data
  useEffect(() => {
    loadRestockData();
  }, [selectedCountry]);

  const loadRestockData = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setPendingItems([
        {
          id: '1',
          identifier: 'ASIN-001',
          current_quantity: 0,
          table_name: 'asin_inventory',
          days_since_last_restock: 30,
          status: 'critical'
        }
      ]);
      setOrderedItems([]);
      setOutOfStockItems([]);
    } catch (error) {
      console.error('Error loading restock data:', error);
      toast({
        title: "Error",
        description: "Failed to load restock data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportRestockData = () => {
    const csv = Papa.unparse(pendingItems);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: "Restock data has been exported"
    });
  };

  const exportOrderedData = () => {
    const csv = Papa.unparse(orderedItems);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordered-items-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful", 
      description: "Ordered items data has been exported"
    });
  };

  const markAsOrdered = (itemId: string) => {
    const item = pendingItems.find(i => i.id === itemId) || outOfStockItems.find(i => i.id === itemId);
    if (item) {
      setOrderedItems(prev => [...prev, { ...item, status: 'ordered' }]);
      setPendingItems(prev => prev.filter(i => i.id !== itemId));
      setOutOfStockItems(prev => prev.filter(i => i.id !== itemId));
      
      toast({
        title: "Item marked as ordered",
        description: `${item.identifier} has been marked as ordered`
      });
    }
  };

  const handleSunskyOrderSuccess = () => {
    setSunskyDialogOpen(false);
    loadRestockData();
    toast({
      title: "Order placed successfully",
      description: "Items have been ordered through Sunsky"
    });
  };

  const handleItemsUnavailable = (unavailableItems: any[]) => {
    toast({
      title: "Some items unavailable",
      description: `${unavailableItems.length} items are not available for order`
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading replenishment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden p-4 md:p-8 space-y-8">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Analytics Section */}
        <div className="mb-8">
          <InventoryAnalytics />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="relative overflow-hidden border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to Order</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingItems.length}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ordered Items</p>
                  <p className="text-2xl font-bold text-blue-600">{orderedItems.length}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                  <p className="text-2xl font-bold text-green-600">85%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Restock Management Dashboard
            </CardTitle>
            <p className="text-muted-foreground">Manage critical stock items and track orders</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button onClick={exportRestockData} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Restock Data
                </Button>
                <Button onClick={exportOrderedData} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Ordered Items
                </Button>
              </div>
              <Button onClick={loadRestockData} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </Button>
            </div>

            {/* Items Display */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Items Ready to Order ({pendingItems.length})</h3>
              {pendingItems.length > 0 ? (
                <div className="space-y-2">
                  {pendingItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50 hover:bg-orange-100/50 transition-colors border-orange-200">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <Package className="w-4 h-4 text-orange-700" />
                        </div>
                        <div>
                          <p className="font-medium">{item.identifier}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Qty: {item.current_quantity}</span>
                            <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                              Ready to Order
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => markAsOrdered(item.id)} size="sm" className="gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Mark as Ordered
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p className="text-lg font-medium">No items need restocking</p>
                  <p className="text-sm">All items are adequately stocked!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sunsky Order Dialog */}
        <SunskyOrderDialog
          open={sunskyDialogOpen}
          onOpenChange={setSunskyDialogOpen}
          selectedOrders={sunskyOrderItems}
          onOrderSuccess={handleSunskyOrderSuccess}
          onItemsUnavailable={handleItemsUnavailable}
        />
      </div>
    </div>
  );
}
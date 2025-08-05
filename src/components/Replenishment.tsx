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
import { EnhancedAnalyticsDashboard } from './EnhancedAnalyticsDashboard';

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
  const [chartLayout, setChartLayout] = useState('default');

  // Load restock items that need attention
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
      console.error('Error loading restock items:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Load sales data for analytics
  const loadSalesData = async () => {
    try {
      const periods = ['7d', '15d', '30d', '45d', '60d', '90d'];
      const salesPromises = periods.map(async (period) => {
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [asinSales, skuSales, asinRestocks, skuRestocks] = await Promise.all([
          supabase.from('asin_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .eq('status', 'sold')
            .gte('date_sold', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .eq('status', 'sold')
            .gte('date_sold', startDate.toISOString()),
          supabase.from('asin_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .gte('last_restock_date', startDate.toISOString()),
          supabase.from('sku_inventory')
            .select('id')
            .eq('country', selectedCountry)
            .gte('last_restock_date', startDate.toISOString())
        ]);

        const asinSold = asinSales.data?.length || 0;
        const skuSold = skuSales.data?.length || 0;
        const asinRestocked = asinRestocks.data?.length || 0;
        const skuRestocked = skuRestocks.data?.length || 0;

        return {
          period,
          asin_sold: asinSold,
          sku_sold: skuSold,
          total_sold: asinSold + skuSold,
          asin_restocked: asinRestocked,
          sku_restocked: skuRestocked,
          total_restocked: asinRestocked + skuRestocked,
          sell_rate: (asinSold + skuSold) / days
        };
      });

      const salesResults = await Promise.all(salesPromises);
      setSalesData(salesResults);
    } catch (error: any) {
      console.error('Error loading sales data:', error);
    }
  };

  // Main data loading function
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRestockItems(),
        loadSalesData(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedCountry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  const totalSales30d = salesData.find(d => d.period === '30d')?.total_sold || 0;
  const totalRestocks30d = salesData.find(d => d.period === '30d')?.total_restocked || 0;

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-none">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 glass-container rounded-xl border backdrop-blur-lg">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Advanced Sales & Replenishment Analytics
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Real-time intelligence for {selectedCountry} operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2 hover-scale">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Enhanced Analytics Dashboard */}
      <EnhancedAnalyticsDashboard 
        salesData={salesData}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        chartLayout={chartLayout}
        setChartLayout={setChartLayout}
        totalSales30d={totalSales30d}
        totalRestocks30d={totalRestocks30d}
      />
    </div>
  );
}
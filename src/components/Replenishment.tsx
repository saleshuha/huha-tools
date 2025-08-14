import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, CalendarIcon, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Settings, Gauge, Star, Minus, Columns3, GripVertical } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, Legend } from 'recharts';

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
}

interface DialogData {
  isOpen: boolean;
  title: string;
  items: RestockItem[];
  type: 'critical' | 'ordered' | 'sales' | 'restocks';
}

interface TrendsItem {
  identifier: string;
  item_type: string;
  total_sold: number;
  total_restocked: number;
  last_sold_date: string | null;
  last_order_date: string | null;
  current_quantity: number;
  status: string;
  velocity_score: number;
  days_since_last_sold: number | null;
  days_since_last_ordered: number | null;
}

interface AllInventoryItem {
  id: string;
  item_type: 'ASIN' | 'SKU';
  asin?: string;
  sku?: string;
  serial_number?: string;
  quantity: number;
  status: string;
  last_sold_date?: string | null;
  last_order_date?: string | null;
  days_since_ordered?: number | null;
}

interface InventoryMetrics {
  velocityScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  stockDaysRemaining: number | null;
  turnoverRate: number;
  performanceRating: number;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  resizable: boolean;
  icon: any;
}

export function Replenishment() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Column configuration state
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { key: 'item_type', label: 'Type', visible: true, width: 120, minWidth: 80, resizable: true, icon: Database },
    { key: 'asin', label: 'ASIN', visible: true, width: 150, minWidth: 100, resizable: true, icon: Package },
    { key: 'sku', label: 'SKU', visible: true, width: 150, minWidth: 100, resizable: true, icon: ShoppingCart },
    { key: 'serial_number', label: 'Serial Number', visible: true, width: 140, minWidth: 100, resizable: true, icon: Target },
    { key: 'quantity', label: 'Quantity', visible: true, width: 120, minWidth: 80, resizable: true, icon: Gauge },
    { key: 'status', label: 'Status', visible: true, width: 120, minWidth: 80, resizable: true, icon: Activity },
    { key: 'last_sold_date', label: 'Last Sold', visible: true, width: 140, minWidth: 100, resizable: true, icon: Clock },
    { key: 'last_order_date', label: 'Last Order', visible: true, width: 140, minWidth: 100, resizable: true, icon: Truck },
    { key: 'days_since_ordered', label: 'Days Since', visible: true, width: 120, minWidth: 80, resizable: true, icon: CalendarIcon },
    { key: 'metrics', label: 'Metrics', visible: true, width: 160, minWidth: 120, resizable: true, icon: Star }
  ]);

  // Column resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeColumnKey, setResizeColumnKey] = useState<string | null>(null);

  // Column management functions
  const toggleColumnVisibility = (columnKey: string) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const updateColumnWidth = (columnKey: string, newWidth: number) => {
    setColumnConfig(prev =>
      prev.map(col =>
        col.key === columnKey 
          ? { ...col, width: Math.max(newWidth, col.minWidth) }
          : col
      )
    );
  };

  const resetColumnWidths = () => {
    setColumnConfig(prev =>
      prev.map(col => ({
        ...col,
        width: col.key === 'item_type' ? 120 :
               col.key === 'asin' || col.key === 'sku' ? 150 :
               col.key === 'serial_number' || col.key === 'last_sold_date' || col.key === 'last_order_date' ? 140 :
               col.key === 'quantity' || col.key === 'status' || col.key === 'days_since_ordered' ? 120 :
               160
      }))
    );
  };

  const showAllColumns = () => {
    setColumnConfig(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const hideAllColumns = () => {
    // Keep at least one column visible
    setColumnConfig(prev => 
      prev.map((col, index) => ({ 
        ...col, 
        visible: index === 0 // Keep first column (Type) visible
      }))
    );
  };

  const visibleColumns = columnConfig.filter(col => col.visible);

  // Header filter functions
  const updateHeaderFilter = (field: string, value: string) => {
    setHeaderFilters(prev => ({ ...prev, [field]: value }));
  };

  const updateHeaderRangeFilter = (field: string, type: 'min' | 'max', value: string) => {
    setHeaderFilters(prev => {
      if (field === 'quantity' || field === 'daysSince') {
        return {
          ...prev,
          [field]: { ...prev[field], [type]: value }
        };
      }
      return prev;
    });
  };

  const clearHeaderFilters = () => {
    setHeaderFilters({
      type: 'all',
      asin: '',
      sku: '',
      serial: '',
      status: 'all',
      quantity: { min: '', max: '' },
      daysSince: { min: '', max: '' }
    });
  };

  // Calculate item metrics
  const calculateItemMetrics = (item: AllInventoryItem): InventoryMetrics => {
    const daysSinceSold = item.last_sold_date ? 
      Math.floor((Date.now() - new Date(item.last_sold_date).getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    let velocityScore = 0;
    if (daysSinceSold !== null && daysSinceSold > 0) {
      velocityScore = Math.max(0, 100 - (daysSinceSold / 30) * 100);
    }
    
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (item.quantity === 0) urgencyLevel = 'critical';
    else if (item.quantity <= 2) urgencyLevel = 'high';
    else if (item.quantity <= 5) urgencyLevel = 'medium';
    
    let stockDaysRemaining: number | null = null;
    if (velocityScore > 0 && item.quantity > 0) {
      stockDaysRemaining = Math.floor(item.quantity / Math.max(velocityScore / 100, 0.1));
    }
    
    const turnoverRate = velocityScore / 100;
    const performanceRating = Math.min(velocityScore + (item.quantity * 10), 100);
    
    return {
      velocityScore,
      urgencyLevel,
      stockDaysRemaining,
      turnoverRate,
      performanceRating
    };
  };

  const { selectedCountry } = useCountry();
  const {
    inventoryMetrics,
    loading: analyticsLoading,
    loadAnalytics
  } = useInventoryAnalytics();
  
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
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<AllInventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AllInventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{key: keyof AllInventoryItem | null, direction: 'asc' | 'desc'}>({
    key: null,
    direction: 'asc'
  });
  
  const [filters, setFilters] = useState({
    search: '',
    itemType: 'all' as 'all' | 'ASIN' | 'SKU',
    stockStatus: 'all' as 'all' | 'in-stock' | 'out-of-stock' | 'low-stock' | 'critical',
    orderStatus: 'all' as 'all' | 'ordered' | 'not-ordered' | 'overdue',
    dateRange: {
      lastSoldFrom: null as Date | null,
      lastSoldTo: null as Date | null,
      lastOrderFrom: null as Date | null,
      lastOrderTo: null as Date | null,
    },
    quantityRange: {
      min: null as number | null,
      max: null as number | null,
    },
    daysSinceOrderRange: {
      min: null as number | null,
      max: null as number | null,
    }
  });

  // Header filter states
  const [headerFilters, setHeaderFilters] = useState({
    type: 'all',
    asin: '',
    sku: '',
    serial: '',
    status: 'all',
    quantity: { min: '', max: '' },
    daysSince: { min: '', max: '' }
  });

  // Trends state
  const [trendsSearchTerm, setTrendsSearchTerm] = useState('');
  const [trendsDateRange, setTrendsDateRange] = useState('30d');
  const [trendsItemType, setTrendsItemType] = useState('all');
  const [trendsSortBy, setTrendsSortBy] = useState('sold_desc');
  const [trendsItems, setTrendsItems] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  
  // Pagination state for trends
  const [trendsCurrentPage, setTrendsCurrentPage] = useState(1);

  // Visual Analytics layout state
  const [chartLayout, setChartLayout] = useState('default');

  // Reset pagination when filters change
  useEffect(() => {
    setTrendsCurrentPage(1);
  }, [trendsSearchTerm, trendsDateRange, trendsItemType, trendsSortBy]);

  // AI Forecasting state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Load all inventory items
  const loadAllInventoryItems = async () => {
    try {
      setLoading(true);
      console.log('Loading all inventory items for country:', selectedCountry);
      
      // Get ASIN inventory items
      const asinQuery = supabase.from('asin_inventory').select('*');
      if (selectedCountry && selectedCountry !== 'ALL') {
        asinQuery.eq('country', selectedCountry);
      }
      const { data: asinData, error: asinError } = await asinQuery;
      
      if (asinError) throw asinError;

      // Get SKU inventory items  
      const skuQuery = supabase.from('sku_inventory').select('*');
      if (selectedCountry && selectedCountry !== 'ALL') {
        skuQuery.eq('country', selectedCountry);
      }
      const { data: skuData, error: skuError } = await skuQuery;
      
      if (skuError) throw skuError;

      // Transform and combine data
      const allItems: AllInventoryItem[] = [
        ...(asinData || []).map(item => ({
          id: item.id,
          item_type: 'ASIN' as const,
          asin: item.asin,
          sku: item.sku,
          serial_number: item.serial_number,
          quantity: item.quantity || 0,
          status: item.quantity > 0 ? 'in-stock' : 'out-of-stock',
          last_sold_date: item.last_sold_date,
          last_order_date: item.last_order_date,
          days_since_ordered: item.days_since_ordered
        })),
        ...(skuData || []).map(item => ({
          id: item.id,
          item_type: 'SKU' as const,
          asin: item.asin,
          sku: item.sku,
          serial_number: item.serial_number,
          quantity: item.quantity || 0,
          status: item.quantity > 0 ? 'in-stock' : 'out-of-stock',
          last_sold_date: item.last_sold_date,
          last_order_date: item.last_order_date,
          days_since_ordered: item.days_since_ordered
        }))
      ];

      setAllInventoryItems(allItems);
      console.log(`Loaded ${allItems.length} total inventory items`);
      
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and country change
  useEffect(() => {
    loadAllInventoryItems();
    loadAnalytics(selectedCountry);
  }, [selectedCountry]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allInventoryItems];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.asin && item.asin.toLowerCase().includes(searchLower)) ||
        (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
        (item.serial_number && item.serial_number.toLowerCase().includes(searchLower))
      );
    }

    // Apply header filters
    if (headerFilters.type && headerFilters.type !== 'all') {
      filtered = filtered.filter(item => item.item_type === headerFilters.type);
    }

    if (headerFilters.asin) {
      filtered = filtered.filter(item => 
        item.asin && item.asin.toLowerCase().includes(headerFilters.asin.toLowerCase())
      );
    }

    if (headerFilters.sku) {
      filtered = filtered.filter(item => 
        item.sku && item.sku.toLowerCase().includes(headerFilters.sku.toLowerCase())
      );
    }

    if (headerFilters.serial) {
      filtered = filtered.filter(item => 
        item.serial_number && item.serial_number.toLowerCase().includes(headerFilters.serial.toLowerCase())
      );
    }

    if (headerFilters.status && headerFilters.status !== 'all') {
      filtered = filtered.filter(item => item.status === headerFilters.status);
    }

    // Apply quantity range filter
    if (headerFilters.quantity.min) {
      filtered = filtered.filter(item => item.quantity >= parseInt(headerFilters.quantity.min));
    }
    if (headerFilters.quantity.max) {
      filtered = filtered.filter(item => item.quantity <= parseInt(headerFilters.quantity.max));
    }

    // Apply days since range filter
    if (headerFilters.daysSince.min) {
      filtered = filtered.filter(item => 
        item.days_since_ordered !== null && item.days_since_ordered >= parseInt(headerFilters.daysSince.min)
      );
    }
    if (headerFilters.daysSince.max) {
      filtered = filtered.filter(item => 
        item.days_since_ordered !== null && item.days_since_ordered <= parseInt(headerFilters.daysSince.max)
      );
    }

    // Apply additional filters
    if (filters.itemType !== 'all') {
      filtered = filtered.filter(item => item.item_type === filters.itemType);
    }

    if (filters.stockStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filters.stockStatus) {
          case 'in-stock':
            return item.quantity > 0;
          case 'out-of-stock':
            return item.quantity === 0;
          case 'low-stock':
            return item.quantity > 0 && item.quantity <= 5;
          case 'critical':
            return item.quantity <= 2;
          default:
            return true;
        }
      });
    }

    setFilteredItems(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allInventoryItems, filters, headerFilters]);

  // Apply sorting
  useEffect(() => {
    if (sortConfig.key) {
      const sorted = [...filteredItems].sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? 
            aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
      
      setFilteredItems(sorted);
    }
  }, [sortConfig]);

  // Sorting function
  const handleSort = (key: keyof AllInventoryItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter update functions
  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.itemType !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.orderStatus !== 'all') count++;
    if (headerFilters.type !== 'all') count++;
    if (headerFilters.asin) count++;
    if (headerFilters.sku) count++;
    if (headerFilters.serial) count++;
    if (headerFilters.status !== 'all') count++;
    if (headerFilters.quantity.min || headerFilters.quantity.max) count++;
    if (headerFilters.daysSince.min || headerFilters.daysSince.max) count++;
    return count;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      itemType: 'all',
      stockStatus: 'all',
      orderStatus: 'all',
      dateRange: {
        lastSoldFrom: null,
        lastSoldTo: null,
        lastOrderFrom: null,
        lastOrderTo: null,
      },
      quantityRange: {
        min: null,
        max: null,
      },
      daysSinceOrderRange: {
        min: null,
        max: null,
      }
    });
    clearHeaderFilters();
  };

  // Export filtered data
  const exportFilteredData = () => {
    const csvData = filteredItems.map(item => ({
      Type: item.item_type,
      ASIN: item.asin || '',
      SKU: item.sku || '',
      SerialNumber: item.serial_number || '',
      Quantity: item.quantity,
      Status: item.status,
      LastSoldDate: item.last_sold_date || '',
      LastOrderDate: item.last_order_date || '',
      DaysSinceOrdered: item.days_since_ordered || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${getActiveFiltersCount() > 0 ? 'filtered_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-[95vw] mx-auto px-4 py-6 space-y-8">
      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Stock</p>
                <p className="text-3xl font-bold text-destructive">
                  {allInventoryItems.filter(item => item.quantity === 0).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of stock items
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-3xl font-bold text-warning">
                  {allInventoryItems.filter(item => item.quantity > 0 && item.quantity <= 5).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items with ≤5 quantity
                </p>
              </div>
              <Package className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Stock</p>
                <p className="text-3xl font-bold text-success">
                  {allInventoryItems.filter(item => item.quantity > 5).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items with >5 quantity
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-primary">
                  {allInventoryItems.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All inventory items
                </p>
              </div>
              <Database className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-2 bg-gradient-subtle rounded-xl shadow-elegant">
          <TabsTrigger value="sales" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">📊 Sales Analytics</TabsTrigger>
          <TabsTrigger value="restock" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">📦 Restock Management</TabsTrigger>
        </TabsList>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          <InventoryAnalytics />
        </TabsContent>

        {/* Restock Management Tab */}
        <TabsContent value="restock" className="space-y-6">
          {/* Inventory Tracking Table */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Complete Inventory Tracking
              </CardTitle>
              <p className="text-muted-foreground">Comprehensive view of all ASIN and SKU inventory with sales and restock analytics</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading inventory data...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {/* Search and Quick Actions */}
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search by ASIN, SKU, or Serial Number..."
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* Column Visibility Control */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              <Columns3 className="h-4 w-4 mr-2" />
                              Columns ({visibleColumns.length})
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4" align="end">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Table Columns</h4>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={showAllColumns}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Show All
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={hideAllColumns}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Hide All
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {columnConfig.map((column) => (
                                  <div key={column.key} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={column.key}
                                      checked={column.visible}
                                      onCheckedChange={() => toggleColumnVisibility(column.key)}
                                      disabled={column.key === 'item_type' && visibleColumns.length === 1}
                                    />
                                    <label 
                                      htmlFor={column.key}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                                    >
                                      <column.icon className="h-3 w-3" />
                                      {column.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={resetColumnWidths}
                                  className="w-full text-xs"
                                >
                                  Reset Column Widths
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportFilteredData}
                          className="whitespace-nowrap"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export {getActiveFiltersCount() > 0 ? 'Filtered' : 'All'}
                        </Button>
                        {getActiveFiltersCount() > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllFilters}
                            className="whitespace-nowrap"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear ({getActiveFiltersCount()})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      <Select value={filters.itemType} onValueChange={(value) => updateFilter('itemType', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="ASIN">ASIN</SelectItem>
                          <SelectItem value="SKU">SKU</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filters.stockStatus} onValueChange={(value) => updateFilter('stockStatus', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Stock" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stock</SelectItem>
                          <SelectItem value="in-stock">In Stock</SelectItem>
                          <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                          <SelectItem value="low-stock">Low Stock</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Showing {currentItems.length} of {filteredItems.length} items
                        {getActiveFiltersCount() > 0 && ` (${getActiveFiltersCount()} filters active)`}
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Advanced Data Table with Header Filters */}
                  <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card via-card/95 to-muted/30 overflow-hidden shadow-lg">
                    <Table>
                      <TableHeader>
                        {/* Sort Headers Row */}
                        <TableRow className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b-2 border-primary/20">
                          {visibleColumns.map((column, index) => (
                            <TableHead
                              key={column.key}
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold relative group"
                              style={{ 
                                width: `${column.width}px`,
                                minWidth: `${column.minWidth}px`,
                                maxWidth: `${column.width}px`
                              }}
                              onClick={() => column.key !== 'metrics' && handleSort(column.key as keyof AllInventoryItem)}
                            >
                              <div className="flex items-center gap-2 pr-2">
                                <column.icon className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="truncate">{column.label}</span>
                                {column.key !== 'metrics' && (
                                  <>
                                    <ArrowUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                                    {sortConfig.key === column.key && (
                                      sortConfig.direction === 'asc' ? 
                                        <ArrowUp className="h-3 w-3 text-primary flex-shrink-0" /> : 
                                        <ArrowDown className="h-3 w-3 text-primary flex-shrink-0" />
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {/* Resize Handle */}
                              {column.resizable && index < visibleColumns.length - 1 && (
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-primary/30 cursor-col-resize group-hover:bg-primary/20 transition-colors"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizing(true);
                                    setResizeColumnKey(column.key);
                                    
                                    const startX = e.clientX;
                                    const startWidth = column.width;
                                    
                                    const handleMouseMove = (e: MouseEvent) => {
                                      const deltaX = e.clientX - startX;
                                      const newWidth = Math.max(startWidth + deltaX, column.minWidth);
                                      updateColumnWidth(column.key, newWidth);
                                    };
                                    
                                    const handleMouseUp = () => {
                                      setIsResizing(false);
                                      setResizeColumnKey(null);
                                      document.removeEventListener('mousemove', handleMouseMove);
                                      document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                  }}
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                        
                        {/* Filter Headers Row */}
                        <TableRow className="bg-muted/30 border-b border-border/50">
                          {visibleColumns.map((column) => (
                            <TableHead 
                              key={column.key} 
                              className="p-2"
                              style={{ 
                                width: `${column.width}px`,
                                minWidth: `${column.minWidth}px`,
                                maxWidth: `${column.width}px`
                              }}
                            >
                              {column.key === 'item_type' && (
                                <Select value={headerFilters.type} onValueChange={(value) => updateHeaderFilter('type', value === 'all' ? '' : value)}>
                                  <SelectTrigger className="h-8 text-xs border-border/50 bg-background/80">
                                    <SelectValue placeholder="All Types" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="ASIN">ASIN</SelectItem>
                                    <SelectItem value="SKU">SKU</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {column.key === 'asin' && (
                                <Input
                                  placeholder="Filter ASIN..."
                                  value={headerFilters.asin}
                                  onChange={(e) => updateHeaderFilter('asin', e.target.value)}
                                  className="h-8 text-xs border-border/50 bg-background/80"
                                />
                              )}
                              {column.key === 'sku' && (
                                <Input
                                  placeholder="Filter SKU..."
                                  value={headerFilters.sku}
                                  onChange={(e) => updateHeaderFilter('sku', e.target.value)}
                                  className="h-8 text-xs border-border/50 bg-background/80"
                                />
                              )}
                              {column.key === 'serial_number' && (
                                <Input
                                  placeholder="Filter Serial..."
                                  value={headerFilters.serial}
                                  onChange={(e) => updateHeaderFilter('serial', e.target.value)}
                                  className="h-8 text-xs border-border/50 bg-background/80"
                                />
                              )}
                              {column.key === 'quantity' && (
                                <div className="flex gap-1">
                                  <Input
                                    placeholder="Min"
                                    value={headerFilters.quantity.min}
                                    onChange={(e) => updateHeaderRangeFilter('quantity', 'min', e.target.value)}
                                    className="h-8 text-xs w-12 border-border/50 bg-background/80"
                                    type="number"
                                  />
                                  <Input
                                    placeholder="Max"
                                    value={headerFilters.quantity.max}
                                    onChange={(e) => updateHeaderRangeFilter('quantity', 'max', e.target.value)}
                                    className="h-8 text-xs w-12 border-border/50 bg-background/80"
                                    type="number"
                                  />
                                </div>
                              )}
                              {column.key === 'status' && (
                                <Select value={headerFilters.status} onValueChange={(value) => updateHeaderFilter('status', value === 'all' ? '' : value)}>
                                  <SelectTrigger className="h-8 text-xs border-border/50 bg-background/80">
                                    <SelectValue placeholder="All Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="in-stock">In Stock</SelectItem>
                                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                                    <SelectItem value="ordered">Ordered</SelectItem>
                                    <SelectItem value="low-stock">Low Stock</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {(column.key === 'last_sold_date' || column.key === 'last_order_date') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 text-xs opacity-60 hover:opacity-100"
                                  disabled
                                >
                                  Date Filter
                                </Button>
                              )}
                              {column.key === 'days_since_ordered' && (
                                <div className="flex gap-1">
                                  <Input
                                    placeholder="Min"
                                    value={headerFilters.daysSince.min}
                                    onChange={(e) => updateHeaderRangeFilter('daysSince', 'min', e.target.value)}
                                    className="h-8 text-xs w-12 border-border/50 bg-background/80"
                                    type="number"
                                  />
                                  <Input
                                    placeholder="Max"
                                    value={headerFilters.daysSince.max}
                                    onChange={(e) => updateHeaderRangeFilter('daysSince', 'max', e.target.value)}
                                    className="h-8 text-xs w-12 border-border/50 bg-background/80"
                                    type="number"
                                  />
                                </div>
                              )}
                              {column.key === 'metrics' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={clearHeaderFilters}
                                  className="h-8 text-xs border-border/50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={visibleColumns.length} className="text-center p-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                <Database className="h-12 w-12 opacity-30" />
                                <div>
                                  <p className="text-lg font-medium">No inventory items found</p>
                                  <p className="text-sm">Try adjusting your filters or search criteria</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentItems.map((item) => {
                            const metrics = calculateItemMetrics(item);
                            return (
                              <TableRow 
                                key={`${item.item_type}-${item.id}`} 
                                className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-b border-border/50"
                              >
                                {visibleColumns.map((column) => (
                                  <TableCell 
                                    key={column.key}
                                    style={{ 
                                      width: `${column.width}px`,
                                      minWidth: `${column.minWidth}px`,
                                      maxWidth: `${column.width}px`
                                    }}
                                    className={column.key === 'asin' || column.key === 'sku' ? 'font-mono text-sm font-medium' : column.key === 'serial_number' ? 'font-mono text-sm' : ''}
                                  >
                                    {column.key === 'item_type' && (
                                      <Badge 
                                        variant={item.item_type === 'ASIN' ? 'default' : 'secondary'}
                                        className="font-medium"
                                      >
                                        {item.item_type}
                                      </Badge>
                                    )}
                                    {column.key === 'asin' && (item.asin || 'N/A')}
                                    {column.key === 'sku' && (item.sku || 'N/A')}
                                    {column.key === 'serial_number' && (item.serial_number || 'N/A')}
                                    {column.key === 'quantity' && (
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={item.quantity === 0 ? 'destructive' : item.quantity <= 2 ? 'secondary' : 'default'}
                                          className={cn(
                                            "font-bold transition-colors",
                                            item.quantity === 0 ? 'bg-destructive/20 text-destructive border-destructive/50' : 
                                            item.quantity <= 2 ? 'bg-warning/20 text-warning border-warning/50' : 
                                            'bg-success/20 text-success border-success/50'
                                          )}
                                        >
                                          {item.quantity}
                                        </Badge>
                                        {item.quantity <= 5 && (
                                          <Progress 
                                            value={Math.min((item.quantity / 10) * 100, 100)} 
                                            className="w-12 h-2"
                                          />
                                        )}
                                      </div>
                                    )}
                                    {column.key === 'status' && (
                                      <Badge 
                                        variant={item.status === 'in-stock' ? 'default' : 'secondary'}
                                        className={cn(
                                          "capitalize",
                                          item.status === 'in-stock' ? 'bg-success/20 text-success border-success/50' : 
                                          item.status === 'ordered' ? 'bg-primary/20 text-primary border-primary/50' :
                                          'bg-muted/50 text-muted-foreground'
                                        )}
                                      >
                                        {item.status}
                                      </Badge>
                                    )}
                                    {column.key === 'last_sold_date' && (
                                      <span className="text-sm text-muted-foreground">
                                        {item.last_sold_date ? format(new Date(item.last_sold_date), 'MMM dd, yyyy') : 'Never'}
                                      </span>
                                    )}
                                    {column.key === 'last_order_date' && (
                                      <span className="text-sm text-muted-foreground">
                                        {item.last_order_date ? format(new Date(item.last_order_date), 'MMM dd, yyyy') : 'Never'}
                                      </span>
                                    )}
                                    {column.key === 'days_since_ordered' && (
                                      <span className="text-sm font-medium">
                                        {item.days_since_ordered !== null ? `${item.days_since_ordered} days` : 'N/A'}
                                      </span>
                                    )}
                                    {column.key === 'metrics' && (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant={metrics.urgencyLevel === 'critical' ? 'destructive' : metrics.urgencyLevel === 'high' ? 'secondary' : 'default'}
                                            className="text-xs"
                                          >
                                            {metrics.urgencyLevel}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            Score: {Math.round(metrics.velocityScore)}
                                          </span>
                                        </div>
                                        {metrics.stockDaysRemaining && (
                                          <div className="text-xs text-muted-foreground">
                                            <Clock className="h-2 w-2 inline mr-1" />
                                            {metrics.stockDaysRemaining}d stock
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {filteredItems.length > itemsPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && (
                          <>
                            <span className="text-muted-foreground">...</span>
                            <Button
                              variant={currentPage === totalPages ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              className="w-8 h-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

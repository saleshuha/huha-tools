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
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, CalendarIcon, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Settings, Gauge, Star, Minus, Timer } from 'lucide-react';
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
  date_added: string;
  notes?: string;
}

interface InventoryMetrics {
  velocityScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  stockDaysRemaining: number | null;
  turnoverRate: number;
  performanceRating: number;
}
export function Replenishment() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

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
    
    const daysSinceAdded = Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24));
    const turnoverRate = daysSinceAdded > 0 ? (velocityScore / daysSinceAdded) * 365 : 0;
    
    let performanceRating = 2.5;
    if (item.quantity > 0 && velocityScore > 70) performanceRating = 5;
    else if (item.quantity > 0 && velocityScore > 50) performanceRating = 4;
    else if (item.quantity > 0 && velocityScore > 30) performanceRating = 3;
    else if (item.quantity === 0) performanceRating = 1;
    
    return {
      velocityScore,
      urgencyLevel,
      stockDaysRemaining,
      turnoverRate,
      performanceRating
    };
  };
  const {
    selectedCountry
  } = useCountry();
  const {
    inventoryMetrics,
    loading: analyticsLoading,
    loadAnalytics
  } = useInventoryAnalytics();
  const {
    toast
  } = useToast();
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
  
  // Sunsky order dialog state
  const [sunskyDialogOpen, setSunskyDialogOpen] = useState(false);
  const [sunskyOrderItems, setSunskyOrderItems] = useState<any[]>([]);
  
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
    stockRange: {
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

  // Load restock items needing attention (excludes already ordered items)
  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);
      
      // Get ASIN inventory items that need restocking (quantity = 0 and not ordered)
      const asinQuery = supabase.from('asin_inventory')
        .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added')
        .eq('country', selectedCountry)
        .eq('quantity', 0)
        .neq('status', 'ordered');
        
      // Get SKU inventory items that need restocking (quantity = 0 and not ordered)  
      const skuQuery = supabase.from('sku_inventory')
        .select('id, sku_number, bin_serial_number, quantity, status, last_restock_date, date_sold, date_added')
        .eq('country', selectedCountry)
        .eq('quantity', 0)
        .neq('status', 'ordered');
        
      const [asinResult, skuResult] = await Promise.all([asinQuery, skuQuery]);
      
      if (asinResult.error) throw asinResult.error;
      if (skuResult.error) throw skuResult.error;
      
      // Process ASIN items
      const asinItems = (asinResult.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? 
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));
      
      // Process SKU items
      const skuItems = (skuResult.data || []).map(item => ({
        id: item.id,
        identifier: `SKU: ${item.sku_number} (${item.bin_serial_number})`,
        current_quantity: item.quantity,
        table_name: 'sku_inventory', 
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ?
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));
      
      const allItems = [...asinItems, ...skuItems];
      console.log('Processed restock items:', allItems);
      setRestockItems(allItems);
      console.log('Set restock items for', selectedCountry, ':', allItems.length, 'items');
    } catch (error: any) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error loading restock items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Load all inventory items for comprehensive tracking
  const loadAllInventoryItems = async () => {
    try {
      console.log('Starting loadAllInventoryItems for country:', selectedCountry);
      
      const [asinAll, skuAll] = await Promise.all([
        supabase.from('asin_inventory')
          .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added, notes')
          .eq('country', selectedCountry),
        supabase.from('sku_inventory')
          .select('id, sku_number, bin_serial_number, quantity, status, last_restock_date, date_sold, date_added')
          .eq('country', selectedCountry)
      ]);
      
      if (asinAll.error) {
        console.error('ASIN query error:', asinAll.error);
        throw asinAll.error;
      }
      if (skuAll.error) {
        console.error('SKU query error:', skuAll.error);
        throw skuAll.error;
      }
      
      console.log('Raw ASIN data:', asinAll.data);
      console.log('Raw SKU data:', skuAll.data);
      
      // Process ASIN items into AllInventoryItem format
      const asinItems: AllInventoryItem[] = (asinAll.data || []).map(item => ({
        id: item.id,
        item_type: 'ASIN' as const,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        quantity: item.quantity,
        status: item.status,
        last_sold_date: item.date_sold,
        last_order_date: item.last_restock_date,
        days_since_ordered: item.last_restock_date ? 
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
        date_added: item.date_added,
        notes: item.notes
      }));
      
      // Process SKU items into AllInventoryItem format
      const skuItems: AllInventoryItem[] = (skuAll.data || []).map(item => ({
        id: item.id,
        item_type: 'SKU' as const,
        sku: item.sku_number,
        serial_number: item.bin_serial_number,
        quantity: item.quantity,
        status: item.status,
        last_sold_date: item.date_sold,
        last_order_date: item.last_restock_date,
        days_since_ordered: item.last_restock_date ? 
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
        date_added: item.date_added
      }));
      
      const allInventoryItems = [...asinItems, ...skuItems];
      console.log('Processed inventory items:', allInventoryItems);
      console.log('Total items count:', allInventoryItems.length);
      
      // Separate items based on status for the existing logic (convert to RestockItem format)
      const restockNeeded = allInventoryItems
        .filter(item => item.quantity === 0 && item.status !== 'ordered')
        .map(item => ({
          id: item.id,
          identifier: item.item_type === 'ASIN' 
            ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` 
            : `SKU: ${item.sku} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: item.item_type === 'ASIN' ? 'asin_inventory' : 'sku_inventory',
          status: item.status,
          date_sold: item.last_sold_date,
          last_restock_date: item.last_order_date,
          days_since_last_restock: item.days_since_ordered
        }));
      
      const orderedItemsData = allInventoryItems
        .filter(item => item.status === 'ordered' && item.quantity === 0)
        .map(item => ({
          id: item.id,
          identifier: item.item_type === 'ASIN' 
            ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` 
            : `SKU: ${item.sku} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: item.item_type === 'ASIN' ? 'asin_inventory' : 'sku_inventory',
          status: item.status,
          date_sold: item.last_sold_date,
          last_restock_date: item.last_order_date,
          days_since_last_restock: item.days_since_ordered
        }));
      
      console.log('Setting allInventoryItems state with:', allInventoryItems.length, 'items');
      setAllInventoryItems(allInventoryItems);
      setRestockItems(restockNeeded);
      setOrderedItems(orderedItemsData);
      
      console.log('State updated - allInventoryItems length:', allInventoryItems.length);
      console.log('Items needing restock:', restockNeeded.length);
      console.log('Items on order:', orderedItemsData.length);
    } catch (error: any) {
      console.error('Error loading all inventory items:', error);
      toast({
        title: "Error loading inventory",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Apply filters and sorting (including header filters)
  useEffect(() => {
    console.log('Filtering effect triggered. allInventoryItems length:', allInventoryItems.length);
    console.log('Current filters:', filters);
    console.log('Header filters:', headerFilters);
    
    let filtered = [...allInventoryItems];
    console.log('Starting with items:', filtered.length);

    // Search filter (main search)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.asin?.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower) ||
        item.serial_number?.toLowerCase().includes(searchLower)
      );
      console.log('After search filter:', filtered.length);
    }

    // Header filters
    if (headerFilters.type && headerFilters.type !== 'all') {
      filtered = filtered.filter(item => 
        item.item_type.toLowerCase().includes(headerFilters.type.toLowerCase())
      );
    }
    
    if (headerFilters.asin) {
      filtered = filtered.filter(item => 
        item.asin?.toLowerCase().includes(headerFilters.asin.toLowerCase())
      );
    }
    
    if (headerFilters.sku) {
      filtered = filtered.filter(item => 
        item.sku?.toLowerCase().includes(headerFilters.sku.toLowerCase())
      );
    }
    
    if (headerFilters.serial) {
      filtered = filtered.filter(item => 
        item.serial_number?.toLowerCase().includes(headerFilters.serial.toLowerCase())
      );
    }
    
    if (headerFilters.status && headerFilters.status !== 'all') {
      filtered = filtered.filter(item => 
        item.status.toLowerCase().includes(headerFilters.status.toLowerCase())
      );
    }
    
    if (headerFilters.quantity.min || headerFilters.quantity.max) {
      filtered = filtered.filter(item => {
        const min = headerFilters.quantity.min ? parseInt(headerFilters.quantity.min) : null;
        const max = headerFilters.quantity.max ? parseInt(headerFilters.quantity.max) : null;
        if (min !== null && item.quantity < min) return false;
        if (max !== null && item.quantity > max) return false;
        return true;
      });
    }
    
    if (headerFilters.daysSince.min || headerFilters.daysSince.max) {
      filtered = filtered.filter(item => {
        if (item.days_since_ordered === null) return false;
        const min = headerFilters.daysSince.min ? parseInt(headerFilters.daysSince.min) : null;
        const max = headerFilters.daysSince.max ? parseInt(headerFilters.daysSince.max) : null;
        if (min !== null && item.days_since_ordered < min) return false;
        if (max !== null && item.days_since_ordered > max) return false;
        return true;
      });
    }

    // Item type filter
    if (filters.itemType !== 'all') {
      filtered = filtered.filter(item => item.item_type === filters.itemType);
      console.log('After item type filter:', filtered.length);
    }

    // Stock status filter
    if (filters.stockStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filters.stockStatus) {
          case 'in-stock': return item.quantity > 5;
          case 'low-stock': return item.quantity > 0 && item.quantity <= 5;
          case 'critical': return item.quantity <= 2;
          case 'out-of-stock': return item.quantity === 0;
          default: return true;
        }
      });
      console.log('After stock status filter:', filtered.length);
    }

    // Order status filter
    if (filters.orderStatus !== 'all') {
      filtered = filtered.filter(item => {
        const daysSinceOrder = item.days_since_ordered;
        switch (filters.orderStatus) {
          case 'ordered': return daysSinceOrder !== null && daysSinceOrder >= 0;
          case 'not-ordered': return daysSinceOrder === null;
          case 'overdue': return daysSinceOrder !== null && daysSinceOrder > 30;
          default: return true;
        }
      });
      console.log('After order status filter:', filtered.length);
    }

    // Date range filters
    if (filters.dateRange.lastSoldFrom || filters.dateRange.lastSoldTo) {
      filtered = filtered.filter(item => {
        if (!item.last_sold_date) return false;
        const soldDate = new Date(item.last_sold_date);
        if (filters.dateRange.lastSoldFrom && soldDate < filters.dateRange.lastSoldFrom) return false;
        if (filters.dateRange.lastSoldTo && soldDate > filters.dateRange.lastSoldTo) return false;
        return true;
      });
      console.log('After last sold date filter:', filtered.length);
    }

    if (filters.dateRange.lastOrderFrom || filters.dateRange.lastOrderTo) {
      filtered = filtered.filter(item => {
        if (!item.last_order_date) return false;
        const orderDate = new Date(item.last_order_date);
        if (filters.dateRange.lastOrderFrom && orderDate < filters.dateRange.lastOrderFrom) return false;
        if (filters.dateRange.lastOrderTo && orderDate > filters.dateRange.lastOrderTo) return false;
        return true;
      });
      console.log('After last order date filter:', filtered.length);
    }

    // Stock range filter
    if (filters.stockRange.min !== null || filters.stockRange.max !== null) {
      filtered = filtered.filter(item => {
        if (filters.stockRange.min !== null && item.quantity < filters.stockRange.min) return false;
        if (filters.stockRange.max !== null && item.quantity > filters.stockRange.max) return false;
        return true;
      });
      console.log('After stock range filter:', filtered.length);
    }

    // Days since order range filter
    if (filters.daysSinceOrderRange.min !== null || filters.daysSinceOrderRange.max !== null) {
      filtered = filtered.filter(item => {
        if (item.days_since_ordered === null) return false;
        if (filters.daysSinceOrderRange.min !== null && item.days_since_ordered < filters.daysSinceOrderRange.min) return false;
        if (filters.daysSinceOrderRange.max !== null && item.days_since_ordered > filters.daysSinceOrderRange.max) return false;
        return true;
      });
      console.log('After days since order range filter:', filtered.length);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (aValue && bValue && typeof aValue === 'string' && typeof bValue === 'string' && 
                   (sortConfig.key === 'last_sold_date' || sortConfig.key === 'last_order_date' || sortConfig.key === 'date_added')) {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
      console.log('After sorting:', filtered.length);
    }

    console.log('Final filtered items count:', filtered.length);
    setFilteredItems(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allInventoryItems, filters, sortConfig]);

  // Sorting handler
  const handleSort = (key: keyof AllInventoryItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter handlers
  const updateFilter = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const updateDateRangeFilter = (type: 'lastSoldFrom' | 'lastSoldTo' | 'lastOrderFrom' | 'lastOrderTo', date: Date | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: date
      }
    }));
  };

  const updateRangeFilter = (type: 'stockRange' | 'daysSinceOrderRange', field: 'min' | 'max', value: number | null) => {
    setFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

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
      stockRange: {
        min: null,
        max: null,
      },
      daysSinceOrderRange: {
        min: null,
        max: null,
      }
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.itemType !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.orderStatus !== 'all') count++;
    if (filters.dateRange.lastSoldFrom || filters.dateRange.lastSoldTo) count++;
    if (filters.dateRange.lastOrderFrom || filters.dateRange.lastOrderTo) count++;
    if (filters.stockRange.min !== null || filters.stockRange.max !== null) count++;
    if (filters.daysSinceOrderRange.min !== null || filters.daysSinceOrderRange.max !== null) count++;
    return count;
  };

  const exportFilteredData = () => {
    const dataToExport = filteredItems.map(item => ({
      'Item Type': item.item_type,
      'ASIN': item.asin || 'N/A',
      'SKU': item.sku || 'N/A',
      'Serial Number': item.serial_number || 'N/A',
      'Quantity': item.quantity,
      'Status': item.status,
      'Last Sold Date': item.last_sold_date ? format(new Date(item.last_sold_date), 'yyyy-MM-dd') : 'Never',
      'Last Order Date': item.last_order_date ? format(new Date(item.last_order_date), 'yyyy-MM-dd') : 'Never',
      'Days Since Order': item.days_since_ordered ?? 'N/A',
      'Date Added': format(new Date(item.date_added), 'yyyy-MM-dd'),
      'Notes': item.notes || ''
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const activeFilters = getActiveFiltersCount();
    const filename = `inventory-${activeFilters > 0 ? 'filtered-' : ''}${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.download = filename;
    link.click();
    
    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} items ${activeFilters > 0 ? '(filtered)' : ''}`,
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Load ordered items separately for analytics and display
  const loadOrderedItems = async () => {
    try {
      const [asinOrdered, skuOrdered] = await Promise.all([
        supabase.from('asin_inventory')
          .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .eq('quantity', 0), 
        supabase.from('sku_inventory')
          .select('id, sku_number, bin_serial_number, quantity, status, last_restock_date, date_sold, date_added')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .eq('quantity', 0)
      ]);
      if (asinOrdered.error) throw asinOrdered.error;
      if (skuOrdered.error) throw skuOrdered.error;
      const orderedItemsData = [...(asinOrdered.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      })), ...(skuOrdered.data || []).map(item => ({
        id: item.id,
        identifier: `${item.sku_number} (${item.bin_serial_number})`,
        current_quantity: item.quantity,
        table_name: 'sku_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }))];
      return orderedItemsData;
    } catch (error: any) {
      console.error('Error loading ordered items:', error);
      return [];
    }
  };

  // Function to automatically remove ordered items that are back in stock
  const removeRestockedOrderedItems = async () => {
    try {
      // Get all ordered items that now have quantity > 0
      const [asinRestocked, skuRestocked] = await Promise.all([
        supabase.from('asin_inventory')
          .select('id, asin, serial_number, quantity, status')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .gt('quantity', 0),
        supabase.from('sku_inventory')
          .select('id, sku_number, bin_serial_number, quantity, status')
          .eq('country', selectedCountry)
          .eq('status', 'ordered')
          .gt('quantity', 0)
      ]);

      if (asinRestocked.error) throw asinRestocked.error;
      if (skuRestocked.error) throw skuRestocked.error;

      const restockedItems = [
        ...(asinRestocked.data || []),
        ...(skuRestocked.data || [])
      ];

      if (restockedItems.length > 0) {
        // Update status to 'in-stock' for these items
        const asinUpdates = asinRestocked.data?.map(item => 
          supabase.from('asin_inventory')
            .update({ status: 'in-stock' })
            .eq('id', item.id)
        ) || [];

        const skuUpdates = skuRestocked.data?.map(item => 
          supabase.from('sku_inventory')
            .update({ status: 'in-stock' })
            .eq('id', item.id)
        ) || [];

        // Execute all updates
        await Promise.all([...asinUpdates, ...skuUpdates]);

        // Remove from local ordered items state
        const restockedIds = restockedItems.map(item => item.id);
        setOrderedItems(prev => prev.filter(item => !restockedIds.includes(item.id)));

        if (restockedItems.length > 0) {
          toast({
            title: "Items Restocked",
            description: `${restockedItems.length} ordered items are now back in stock and removed from restock management`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error removing restocked ordered items:', error);
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

        // Query ASIN inventory for sales data
        let asinSalesQuery = supabase.from('asin_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry) // Filter by selected country
        .gte('date_sold', startDate.toISOString());
        let asinRestockQuery = supabase.from('asin_inventory').select('restock_quantity').eq('country', selectedCountry) // Filter by selected country
        .not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString());
        let skuSalesQuery = supabase.from('sku_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry) // Filter by selected country
        .gte('date_sold', startDate.toISOString());
        let skuRestockQuery = supabase.from('sku_inventory').select('restock_quantity').eq('country', selectedCountry) // Filter by selected country
        .not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString());
        const [asinSalesData, asinRestockData, skuSalesData, skuRestockData] = await Promise.all([asinSalesQuery, asinRestockQuery, skuSalesQuery, skuRestockQuery]);
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

  // Load all data with optimized parallel loading
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load all inventory data comprehensively
      await loadAllInventoryItems();

      // Load analytics data in parallel without blocking the UI
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

  // Filter restock items - show all critical stock items (qty=0) regardless of status
  const filteredRestockItems = restockItems.filter(item => {
    if (!searchTerm.trim()) return true;

    // Support bulk search - split by space and search for any match
    const searchTerms = searchTerm.toLowerCase().split(' ').map(term => term.trim()).filter(Boolean);
    return searchTerms.some(term => item.identifier.toLowerCase().includes(term));
  });

  // Since database function now excludes ordered items, all filtered items are pending
  const pendingItems = filteredRestockItems;

  // Bulk selection handlers - only allow selection of pending items
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = pendingItems.map(item => item.id);
      setSelectedItems(new Set(allItemIds));
    } else {
      setSelectedItems(new Set());
    }
  };
  const handleSelectItem = (itemId: string, checked: boolean) => {
    console.log('handleSelectItem called with:', {
      itemId,
      checked,
      currentSelected: Array.from(selectedItems)
    });
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      console.log('New selected items:', Array.from(newSelected));
      return newSelected;
    });
  };
  const handleBulkMarkAsOrdered = async () => {
    if (selectedItems.size === 0) return;
    try {
      // Update each item in database
      const updatePromises = Array.from(selectedItems).map(async itemId => {
        const item = restockItems.find(i => i.id === itemId);
        if (!item) return;
        if (item.table_name === 'asin_inventory') {
          return supabase.from('asin_inventory').update({
            status: 'ordered'
          }).eq('id', itemId);
        } else if (item.table_name === 'sku_inventory') {
          return supabase.from('sku_inventory').update({
            status: 'ordered'
          }).eq('id', itemId);
        }
      });
      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result?.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items`);
      }

      // Remove items from restock list and add to ordered items
      const updatedItems = Array.from(selectedItems).map(itemId => {
        const item = restockItems.find(i => i.id === itemId);
        return item ? {
          ...item,
          status: 'ordered'
        } : null;
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

  // Mark item as ordered from supplier
  const markAsOrdered = async (itemId: string) => {
    const item = restockItems.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      toast({
        title: "Error",
        description: "Item not found",
        variant: "destructive"
      });
      return;
    }
    console.log('Marking item as ordered:', {
      itemId,
      tableType: item.table_name,
      item
    });
    try {
      let updateResult;

      // Update status in database using the correct ID
      if (item.table_name === 'asin_inventory') {
        updateResult = await supabase.from('asin_inventory').update({
          status: 'ordered'
        }).eq('id', itemId);
        console.log('ASIN update result:', updateResult);
      } else if (item.table_name === 'sku_inventory') {
        updateResult = await supabase.from('sku_inventory').update({
          status: 'ordered'
        }).eq('id', itemId);
        console.log('SKU update result:', updateResult);
      } else {
        throw new Error(`Unknown table type: ${item.table_name}`);
      }
      if (updateResult.error) {
        console.error('Database update error:', updateResult.error);
        throw updateResult.error;
      }
      console.log('Database update successful, updating local state...');

      // Remove item from restock list and add to ordered items
      const updatedItem = restockItems.find(i => i.id === itemId);
      if (updatedItem) {
        setRestockItems(prev => prev.filter(item => item.id !== itemId));
        setOrderedItems(prev => [...prev, {
          ...updatedItem,
          status: 'ordered'
        }]);
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

  // Sunsky order handlers
  const handlePlaceOrderFromSunsky = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to place an order.",
        variant: "destructive",
      });
      return;
    }

    // Convert selected restock items to the format expected by SunskyOrderDialog
    const selectedRestockItems = pendingItems.filter(item => selectedItems.has(item.id));
    
    // Calculate quantities based on units sold after last restock
    const orderItems = await Promise.all(selectedRestockItems.map(async item => {
      const extractedSku = extractSkuFromIdentifier(item.identifier);
      const extractedModel = extractModelFromIdentifier(item.identifier);
      const sunskySku = extractedSku || extractedModel;
      
      // If no SKU is found, skip this item
      if (!sunskySku) {
        return null;
      }
      
      // Calculate quantity based on sales after last restock
      let calculatedQty = 1; // Default minimum quantity
      
      try {
        // Query stock changes to calculate units sold since last restock
        let stockChangesQuery;
        
        if (item.table_name === 'asin_inventory') {
          stockChangesQuery = supabase
            .from('stock_changes')
            .select('change_amount, created_at')
            .eq('inventory_id', item.id)
            .eq('inventory_type', 'asin')
            .lt('change_amount', 0); // Only negative changes (sales)
        } else {
          stockChangesQuery = supabase
            .from('stock_changes')
            .select('change_amount, created_at')
            .eq('inventory_id', item.id)
            .eq('inventory_type', 'sku')
            .lt('change_amount', 0); // Only negative changes (sales)
        }

        // If there's a last restock date, only count sales after that date
        if (item.days_since_last_restock !== null) {
          const lastRestockDate = new Date(Date.now() - (item.days_since_last_restock * 24 * 60 * 60 * 1000));
          stockChangesQuery = stockChangesQuery.gte('created_at', lastRestockDate.toISOString());
        }

        const { data: stockChanges } = await stockChangesQuery;
        
        if (stockChanges && stockChanges.length > 0) {
          // Sum all negative changes (units sold)
          const unitsSold = stockChanges.reduce((sum, change) => sum + Math.abs(change.change_amount), 0);
          calculatedQty = unitsSold;
        }
        
        // If no restock was made before (days_since_last_restock is null), add 1 piece
        if (item.days_since_last_restock === null) {
          calculatedQty += 1;
        }
        
        // Ensure minimum quantity of 1
        calculatedQty = Math.max(1, calculatedQty);
      } catch (error) {
        console.error('Error calculating quantity for item:', item.id, error);
        // Fall back to default quantity of 1
      }
      
      return {
        id: item.id,
        po_number: `RESTOCK-${Date.now()}`, // Generate a unique PO number for restocking
        sku_code: extractedSku,
        asin: '', // Don't use ASIN for Sunsky search
        quantity: calculatedQty,
        status: 'pending',
        model_number: extractedModel,
        title: `Restock for ${item.identifier}`,
        notes: sunskySku ? 
          `Replenishment order - Qty: ${calculatedQty} (based on sales after last restock) - Search by ${extractedSku ? 'SKU' : 'Model'}: ${sunskySku}` :
          `Replenishment order for out of stock item - No valid Sunsky SKU found (contains Amazon ASIN)`,
        sunsky_sku: sunskySku, // Use valid SKU/model, avoiding Amazon ASINs
        itemNo: sunskySku, // Add itemNo field for SunskyOrderDialog compatibility
        qty: calculatedQty
      };
    }));
    
    // Filter out null items (items without valid SKUs)
    const validOrderItems = orderItems.filter(item => item !== null);

    if (validOrderItems.length === 0) {
      toast({
        title: "No Valid SKUs Found",
        description: "The selected items contain only Amazon ASINs which are not compatible with Sunsky. Please select items with valid SKU or model numbers.",
        variant: "destructive",
      });
      return;
    }

    if (validOrderItems.length < selectedRestockItems.length) {
      toast({
        title: `${selectedRestockItems.length - validOrderItems.length} Items Skipped`,
        description: "Some items were skipped because they only contain Amazon ASINs. Only items with valid SKUs will be processed.",
        variant: "default",
      });
    }

    setSunskyOrderItems(validOrderItems);
    setSunskyDialogOpen(true);
  };

  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    try {
      // Mark the original inventory items as ordered
      const updatePromises = Array.from(selectedItems).map(async itemId => {
        const item = restockItems.find(i => i.id === itemId);
        if (!item) return;
        
        if (item.table_name === 'asin_inventory') {
          return supabase.from('asin_inventory').update({
            status: 'ordered'
          }).eq('id', itemId);
        } else if (item.table_name === 'sku_inventory') {
          return supabase.from('sku_inventory').update({
            status: 'ordered'
          }).eq('id', itemId);
        }
      });

      await Promise.all(updatePromises);

      toast({
        title: "Sunsky Order Placed Successfully",
        description: `Order ${orderNumber} has been placed. Selected items marked as ordered.`,
      });

      setSelectedItems(new Set());
      setSunskyDialogOpen(false);
      loadRestockItems(); // Refresh data
    } catch (error) {
      console.error('Error updating items after Sunsky order:', error);
      toast({
        title: "Order Placed but Update Failed",
        description: `Order ${orderNumber} was placed successfully, but failed to update item status.`,
        variant: "destructive",
      });
    }
  };

  // Helper functions to extract identifiers
  const isAmazonAsin = (text: string): boolean => {
    // Amazon ASINs are typically 10 characters and start with B0
    return /^B0[A-Z0-9]{8}$/.test(text.trim());
  };

  const extractSkuFromIdentifier = (identifier: string): string => {
    // Extract SKU from identifier like "SKU123 (serial456)"
    const match = identifier.match(/^([^(]+)/);
    const extracted = match ? match[1].trim() : identifier;
    
    // Don't return Amazon ASINs as SKUs
    if (isAmazonAsin(extracted)) {
      return '';
    }
    
    return extracted;
  };

  const extractAsinFromIdentifier = (identifier: string): string => {
    // If identifier contains ASIN pattern, extract it
    const asinMatch = identifier.match(/([A-Z0-9]{10})/);
    return asinMatch ? asinMatch[1] : '';
  };

  const extractModelFromIdentifier = (identifier: string): string => {
    // Extract model from identifier in parentheses (serial number, model number, etc.)
    const match = identifier.match(/\(([^)]+)\)/);
    const modelCandidate = match ? match[1].trim() : '';
    
    // Don't return Amazon ASINs as model numbers
    if (isAmazonAsin(modelCandidate)) {
      return '';
    }
    
    // If it looks like a model number (contains letters and numbers, not just numbers), return it
    // Otherwise, try to extract from the main part if it's not an ASIN
    if (modelCandidate && /[A-Za-z]/.test(modelCandidate) && modelCandidate.length > 3) {
      return modelCandidate;
    }
    
    // If no good model found in parentheses, check if the main identifier is a model (not an ASIN)
    const mainPart = identifier.split('(')[0].trim();
    if (mainPart && !/^[A-Z0-9]{10}$/.test(mainPart)) {
      return mainPart;
    }
    
    return modelCandidate; // Return whatever we found, even if it might be a serial
  };

  // Export data functions
  const exportSalesData = () => {
    const csvContent = [['Period', 'ASIN Sold', 'SKU Sold', 'Total Sold', 'ASIN Restocked', 'SKU Restocked', 'Total Restocked', 'Daily Sell Rate'], ...salesData.map(item => [item.period, item.asin_sold, item.sku_sold, item.total_sold, item.asin_restocked, item.sku_restocked, item.total_restocked, item.sell_rate.toFixed(2)])].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `sales-data-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportRestockData = () => {
    // Filter items based on search term - use filteredRestockItems to get proper filtered data
    const itemsToExport = filteredRestockItems.filter(item => item.current_quantity === 0 && item.status !== 'ordered');
    
    const csvContent = [
      ['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Quantity', 'Days Since Restock', 'Status'], 
      ...itemsToExport.map(item => {
        let asin = '';
        let sku = '';
        let serialBin = '';
        
        if (item.table_name === 'asin_inventory') {
          // Parse ASIN format: "ASIN123 (Serial456) | SKU: SKU789" or "ASIN123 (Serial456)"
          const asinMatch = item.identifier.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
          if (asinMatch) {
            asin = asinMatch[1];
            serialBin = asinMatch[2];
          }
          
          // Extract SKU if present
          const skuMatch = item.identifier.match(/\|\s*SKU:\s*([^\s]+)/);
          if (skuMatch) {
            sku = skuMatch[1];
          }
        } else {
          // Parse SKU format: "SKU: SKU123 (Bin456)"
          const skuMatch = item.identifier.match(/SKU:\s*([^\s]+)\s*\(([^)]+)\)/);
          if (skuMatch) {
            sku = skuMatch[1];
            serialBin = skuMatch[2];
          }
        }
        
        return [
          item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', 
          asin, 
          sku,
          `="${serialBin}"`, // Preserve leading zeros with formula format
          item.current_quantity, 
          item.days_since_last_restock || 'Never', 
          item.status || 'Critical'
        ];
      })
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csvContent, `restock-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportOrderedData = () => {
    const itemsToExport = orderedItems.filter(item => item.status === 'ordered');
    
    const csvContent = [
      ['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Quantity', 'Days Since Restock', 'Order Status', 'Date Marked'], 
      ...itemsToExport.map(item => {
        let asin = '';
        let sku = '';
        let serialBin = '';
        
        if (item.table_name === 'asin_inventory') {
          // Parse ASIN format: "ASIN123 (Serial456) | SKU: SKU789" or "ASIN123 (Serial456)"
          const asinMatch = item.identifier.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
          if (asinMatch) {
            asin = asinMatch[1];
            serialBin = asinMatch[2];
          }
          
          // Extract SKU if present
          const skuMatch = item.identifier.match(/\|\s*SKU:\s*([^\s]+)/);
          if (skuMatch) {
            sku = skuMatch[1];
          }
        } else {
          // Parse SKU format: "SKU: SKU123 (Bin456)"
          const skuMatch = item.identifier.match(/SKU:\s*([^\s]+)\s*\(([^)]+)\)/);
          if (skuMatch) {
            sku = skuMatch[1];
            serialBin = skuMatch[2];
          }
        }
        
        return [
          item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', 
          asin, 
          sku,
          `="${serialBin}"`, // Preserve leading zeros with formula format
          item.current_quantity, 
          item.days_since_last_restock || 'Never', 
          item.status, 
          new Date().toLocaleDateString()
        ];
      })
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csvContent, `ordered-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Export Complete",
      description: `Data exported as ${filename}`
    });
  };

  // Load trends data
  const loadTrendsData = async () => {
    setTrendsLoading(true);
    try {
      const daysNum = parseInt(trendsDateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // Get ASIN data
      const asinQuery = supabase.from('asin_inventory').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id).eq('country', selectedCountry);

      // Get SKU data
      const skuQuery = supabase.from('sku_inventory').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id).eq('country', selectedCountry);
      const [asinResult, skuResult] = await Promise.all([asinQuery, skuQuery]);
      if (asinResult.error) throw asinResult.error;
      if (skuResult.error) throw skuResult.error;

      // Process ASIN items
      const asinItems: TrendsItem[] = (asinResult.data || []).map(item => {
        const soldInPeriod = item.date_sold && new Date(item.date_sold) >= startDate ? 1 : 0;
        const sellRate = soldInPeriod / daysNum;
        return {
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
          table_name: 'asin_inventory',
          current_quantity: item.quantity || 0,
          sold_quantity: soldInPeriod,
          last_sold_date: item.date_sold,
          days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          sell_rate: sellRate
        };
      });

      // Process SKU items  
      const skuItems: TrendsItem[] = (skuResult.data || []).map(item => {
        const soldInPeriod = item.date_sold && new Date(item.date_sold) >= startDate ? 1 : 0;
        const sellRate = soldInPeriod / daysNum;
        return {
          id: item.id,
        identifier: `SKU: ${item.sku_number} (${item.bin_serial_number})`,
          table_name: 'sku_inventory',
          current_quantity: item.quantity || 0,
          sold_quantity: soldInPeriod,
          last_sold_date: item.date_sold,
          days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          sell_rate: sellRate
        };
      });

      // Combine and filter by type
      let combinedItems = [...asinItems, ...skuItems];
      if (trendsItemType === 'asin') {
        combinedItems = asinItems;
      } else if (trendsItemType === 'sku') {
        combinedItems = skuItems;
      }
      setTrendsItems(combinedItems);
    } catch (error: any) {
      console.error('Error loading trends data:', error);
      toast({
        title: "Error loading trends data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTrendsLoading(false);
    }
  };

  // Filter and sort trends items
  const filteredTrendsItems = trendsItems.filter(item => {
    if (!trendsSearchTerm.trim()) return true;
    const searchLower = trendsSearchTerm.toLowerCase();
    return item.identifier.toLowerCase().includes(searchLower);
  }).sort((a, b) => {
    switch (trendsSortBy) {
      case 'sold_desc':
        return b.sold_quantity - a.sold_quantity;
      case 'sold_asc':
        return a.sold_quantity - b.sold_quantity;
      case 'recent':
        if (!a.last_sold_date && !b.last_sold_date) return 0;
        if (!a.last_sold_date) return 1;
        if (!b.last_sold_date) return -1;
        return new Date(b.last_sold_date).getTime() - new Date(a.last_sold_date).getTime();
      case 'quantity_low':
        return a.current_quantity - b.current_quantity;
      default:
        return 0;
    }
  });

  // Export trends data
  const exportTrendsData = () => {
    const csvContent = [
      ['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Stock', 'Sold Quantity', 'Sell Rate/Day', 'Last Sold', 'Days Since Restock', 'Stock Status'], 
      ...filteredTrendsItems.map(item => {
        let asin = '';
        let sku = '';
        let serialBin = '';
        
        if (item.table_name === 'asin_inventory') {
          // Parse ASIN format: "ASIN123 (Serial456) | SKU: SKU789" or "ASIN123 (Serial456)"
          const asinMatch = item.identifier.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
          if (asinMatch) {
            asin = asinMatch[1];
            serialBin = asinMatch[2];
          }
          
          // Extract SKU if present
          const skuMatch = item.identifier.match(/\|\s*SKU:\s*([^\s]+)/);
          if (skuMatch) {
            sku = skuMatch[1];
          }
        } else {
          // Parse SKU format: "SKU: SKU123 (Bin456)"
          const skuMatch = item.identifier.match(/SKU:\s*([^\s]+)\s*\(([^)]+)\)/);
          if (skuMatch) {
            sku = skuMatch[1];
            serialBin = skuMatch[2];
          }
        }
        
        return [
          item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', 
          asin, 
          sku,
          `="${serialBin}"`, // Preserve leading zeros with formula format
          item.current_quantity, 
          item.sold_quantity, 
          item.sell_rate.toFixed(2), 
          item.last_sold_date ? new Date(item.last_sold_date).toLocaleDateString() : 'Never', 
          item.days_since_last_restock || 'Never', 
          item.current_quantity <= 5 ? 'Critical' : item.current_quantity <= 10 ? 'Low' : 'Good'
        ];
      })
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csvContent, `trends-analysis-${selectedCountry}-${trendsDateRange}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // AI Forecasting functions
  const generateForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-inventory-forecast', {
        body: {
          country: selectedCountry,
          itemType: 'all',
          analysisDepth: 'standard'
        }
      });
      if (error) throw error;
      if (data?.error) {
        throw new Error(data.error);
      }
      setForecastData(data);
      toast({
        title: "AI Forecast Generated",
        description: `Analysis completed for ${data?.items_analyzed || 0} items`
      });
    } catch (error: any) {
      console.error('Error generating forecast:', error);
      setForecastError(error.message);
      toast({
        title: "Forecast Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setForecastLoading(false);
    }
  };
  const exportForecastData = () => {
    if (!forecastData?.forecasts) return;
    const csvContent = [['Item', 'Current Stock', 'Days Until Stockout', 'Reorder Point', 'Risk Level', 'Confidence', 'Trend', 'Key Insights'], ...forecastData.forecasts.map((item: any) => [item.identifier, item.current_stock, item.predicted_days_until_stockout, item.recommended_reorder_point, item.risk_level, `${item.confidence_score}%`, item.seasonal_trend, (item.insights || []).join('; ')])].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `ai-forecast-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Dialog handlers for metric cards
  const openCriticalStockDialog = () => {
    setDialogData({
      isOpen: true,
      title: 'Critical Stock Items (0 Units)',
      items: filteredRestockItems,
      // Show all critical items regardless of status
      type: 'critical'
    });
  };
  const openOrderedItemsDialog = async () => {
    const orderedItemsData = await loadOrderedItems();
    setDialogData({
      isOpen: true,
      title: 'Items Ordered from Supplier',
      items: orderedItemsData,
      type: 'ordered'
    });
  };
  const openActiveItemsDialog = async () => {
    try {
      // Get all active items from both tables
      const [asinData, skuData] = await Promise.all([supabase.from('asin_inventory').select('*').eq('country', selectedCountry).eq('status', 'in-stock'), supabase.from('sku_inventory').select('*').eq('country', selectedCountry).eq('status', 'in-stock')]);
      if (asinData.error) throw asinData.error;
      if (skuData.error) throw skuData.error;
      const activeItemsData = [...(asinData.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
        status: item.status,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      })), ...(skuData.data || []).map(item => ({
        id: item.id,
        identifier: `${item.sku_number} (${item.bin_serial_number})`,
        current_quantity: item.quantity,
        table_name: 'sku_inventory',
        status: item.status,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }))];
      setDialogData({
        isOpen: true,
        title: 'Active Inventory Items',
        items: activeItemsData,
        type: 'active'
      });
    } catch (error: any) {
      toast({
        title: "Error loading active items",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Optimized real-time subscriptions - only reload specific data that changed
  useEffect(() => {
    if (!selectedCountry) return;
    const channels = [supabase.channel('asin-inventory-realtime').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'asin_inventory',
      filter: `country=eq.${selectedCountry}`
    }, async () => {
      // Reload all inventory data on changes
      loadAllInventoryItems();
      // Check if any ordered items are now back in stock and remove them
      await removeRestockedOrderedItems();
    }), supabase.channel('sku-inventory-realtime').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sku_inventory',
      filter: `country=eq.${selectedCountry}`
    }, async () => {
      // Reload all inventory data on changes
      loadAllInventoryItems();
      // Check if any ordered items are now back in stock and remove them
      await removeRestockedOrderedItems();
    })];
    channels.forEach(channel => channel.subscribe());
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [selectedCountry]);

  // Load data on country change
  useEffect(() => {
    const loadData = async () => {
      await loadAllData();
      const orderedItemsData = await loadOrderedItems();
      setOrderedItems(orderedItemsData);
      // Check for restocked ordered items and clean them up
      await removeRestockedOrderedItems();
    };
    loadData();
  }, [selectedCountry]);

  // Load trends data when filters change
  useEffect(() => {
    loadTrendsData();
  }, [selectedCountry, trendsDateRange, trendsItemType]);
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading sales & replenishment data...</p>
        </div>
      </div>;
  }

  // Chart configurations with updated SKU color scheme
  const chartConfig = {
    total_sold: {
      label: "Total Sold",
      color: "hsl(var(--primary))"
    },
    total_restocked: {
      label: "Total Restocked",
      color: "hsl(var(--secondary))"
    },
    asin_sold: {
      label: "ASIN Sold",
      color: "hsl(var(--chart-1))"
    },
    sku_sold: {
      label: "SKU Sold",
      color: "hsl(220, 70%, 50%)"
    },
    // Changed to blue scheme
    sell_rate: {
      label: "Daily Rate",
      color: "hsl(var(--accent))"
    }
  };
  const selectedPeriodData = salesData.find(d => d.period === selectedPeriod);
  const totalSales30d = salesData.find(d => d.period === '30d')?.total_sold || 0;
  const totalRestocks30d = salesData.find(d => d.period === '30d')?.total_restocked || 0;
  return <div className="space-y-6 animate-fade-in w-full max-w-none">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales & Replenishment Dashboard</h2>
          <p className="text-muted-foreground">Real-time analytics for {selectedCountry}</p>
        </div>
        <Button onClick={loadAllData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Critical Stock Items */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-destructive" onClick={openCriticalStockDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-medium text-muted-foreground">Critical Stock</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{pendingItems.length}</p>
                <p className="text-xs text-destructive">Out of stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Ordered */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4" style={{
        borderLeftColor: 'hsl(220, 70%, 50%)'
      }} onClick={openOrderedItemsDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4" style={{
                  color: 'hsl(220, 70%, 50%)'
                }} />
                  <p className="text-xs font-medium text-muted-foreground">Ordered</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{orderedItems.length}</p>
                <p className="text-xs" style={{
                color: 'hsl(220, 70%, 50%)'
              }}>From supplier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales (30 days) */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-primary" onClick={openActiveItemsDialog}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Sales (30d)</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalSales30d}</p>
                <p className="text-xs text-primary">Units sold</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Restocks (30 days) */}
        <Card className="glass-container hover-scale cursor-pointer transition-all duration-300 hover:shadow-glow border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-secondary" />
                  <p className="text-xs font-medium text-muted-foreground">Restocks (30d)</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalRestocks30d}</p>
                <p className="text-xs text-secondary">Units restocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Sell Rate */}
        <Card className="glass-container hover-scale transition-all duration-300 hover:shadow-glow border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-accent" />
                  <p className="text-xs font-medium text-muted-foreground">Daily Rate</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {salesData.find(d => d.period === '30d')?.sell_rate?.toFixed(1) || '0'}
                </p>
                <p className="text-xs text-accent">Units/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Ratio */}
        <Card className="glass-container hover-scale transition-all duration-300 hover:shadow-glow border-l-4 border-l-chart-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-chart-1" />
                  <p className="text-xs font-medium text-muted-foreground">Stock Ratio</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {totalRestocks30d > 0 ? (totalSales30d / totalRestocks30d * 100).toFixed(0) : '0'}%
                </p>
                <p className="text-xs text-chart-1">Efficiency</p>
              </div>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Comprehensive Inventory Tracking</h3>
              <p className="text-muted-foreground">Track all ASIN and SKU inventory with detailed analytics and status</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="15d">15 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="45d">45 Days</SelectItem>
                  <SelectItem value="60d">60 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportSalesData} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Comprehensive Inventory Tracking */}
          <div className="space-y-6">
            {/* Filters and Controls */}
            <Card className="glass-container">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search ASINs, SKUs, or serial numbers..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-80" 
                    />
                  </div>
                  <Select value={trendsItemType || 'all'} onValueChange={setTrendsItemType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="asin">ASIN Only</SelectItem>
                      <SelectItem value="sku">SKU Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={trendsSortBy || 'sold_desc'} onValueChange={setTrendsSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sold_desc">Most Sold</SelectItem>
                      <SelectItem value="sold_asc">Least Sold</SelectItem>
                      <SelectItem value="recent_sold">Recently Sold</SelectItem>
                      <SelectItem value="recent_ordered">Recently Ordered</SelectItem>
                      <SelectItem value="quantity_low">Low Stock</SelectItem>
                      <SelectItem value="needs_restock">Needs Restock</SelectItem>
                      <SelectItem value="slow_restock">Slow Restock</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => loadAnalytics()} variant="outline" size="sm" disabled={loading} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                            <SelectItem value="in-stock">In Stock (&gt;5)</SelectItem>
                            <SelectItem value="low-stock">Low Stock (1-5)</SelectItem>
                            <SelectItem value="critical">Critical (≤2)</SelectItem>
                            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={filters.orderStatus} onValueChange={(value) => updateFilter('orderStatus', value)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Orders" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Orders</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="not-ordered">Not Ordered</SelectItem>
                            <SelectItem value="overdue">Overdue (&gt;30d)</SelectItem>
                          </SelectContent>
                        </Select>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 justify-start text-left font-normal">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Last Sold
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-2">
                              <Label>From:</Label>
                              <Calendar
                                mode="single"
                                selected={filters.dateRange.lastSoldFrom}
                                onSelect={(date) => updateDateRangeFilter('lastSoldFrom', date)}
                                className={cn("p-3 pointer-events-auto")}
                              />
                              <Label>To:</Label>
                              <Calendar
                                mode="single"
                                selected={filters.dateRange.lastSoldTo}
                                onSelect={(date) => updateDateRangeFilter('lastSoldTo', date)}
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 justify-start text-left font-normal">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Last Order
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-2">
                              <Label>From:</Label>
                              <Calendar
                                mode="single"
                                selected={filters.dateRange.lastOrderFrom}
                                onSelect={(date) => updateDateRangeFilter('lastOrderFrom', date)}
                                className={cn("p-3 pointer-events-auto")}
                              />
                              <Label>To:</Label>
                              <Calendar
                                mode="single"
                                selected={filters.dateRange.lastOrderTo}
                                onSelect={(date) => updateDateRangeFilter('lastOrderTo', date)}
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 justify-start text-left font-normal">
                              <Filter className="h-4 w-4 mr-2" />
                              More
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                              <div>
                                <Label>Stock Range:</Label>
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.stockRange.min ?? ''}
                                    onChange={(e) => updateRangeFilter('stockRange', 'min', e.target.value ? Number(e.target.value) : null)}
                                    className="h-8"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.stockRange.max ?? ''}
                                    onChange={(e) => updateRangeFilter('stockRange', 'max', e.target.value ? Number(e.target.value) : null)}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Days Since Order:</Label>
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.daysSinceOrderRange.min ?? ''}
                                    onChange={(e) => updateRangeFilter('daysSinceOrderRange', 'min', e.target.value ? Number(e.target.value) : null)}
                                    className="h-8"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.daysSinceOrderRange.max ?? ''}
                                    onChange={(e) => updateRangeFilter('daysSinceOrderRange', 'max', e.target.value ? Number(e.target.value) : null)}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Results Info */}
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
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
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('item_type')}
                            >
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-primary" />
                                Type
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'item_type' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('asin')}
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                ASIN
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'asin' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('sku')}
                            >
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-primary" />
                                SKU
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'sku' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('serial_number')}
                            >
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                Serial Number
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'serial_number' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Status
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'status' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('last_sold_date')}
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Last Sold
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'last_sold_date' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('last_order_date')}
                            >
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" />
                                Last Order
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'last_order_date' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold"
                              onClick={() => handleSort('days_since_ordered')}
                            >
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                Days Since Order
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                {sortConfig.key === 'days_since_ordered' && (
                                  sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold">
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-primary" />
                                Order Frequency
                              </div>
                            </TableHead>
                          </TableRow>
                          
                          {/* Filter Headers Row */}
                          <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="p-2">
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
                            </TableHead>
                            <TableHead className="p-2">
                              <Input
                                placeholder="Filter ASIN..."
                                value={headerFilters.asin}
                                onChange={(e) => updateHeaderFilter('asin', e.target.value)}
                                className="h-8 text-xs border-border/50 bg-background/80"
                              />
                            </TableHead>
                            <TableHead className="p-2">
                              <Input
                                placeholder="Filter SKU..."
                                value={headerFilters.sku}
                                onChange={(e) => updateHeaderFilter('sku', e.target.value)}
                                className="h-8 text-xs border-border/50 bg-background/80"
                              />
                            </TableHead>
                            <TableHead className="p-2">
                              <Input
                                placeholder="Filter Serial..."
                                value={headerFilters.serial}
                                onChange={(e) => updateHeaderFilter('serial', e.target.value)}
                                className="h-8 text-xs border-border/50 bg-background/80"
                              />
                            </TableHead>
                            <TableHead className="p-2">
                              <Select value={headerFilters.status} onValueChange={(value) => updateHeaderFilter('status', value === 'all' ? '' : value)}>
                                <SelectTrigger className="h-8 text-xs border-border/50 bg-background/80">
                                  <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="in-stock">In Stock</SelectItem>
                                  <SelectItem value="ordered">Ordered</SelectItem>
                                  <SelectItem value="sold">Sold</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableHead>
                            <TableHead className="p-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 text-xs opacity-60 hover:opacity-100"
                                disabled
                              >
                                Date Filter
                              </Button>
                            </TableHead>
                            <TableHead className="p-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 text-xs opacity-60 hover:opacity-100"
                                disabled
                              >
                                Date Filter
                              </Button>
                            </TableHead>
                            <TableHead className="p-2">
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
                            </TableHead>
                            <TableHead className="p-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={clearHeaderFilters}
                                className="h-8 text-xs border-border/50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center p-12 text-muted-foreground">
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
                              // Calculate days since last order
                              const daysSinceLastOrder = item.last_order_date 
                                ? Math.floor((new Date().getTime() - new Date(item.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
                                : null;

                              // Calculate order frequency (placeholder logic - could be enhanced with order history)
                              const orderFrequency = item.last_order_date 
                                ? `${daysSinceLastOrder} days ago`
                                : 'Never ordered';

                              return (
                                <TableRow 
                                  key={`${item.item_type}-${item.id}`} 
                                  className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-b border-border/50"
                                >
                                  <TableCell>
                                    <Badge 
                                      variant={item.item_type === 'ASIN' ? 'default' : 'secondary'}
                                      className="font-medium"
                                    >
                                      {item.item_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm font-medium">{item.asin || 'N/A'}</TableCell>
                                  <TableCell className="font-mono text-sm font-medium">{item.sku || 'N/A'}</TableCell>
                                  <TableCell className="font-mono text-sm">{item.serial_number || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={item.status === 'in-stock' ? 'default' : 'secondary'}
                                      className={cn(
                                        "capitalize",
                                        item.status === 'in-stock' ? 'bg-success/20 text-success border-success/50' : 
                                        item.status === 'ordered' ? 'bg-primary/20 text-primary border-primary/50' :
                                        'bg-muted/50 text-muted-foreground'
                                      )}
                                    >
                                      {item.status.replace('-', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      {item.last_sold_date ? (
                                        <>
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          {format(new Date(item.last_sold_date), 'MMM dd, yyyy')}
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <XCircle className="h-3 w-3" />
                                          Never
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      {item.last_order_date ? (
                                        <>
                                          <Truck className="h-3 w-3 text-muted-foreground" />
                                          {format(new Date(item.last_order_date), 'MMM dd, yyyy')}
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <XCircle className="h-3 w-3" />
                                          Never
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {daysSinceLastOrder !== null ? (
                                      <Badge 
                                        variant={daysSinceLastOrder > 30 ? 'destructive' : daysSinceLastOrder > 14 ? 'secondary' : 'default'}
                                        className={cn(
                                          "font-medium",
                                          daysSinceLastOrder > 30 ? 'bg-destructive/20 text-destructive border-destructive/50' : 
                                          daysSinceLastOrder > 14 ? 'bg-warning/20 text-warning border-warning/50' : 
                                          'bg-primary/20 text-primary border-primary/50'
                                        )}
                                      >
                                        {daysSinceLastOrder} days
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Timer className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">
                                        {orderFrequency}
                                      </span>
                                    </div>
                                  </TableCell>
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
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <span className="text-sm text-muted-foreground px-4">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          </div>
        </TabsContent>

        {/* Restock Management Tab with Separate Tabs */}
        <TabsContent value="restock" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Restock Management Dashboard</h3>
              <p className="text-muted-foreground">Manage items that need restocking and track order status</p>
            </div>
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
          </div>
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Restock Management
              </CardTitle>
              <p className="text-muted-foreground">Manage critical stock items and track orders</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="critical" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="critical" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Stock ({pendingItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="ordered" className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Ordered Items ({orderedItems.length})
                  </TabsTrigger>
                </TabsList>

                {/* Critical Stock Tab */}
                <TabsContent value="critical" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input placeholder="Search ASINs, SKUs, or serials... (use spaces for multiple)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Badge variant="outline" className="text-sm whitespace-nowrap">
                      {pendingItems.length} items need attention
                    </Badge>
                  </div>

                  {/* Bulk Actions for Critical Items */}
                  {pendingItems.length > 0 && <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                         <div className="flex items-center space-x-2">
                           <Checkbox id="select-all" checked={selectedItems.size === pendingItems.length && pendingItems.length > 0} onCheckedChange={handleSelectAll} />
                           <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                             Select All ({pendingItems.length})
                           </label>
                         </div>
                         {selectedItems.size > 0 && <Badge variant="secondary" className="text-xs">
                             {selectedItems.size} selected
                           </Badge>}
                       </div>
                       <div className="flex items-center gap-2">
                         <Button onClick={handlePlaceOrderFromSunsky} disabled={selectedItems.size === 0} size="sm" className="gap-2" variant="secondary">
                           <Package className="w-4 h-4" />
                           Order from Sunsky ({selectedItems.size || 'Selected'})
                         </Button>
                         <Button onClick={handleBulkMarkAsOrdered} disabled={selectedItems.size === 0} size="sm" className="gap-2">
                           <ShoppingCart className="w-4 h-4" />
                           Mark {selectedItems.size || 'Selected'} as Ordered
                         </Button>
                       </div>
                    </div>}

                  {searchTerm.trim() && <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
                      <strong>Search Active:</strong> {searchTerm.split(' ').map(term => term.trim()).filter(Boolean).join(', ')}
                    </div>}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pendingItems.length > 0 ? pendingItems.map(item => <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <Checkbox id={`item-${item.id}`} checked={selectedItems.has(item.id)} onCheckedChange={checked => handleSelectItem(item.id, checked as boolean)} />
                            <div className="p-2 rounded-lg bg-destructive/20">
                              {item.table_name === 'asin_inventory' ? <Package className="w-4 h-4 text-destructive" /> : <Database className="w-4 h-4 text-destructive" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.identifier}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Qty: {item.current_quantity}</span>
                                <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                                <Badge variant="destructive" className="text-xs">
                                  Out of Stock
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button onClick={() => markAsOrdered(item.id)} size="sm" variant="outline" className="gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Mark as Ordered
                          </Button>
                        </div>) : <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No critical stock items</p>
                        <p className="text-sm">All items are well stocked!</p>
                      </div>}
                  </div>

                  {/* Export button for critical items */}
                  {pendingItems.length > 0 && <div className="pt-4 border-t">
                      <Button onClick={exportRestockData} variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Critical Items
                      </Button>
                    </div>}
                </TabsContent>

                {/* Ordered Items Tab */}
                <TabsContent value="ordered" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Items that have been ordered from suppliers
                    </div>
                    {orderedItems.length > 0 && <Button onClick={() => exportOrderedData()} size="sm" variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Ordered Items
                      </Button>}
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orderedItems.length > 0 ? orderedItems.map(item => <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 opacity-80">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              {item.table_name === 'asin_inventory' ? <Package className="w-4 h-4 text-blue-600" /> : <Database className="w-4 h-4 text-blue-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.identifier}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Qty: {item.current_quantity}</span>
                                <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  Order Placed
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" disabled className="gap-2 opacity-60">
                            <CheckCircle className="w-4 h-4" />
                            Ordered
                          </Button>
                        </div>) : <div className="text-center py-8 text-muted-foreground">
                        <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No ordered items</p>
                        <p className="text-sm">Items you mark as ordered will appear here</p>
                      </div>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialog for displaying filtered items */}
      <Dialog open={dialogData.isOpen} onOpenChange={open => setDialogData(prev => ({
      ...prev,
      isOpen: open
    }))}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-background border border-border">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {dialogData.type === 'critical' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                {dialogData.type === 'ordered' && <Truck className="w-5 h-5" style={{
                color: 'hsl(220, 70%, 50%)'
              }} />}
                {dialogData.type === 'active' && <Activity className="w-5 h-5 text-primary" />}
                {dialogData.title}
              </span>
              <Badge variant="outline" className="text-sm">
                {dialogData.items.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 pt-4">
            {dialogData.items.length > 0 ? dialogData.items.map(item => <div key={item.id} className={`p-4 border rounded-lg transition-colors ${dialogData.type === 'critical' ? 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20' : dialogData.type === 'ordered' ? 'bg-blue-50/50 border-blue-200/50' : 'bg-primary/5 hover:bg-primary/10 border-primary/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${dialogData.type === 'critical' ? 'bg-destructive/20' : dialogData.type === 'ordered' ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                        {item.table_name === 'asin_inventory' ? <Package className={`w-4 h-4 ${dialogData.type === 'critical' ? 'text-destructive' : dialogData.type === 'ordered' ? 'text-blue-600' : 'text-primary'}`} /> : <Database className={`w-4 h-4 ${dialogData.type === 'critical' ? 'text-destructive' : dialogData.type === 'ordered' ? 'text-blue-600' : 'text-primary'}`} />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.identifier}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Quantity: {item.current_quantity}</span>
                          <span>Last Restock: {item.days_since_last_restock ? `${item.days_since_last_restock}d ago` : 'Never'}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dialogData.type === 'critical' && <>
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                          <Button size="sm" onClick={() => markAsOrdered(item.id)}>
                            Mark as Ordered
                          </Button>
                        </>}
                      {dialogData.type === 'ordered' && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          Order Placed
                        </Badge>}
                      {dialogData.type === 'active' && <Badge variant={item.current_quantity <= 5 ? "destructive" : "default"} className="text-xs">
                          {item.current_quantity <= 5 ? "Low Stock" : "In Stock"}
                        </Badge>}
                    </div>
                  </div>
                </div>) : <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No items found</p>
                <p className="text-sm">No items match the current criteria</p>
              </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sunsky Order Dialog */}
      <SunskyOrderDialog
        open={sunskyDialogOpen}
        onOpenChange={setSunskyDialogOpen}
        selectedOrders={sunskyOrderItems}
        onOrderSuccess={handleSunskyOrderSuccess}
      />
    </div>;
}
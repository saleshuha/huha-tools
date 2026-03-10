import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Label } from './ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { useProductImages } from '@/hooks/useProductImages';
import { InventoryAnalytics } from './InventoryAnalytics';
import { VelocityAnalyticsSimple } from './VelocityAnalyticsSimple';
import { ReplenishmentItemCard } from './replenishment/ReplenishmentItemCard';
import { ReplenishmentSearchBar } from './replenishment/ReplenishmentSearchBar';
import { ReplenishmentPagination } from './replenishment/ReplenishmentPagination';
import { ReplenishmentConfigDialog } from './replenishment/ReplenishmentConfigDialog';
import { CalculationStatusCard } from './replenishment/CalculationStatusCard';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Package, Download, RefreshCw, Search, BarChart3, Clock, ShoppingCart, Activity, DollarSign, Database, PieChart, LineChart, CalendarIcon, CheckCircle, XCircle, Eye, Truck, ArrowRight, Target, Zap, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Settings, Gauge, Star, Minus, Timer, ChevronUp, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, Legend } from 'recharts';
import { SunskyOrderDialog } from './SunskyOrderDialog';
import { useTaxonomy } from '@/hooks/useTaxonomy';
interface RestockItem {
  id: string;
  identifier: string;
  asin?: string;
  sku?: string;
  serial_number?: string;
  title?: string | null;
  current_quantity: number;
  table_name: string;
  days_since_last_restock: number | null;
  status: string;
  date_sold?: string | null;
  last_restock_date?: string | null;
  restock_quantity?: number | null;
  date_added?: string;
  total_sold_units?: number;
  // Enhanced velocity fields
  sales_velocity?: number;
  velocity_category?: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales';
  recommended_reorder_quantity?: number;
  reorder_point?: number;
  stock_days_remaining?: number | null;
  urgency_score?: number;
}
interface SalesData {
  period: string;
  asin_sold: number;
  total_sold: number;
  asin_restocked: number;
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
  title?: string | null;
  quantity: number;
  ordered_quantity?: number;
  restock_quantity?: number | null;
  recommended_reorder_quantity?: number;
  status: string;
  last_sold_date?: string | null;
  last_order_date?: string | null;
  days_since_ordered?: number | null;
  date_added: string;
  notes?: string;
  ordered_at?: string | null;
  sunsky_order_number?: string | null;
  velocity_order_ref?: string | null;
}
interface InventoryMetrics {
  velocityScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  stockDaysRemaining: number | null;
  turnoverRate: number;
  performanceRating: number;
}
export function Replenishment() {
  const { trackTabChange } = useTaxonomy();
  
  // Product Images
  const {
    productImages,
    getImageByAsin,
    isLoading: imagesLoading
  } = useProductImages();

  // Search states for each tab
  const [readyToOrderSearch, setReadyToOrderSearch] = useState('');
  const [orderedSearch, setOrderedSearch] = useState('');
  const [outOfStockSearch, setOutOfStockSearch] = useState('');
  const [nonSourceSearch, setNonSourceSearch] = useState('');

  // Pagination states for each tab
  const [readyToOrderPage, setReadyToOrderPage] = useState(1);
  const [orderedPage, setOrderedPage] = useState(1);
  const [outOfStockPage, setOutOfStockPage] = useState(1);
  const [nonSourcePage, setNonSourcePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Pagination state (legacy, kept for other features)
  const [currentPage, setCurrentPage] = useState(1);

  // Header filter functions
  const updateHeaderFilter = (field: string, value: string) => {
    setHeaderFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const updateHeaderRangeFilter = (field: string, type: 'min' | 'max', value: string) => {
    setHeaderFilters(prev => {
      if (field === 'quantity' || field === 'daysSince') {
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [type]: value
          }
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
      quantity: {
        min: '',
        max: ''
      },
      daysSince: {
        min: '',
        max: ''
      }
    });
  };

  // Calculate item metrics
  const calculateItemMetrics = (item: AllInventoryItem): InventoryMetrics => {
    const daysSinceSold = item.last_sold_date ? Math.floor((Date.now() - new Date(item.last_sold_date).getTime()) / (1000 * 60 * 60 * 24)) : null;
    let velocityScore = 0;
    if (daysSinceSold !== null && daysSinceSold > 0) {
      velocityScore = Math.max(0, 100 - daysSinceSold / 30 * 100);
    }
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (item.quantity === 0) urgencyLevel = 'critical';else if (item.quantity <= 2) urgencyLevel = 'high';else if (item.quantity <= 5) urgencyLevel = 'medium';
    let stockDaysRemaining: number | null = null;
    if (velocityScore > 0 && item.quantity > 0) {
      stockDaysRemaining = Math.floor(item.quantity / Math.max(velocityScore / 100, 0.1));
    }
    const daysSinceAdded = Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24));
    const turnoverRate = daysSinceAdded > 0 ? velocityScore / daysSinceAdded * 365 : 0;
    let performanceRating = 2.5;
    if (item.quantity > 0 && velocityScore > 70) performanceRating = 5;else if (item.quantity > 0 && velocityScore > 50) performanceRating = 4;else if (item.quantity > 0 && velocityScore > 30) performanceRating = 3;else if (item.quantity === 0) performanceRating = 1;
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
  const [searchTerm, setSearchTerm] = useState(''); // Legacy search for main features
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);
  const [nonSourceItems, setNonSourceItems] = useState<RestockItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<AllInventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AllInventoryItem[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [outOfStockItems, setOutOfStockItems] = useState<RestockItem[]>([]);

  // Sunsky order dialog state
  const [sunskyDialogOpen, setSunskyDialogOpen] = useState(false);
  const [sunskyOrderItems, setSunskyOrderItems] = useState<any[]>([]);

  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AllInventoryItem | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const [filters, setFilters] = useState({
    search: '',
    itemType: 'all' as 'all' | 'ASIN' | 'SKU',
    stockStatus: 'all' as 'all' | 'in-stock' | 'sold',
    orderStatus: 'all' as 'all' | 'ordered' | 'not-ordered' | 'overdue',
    dateRange: {
      lastSoldFrom: null as Date | null,
      lastSoldTo: null as Date | null,
      lastOrderFrom: null as Date | null,
      lastOrderTo: null as Date | null
    },
    stockRange: {
      min: null as number | null,
      max: null as number | null
    },
    daysSinceOrderRange: {
      min: null as number | null,
      max: null as number | null
    }
  });

  // Header filter states
  const [headerFilters, setHeaderFilters] = useState({
    type: 'all',
    asin: '',
    sku: '',
    serial: '',
    status: 'all',
    quantity: {
      min: '',
      max: ''
    },
    daysSince: {
      min: '',
      max: ''
    }
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

  // Replenishment configuration state
  const [availableConfigs, setAvailableConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<any>(null);
  
  // Calculation progress state
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculatedItems, setCalculatedItems] = useState(0);
  
  // Calculation tracking state
  const [calculationStats, setCalculationStats] = useState<{
    edgeSuccessCount: number;
    fallbackCount: number;
    errorCount: number;
    lastError: string | null;
  }>({
    edgeSuccessCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    lastError: null,
  });

  // Delete configuration
  const handleDeleteConfig = async () => {
    if (!configToDelete) return;
    
    try {
      const { error } = await supabase
        .from('replenishment_calculation_configs')
        .delete()
        .eq('id', configToDelete.id);

      if (error) throw error;

      toast({
        title: "Configuration deleted",
        description: `"${configToDelete.config_name}" has been deleted.`,
      });

      // If deleted config was selected, clear selection
      if (selectedConfigId === configToDelete.id) {
        setSelectedConfigId(null);
      }

      // Reload configs
      await loadConfigs();
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    } catch (error: any) {
      console.error('Error deleting configuration:', error);
      toast({
        title: 'Error deleting configuration',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Load non-source items
  const loadNonSourceItems = async () => {
    try {
      const {
        data,
        error
      } = await ((supabase as any).from('non_source_items').select('id, asin, serial_number, sku, title, marked_at').eq('country', selectedCountry).order('marked_at', {
        ascending: false
      }));
      if (error) throw error;
      const nonSourceItemsData = ((data as any) || []).map((item: any) => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: 0,
        table_name: 'non_source_items' as const,
        status: 'non-source',
        date_sold: null,
        last_restock_date: null,
        days_since_last_restock: null
      }));
      setNonSourceItems(nonSourceItemsData);
    } catch (error: any) {
      console.error('Error loading non-source items:', error);
      toast({
        title: "Error loading non-source items",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  // Load replenishment configurations
  // Returns the resolved config so callers can use it immediately without waiting for state
  const loadConfigs = async (): Promise<{ configs: any[]; resolvedConfig: any | null }> => {
    try {
      const { data, error } = await supabase
        .from('replenishment_calculation_configs')
        .select('*')
        .eq('country', selectedCountry)
        .order('is_default', { ascending: false });

      if (error) throw error;

      // If no configurations exist, create a default one
      if (!data || data.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const defaultConfig = {
            user_id: user.id,
            config_name: 'Standard Replenishment',
            is_default: true,
            country: selectedCountry,
            calculation_method: 'simple',
            include_sales: true,
            sales_weight: 1.0,
            include_manual_adjustments: true,
            manual_adjustment_weight: 1.0,
            include_po_restocks: true,
            po_restock_weight: 1.0,
            include_returns: false,
            return_weight: 0.5,
            lookback_days: 90,
            exclude_first_n_days: 0,
            use_velocity_multiplier: false,
            fast_moving_multiplier: 1.5,
            medium_moving_multiplier: 1.0,
            slow_moving_multiplier: 0.5,
            safety_stock_days: 7,
            lead_time_days: 14,
            min_order_quantity: 1,
            max_order_quantity: 100,
            round_to_multiple: 1,
            notes: 'Auto-created default configuration'
          };

          const { data: newConfig, error: createError } = await supabase
            .from('replenishment_calculation_configs')
            .insert(defaultConfig)
            .select()
            .single();

          if (createError) {
            console.error('Error creating default config:', createError);
            return { configs: [], resolvedConfig: null };
          } else {
            setAvailableConfigs([newConfig]);
            setSelectedConfigId(newConfig.id);
            toast({
              title: "Configuration Created",
              description: "Created default replenishment configuration",
            });
            return { configs: [newConfig], resolvedConfig: newConfig };
          }
        }
        return { configs: [], resolvedConfig: null };
      }

      setAvailableConfigs(data || []);

      // Determine the resolved config synchronously from the fresh data
      let resolvedConfig: any = null;
      const currentConfigStillExists = selectedConfigId && (data || []).some(c => c.id === selectedConfigId);
      
      if (currentConfigStillExists) {
        resolvedConfig = data.find(c => c.id === selectedConfigId);
      } else {
        const defaultConfig = (data || []).find(c => c.is_default);
        if (defaultConfig) {
          setSelectedConfigId(defaultConfig.id);
          resolvedConfig = defaultConfig;
        } else if (data && data.length > 0) {
          setSelectedConfigId(data[0].id);
          resolvedConfig = data[0];
        }
      }
      
      return { configs: data || [], resolvedConfig };
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      return { configs: [], resolvedConfig: null };
    }
  };

  // Watch for configuration changes and recalculate quantities
  useEffect(() => {
    if (selectedConfigId && allInventoryItems.length > 0) {
      console.log('Configuration changed, recalculating recommended quantities...');
      recalculateAllRecommendedQuantities();
    }
  }, [selectedConfigId]);

  // Batch calculate recommended quantities for multiple items in a SINGLE edge function call
  // This prevents overwhelming the edge function with many simultaneous requests
  // IMPORTANT: Pass resolvedConfig explicitly to avoid race conditions with React state
  const calculateBatchRecommendedQuantities = async (
    items: { id: string; table_name: string }[],
    resolvedConfig?: any // Pass config explicitly to avoid state race conditions
  ): Promise<Map<string, { quantity: number; source: 'edge' | 'fallback'; error?: string }>> => {
    const results = new Map<string, { quantity: number; source: 'edge' | 'fallback'; error?: string }>();
    
    if (items.length === 0) {
      return results;
    }

    // Use passed config OR fall back to state (for manual recalculation button)
    const config = resolvedConfig || availableConfigs.find(c => c.id === selectedConfigId);
    if (!config) {
      console.warn('⚠️ No config found for ID:', selectedConfigId, 'and no resolvedConfig passed');
      items.forEach(item => {
        results.set(item.id, { quantity: 1, source: 'fallback', error: 'No config available' });
      });
      return results;
    }

    console.log(`🚀 Batch calculating ${items.length} items with config:`, {
      id: config.id,
      name: config.config_name,
      method: config.calculation_method,
    });

    // Use direct fetch instead of supabase.functions.invoke to avoid client issues
    const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';

    try {
      // Get auth token for authenticated request
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      // Prepare batch request
      const batchItems = items.map(item => ({
        inventory_id: item.id,
        inventory_type: item.table_name === 'asin_inventory' ? 'asin' : 'sku',
      }));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-replenishment-quantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          items: batchItems,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error(`Edge function returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const resultsArray = data?.results;
      if (!Array.isArray(resultsArray)) {
        throw new Error(`Unexpected edge response: ${JSON.stringify(data)}`);
      }

      // Process batch results
      console.log(`✅ Batch calculation successful: ${resultsArray.length} results`);

      resultsArray.forEach((result: any) => {
        const minQty = config.min_order_quantity || 1;
        if (result.error) {
          results.set(result.inventory_id, {
            quantity: result.recommended_quantity || minQty,
            source: 'fallback',
            error: result.error,
          });
        } else {
          results.set(result.inventory_id, {
            quantity: result.recommended_quantity || minQty,
            source: 'edge',
          });
        }
      });

      // Handle any items not in results (shouldn't happen, but safety)
      items.forEach(item => {
        if (!results.has(item.id)) {
          results.set(item.id, {
            quantity: config.min_order_quantity || 1,
            source: 'fallback',
            error: 'Missing from batch results',
          });
        }
      });

      return results;
    } catch (error: any) {
      console.error('❌ Batch calculation error:', error);
      
      // Fall back to simple calculation for all items
      console.warn('⚠️ Edge function failed, using fallback calculation');
      
      for (const item of items) {
        const fallbackQty = await calculateSimpleQuantity({
          id: item.id,
          table_name: item.table_name,
          identifier: '',
          current_quantity: 0,
          status: '',
          days_since_last_restock: null,
        } as RestockItem);
        results.set(item.id, { 
          quantity: fallbackQty, 
          source: 'fallback', 
          error: error?.message || 'Batch calculation failed' 
        });
      }
      
      return results;
    }
  };

  // Legacy single-item calculation (kept for backward compatibility)
  const calculateRecommendedQuantity = async (item: RestockItem): Promise<{ quantity: number; source: 'edge' | 'fallback'; error?: string }> => {
    const results = await calculateBatchRecommendedQuantities([{ id: item.id, table_name: item.table_name }]);
    return results.get(item.id) || { quantity: 1, source: 'fallback', error: 'Unknown error' };
  };

  // Simple fallback calculation
  const calculateSimpleQuantity = async (item: RestockItem): Promise<number> => {
    const config = availableConfigs.find(c => c.id === selectedConfigId);
    const minQty = config?.min_order_quantity || 1;
    
    try {
      let stockChangesQuery;
      if (item.table_name === 'asin_inventory') {
        stockChangesQuery = (supabase as any)
          .from('stock_changes')
          .select('change_amount')
          .eq('inventory_id', item.id)
          .eq('inventory_type', 'asin')
          .lt('change_amount', 0);
      } else {
        stockChangesQuery = (supabase as any)
          .from('stock_changes')
          .select('change_amount')
          .eq('inventory_id', item.id)
          .eq('inventory_type', 'sku')
          .lt('change_amount', 0);
      }

      const { data: stockChanges } = await stockChangesQuery;

      if (stockChanges && stockChanges.length > 0) {
        const unitsSold = stockChanges.reduce(
          (sum: number, change: any) => sum + Math.abs(change.change_amount),
          0
        );
        const calculated = Math.ceil(unitsSold / 2);
        return Math.max(minQty, calculated);
      }

      return minQty;
    } catch (error) {
      console.error('Error in simple calculation:', error);
      return minQty;
    }
  };

  // Recalculate recommended quantities for items that need ordering (not already ordered)
  // Uses BATCH processing - single edge function call for all items
  const recalculateAllRecommendedQuantities = async () => {
    if (!selectedConfigId || allInventoryItems.length === 0) {
      toast({
        title: "No configuration selected",
        description: "Please select a calculation configuration first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCalculating(true);
      setCalculationProgress(0);
      setCalculatedItems(0);
      
      // Filter out already ordered items - they don't need recalculation
      const itemsNeedingCalculation = allInventoryItems.filter(
        item => item.status !== 'ordered'
      );
      const skippedOrderedCount = allInventoryItems.filter(item => item.status === 'ordered').length;
      
      const config = availableConfigs.find(c => c.id === selectedConfigId);
      console.log('🔄 Starting BATCH recalculation with config:', {
        id: selectedConfigId,
        name: config?.config_name,
        method: config?.calculation_method,
        lookback_days: config?.lookback_days,
        safety_stock_days: config?.safety_stock_days,
        lead_time_days: config?.lead_time_days,
      });
      console.log(`📊 Items needing calculation: ${itemsNeedingCalculation.length} (skipping ${skippedOrderedCount} already ordered)`);
      
      const totalItems = itemsNeedingCalculation.length;
      
      // Show initial progress
      setCalculatedItems(0);
      setCalculationProgress(10); // 10% for starting

      // Prepare items for batch calculation
      const batchItems = itemsNeedingCalculation.map(item => ({
        id: item.id,
        table_name: 'asin_inventory' as const,
      }));

      // SINGLE batch call instead of 66+ individual calls
      console.log(`🚀 Sending SINGLE batch request for ${batchItems.length} items`);
      setCalculationProgress(20);
      
      const batchResults = await calculateBatchRecommendedQuantities(batchItems);
      
      setCalculationProgress(80);
      
      // Process results and track stats
      let edgeSuccessCount = 0;
      let fallbackCount = 0;
      let errorCount = 0;
      let lastError: string | null = null;
      
      const updatedCalculatedItems: AllInventoryItem[] = itemsNeedingCalculation.map(item => {
        const result = batchResults.get(item.id);
        
        if (result) {
          if (result.source === 'edge') {
            edgeSuccessCount++;
          } else {
            fallbackCount++;
            if (result.error) {
              lastError = result.error;
            }
          }
          return { ...item, recommended_reorder_quantity: result.quantity };
        } else {
          errorCount++;
          lastError = 'Missing from batch results';
          return item;
        }
      });
      
      setCalculatedItems(totalItems);
      setCalculationProgress(90);
      
      // Merge: keep ordered items unchanged, update the rest
      const orderedItemsUnchanged = allInventoryItems.filter(item => item.status === 'ordered');
      const updatedAllItems = [...updatedCalculatedItems, ...orderedItemsUnchanged];
      
      // Update calculation stats
      setCalculationStats({
        edgeSuccessCount,
        fallbackCount,
        errorCount,
        lastError,
      });
      
      // Force state updates
      setAllInventoryItems([...updatedAllItems]);
      
      // Update restock and out-of-stock items from the calculated results
      const updatedRestockItems = restockItems.map(item => {
        const calculated = updatedCalculatedItems.find(c => c.id === item.id);
        return calculated 
          ? { ...item, recommended_reorder_quantity: calculated.recommended_reorder_quantity }
          : item;
      });
      
      const updatedOutOfStockItems = outOfStockItems.map(item => {
        const calculated = updatedCalculatedItems.find(c => c.id === item.id);
        return calculated 
          ? { ...item, recommended_reorder_quantity: calculated.recommended_reorder_quantity }
          : item;
      });
      
      setRestockItems([...updatedRestockItems]);
      setOutOfStockItems([...updatedOutOfStockItems]);
      setLastCalculatedAt(new Date());
      
      const configName = availableConfigs.find(c => c.id === selectedConfigId)?.config_name || 'Unknown';
      const skippedMsg = skippedOrderedCount > 0 ? ` (skipped ${skippedOrderedCount} already ordered)` : '';
      
      // Show detailed toast with calculation sources
      const edgeMsg = edgeSuccessCount > 0 ? `${edgeSuccessCount} via config` : '';
      const fallbackMsg = fallbackCount > 0 ? `${fallbackCount} fallback` : '';
      const errorMsg = errorCount > 0 ? `${errorCount} errors` : '';
      const details = [edgeMsg, fallbackMsg, errorMsg].filter(Boolean).join(', ');
      
      toast({
        title: fallbackCount > 0 || errorCount > 0 ? "⚠️ Quantities Updated (with issues)" : "✅ Quantities Updated",
        description: `Calculated ${totalItems} items${skippedMsg}. ${details}`,
        variant: fallbackCount > 0 || errorCount > 0 ? "default" : "default",
      });
      
      // Show warning if all used fallback
      if (edgeSuccessCount === 0 && totalItems > 0) {
        const errorHint = lastError
          ? `Last error: ${lastError}`
          : 'Check browser console for errors.';

        toast({
          title: "⚠️ Edge Function Not Working",
          description: `All ${totalItems} items used fallback calculation. ${errorHint}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Error recalculating quantities:', error);
      setCalculationStats(prev => ({
        ...prev,
        lastError: error.message || 'Unknown error',
      }));
      toast({
        title: "Error",
        description: "Failed to recalculate recommended quantities",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
      setCalculationProgress(100);
    }
  };

  const loadRestockItems = async () => {
    try {
      console.log('Loading restock items for country:', selectedCountry);

      // Get ASIN inventory items that are eligible for restock (excluding non-source items)
      const {
        data: nonSourceData
      } = await ((supabase as any).from('non_source_items').select('asin, serial_number').eq('country', selectedCountry));
      const nonSourceIdentifiers = new Set(((nonSourceData as any) || []).map((item: any) => `${item.asin}-${item.serial_number}`));
      const asinQuery = (supabase as any).from('asin_inventory').select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added, eligible_for_restock, title').eq('country', selectedCountry).eq('eligible_for_restock', true).eq('quantity', 0).neq('status', 'no-stock').neq('status', 'ordered');
      const [asinResult] = await Promise.all([asinQuery]);
      if (asinResult.error) throw asinResult.error;

      // Get last sale dates and total sold units from stock_changes
      const inventoryIds = ((asinResult.data as any) || []).map((item: any) => item.id);
      const {
        data: stockChanges
      } = await ((supabase as any).from('stock_changes').select('inventory_id, created_at, change_amount').in('inventory_id', inventoryIds).lt('change_amount', 0).order('created_at', {
        ascending: false
      }));

      // Create a map of inventory_id to last sale date and total sold units
      const lastSaleDates = new Map();
      const totalSoldUnits = new Map();
      ((stockChanges as any) || []).forEach((change: any) => {
        if (!lastSaleDates.has(change.inventory_id)) {
          lastSaleDates.set(change.inventory_id, change.created_at);
        }
        // Sum up all negative changes (sales) as positive numbers
        const currentTotal = totalSoldUnits.get(change.inventory_id) || 0;
        totalSoldUnits.set(change.inventory_id, currentTotal + Math.abs(change.change_amount));
      });

      console.log('📊 Ready to Order - Total Sold Units:', {
        itemsQueried: inventoryIds.length,
        stockChangesFound: ((stockChanges as any) || []).length,
        itemsWithSales: totalSoldUnits.size,
        sampleSoldUnits: Array.from(totalSoldUnits.entries()).slice(0, 5)
      });

      // Process ASIN items only (excluding non-source items)
      const asinItems = ((asinResult.data as any) || []).filter((item: any) => !nonSourceIdentifiers.has(`${item.asin}-${item.serial_number}`)).map((item: any) => {
        const lastSaleDate = lastSaleDates.get(item.id) || item.date_sold;
        return {
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
          asin: item.asin,
          sku: item.sku,
          serial_number: item.serial_number,
          title: item.title,
          current_quantity: item.quantity,
          table_name: 'asin_inventory',
          status: item.status,
          date_sold: lastSaleDate,
          last_restock_date: item.last_restock_date,
          days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          date_added: item.date_added,
          total_sold_units: totalSoldUnits.get(item.id) || 0
        };
      });
      
      // Calculate recommended quantities using BATCH processing (single edge function call)
      const batchItems = asinItems.map(item => ({ id: item.id, table_name: item.table_name }));
      console.log(`🚀 Batch calculating ${batchItems.length} restock items`);
      
      const batchResults = await calculateBatchRecommendedQuantities(batchItems);
      
      const itemsWithRecommendedQty = asinItems.map(item => {
        const result = batchResults.get(item.id);
        return { ...item, recommended_reorder_quantity: result?.quantity || 1 };
      });
      
      console.log('Processed restock items with recommended quantities:', itemsWithRecommendedQty);
      setRestockItems(itemsWithRecommendedQty);
      console.log('Set restock items for', selectedCountry, ':', itemsWithRecommendedQty.length, 'items');
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
  // Accepts resolvedConfig to avoid race conditions with React state
  const loadAllInventoryItems = async (resolvedConfig?: any) => {
    try {
      console.log('Starting loadAllInventoryItems for country:', selectedCountry);
      const [asinAll] = await Promise.all([(supabase as any).from('asin_inventory').select('id, asin, serial_number, quantity, ordered_quantity, status, sku, last_restock_date, date_sold, date_added, notes, eligible_for_restock, title, ordered_at, sunsky_order_number, restock_quantity, velocity_order_ref').eq('country', selectedCountry).eq('eligible_for_restock', true).eq('quantity', 0)]);

      // Get non-source items to exclude them
      const {
        data: nonSourceData
      } = await ((supabase as any).from('non_source_items').select('asin, serial_number').eq('country', selectedCountry));
      const nonSourceIdentifiers = new Set(((nonSourceData as any) || []).map((item: any) => `${item.asin}-${item.serial_number}`));
      if (asinAll.error) {
        console.error('ASIN query error:', asinAll.error);
        throw asinAll.error;
      }
      console.log('Raw ASIN data:', asinAll.data);

      // Process ASIN items into AllInventoryItem format (excluding non-source items)
      const asinItemsRaw = ((asinAll.data as any) || []).filter((item: any) => 
        !nonSourceIdentifiers.has(`${item.asin}-${item.serial_number}`)
      );

      // Calculate recommended quantities using BATCH processing (single edge function call)
      // Pass resolvedConfig to avoid state race conditions
      const batchItems = asinItemsRaw.map((item: any) => ({ id: item.id, table_name: 'asin_inventory' }));
      console.log(`🚀 Batch calculating ${batchItems.length} inventory items`);
      
      const batchResults = await calculateBatchRecommendedQuantities(batchItems, resolvedConfig);

      const asinItems: AllInventoryItem[] = asinItemsRaw.map((item: any) => {
        const result = batchResults.get(item.id);
        return {
          id: item.id,
          item_type: 'ASIN' as const,
          asin: item.asin,
          sku: item.sku,
          serial_number: item.serial_number,
          title: item.title,
          quantity: item.quantity,
          ordered_quantity: item.ordered_quantity,
          restock_quantity: item.restock_quantity,
          recommended_reorder_quantity: result?.quantity || 1,
          status: item.status,
          last_sold_date: item.date_sold,
          last_order_date: item.last_restock_date,
          days_since_ordered: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          date_added: item.date_added,
          notes: item.notes,
          ordered_at: item.ordered_at,
          sunsky_order_number: item.sunsky_order_number,
          velocity_order_ref: item.velocity_order_ref
        };
      });
      const allInventoryItems = [...asinItems];
      console.log('Processed inventory items:', allInventoryItems);
      console.log('Total items count:', allInventoryItems.length);

      // Separate items based on eligibility for restocking
      const allEligibleItems = allInventoryItems.filter(item => item.status !== 'ordered');

      // Get stock changes for ALL items (including ordered) to calculate total sold units and last sale dates
      const allItemIdsForSales = allInventoryItems.map(item => item.id);
      const { data: stockChanges } = await (supabase as any)
        .from('stock_changes')
        .select('inventory_id, change_amount, created_at')
        .in('inventory_id', allItemIdsForSales)
        .lt('change_amount', 0)
        .order('created_at', { ascending: false });

      // Create map of total sold units and last sale date per item
      const totalSoldMap = new Map<string, number>();
      const lastSaleDateMap = new Map<string, string>();
      (stockChanges || []).forEach((change: any) => {
        // Track total sold units
        const current = totalSoldMap.get(change.inventory_id) || 0;
        totalSoldMap.set(change.inventory_id, current + Math.abs(change.change_amount));
        
        // Track last sale date (most recent negative change)
        if (!lastSaleDateMap.has(change.inventory_id)) {
          lastSaleDateMap.set(change.inventory_id, change.created_at);
        }
      });

      console.log('📊 Total Sold Units Summary:', {
        itemsQueried: allItemIdsForSales.length,
        stockChangesFound: (stockChanges || []).length,
        itemsWithSales: totalSoldMap.size,
        sampleSoldUnits: Array.from(totalSoldMap.entries()).slice(0, 5)
      });

      // 1. Items with status='no-stock' → Out of Stock tab
      const noStockItems = allEligibleItems.filter(item => item.status === 'no-stock').map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: item.quantity,
        ordered_quantity: item.ordered_quantity,
        restock_quantity: item.restock_quantity,
        recommended_reorder_quantity: item.recommended_reorder_quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: lastSaleDateMap.get(item.id) || item.last_sold_date,
        last_restock_date: item.last_order_date,
        days_since_last_restock: item.days_since_ordered,
        date_added: item.date_added,
        total_sold_units: totalSoldMap.get(item.id) || 0,
        ordered_at: item.ordered_at,
        sunsky_order_number: item.sunsky_order_number,
        notes: item.notes,
        velocity_order_ref: item.velocity_order_ref
      }));

      // 2. Items with valid SKU and NOT 'no-stock' → Ready to Order tab
      const restockNeeded = allEligibleItems.filter(item => {
        if (item.status === 'no-stock') return false;
        // Check if item has valid SKU for ordering
        const identifier = item.item_type === 'ASIN' ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` : `SKU: ${item.sku} (${item.serial_number})`;
        const extractedSku = extractSkuFromIdentifier(identifier);
        const extractedModel = extractModelFromIdentifier(identifier);
        return !!(extractedSku || extractedModel); // Only include items that can be ordered
      }).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: item.quantity,
        ordered_quantity: item.ordered_quantity,
        restock_quantity: item.restock_quantity,
        recommended_reorder_quantity: item.recommended_reorder_quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: lastSaleDateMap.get(item.id) || item.last_sold_date,
        last_restock_date: item.last_order_date,
        days_since_last_restock: item.days_since_ordered,
        date_added: item.date_added,
        total_sold_units: totalSoldMap.get(item.id) || 0,
        ordered_at: item.ordered_at,
        sunsky_order_number: item.sunsky_order_number,
        notes: item.notes,
        velocity_order_ref: item.velocity_order_ref
      }));

      // 3. Items without valid SKU and NOT 'no-stock' → Out of Stock tab (no SKU to order)
      const outOfStockNoSku = allEligibleItems.filter(item => {
        if (item.status === 'no-stock') return false;
        const identifier = item.item_type === 'ASIN' ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` : `SKU: ${item.sku} (${item.serial_number})`;
        const extractedSku = extractSkuFromIdentifier(identifier);
        const extractedModel = extractModelFromIdentifier(identifier);
        return !(extractedSku || extractedModel); // Only include items that cannot be ordered
      }).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: item.quantity,
        ordered_quantity: item.ordered_quantity,
        restock_quantity: item.restock_quantity,
        recommended_reorder_quantity: item.recommended_reorder_quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: lastSaleDateMap.get(item.id) || item.last_sold_date,
        last_restock_date: item.last_order_date,
        days_since_last_restock: item.days_since_ordered,
        date_added: item.date_added,
        total_sold_units: totalSoldMap.get(item.id) || 0,
        ordered_at: item.ordered_at,
        sunsky_order_number: item.sunsky_order_number,
        notes: item.notes,
        velocity_order_ref: item.velocity_order_ref
      }));

      // 4. Combine no-stock items with items lacking SKU for Out of Stock tab
      const outOfStockOnly = [...noStockItems, ...outOfStockNoSku];
      const orderedItemsData = allInventoryItems.filter(item => item.status === 'ordered').map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: item.quantity,
        ordered_quantity: item.ordered_quantity,
        restock_quantity: item.restock_quantity,
        recommended_reorder_quantity: item.recommended_reorder_quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: lastSaleDateMap.get(item.id) || item.last_sold_date,
        last_restock_date: item.last_order_date,
        days_since_last_restock: item.days_since_ordered,
        date_added: item.date_added,
        total_sold_units: totalSoldMap.get(item.id) || 0,
        ordered_at: item.ordered_at,
        sunsky_order_number: item.sunsky_order_number,
        notes: item.notes,
        velocity_order_ref: item.velocity_order_ref
      }));
      console.log('Setting allInventoryItems state with:', allInventoryItems.length, 'items');
      setAllInventoryItems(allInventoryItems);
      setRestockItems(restockNeeded);
      setOrderedItems(orderedItemsData);
      setOutOfStockItems(outOfStockOnly);
      console.log('State updated - allInventoryItems length:', allInventoryItems.length);
      console.log('Items needing restock (can be ordered):', restockNeeded.length);
      console.log('Items out of stock (cannot be ordered):', outOfStockOnly.length);
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
      filtered = filtered.filter(item => item.asin?.toLowerCase().includes(searchLower) || item.sku?.toLowerCase().includes(searchLower) || item.serial_number?.toLowerCase().includes(searchLower));
      console.log('After search filter:', filtered.length);
    }

    // Header filters
    if (headerFilters.type && headerFilters.type !== 'all') {
      filtered = filtered.filter(item => item.item_type.toLowerCase().includes(headerFilters.type.toLowerCase()));
    }
    if (headerFilters.asin) {
      filtered = filtered.filter(item => item.asin?.toLowerCase().includes(headerFilters.asin.toLowerCase()));
    }
    if (headerFilters.sku) {
      filtered = filtered.filter(item => item.sku?.toLowerCase().includes(headerFilters.sku.toLowerCase()));
    }
    if (headerFilters.serial) {
      filtered = filtered.filter(item => item.serial_number?.toLowerCase().includes(headerFilters.serial.toLowerCase()));
    }
    if (headerFilters.status && headerFilters.status !== 'all') {
      filtered = filtered.filter(item => item.status.toLowerCase().includes(headerFilters.status.toLowerCase()));
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
          case 'in-stock':
            return item.quantity > 0;
          case 'sold':
            return item.status === 'sold' || item.quantity === 0;
          default:
            return true;
        }
      });
      console.log('After stock status filter:', filtered.length);
    }

    // Order status filter
    if (filters.orderStatus !== 'all') {
      filtered = filtered.filter(item => {
        const daysSinceOrder = item.days_since_ordered;
        switch (filters.orderStatus) {
          case 'ordered':
            return daysSinceOrder !== null && daysSinceOrder >= 0;
          case 'not-ordered':
            return daysSinceOrder === null;
          case 'overdue':
            return daysSinceOrder !== null && daysSinceOrder > 30;
          default:
            return true;
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
        } else if (aValue && bValue && typeof aValue === 'string' && typeof bValue === 'string' && (sortConfig.key === 'last_sold_date' || sortConfig.key === 'last_order_date' || sortConfig.key === 'date_added')) {
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
        lastOrderTo: null
      },
      stockRange: {
        min: null,
        max: null
      },
      daysSinceOrderRange: {
        min: null,
        max: null
      }
    });
    setSortConfig({
      key: null,
      direction: 'asc'
    });
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
      'Serial Number': item.serial_number ? `="${item.serial_number}"` : 'N/A',
      'Quantity': item.quantity,
      'Status': item.status,
      'Last Sold Date': item.last_sold_date ? format(new Date(item.last_sold_date), 'yyyy-MM-dd') : 'Never',
      'Last Order Date': item.last_order_date ? format(new Date(item.last_order_date), 'yyyy-MM-dd') : 'Never',
      'Days Since Order': item.days_since_ordered ?? 'N/A',
      'Date Added': format(new Date(item.date_added), 'yyyy-MM-dd'),
      'Notes': item.notes || ''
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const activeFilters = getActiveFiltersCount();
    const filename = `inventory-${activeFilters > 0 ? 'filtered-' : ''}${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.download = filename;
    link.click();
    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} items ${activeFilters > 0 ? '(filtered)' : ''}`
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
      const [asinOrdered] = await Promise.all([(supabase as any).from('asin_inventory').select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added, ordered_at, ordered_quantity, restock_quantity, title, sunsky_order_number, velocity_order_ref').eq('country', selectedCountry).eq('status', 'ordered').eq('quantity', 0).eq('eligible_for_restock', true)]);
      if (asinOrdered.error) throw asinOrdered.error;
      
      // Get total sold units for each item
      const inventoryIds = ((asinOrdered.data as any) || []).map((item: any) => item.id);
      const { data: stockChanges } = await (supabase as any)
        .from('stock_changes')
        .select('inventory_id, change_amount')
        .in('inventory_id', inventoryIds)
        .lt('change_amount', 0);
      
      const totalSoldMap = new Map<string, number>();
      ((stockChanges as any) || []).forEach((change: any) => {
        const currentTotal = totalSoldMap.get(change.inventory_id) || 0;
        totalSoldMap.set(change.inventory_id, currentTotal + Math.abs(change.change_amount));
      });

      console.log('📊 Ordered Items - Total Sold Units:', {
        itemsQueried: inventoryIds.length,
        stockChangesFound: ((stockChanges as any) || []).length,
        itemsWithSales: totalSoldMap.size,
        sampleSoldUnits: Array.from(totalSoldMap.entries()).slice(0, 5)
      });
      
      const orderedItemsData = [...((asinOrdered.data as any) || []).map((item: any) => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        title: item.title,
        current_quantity: item.quantity,
        ordered_quantity: item.ordered_quantity,
        restock_quantity: item.restock_quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
        date_added: item.date_added,
        ordered_at: item.ordered_at,
        sunsky_order_number: item.sunsky_order_number,
        velocity_order_ref: item.velocity_order_ref,
        total_sold_units: totalSoldMap.get(item.id) || 0
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
      const [asinRestocked] = await Promise.all([(supabase as any).from('asin_inventory').select('id, asin, serial_number, quantity, status').eq('country', selectedCountry).eq('status', 'ordered').gt('quantity', 0)]);
      if (asinRestocked.error) throw asinRestocked.error;
      const restockedItems = [...((asinRestocked.data as any) || [])];
      if (restockedItems.length > 0) {
        // Update status to 'in-stock' for these items
        const asinUpdates = ((asinRestocked.data as any) || []).map((item: any) => (supabase as any).from('asin_inventory').update({
          status: 'in-stock'
        }).eq('id', item.id)) || [];

        // Execute all updates
        await Promise.all([...asinUpdates]);

        // Remove from local ordered items state
        const restockedIds = restockedItems.map((item: any) => item.id);
        setOrderedItems(prev => prev.filter(item => !restockedIds.includes(item.id)));
        if (restockedItems.length > 0) {
          toast({
            title: "Items Restocked",
            description: `${restockedItems.length} ordered items are now back in stock and removed from restock management`
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
        let asinSalesQuery = (supabase as any).from('asin_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry) // Filter by selected country
        .eq('eligible_for_restock', true).gte('date_sold', startDate.toISOString()).limit(100000); // Explicitly set high limit to override default 1000
        let asinRestockQuery = (supabase as any).from('asin_inventory').select('restock_quantity').eq('country', selectedCountry) // Filter by selected country
        .eq('eligible_for_restock', true).not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString()).limit(100000); // Explicitly set high limit to override default 1000
        const [asinSalesData, asinRestockData] = await Promise.all([asinSalesQuery, asinRestockQuery]);
        if (asinSalesData.error) throw asinSalesData.error;
        if (asinRestockData.error) throw asinRestockData.error;
        const asinSoldCount = ((asinSalesData.data as any) || []).length || 0;
        const totalSold = asinSoldCount;
        const asinRestockedQty = ((asinRestockData.data as any) || []).reduce((sum: number, item: any) => sum + (item.restock_quantity || 0), 0) || 0;
        const totalRestocked = asinRestockedQty;
        salesAnalytics.push({
          period: `${days}d`,
          asin_sold: asinSoldCount,
          total_sold: totalSold,
          asin_restocked: asinRestockedQty,
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
  // Accepts resolvedConfig to avoid race conditions with React state
  const loadAllData = async (resolvedConfig?: any) => {
    setLoading(true);
    try {
      await loadAllInventoryItems(resolvedConfig);

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
  // Note: pendingItems kept for legacy compatibility but Select All uses filteredReadyToOrder
  const pendingItems = filteredRestockItems;

  // Bulk selection handlers - use filteredReadyToOrder (what user actually sees)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = filteredReadyToOrder.map(item => item.id);
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
        return (supabase as any).from('asin_inventory').update({
          status: 'ordered'
        }).eq('id', itemId);
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

  // Mark item as non-source (move to non-source items)
  const markAsNonSource = async (itemId: string) => {
    const item = restockItems.find(i => i.id === itemId) || outOfStockItems.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      toast({
        title: "Error",
        description: "Item not found",
        variant: "destructive"
      });
      return;
    }
    try {
      // Get the full item details from database
      const {
        data: inventoryItem,
        error: fetchError
      } = await ((supabase as any).from('asin_inventory').select('*').eq('id', itemId).single());
      if (fetchError) throw fetchError;

      // Insert into non_source_items table
      const {
        error: insertError
      } = await supabase.from('non_source_items').insert({
        user_id: (inventoryItem as any).user_id,
        asin: (inventoryItem as any).asin,
        sku: (inventoryItem as any).sku,
        title: (inventoryItem as any).title,
        serial_number: (inventoryItem as any).serial_number,
        country: (inventoryItem as any).country,
        reason: 'Marked as non-source item - not to be restocked'
      } as any);
      if (insertError) throw insertError;

      // Mark as not eligible for restock
      const {
        error: updateError
      } = await ((supabase as any).from('asin_inventory').update({
        eligible_for_restock: false
      }).eq('id', itemId));
      if (updateError) throw updateError;

      // Reload data to reflect changes
      await loadAllInventoryItems();
      await loadNonSourceItems();
      toast({
        title: "Item Moved to Non-Source",
        description: "Item will no longer appear in restock lists"
      });
    } catch (error: any) {
      console.error('Error marking item as non-source:', error);
      toast({
        title: "Error",
        description: `Failed to mark as non-source: ${error.message}`,
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
      updateResult = await ((supabase as any).from('asin_inventory').update({
        status: 'ordered'
      }).eq('id', itemId));
      console.log('ASIN update result:', updateResult);
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
        variant: "destructive"
      });
      return;
    }

    // Convert selected restock items to the format expected by SunskyOrderDialog
    // Use filteredReadyToOrder (what user sees) instead of pendingItems (legacy filter)
    const selectedRestockItems = filteredReadyToOrder.filter(item => selectedItems.has(item.id));

    // Calculate quantities based on units sold after last restock
    const orderItems = await Promise.all(selectedRestockItems.map(async item => {
      console.log('Processing item for Sunsky order:', item.identifier);
      const extractedSku = extractSkuFromIdentifier(item.identifier);
      const extractedModel = extractModelFromIdentifier(item.identifier);
      const sunskySku = extractedSku || extractedModel;
      console.log('Extracted values:', {
        identifier: item.identifier,
        extractedSku,
        extractedModel,
        sunskySku
      });

      // If no SKU is found, skip this item
      if (!sunskySku) {
        console.log('No valid SKU found for item:', item.identifier);
        return null;
      }

      // Use the advanced calculated recommended quantity if available
      // Otherwise fall back to simple calculation
      let calculatedQty = item.recommended_reorder_quantity || 1;
      let quantitySource: 'advanced' | 'simple' = 'advanced';

      if (!item.recommended_reorder_quantity) {
        try {
          // Fallback: Query stock changes to calculate units sold
          let stockChangesQuery;
          if (item.table_name === 'asin_inventory') {
            stockChangesQuery = (supabase as any).from('stock_changes').select('change_amount, created_at').eq('inventory_id', item.id).eq('inventory_type', 'asin').lt('change_amount', 0);
          } else {
            stockChangesQuery = (supabase as any).from('stock_changes').select('change_amount, created_at').eq('inventory_id', item.id).eq('inventory_type', 'sku').lt('change_amount', 0);
          }

          const { data: stockChanges } = await stockChangesQuery;
          if (stockChanges && stockChanges.length > 0) {
            const unitsSold = stockChanges.reduce((sum, change) => sum + Math.abs(change.change_amount), 0);
            calculatedQty = Math.max(1, Math.ceil(unitsSold / 2));
          }
          quantitySource = 'simple';
        } catch (error) {
          console.error('Error calculating quantity for item:', item.id, error);
          calculatedQty = 1;
          quantitySource = 'simple';
        }
      }

      // Ensure minimum quantity of 1
      calculatedQty = Math.max(1, calculatedQty);
      return {
        id: item.id,
        po_number: `RESTOCK-${Date.now()}`,
        // Generate a unique PO number for restocking
        sku_code: extractedSku,
        asin: '',
        // Don't use ASIN for Sunsky search
        quantity: calculatedQty,
        status: 'pending',
        model_number: extractedModel,
        title: `Restock for ${item.identifier}`,
        notes: sunskySku ? `Replenishment order - Qty: ${calculatedQty} (${quantitySource} calculation) - Search by ${extractedSku ? 'SKU' : 'Model'}: ${sunskySku}` : `Replenishment order for out of stock item - No valid Sunsky SKU found (contains Amazon ASIN)`,
        recommended_reorder_quantity: item.recommended_reorder_quantity,
        quantity_source: quantitySource,
        sunsky_sku: sunskySku,
        // Use valid SKU/model, avoiding Amazon ASINs
        itemNo: sunskySku,
        // Add itemNo field for SunskyOrderDialog compatibility
        qty: calculatedQty
      };
    }));

    // Filter out null items (items without valid SKUs)
    const validOrderItems = orderItems.filter(item => item !== null);
    if (validOrderItems.length === 0) {
      toast({
        title: "No Valid SKUs Found",
        description: "The selected items contain only Amazon ASINs which are not compatible with Sunsky. Please select items with valid SKU or model numbers.",
        variant: "destructive"
      });
      return;
    }
    if (validOrderItems.length < selectedRestockItems.length) {
      toast({
        title: `${selectedRestockItems.length - validOrderItems.length} Items Skipped`,
        description: "Some items were skipped because they only contain Amazon ASINs. Only items with valid SKUs will be processed.",
        variant: "default"
      });
    }
    setSunskyOrderItems(validOrderItems);
    setSunskyDialogOpen(true);
  };

  // Handle unavailable items from Sunsky
  const handleItemsUnavailable = async (unavailableItems: any[]) => {
    console.log('Moving unavailable items to out of stock tab:', unavailableItems);
    try {
      // Extract the original restock item IDs from the unavailable Sunsky items
      const unavailableIds = new Set<string>();
      unavailableItems.forEach(unavailableItem => {
        // Find the corresponding restock item by matching the sunsky_sku or itemNo
        const matchingRestockItem = pendingItems.find(item => {
          const extractedSku = extractSkuFromIdentifier(item.identifier);
          const extractedModel = extractModelFromIdentifier(item.identifier);
          const sunskySku = extractedSku || extractedModel;
          return sunskySku === unavailableItem.itemNo || sunskySku === unavailableItem.sunsky_sku;
        });
        if (matchingRestockItem) {
          unavailableIds.add(matchingRestockItem.id);
        }
      });

      if (unavailableIds.size === 0) {
        console.log('No matching items found to move');
        return;
      }

      // Update database status to 'no-stock' for unavailable items
      const updatePromises = Array.from(unavailableIds).map(itemId =>
        (supabase as any)
          .from('asin_inventory')
          .update({ 
            status: 'no-stock',
            notes: 'Out of stock in Sunsky catalog'
          })
          .eq('id', itemId)
      );
      
      await Promise.all(updatePromises);

      // Move items from restockItems to outOfStockItems
      const itemsToMove = restockItems.filter(item => unavailableIds.has(item.id));
      const remainingRestockItems = restockItems.filter(item => !unavailableIds.has(item.id));

      // Update the state
      setRestockItems(remainingRestockItems);
      setOutOfStockItems(prev => [...prev, ...itemsToMove]);

      // Clear selection for moved items
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        unavailableIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      toast({
        title: "Items Moved to Out of Stock",
        description: `${itemsToMove.length} items unavailable in Sunsky catalog have been marked as 'no-stock'`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error moving unavailable items:', error);
      toast({
        title: "Error",
        description: "Failed to move unavailable items to out of stock tab",
        variant: "destructive"
      });
    }
  };
  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    try {
      // Create a map of item IDs to their ordered quantities
      const quantityMap = new Map<string, number>();
      sunskyOrderItems.forEach(orderItem => {
        if (orderItem.id) {
          quantityMap.set(orderItem.id, orderItem.qty || orderItem.quantity || 1);
        }
      });

      // Mark the original inventory items as ordered with their quantities
      const updatePromises = Array.from(selectedItems).map(async itemId => {
        const item = restockItems.find(i => i.id === itemId);
        if (!item) return;
        
        const orderedQty = quantityMap.get(itemId) || 1;
        
        return (supabase as any).from('asin_inventory').update({
          status: 'ordered',
          ordered_quantity: orderedQty,
          ordered_at: new Date().toISOString()
        }).eq('id', itemId);
      });
      await Promise.all(updatePromises);
      toast({
        title: "Sunsky Order Placed Successfully",
        description: `Order ${orderNumber} has been placed. Selected items marked as ordered. The order may take a few minutes to appear in Sunsky Order Tracking.`
      });
      setSelectedItems(new Set());
      setSunskyDialogOpen(false);
      loadRestockItems(); // Refresh data

      // Try to trigger sync after a short delay to give Sunsky time to process
      setTimeout(async () => {
        try {
          console.log('Attempting to sync Sunsky orders after placement...');
          // Note: We could call a sync function here if available
          // For now, just log that manual sync is recommended
        } catch (error) {
          console.log('Auto-sync failed, manual sync may be needed');
        }
      }, 30000); // Wait 30 seconds before attempting sync
    } catch (error) {
      console.error('Error updating items after Sunsky order:', error);
      toast({
        title: "Order Placed but Update Failed",
        description: `Order ${orderNumber} was placed successfully, but failed to update item status.`,
        variant: "destructive"
      });
    }
  };

  // Helper functions to extract identifiers
  const isAmazonAsin = (text: string): boolean => {
    // Amazon ASINs are typically 10 characters and start with B0
    const result = /^B0[A-Z0-9]{8}$/.test(text.trim());
    console.log(`isAmazonAsin check: "${text}" -> ${result}`);
    return result;
  };
  const extractSkuFromIdentifier = (identifier: string): string => {
    console.log(`extractSkuFromIdentifier input: "${identifier}"`);

    // First check for the specific format: "ASIN (serial) | SKU: ACTUAL_SKU"
    const skuMatch = identifier.match(/\|\s*SKU:\s*([^\s|]+)/i);
    if (skuMatch) {
      const foundSku = skuMatch[1].trim();
      console.log(`Found SKU in | SKU: format: "${foundSku}"`);
      return foundSku;
    }

    // Extract SKU from identifier like "SKU123 (serial456)"
    const match = identifier.match(/^([^(]+)/);
    const extracted = match ? match[1].trim() : identifier;
    console.log(`Extracted part before parentheses: "${extracted}"`);

    // Don't return Amazon ASINs as SKUs
    if (isAmazonAsin(extracted)) {
      console.log(`Extracted part is Amazon ASIN, checking other parts: "${extracted}"`);

      // Check if there's a SKU in parentheses or after the ASIN
      const parenthesesMatch = identifier.match(/\(([^)]+)\)/);
      const parenthesesContent = parenthesesMatch ? parenthesesMatch[1].trim() : '';
      console.log(`Parentheses content: "${parenthesesContent}"`);

      // Return parentheses content if it's not an ASIN and looks valid
      if (parenthesesContent && !isAmazonAsin(parenthesesContent) && parenthesesContent.length >= 3) {
        console.log(`Using parentheses content as SKU: "${parenthesesContent}"`);
        return parenthesesContent;
      }
      return '';
    }

    // If the extracted part is too short or looks like a serial number, try the parentheses
    if (extracted.length < 3 || /^\d+$/.test(extracted)) {
      console.log(`Extracted part too short or all digits, checking parentheses: "${extracted}"`);
      const parenthesesMatch = identifier.match(/\(([^)]+)\)/);
      const parenthesesContent = parenthesesMatch ? parenthesesMatch[1].trim() : '';
      console.log(`Parentheses content: "${parenthesesContent}"`);

      // Return parentheses content if it's not an ASIN and looks valid
      if (parenthesesContent && !isAmazonAsin(parenthesesContent) && parenthesesContent.length >= 3) {
        console.log(`Using parentheses content as SKU: "${parenthesesContent}"`);
        return parenthesesContent;
      }
    }
    console.log(`Final SKU result: "${extracted}"`);
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
    if (modelCandidate && /[A-Za-z]/.test(modelCandidate) && modelCandidate.length > 3) {
      return modelCandidate;
    }

    // If no good model found in parentheses, check if the main identifier is a model (not an ASIN)
    const mainPart = identifier.split('(')[0].trim();
    if (mainPart && !isAmazonAsin(mainPart) && /[A-Za-z]/.test(mainPart) && mainPart.length >= 3) {
      return mainPart;
    }

    // As a last resort, return the model candidate if it's not purely numeric and has reasonable length
    if (modelCandidate && modelCandidate.length >= 3 && !/^\d+$/.test(modelCandidate)) {
      return modelCandidate;
    }
    return '';
  };

  // Export data functions
  const exportSalesData = () => {
    const csvContent = [['Period', 'ASIN Sold', 'Total Sold', 'ASIN Restocked', 'Total Restocked', 'Daily Sell Rate'], ...salesData.map(item => [item.period, item.asin_sold, item.total_sold, item.asin_restocked, item.total_restocked, item.sell_rate.toFixed(2)])].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `sales-data-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper function to search/filter items
  const filterItemsBySearch = (items: RestockItem[], searchTerm: string) => {
    if (!searchTerm.trim()) return items;
    const searchLower = searchTerm.toLowerCase();
    return items.filter(item => {
      const identifier = item.identifier.toLowerCase();
      // Extract ASIN, SKU, and serial number from identifier
      const asinMatch = identifier.match(/^([a-z0-9]+)/);
      const skuMatch = identifier.match(/sku:\s*([^\s|]+)/i);
      const serialMatch = identifier.match(/\(([^)]+)\)/);
      const asin = asinMatch ? asinMatch[1] : '';
      const sku = skuMatch ? skuMatch[1] : '';
      const serial = serialMatch ? serialMatch[1] : '';
      return identifier.includes(searchLower) || asin.includes(searchLower) || sku.includes(searchLower) || serial.includes(searchLower);
    });
  };

  // Get paginated items
  const getPaginatedItems = (items: RestockItem[], page: number, perPage: number) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return items.slice(startIndex, endIndex);
  };

  // Extract ASIN from identifier for image lookup
  const extractAsinForImage = (identifier: string): string => {
    const asinMatch = identifier.match(/^([A-Z0-9]{10})/);
    return asinMatch ? asinMatch[1] : '';
  };

  // Filtered and paginated items for each tab
  const filteredReadyToOrder = filterItemsBySearch(pendingItems, readyToOrderSearch);
  const filteredOrdered = filterItemsBySearch(orderedItems, orderedSearch);
  const filteredOutOfStock = filterItemsBySearch(outOfStockItems, outOfStockSearch);
  const filteredNonSource = filterItemsBySearch(nonSourceItems, nonSourceSearch);
  const paginatedReadyToOrder = getPaginatedItems(filteredReadyToOrder, readyToOrderPage, itemsPerPage);
  const paginatedOrdered = getPaginatedItems(filteredOrdered, orderedPage, itemsPerPage);
  const paginatedOutOfStock = getPaginatedItems(filteredOutOfStock, outOfStockPage, itemsPerPage);
  const paginatedNonSource = getPaginatedItems(filteredNonSource, nonSourcePage, itemsPerPage);
  const exportRestockData = () => {
    // Filter items based on search term - use filteredRestockItems to get proper filtered data
    const itemsToExport = filteredRestockItems.filter(item => item.current_quantity === 0 && item.status !== 'ordered');
    const csvContent = [['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Quantity', 'Days Since Restock', 'Status'], ...itemsToExport.map(item => {
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
      return [item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', asin, sku, `="${serialBin}"`,
      // Preserve leading zeros with formula format
      item.current_quantity, item.days_since_last_restock || 'Never', item.status || 'Critical'];
    })].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `restock-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
  };
  const exportOrderedData = () => {
    const itemsToExport = orderedItems.filter(item => item.status === 'ordered');
    const csvContent = [['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Quantity', 'Days Since Restock', 'Order Status', 'Date Marked'], ...itemsToExport.map(item => {
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
      return [item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', asin, sku, `="${serialBin}"`,
      // Preserve leading zeros with formula format
      item.current_quantity, item.days_since_last_restock || 'Never', item.status, new Date().toLocaleDateString()];
    })].map(row => row.join(',')).join('\n');
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

      // Get ASIN data only
      const asinQuery = (supabase as any).from('asin_inventory').select('*').eq('user_id', ((await supabase.auth.getUser()).data.user?.id)).eq('country', selectedCountry).eq('eligible_for_restock', true);
      const [asinResult] = await Promise.all([asinQuery]);
      if (asinResult.error) throw asinResult.error;

      // Process ASIN items only
      const asinItems: TrendsItem[] = ((asinResult.data as any) || []).map((item: any) => {
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

      // Use only ASIN items
      let combinedItems = [...asinItems];
      if (trendsItemType === 'asin') {
        combinedItems = asinItems;
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
    const csvContent = [['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Stock', 'Sold Quantity', 'Sell Rate/Day', 'Last Sold', 'Days Since Restock', 'Stock Status'], ...filteredTrendsItems.map(item => {
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
      return [item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU', asin, sku, `="${serialBin}"`,
      // Preserve leading zeros with formula format
      item.current_quantity, item.sold_quantity, item.sell_rate.toFixed(2), item.last_sold_date ? new Date(item.last_sold_date).toLocaleDateString() : 'Never', item.days_since_last_restock || 'Never', item.current_quantity <= 5 ? 'Critical' : item.current_quantity <= 10 ? 'Low' : 'Good'];
    })].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `trends-analysis-${selectedCountry}-${trendsDateRange}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // AI Forecasting functions
  const generateForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';
      
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-inventory-forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          country: selectedCountry,
          itemType: 'all',
          analysisDepth: 'standard'
        }),
      });

      if (!response.ok) {
        throw new Error(`Edge function returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
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
      const [asinData] = await Promise.all([(supabase as any).from('asin_inventory').select('*').eq('country', selectedCountry).eq('status', 'in-stock').eq('eligible_for_restock', true)]);
      if (asinData.error) throw asinData.error;
      const activeItemsData = [...((asinData.data as any) || []).map((item: any) => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
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
  // Note: For realtime updates, configs are already loaded so state should be settled
  useEffect(() => {
    if (!selectedCountry) return;
    const channels = [supabase.channel('asin-inventory-realtime').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'asin_inventory',
      filter: `country=eq.${selectedCountry}`
    }, async () => {
      // For realtime updates, config state should be settled, so no need to pass explicit config
      // The function will use availableConfigs.find(c => c.id === selectedConfigId)
      loadAllInventoryItems();
      // Check if any ordered items are now back in stock and remove them
      await removeRestockedOrderedItems();
    }), supabase.channel('sku-inventory-realtime').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sku_inventory',
      filter: `country=eq.${selectedCountry}`
    }, async () => {
      // For realtime updates, config state should be settled, so no need to pass explicit config
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
      // Load configurations first and get the resolved config synchronously
      const { resolvedConfig } = await loadConfigs();
      
      if (!resolvedConfig) {
        console.warn('⚠️ No config available after loadConfigs - calculations will use fallback');
      }
      
      // Pass resolved config to avoid state race conditions
      await loadAllData(resolvedConfig);
      const orderedItemsData = await loadOrderedItems();
      setOrderedItems(orderedItemsData);
      await loadNonSourceItems();
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
      {/* Header with refresh button and config selector */}
      {/* Calculation Status Card */}
      <CalculationStatusCard
        configName={availableConfigs.find(c => c.id === selectedConfigId)?.config_name || null}
        activeConfig={availableConfigs.find(c => c.id === selectedConfigId) || null}
        calculationStats={calculationStats}
        isCalculating={isCalculating}
        lastCalculatedAt={lastCalculatedAt}
        calculationProgress={calculationProgress}
        totalItems={allInventoryItems.filter(item => item.status !== 'ordered').length}
        calculatedItems={calculatedItems}
        onRecalculate={recalculateAllRecommendedQuantities}
        onOpenConfig={() => {
          setSelectedConfig(availableConfigs.find(c => c.id === selectedConfigId) || null);
          setConfigDialogOpen(true);
        }}
      />

      {/* Config Selector Row */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Config</span>
          <Select value={selectedConfigId || ''} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue placeholder="Select calculation method" />
            </SelectTrigger>
            <SelectContent>
              {availableConfigs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.config_name}
                  {config.is_default && ' (Default)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedConfig(null);
              setConfigDialogOpen(true);
            }}
            className="gap-1.5 h-8 text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            New
          </Button>
          
          {selectedConfigId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const config = availableConfigs.find(c => c.id === selectedConfigId);
                setConfigToDelete(config);
                setDeleteDialogOpen(true);
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        <div className="flex-1" />
        
        <Button onClick={loadAllData} variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      

      {/* Main Content Tabs */}
      <Tabs defaultValue="restock" className="w-full" onValueChange={(newTab) => {
        trackTabChange({
          category: 'Inventory',
          subcategory: 'Replenishment',
          fromTab: 'restock',
          toTab: newTab,
          tabTitle: newTab === 'restock' ? 'Restock Management' : 'Daily Orders Queue'
        });
      }}>
        <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted rounded-lg">
          <TabsTrigger value="restock" className="text-xs font-semibold rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Restock Management
          </TabsTrigger>
          <TabsTrigger value="velocity" className="text-xs font-semibold rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Daily Orders Queue
          </TabsTrigger>
        </TabsList>


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
              <Tabs defaultValue="critical" className="w-full" onValueChange={(newTab) => {
                trackTabChange({
                  category: 'Inventory',
                  subcategory: 'Replenishment',
                  fromTab: 'critical',
                  toTab: newTab,
                  tabTitle: newTab === 'critical' ? 'Ready to Order' : 
                           newTab === 'ordered' ? 'Ordered' :
                           newTab === 'out-of-stock' ? 'Out of Stock' : 
                           'Non-Source Items'
                });
              }}>
                <TabsList className="grid w-full grid-cols-4 bg-gradient-subtle rounded-xl shadow-elegant">
                  <TabsTrigger value="critical" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ShoppingCart className="w-4 h-4" />
                    Ready to Order ({pendingItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="ordered" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Truck className="w-4 h-4" />
                    Ordered ({orderedItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="out-of-stock" className="flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                    <AlertTriangle className="w-4 h-4" />
                    Out of Stock ({outOfStockItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="non-source" className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                    <XCircle className="w-4 h-4" />
                    Non-Source ({nonSourceItems.length})
                  </TabsTrigger>
                </TabsList>

                {/* Ready to Order Tab */}
                <TabsContent value="critical" className="space-y-4 mt-6">
                  {/* Search Bar */}
                  <ReplenishmentSearchBar value={readyToOrderSearch} onChange={setReadyToOrderSearch} placeholder="Search by ASIN, SKU, serial number, or title..." />
                  
                  <div className="flex items-center justify-between gap-4">
                    <Badge variant="outline" className="text-sm whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                      {filteredReadyToOrder.length} ready to order
                    </Badge>
                    <Badge variant="outline" className="text-sm whitespace-nowrap bg-red-50 text-red-700 border-red-200">
                      {outOfStockItems.length} cannot order
                    </Badge>
                  </div>

                  {/* Bulk Actions for Critical Items */}
                  {filteredReadyToOrder.length > 0 && <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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

                   <div className="space-y-3">
                     {paginatedReadyToOrder.length > 0 ? paginatedReadyToOrder.map(item => {
                    // Check if item has valid SKU for Sunsky ordering
                    const extractedSku = extractSkuFromIdentifier(item.identifier);
                    const extractedModel = extractModelFromIdentifier(item.identifier);
                    const asin = extractAsinForImage(item.identifier);
                    const imageUrl = asin ? getImageByAsin(asin)?.image_url : undefined;
                    return <ReplenishmentItemCard key={item.id} item={item} imageUrl={imageUrl} selected={selectedItems.has(item.id)} onSelect={handleSelectItem} showCheckbox={true} actions={<>
                              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 border-green-300">
                                Ready to Order
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-700">
                                Sunsky SKU: {extractedSku || extractedModel}
                              </Badge>
                              <Button onClick={() => markAsNonSource(item.id)} size="sm" variant="outline" className="gap-2">
                                <XCircle className="w-4 h-4" />
                                Mark as Non-Source
                              </Button>
                            </>} />;
                  }) : <div className="text-center py-12 text-muted-foreground">
                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-500" />
                        <p className="text-lg font-medium">No items ready to order</p>
                        <p className="text-sm">
                          {readyToOrderSearch ? 'No items match your search.' : 'All critical items need SKU mapping or are already ordered!'}
                        </p>
                      </div>}
                  </div>

                   {/* Pagination */}
                   {filteredReadyToOrder.length > 0 && <ReplenishmentPagination currentPage={readyToOrderPage} totalPages={Math.ceil(filteredReadyToOrder.length / itemsPerPage)} totalItems={filteredReadyToOrder.length} itemsPerPage={itemsPerPage} onPageChange={setReadyToOrderPage} onItemsPerPageChange={setItemsPerPage} />}

                   {/* Export button for ready-to-order items */}
                   {filteredReadyToOrder.length > 0 && <div className="pt-4 border-t">
                       <Button onClick={exportRestockData} variant="outline" size="sm" className="gap-2">
                         <Download className="w-4 h-4" />
                         Export Ready to Order Items
                       </Button>
                     </div>}
                </TabsContent>

                {/* Out of Stock Tab */}
                <TabsContent value="out-of-stock" className="space-y-4 mt-6">
                  {/* Search Bar */}
                  <ReplenishmentSearchBar value={outOfStockSearch} onChange={setOutOfStockSearch} placeholder="Search out-of-stock items by ASIN, SKU, serial number, or title..." />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Items that are out of stock but cannot be automatically ordered due to missing or invalid SKU mapping
                    </div>
                    <Badge variant="destructive" className="text-sm whitespace-nowrap">
                      {filteredOutOfStock.length} items need manual attention
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {paginatedOutOfStock.length > 0 ? paginatedOutOfStock.map(item => {
                    const asin = extractAsinForImage(item.identifier);
                    const imageUrl = asin ? getImageByAsin(asin)?.image_url : undefined;
                    return <ReplenishmentItemCard key={item.id} item={item} imageUrl={imageUrl} actions={<>
                            <Badge variant="destructive" className="text-xs">
                              Out of Stock
                            </Badge>
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 bg-orange-50">
                              No Valid SKU - Manual Order Required
                            </Badge>
                            <Button onClick={() => markAsNonSource(item.id)} size="sm" variant="outline" className="gap-2">
                              <XCircle className="w-4 h-4" />
                              Mark as Non-Source
                            </Button>
                          </>} />;
                  }) : <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-500" />
                        <p className="text-lg font-medium">No out of stock items</p>
                        <p className="text-sm">
                          {outOfStockSearch ? 'No items match your search.' : 'All out of stock items have valid SKUs and can be ordered!'}
                        </p>
                      </div>}
                  </div>

                  {/* Pagination */}
                  {filteredOutOfStock.length > 0 && <ReplenishmentPagination currentPage={outOfStockPage} totalPages={Math.ceil(filteredOutOfStock.length / itemsPerPage)} totalItems={filteredOutOfStock.length} itemsPerPage={itemsPerPage} onPageChange={setOutOfStockPage} onItemsPerPageChange={setItemsPerPage} />}

                  {/* Export button for out of stock items */}
                  {filteredOutOfStock.length > 0 && <div className="pt-4 border-t">
                      <Button onClick={() => {
                    const csvContent = [['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Current Quantity', 'Days Since Restock', 'Status', 'Notes'], ...filteredOutOfStock.map(item => {
                      let asin = '';
                      let sku = '';
                      let serialBin = '';
                      if (item.table_name === 'asin_inventory') {
                        const asinMatch = item.identifier.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
                        if (asinMatch) {
                          asin = asinMatch[1];
                          serialBin = asinMatch[2];
                        }
                        const skuMatch = item.identifier.match(/\|\s*SKU:\s*([^\s]+)/);
                        if (skuMatch) {
                          sku = skuMatch[1];
                        }
                      }
                      return ['ASIN', asin, sku, `="${serialBin}"`, item.current_quantity, item.days_since_last_restock || 'Never', 'Out of Stock - No Valid SKU', 'Requires manual ordering or SKU mapping'];
                    })].map(row => row.join(',')).join('\n');
                    downloadCSV(csvContent, `out-of-stock-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
                  }} variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Out of Stock Items
                      </Button>
                    </div>}
                </TabsContent>

                {/* Ordered Tab */}
                <TabsContent value="ordered" className="space-y-4 mt-6">
                  {/* Search Bar */}
                  <ReplenishmentSearchBar value={orderedSearch} onChange={setOrderedSearch} placeholder="Search ordered items by ASIN, SKU, serial number, or title..." />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Items that have been ordered from suppliers and are awaiting fulfillment
                    </div>
                    <Badge variant="secondary" className="text-sm whitespace-nowrap">
                      {filteredOrdered.length} items ordered
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {paginatedOrdered.length > 0 ? paginatedOrdered.map(item => {
                    const asin = extractAsinForImage(item.identifier);
                    const imageUrl = asin ? getImageByAsin(asin)?.image_url : undefined;
                    return <ReplenishmentItemCard key={item.id} item={item} imageUrl={imageUrl} actions={<Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-700 border-blue-300">
                            Ordered - Awaiting Fulfillment
                          </Badge>} />;
                  }) : <div className="text-center py-12 text-muted-foreground">
                        <Truck className="w-16 h-16 mx-auto mb-4 opacity-50 text-blue-500" />
                        <p className="text-lg font-medium">No ordered items</p>
                        <p className="text-sm">
                          {orderedSearch ? 'No items match your search.' : 'Items marked as ordered will appear here'}
                        </p>
                      </div>}
                  </div>

                  {/* Pagination */}
                  {filteredOrdered.length > 0 && <ReplenishmentPagination currentPage={orderedPage} totalPages={Math.ceil(filteredOrdered.length / itemsPerPage)} totalItems={filteredOrdered.length} itemsPerPage={itemsPerPage} onPageChange={setOrderedPage} onItemsPerPageChange={setItemsPerPage} />}

                  {/* Export button */}
                  {filteredOrdered.length > 0 && <div className="pt-4 border-t">
                      <Button onClick={exportOrderedData} variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Ordered Items
                      </Button>
                    </div>}
                </TabsContent>

                {/* Non-Source Tab */}
                <TabsContent value="non-source" className="space-y-4 mt-6">
                  {/* Search Bar */}
                  <ReplenishmentSearchBar value={nonSourceSearch} onChange={setNonSourceSearch} placeholder="Search non-source items by ASIN, SKU, serial number, or title..." />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Items marked as non-source that should not be restocked
                    </div>
                    <Badge variant="outline" className="text-sm whitespace-nowrap bg-orange-50 text-orange-700 border-orange-200">
                      {filteredNonSource.length} non-source items
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {paginatedNonSource.length > 0 ? paginatedNonSource.map(item => {
                    const asin = extractAsinForImage(item.identifier);
                    const imageUrl = asin ? getImageByAsin(asin)?.image_url : undefined;
                    return <ReplenishmentItemCard key={item.id} item={item} imageUrl={imageUrl} actions={<Badge variant="outline" className="text-xs border-orange-500 text-orange-600 bg-orange-50">
                            Non-Source - Do Not Restock
                          </Badge>} />;
                  }) : <div className="text-center py-12 text-muted-foreground">
                        <XCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-orange-500" />
                        <p className="text-lg font-medium">No non-source items</p>
                        <p className="text-sm">
                          {nonSourceSearch ? 'No items match your search.' : 'Items marked as non-source will appear here'}
                        </p>
                      </div>}
                  </div>

                  {/* Pagination */}
                  {filteredNonSource.length > 0 && <ReplenishmentPagination currentPage={nonSourcePage} totalPages={Math.ceil(filteredNonSource.length / itemsPerPage)} totalItems={filteredNonSource.length} itemsPerPage={itemsPerPage} onPageChange={setNonSourcePage} onItemsPerPageChange={setItemsPerPage} />}

                  {/* Export button */}
                  {filteredNonSource.length > 0 && <div className="pt-4 border-t">
                      <Button onClick={() => {
                    const csvContent = [['Type', 'ASIN', 'SKU', 'Serial/Bin', 'Status', 'Notes'], ...filteredNonSource.map(item => {
                      let asin = '';
                      let sku = '';
                      let serialBin = '';
                      const asinMatch = item.identifier.match(/^([A-Z0-9]+)\s*\(([^)]+)\)/);
                      if (asinMatch) {
                        asin = asinMatch[1];
                        serialBin = asinMatch[2];
                      }
                      const skuMatch = item.identifier.match(/\|\s*SKU:\s*([^\s]+)/);
                      if (skuMatch) {
                        sku = skuMatch[1];
                      }
                      return ['ASIN', asin, sku, `="${serialBin}"`, 'Non-Source', 'Marked as non-source - not to be restocked'];
                    })].map(row => row.join(',')).join('\n');
                    downloadCSV(csvContent, `non-source-items-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`);
                  }} variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Non-Source Items
                      </Button>
                    </div>}
                </TabsContent>


              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Velocity Analytics Tab */}
        <TabsContent value="velocity" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Intelligent Replenishment Analytics</h3>
              <p className="text-muted-foreground">Smart reorder recommendations based on sales velocity and demand patterns</p>
            </div>
          </div>
          
          <VelocityAnalyticsSimple />
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
      <SunskyOrderDialog open={sunskyDialogOpen} onOpenChange={setSunskyDialogOpen} selectedOrders={sunskyOrderItems} onOrderSuccess={handleSunskyOrderSuccess} onItemsUnavailable={handleItemsUnavailable} />
      
      {/* Replenishment Configuration Dialog */}
      <ReplenishmentConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={async () => {
          const { resolvedConfig } = await loadConfigs();
          // Force recalculation when config content changes (not just config selection)
          if (resolvedConfig && allInventoryItems.length > 0) {
            toast({
              title: "Recalculating recommended quantities...",
            });
            await recalculateAllRecommendedQuantities();
            toast({
              title: "Recommended quantities updated",
              description: "All items have been recalculated with the new configuration",
            });
          }
        }}
        currentConfig={selectedConfig}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{configToDelete?.config_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setConfigToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
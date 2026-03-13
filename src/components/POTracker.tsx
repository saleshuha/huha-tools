// POTracker component for Amazon purchase orders - updated
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw, Printer, Zap, Image as ImageIcon, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, FileText, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, Copy, CheckCircle2, Info, TrendingDown, Check, XCircle, Calculator, ClipboardList, MapPin, Warehouse } from 'lucide-react';
import { SortableTableHeader } from '@/components/order-processing/SortableTableHeader';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
import { POReportsSection } from '@/components/po/POReportsSection';
import { POPrintDialog } from '@/components/po/POPrintDialog';
import { POMetricsCard } from '@/components/po/POMetricsCard';
import { CompactStatBar } from '@/components/ui/compact-stat-bar';
import { ToolbarBar, ToolbarSpacer } from '@/components/ui/toolbar-bar';
import { POAnalyticsDashboard } from '@/components/po/analytics/POAnalyticsDashboard';
import { GeneratePurchaseLinkDialog } from '@/components/po/GeneratePurchaseLinkDialog';
import { PurchaseLinkManagement } from '@/components/po/PurchaseLinkManagement';
import { PurchaseUpdatesPanel } from '@/components/po/PurchaseUpdatesPanel';
import { SmartMatchingPanel } from '@/components/po/matching/SmartMatchingPanel';

import { PurchaseInvoiceList } from '@/components/po/PurchaseInvoiceList';
import { FulfillFromStockDialog } from '@/components/po/FulfillFromStockDialog';
import { PrintHistoryDialog } from '@/components/po/PrintHistoryDialog';
import { ProductProfitAnalyzer } from '@/components/po/ProductProfitAnalyzer';
import { POQuantityMatchingDialog } from '@/components/po/POQuantityMatchingDialog';
import ShippedOrdersUpload from '@/components/po/ShippedOrdersUpload';
import FBAInventoryUpload from '@/components/po/FBAInventoryUpload';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useSKUManager } from '@/hooks/useSKUManager';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useProductImages } from '@/hooks/useProductImages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, LabelElement, LabelSize } from '@/types/label';
import { exportMetricToCSV, exportAllMetrics, calculateMetricPercentage } from '@/utils/po-metrics-export';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { cn } from '@/lib/utils';
import { useProductBarcodes, ProductBarcode } from '@/hooks/useProductBarcodes';
import { useShippedOrders } from '@/hooks/useShippedOrders';
import { useFBAInventory } from '@/hooks/useFBAInventory';
export interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  ship_to_location?: string;
  asin?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  printed_quantity?: number;
  external_id?: string;
  external_id_type?: string;
  sku_code?: string;
  serial_number?: string;
  status: 'pending' | 'placed' | 'received' | 'cancelled' | 'closed';
  priority?: number;
  order_date?: string;
  expected_delivery?: string;
  notes?: string;
  file_name: string;
  country?: string;
  currency?: string;
  unit_cost?: number;
  total_cost?: number;
  sku_user_id?: string;
  supplier_order_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  created_at: string;
  updated_at: string;
  is_printed?: boolean;
  label_printed_at?: string;
  sunsky_sku?: any;
  batch_id?: string;
  // Consolidation properties for merged ASIN view
  _isConsolidated?: boolean;
  _consolidatedOrders?: POOrder[];
  _partiallyPrinted?: boolean;
  _totalFulfilledFromStock?: number;
  _fulfilledOrderCount?: number;
  // Workspace-specific local properties (not saved to DB)
  _localFromStock?: boolean;
  _localStockQuantity?: number;
  _workspaceImageUrl?: string;
}
interface POGroup {
  poNumber: string;
  orders: POOrder[];
}
export const POTracker = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Add debounced search
  const [isSearching, setIsSearching] = useState(false); // Add searching indicator
  const [statusFilter, setStatusFilter] = useState<POOrder['status'] | 'all'>('all');
  const [shipToFilter, setShipToFilter] = useState<string | 'all'>('all');
  const [printedFilter, setPrintedFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sunsky-matched' | 'not-matched'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string[]>([]);
  const [instockFilter, setInstockFilter] = useState<string[]>([]);
  const [barcodeFilter, setBarcodeFilter] = useState<'all' | 'has-barcode' | 'no-barcode'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');

  // Metrics filter state
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<string | null>(null);
  const [exportingMetric, setExportingMetric] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof POOrder | 'combined_title' | 'instock_qty' | 'scanned_barcode' | 'serial_number_qty'>('po_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [originalOrderPreserved, setOriginalOrderPreserved] = useState(false);

  // Grouped view sorting state
  const [groupedSortField, setGroupedSortField] = useState<string>('po_number');
  const [groupedSortDirection, setGroupedSortDirection] = useState<'asc' | 'desc'>('asc');

  // Print Labels state - Two-step flow
  const [labelsStep, setLabelsStep] = useState<'list' | 'print'>('list');
  const [selectedPOForLabels, setSelectedPOForLabels] = useState<string | null>(null);
  const [selectedPOsForLabels, setSelectedPOsForLabels] = useState<Set<string>>(new Set()); // Multi-select
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<Set<string>>(new Set());
  const [allowMixedLocations, setAllowMixedLocations] = useState(false);
  const [debouncedLabelSearch, setDebouncedLabelSearch] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'po_number' | 'barcode'>('all');
  const [selectedForPrint, setSelectedForPrint] = useState<Map<string, number>>(new Map());
  const [customPrintQuantities, setCustomPrintQuantities] = useState<Map<string, number>>(new Map());
  const [labelCurrentPage, setLabelCurrentPage] = useState(1);
  const [labelItemsPerPage, setLabelItemsPerPage] = useState(20);
  const [consolidatedViewMode, setConsolidatedViewMode] = useState<'merged' | 'detailed'>('merged');
  const [filterPrintStatus, setFilterPrintStatus] = useState<'all' | 'pending' | 'printed'>('all');

  // Multi-tag search state
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [chipMode, setChipMode] = useState<'auto' | 'manual'>('manual');
  const [chipDelay, setChipDelay] = useState(2); // Default 2 seconds

  // Bulk delete state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteInput, setBulkDeleteInput] = useState('');
  
  // Quantity matching report state
  const [showQuantityMatchingDialog, setShowQuantityMatchingDialog] = useState(false);
  const [bulkDeleteMatches, setBulkDeleteMatches] = useState<{
    matched: string[];
    notFound: string[];
  }>({
    matched: [],
    notFound: []
  });
  const [isDeletingPOs, setIsDeletingPOs] = useState(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<'input' | 'confirm'>('input');

  // PO Selection Presets state
  interface POSelectionPreset {
    id: string;
    name: string;
    poNumbers: string[];
    createdAt: string;
    lastUsed?: string;
  }
  const [savedPresets, setSavedPresets] = useState<POSelectionPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Fulfill from stock dialog state
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [fulfillDialogOrder, setFulfillDialogOrder] = useState<{
    asin?: string;
    title?: string;
    po_number: string;
    quantity: number;
    isConsolidated: boolean;
    consolidatedOrders: any[];
  } | null>(null);
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Print history dialog state
  const [printHistoryDialogOpen, setPrintHistoryDialogOpen] = useState(false);
  const [printHistoryOrder, setPrintHistoryOrder] = useState<POOrder | null>(null);

  // Debounce main search query (300ms delay)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchQuery]);

  // Auto-create chip based on chipMode and chipDelay settings
  useEffect(() => {
    if (!labelSearchQuery.trim() || chipMode === 'manual') return;
    const timer = setTimeout(() => {
      const trimmedQuery = labelSearchQuery.trim();
      if (trimmedQuery && !searchTags.includes(trimmedQuery)) {
        setSearchTags(prev => [...prev, trimmedQuery]);
        setLabelSearchQuery('');
      }
    }, chipDelay * 1000); // Convert seconds to milliseconds

    return () => clearTimeout(timer);
  }, [labelSearchQuery, searchTags, chipMode, chipDelay]);

  // Load saved print settings from localStorage or use defaults
  const defaultPrintSettings = {
    template: 'default',
    pageSize: '4x6',
    customWidth: 100,
    customHeight: 60,
    dpi: 203 as 203 | 300,
    darkness: 10,
    copiesByQuantity: true,
    copies: 1,
    autoSizeFromTemplate: true
  };
  const getStoredPrintSettings = () => {
    try {
      const stored = localStorage.getItem('poTracker_printSettings');
      if (stored) {
        return {
          ...defaultPrintSettings,
          ...JSON.parse(stored)
        };
      }
    } catch (error) {
      console.error('Failed to load stored print settings:', error);
    }
    return defaultPrintSettings;
  };
  const [printSettings, setPrintSettings] = useState(getStoredPrintSettings);
  const [isPrintConfigCollapsed, setIsPrintConfigCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('poTracker_printConfigCollapsed');
      return stored ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  // Save print settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('poTracker_printSettings', JSON.stringify(printSettings));
    } catch (error) {
      console.error('Failed to save print settings:', error);
    }
  }, [printSettings]);

  // Save collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('poTracker_printConfigCollapsed', JSON.stringify(isPrintConfigCollapsed));
    } catch (error) {
      console.error('Failed to save print config collapse state:', error);
    }
  }, [isPrintConfigCollapsed]);

  // Load saved presets from Supabase
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPresetsLoading(false); return; }
        const { data, error } = await supabase
          .from('po_selection_presets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setSavedPresets((data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          poNumbers: p.po_numbers || [],
          createdAt: p.created_at,
          lastUsed: p.last_used,
        })));
      } catch (error) {
        console.error('Failed to load saved presets:', error);
      } finally {
        setPresetsLoading(false);
      }
    };
    loadPresets();
  }, []);
  const [qzConnected, setQzConnected] = useState(false);
  const [disabledPOs, setDisabledPOs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('poTracker_disabledPOs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingItems, setPrintingItems] = useState<Set<string>>(new Set());
  const [preventTableReorder, setPreventTableReorder] = useState(false);
  const [isPrintStatusUpdating, setIsPrintStatusUpdating] = useState(false);

  // Print Dialog State
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>('single');
  const [printOrders, setPrintOrdersBase] = useState<POOrder[]>([]);
   const [showReprintAllDialog, setShowReprintAllDialog] = useState(false);
    const [isReprintingAll, setIsReprintingAll] = useState(false);
    const [reprintConfirmStep, setReprintConfirmStep] = useState<1 | 2>(1);
    const [reprintConfirmChecked, setReprintConfirmChecked] = useState(false);
    const [showItemReprintDialog, setShowItemReprintDialog] = useState(false);
    const [itemReprintOrder, setItemReprintOrder] = useState<POOrder | null>(null);
    const [itemReprintQty, setItemReprintQty] = useState<string>('1');

  // Generate Purchase Link Dialog State
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false);

  // Inventory data for matching
  const [inventoryData, setInventoryData] = useState<{
    asinInventory: any[];
    skuInventory: any[];
  }>({
    asinInventory: [],
    skuInventory: []
  });

  // Create indexed lookup maps for O(1) inventory matching (CRITICAL OPTIMIZATION)
  const inventoryMaps = useMemo(() => {
    console.log('🗺️ Building inventory lookup maps...', {
      asinInventoryCount: inventoryData.asinInventory.length,
      skuInventoryCount: inventoryData.skuInventory.length
    });
    const startTime = performance.now();
    const asinMap = new Map<string, any[]>();
    const skuMap = new Map<string, any>();
    const serialMap = new Map<string, any>();
    let asinSerialCount = 0;
    let skuBinSerialCount = 0;

    // Build ASIN map with normalized keys
    inventoryData.asinInventory.forEach(item => {
      if (item.asin) {
        const key = item.asin.trim().toUpperCase();
        if (!asinMap.has(key)) {
          asinMap.set(key, []);
        }
        asinMap.get(key)!.push(item);
      }

      // Also index by serial number
      if (item.serial_number) {
        const serialKey = item.serial_number.trim().toUpperCase();
        serialMap.set(serialKey, item);
        asinSerialCount++;
      }
    });

    // Build SKU map with normalized keys
    inventoryData.skuInventory.forEach(item => {
      if (item.sku_number) {
        const key = item.sku_number.trim().toUpperCase();
        skuMap.set(key, item);
      }

      // Also index by ASIN if available
      if (item.asin) {
        const asinKey = item.asin.trim().toUpperCase();
        if (!skuMap.has(asinKey)) {
          skuMap.set(asinKey, item);
        }
      }

      // Index by bin serial number
      if (item.bin_serial_number) {
        const binKey = item.bin_serial_number.trim().toUpperCase();
        serialMap.set(binKey, item);
        skuBinSerialCount++;
      }
    });
    const endTime = performance.now();
    console.log('✅ Inventory maps built:', {
      asinMapSize: asinMap.size,
      skuMapSize: skuMap.size,
      serialMapSize: serialMap.size,
      asinSerialsIndexed: asinSerialCount,
      skuBinSerialsIndexed: skuBinSerialCount,
      sampleSerials: Array.from(serialMap.keys()).slice(0, 10),
      buildTime: `${(endTime - startTime).toFixed(2)}ms`
    });
    return {
      asinMap,
      skuMap,
      serialMap
    };
  }, [inventoryData]);

  // Save disabled POs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('poTracker_disabledPOs', JSON.stringify(Array.from(disabledPOs)));
    } catch (error) {
      console.error('Failed to save disabled POs state:', error);
    }
  }, [disabledPOs]);
  useEffect(() => {
    // Set up connection listener
    const handleConnectionChange = (connected: boolean) => {
      setQzConnected(connected);
      if (connected) {
        loadPrinters();
      } else {
        setAvailablePrinters([]);
      }
    };
    qzConnectionManager.addConnectionListener(handleConnectionChange);
    return () => {
      qzConnectionManager.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  // Debounce label search for better performance with large datasets
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLabelSearch(labelSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [labelSearchQuery]);

  // Auto-add space after 5 seconds of inactivity for single item search
  useEffect(() => {
    if (!labelSearchQuery.trim() || labelSearchQuery.includes(' ')) {
      return; // Don't add space if empty or already has space
    }
    const timer = setTimeout(() => {
      setLabelSearchQuery(prev => prev + ' ');
    }, 5000);
    return () => clearTimeout(timer);
  }, [labelSearchQuery]);

  // Sorting handler
  const handleSort = (field: keyof POOrder | 'combined_title' | 'instock_qty' | 'serial_number_qty') => {
    console.log('🔄 SORT: Sorting by field:', field, 'Current field:', sortField, 'Current direction:', sortDirection);
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('🔄 SORT: Toggling direction to:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('🔄 SORT: Changing field to:', field, 'Setting direction to: asc');
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Grouped view sorting handler
  const handleGroupedSort = (field: string) => {
    console.log('🔄 GROUPED SORT:', field);
    if (groupedSortField === field) {
      setGroupedSortDirection(groupedSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setGroupedSortField(field);
      setGroupedSortDirection('asc');
    }
  };

  // PHASE 3: Metric click handler for filtering
  const handleMetricClick = (metricType: string) => {
    console.log('📊 Metric clicked:', metricType);
    setSelectedMetricFilter(selectedMetricFilter === metricType ? null : metricType);
    // Scroll to table smoothly
    setTimeout(() => {
      const tableElement = document.querySelector('[data-table="po-main"]');
      if (tableElement) {
        tableElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  // PHASE 4: Export metric data
  const handleExportMetric = async (metricType: string) => {
    setExportingMetric(metricType);
    try {
      let ordersToExport: POOrder[] = [];
      switch (metricType) {
        case 'in-stock':
          ordersToExport = calculatedMetrics.inStock.orders;
          break;
        case 'out-of-stock':
          ordersToExport = calculatedMetrics.outOfStock.orders;
          break;
        case 'not-matched':
          ordersToExport = calculatedMetrics.notMatched.orders;
          break;
        case 'matched':
          ordersToExport = calculatedMetrics.matched.orders;
          break;
        case 'placed':
          ordersToExport = calculatedMetrics.placed.orders;
          break;
        case 'pending':
          ordersToExport = calculatedMetrics.pending.orders;
          break;
        default:
          ordersToExport = poOrders;
      }
      if (ordersToExport.length === 0) {
        toast({
          title: 'No data to export',
          description: `No orders found for ${metricType} metric`,
          variant: 'destructive'
        });
        return;
      }
      exportMetricToCSV(ordersToExport, metricType);
      toast({
        title: 'Export successful',
        description: `Exported ${ordersToExport.length} orders`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setExportingMetric(null);
    }
  };

  // PHASE 4: Export all metrics
  const handleExportAllMetrics = async () => {
    setExportingMetric('all');
    try {
      const totalItems = comprehensiveMetrics?.total_line_items || poOrders.length;
      exportAllMetrics({
        summary: [{
          name: 'Total Items',
          value: totalItems,
          subValue: `${comprehensiveMetrics?.total_quantity || 0} units`
        }, {
          name: 'In Stock',
          value: calculatedMetrics.inStock.count,
          subValue: `${calculatedMetrics.inStock.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.inStock.count, totalItems)
        }, {
          name: 'Out of Stock',
          value: calculatedMetrics.outOfStock.count,
          subValue: `${calculatedMetrics.outOfStock.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.outOfStock.count, totalItems)
        }, {
          name: 'Not Matched',
          value: calculatedMetrics.notMatched.count,
          subValue: `${calculatedMetrics.notMatched.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.notMatched.count, totalItems)
        }, {
          name: 'Matched',
          value: calculatedMetrics.matched.count,
          subValue: `${calculatedMetrics.matched.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.matched.count, totalItems)
        }, {
          name: 'Placed',
          value: calculatedMetrics.placed.count,
          subValue: `${calculatedMetrics.placed.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.placed.count, totalItems)
        }, {
          name: 'Pending',
          value: calculatedMetrics.pending.count,
          subValue: `${calculatedMetrics.pending.qty} units`,
          percentage: calculateMetricPercentage(calculatedMetrics.pending.count, totalItems)
        }, {
          name: 'Fulfillment Rate',
          value: calculatedMetrics.fulfillmentRate,
          subValue: `${calculatedMetrics.placed.count} / ${calculatedMetrics.matched.count} fulfilled`,
          percentage: calculatedMetrics.fulfillmentRate
        }],
        inStock: calculatedMetrics.inStock.orders,
        outOfStock: calculatedMetrics.outOfStock.orders,
        notMatched: calculatedMetrics.notMatched.orders,
        matched: calculatedMetrics.matched.orders,
        placed: calculatedMetrics.placed.orders,
        pending: calculatedMetrics.pending.orders
      });
      toast({
        title: 'All metrics exported',
        description: 'Successfully exported complete metrics report'
      });
    } catch (error) {
      console.error('Export all error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setExportingMetric(null);
    }
  };
  const loadPrinters = async () => {
    console.log('🖨️ Loading printers...');
    try {
      const printers = await qzConnectionManager.getPrinters();
      console.log('✅ Printers loaded:', {
        count: printers.length,
        printers
      });
      setAvailablePrinters(printers);

      // Set default printer
      const defaultPrinter = await qzConnectionManager.getDefaultPrinter();
      console.log('🎯 Default printer:', defaultPrinter);
      if (defaultPrinter) {
        setSelectedPrinter(defaultPrinter);
      } else if (printers.length > 0) {
        setSelectedPrinter(printers[0]);
        console.log('📌 Using first available printer:', printers[0]);
      }
    } catch (error) {
      console.error('❌ Failed to load printers:', error);
      setAvailablePrinters([]);
    }
  };
  const navigate = useNavigate();
  const {
    poOrders,
    isLoading,
    loadingProgress,
    loadingStatus,
    currentPO,
    currentItem,
    uploadStats,
    poProgress,
    fetchPOOrders,
    processPOFiles,
    deletePOOrders,
    updatePrintStatus
  } = usePOOrders();
  const {
    profile,
    loading: profileLoading
  } = useUserProfile();
  const {
    selectedCountry
  } = useCountry();
  const {
    getImageByAsin,
    productImages,
    isLoading: imagesLoading,
    refreshImages
  } = useProductImages();
  const {
    sunskySKUs
  } = useSKUManager();
  const {
    toast
  } = useToast();
  const {
    trackTabChange,
    trackAction,
    trackPageView
  } = useTaxonomy();
  const queryClient = useQueryClient();
  
  // Scanned barcodes from purchase links
  const { fetchAllBarcodes, barcodes: allBarcodes } = useProductBarcodes();
  
  // Shipped orders and FBA inventory lookup hooks
  const { getShippedQty, reload: reloadShippedOrders, shippedQtyMap } = useShippedOrders();
  const { getFBAQty, reload: reloadFBAInventory, fbaQtyMap } = useFBAInventory();
  
  // Fetch barcodes and reload inventory data when on Labels tab
  useEffect(() => {
    if (activeTab === 'labels') {
      console.log('📦 Fetching scanned barcodes for Labels tab...');
      fetchAllBarcodes();
      console.log('📦 Reloading shipped orders and FBA inventory for Labels tab...');
      reloadShippedOrders();
      reloadFBAInventory();
    }
  }, [activeTab, fetchAllBarcodes, reloadShippedOrders, reloadFBAInventory]);
  
  // Debug: Log shipped and FBA inventory data state
  useEffect(() => {
    if (activeTab === 'labels') {
      console.log('📊 Shipped Orders Map:', { size: shippedQtyMap.size, entries: Array.from(shippedQtyMap.entries()).slice(0, 5) });
      console.log('📊 FBA Inventory Map:', { size: fbaQtyMap.size, entries: Array.from(fbaQtyMap.entries()).slice(0, 5) });
    }
  }, [activeTab, shippedQtyMap, fbaQtyMap]);
  
  // Create barcode lookup map by po_order_id for O(1) access
  const barcodesByOrderId = useMemo(() => {
    const map = new Map<string, ProductBarcode[]>();
    allBarcodes.forEach(b => {
      if (b.po_order_id) {
        const existing = map.get(b.po_order_id) || [];
        map.set(b.po_order_id, [...existing, b]);
      }
    });
    console.log('📦 Barcode lookup map built:', { mapSize: map.size, totalBarcodes: allBarcodes.length });
    return map;
  }, [allBarcodes]);

  useEffect(() => {
    console.log('🖨️ PRINT SELECTION STATE CHANGED:', {
      size: selectedForPrint.size,
      selectedIds: Array.from(selectedForPrint.keys()),
      printButtonDisabled: selectedForPrint.size === 0 || !qzConnected || !selectedPrinter
    });
  }, [selectedForPrint, qzConnected, selectedPrinter]);


  // Track page view
  useEffect(() => {
    trackPageView({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      pageRoute: '/po-tracker',
      pageTitle: 'Amazon Retail - Purchase Orders',
      metadata: {
        features: ['bulk_import', 'print_labels', 'export', 'analytics', 'sunsky_matching', 'selection_presets']
      }
    });
  }, [trackPageView]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔄 Window focused, checking for PO updates...');
      await queryClient.invalidateQueries({
        queryKey: ['po-orders']
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  // Polling when "Print Labels" tab is active
  useEffect(() => {
    if (activeTab === 'labels') {
      console.log('🔄 Starting auto-polling for Print Labels tab');
      const interval = setInterval(async () => {
        console.log('🔄 Auto-polling for PO updates...');
        await queryClient.invalidateQueries({
          queryKey: ['po-orders']
        });
      }, 30000); // 30 seconds

      return () => {
        console.log('⏹️ Stopping auto-polling');
        clearInterval(interval);
      };
    }
  }, [activeTab, queryClient]);

  // Real-time subscription for po_orders updates
  useEffect(() => {
    if (!selectedCountry) return;
    console.log('🔴 Setting up real-time subscription for po_orders');
    const channel = supabase.channel('po_orders_changes').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'po_orders',
      filter: `country=eq.${selectedCountry}`
    }, async payload => {
      console.log('🔴 Real-time update received:', payload);

      // Invalidate cache and trigger fresh fetch
      queryClient.invalidateQueries({
        queryKey: ['po-orders']
      });
      await fetchPOOrders(true);

      // Show toast notification
      if (payload.new.is_printed) {
        toast({
          title: "✅ Status updated",
          description: `${payload.new.asin || payload.new.sku_code} marked as printed`,
          duration: 2000
        });
      }
    }).subscribe();
    return () => {
      console.log('🔴 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedCountry, fetchPOOrders, toast]);

  // Function to handle bulk PO closing
  // Delete all PO orders for fresh upload

  // Helper function to detect network/timeout errors
  const isNetworkOrTimeoutError = (err: any): boolean => {
    const msg = err?.message?.toLowerCase() || '';
    return msg.includes('failed to fetch') || msg.includes('failed to send') || msg.includes('network') || msg.includes('connection') || msg.includes('timeout') || msg.includes('aborted');
  };

  // Enhanced error logging helper
  const logDetailedError = (error: any, context: string) => {
    console.error(`🚨 ${context}:`, {
      error,
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      errorDetails: JSON.stringify(error, null, 2),
      supabaseUrl: 'https://vfqqlifvhooefxvvyebm.supabase.co',
      functionsUrl: 'https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/fulfill-from-stock',
      timestamp: new Date().toISOString()
    });
  };

  // Fallback function using direct fetch
  const fulfillWithFallback = async (poNumber: string, quantity: number, orderInfo: any) => {
    console.log('🔄 Attempting fallback with direct fetch...');
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session for fallback');
    }
    const response = await fetch('https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/fulfill-from-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM'
      },
      body: JSON.stringify({
        poNumber,
        quantity,
        asin: orderInfo.asin,
        title: orderInfo.title,
        originalQuantity: orderInfo.quantity
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return await response.json();
  };

  // Handle fulfill from stock
  const handleFulfillFromStock = async (poNumber: string, quantity: number) => {
    if (!fulfillDialogOrder) return;
    setIsFulfilling(true);
    try {
      // Determine the correct originalQuantity
      let originalQuantity = fulfillDialogOrder.quantity;

      // If consolidated, find the specific PO's quantity
      if (fulfillDialogOrder.isConsolidated && fulfillDialogOrder.consolidatedOrders) {
        const specificPO = fulfillDialogOrder.consolidatedOrders.find(po => po.po_number === poNumber);
        if (specificPO) {
          originalQuantity = specificPO.quantity;
          console.log('✅ Consolidated PO fulfillment:', {
            selectedPO: poNumber,
            specificQuantity: originalQuantity,
            totalConsolidated: fulfillDialogOrder.quantity
          });
        }
      }

      // Call edge function with retry logic for cold starts and network errors
      let data, error;
      let retryCount = 0;
      const maxRetries = 2;
      while (retryCount <= maxRetries) {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
          const result = await supabase.functions.invoke('fulfill-from-stock', {
            body: {
              poNumber,
              quantity,
              asin: fulfillDialogOrder.asin,
              title: fulfillDialogOrder.title,
              originalQuantity
            }
          });
          clearTimeout(timeoutId);
          data = result.data;
          error = result.error;
        } catch (invokeError: any) {
          clearTimeout(timeoutId);
          error = invokeError;
        }

        // Log detailed error info for debugging
        if (error) {
          logDetailedError(error, `Fulfillment Error (Attempt ${retryCount + 1}/${maxRetries + 1})`);
        }

        // If successful or non-retryable error, break
        if (!error || !isNetworkOrTimeoutError(error)) {
          break;
        }

        // Wait before retry (cold start or network recovery)
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying fulfillment (attempt ${retryCount + 2}/${maxRetries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
        } else {
          break;
        }
      }
      if (error) {
        // Try fallback method before giving up
        console.log('⚠️ All standard attempts failed, attempting fallback method...');
        try {
          const fallbackResult = await fulfillWithFallback(poNumber, quantity, fulfillDialogOrder);
          console.log('✅ Fallback fulfillment successful:', fallbackResult);
          data = fallbackResult;
          error = null;
        } catch (fallbackError: any) {
          logDetailedError(fallbackError, 'Fallback Method Failed');
          const errorMsg = error?.message || 'Unknown error occurred';
          throw new Error(`${errorMsg} (after ${retryCount + 1} attempts + fallback)`);
        }
      }

      // Show immediate success feedback
      toast({
        title: "✓ Fulfillment Started",
        description: <div className="space-y-1">
            <div>PO: <strong>{poNumber}</strong></div>
            <div>Processing {quantity} units in background...</div>
          </div>
      });

      // Immediately invalidate cache to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['po-orders'] });

      // Close dialog immediately
      setFulfillDialogOpen(false);

      // Set up real-time listener for task completion
      if (data?.taskId) {
        const channel = supabase.channel(`task-${data.taskId}`).on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'background_tasks',
          filter: `id=eq.${data.taskId}`
        }, payload => {
          if (payload.new.status === 'completed') {
            toast({
              title: "✅ Fulfillment Completed",
              description: <div className="space-y-1">
                      <div>PO: <strong>{poNumber}</strong></div>
                      <div>Successfully fulfilled {quantity} units from stock</div>
                    </div>
            });
            fetchPOOrders(true);
            channel.unsubscribe();
          } else if (payload.new.status === 'failed') {
            toast({
              title: "❌ Fulfillment Failed",
              description: payload.new.metadata?.error || 'Unknown error',
              variant: "destructive"
            });
            channel.unsubscribe();
          }
        }).subscribe();
      } else {
        // Fallback: refresh after a short delay if no taskId
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['po-orders'] });
          fetchPOOrders(true);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error starting fulfillment:', error);
      toast({
        title: "Error Starting Fulfillment",
        description: error.message || 'Failed to send a request to the Edge Function',
        variant: "destructive"
      });
      setFulfillDialogOpen(false);
    } finally {
      setIsFulfilling(false);
    }
  };

  // Delete all PO orders for fresh upload
  const handleDeleteAllPO = async () => {
    await deletePOOrders();
  };

  // Delete specific PO orders
  const handleDeletePO = async (poNumber: string, orders: POOrder[]) => {
    console.log('🗑️ Delete PO:', {
      poNumber,
      orderCount: orders.length,
      orderIds: orders.map(o => o.id)
    });
    const orderIds = orders.map(order => order.id);
    await deletePOOrders(orderIds);
  };

  // Delete today's uploads for selected country
  const handleDeleteTodayUploads = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayOrders = poOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      const isToday = orderDate >= todayStart && orderDate <= todayEnd;
      return isToday;
    });
    console.log('🗑️ Delete Today Uploads:', {
      selectedCountry,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      totalOrders: poOrders.length,
      todayOrdersCount: todayOrders.length,
      orderIds: todayOrders.map(o => o.id).slice(0, 5)
    });
    if (todayOrders.length === 0) {
      toast({
        title: "No Orders Found",
        description: `No PO orders uploaded today for ${selectedCountry}`,
        variant: "destructive"
      });
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete ${todayOrders.length} PO orders uploaded today from ${selectedCountry}?\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    try {
      const orderIds = todayOrders.map(order => order.id);
      await deletePOOrders(orderIds);
      toast({
        title: "Success",
        description: `Deleted ${todayOrders.length} PO orders from ${selectedCountry}`
      });
    } catch (error) {
      console.error('Error deleting today\'s orders:', error);
      toast({
        title: "Error",
        description: "Failed to delete today's orders",
        variant: "destructive"
      });
    }
  };

  // Parse PO numbers from input text
  const parsePONumbers = (input: string): string[] => {
    // Split by comma, newline, semicolon, or multiple spaces
    const cleaned = input.split(/[,;\n\r\s]+/).map(po => po.trim()).filter(po => po.length > 0);

    // Remove duplicates
    return [...new Set(cleaned)];
  };

  // Match PO numbers against existing orders
  const matchPONumbers = (inputPOs: string[]): {
    matched: string[];
    notFound: string[];
  } => {
    const existingPONumbers = new Set(poOrders.map(o => o.po_number));
    const matched: string[] = [];
    const notFound: string[] = [];
    inputPOs.forEach(po => {
      if (existingPONumbers.has(po)) {
        matched.push(po);
      } else {
        notFound.push(po);
      }
    });
    return {
      matched,
      notFound
    };
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (bulkDeleteMatches.matched.length === 0) {
      toast({
        title: "No POs to Delete",
        description: "No matching PO numbers found",
        variant: "destructive"
      });
      return;
    }
    setIsDeletingPOs(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete all orders matching the PO numbers
      const {
        error
      } = await supabase.from('po_orders').delete().in('po_number', bulkDeleteMatches.matched).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: `Deleted ${bulkDeleteMatches.matched.length} PO(s) successfully`
      });

      // Refresh data
      await fetchPOOrders(true);
      refetchComprehensiveMetrics();
      refetchMetrics();

      // Reset state
      setShowBulkDeleteDialog(false);
      setBulkDeleteInput('');
      setBulkDeleteMatches({
        matched: [],
        notFound: []
      });
      setBulkDeleteStep('input');
    } catch (error) {
      console.error('Error deleting POs:', error);
      toast({
        title: "Error",
        description: "Failed to delete POs",
        variant: "destructive"
      });
    } finally {
      setIsDeletingPOs(false);
    }
  };

  // Query to fetch available label templates with full data
  const {
    data: labelTemplates,
    isLoading: isLoadingTemplates
  } = useQuery({
    queryKey: ['label-templates'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const {
        data,
        error
      } = await supabase.from('label_templates').select('id, name, description, canvas_data, width, height').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching label templates:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // New query to fetch deduplicated PO metrics from database
  const {
    data: comprehensiveMetrics,
    isLoading: isLoadingComprehensiveMetrics,
    refetch: refetchComprehensiveMetrics,
    error: comprehensiveMetricsError
  } = useQuery({
    queryKey: ['po-comprehensive-metrics'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      console.log('🔄 Fetching comprehensive PO metrics for user:', user.id);
      const {
        data,
        error
      } = await supabase.rpc('get_po_comprehensive_metrics', {
        user_id_param: user.id
      });
      if (error) {
        console.error('❌ Error fetching comprehensive metrics:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }
      console.log('📊 Comprehensive metrics result:', data);
      return data?.[0] || null;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
    // 30 seconds
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Keep the existing PO group metrics query for the grouped view
  const {
    data: poGroupMetrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['po-group-metrics'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      console.log('🔄 Fetching PO group metrics (includes all items)...');
      const {
        data,
        error
      } = await supabase.rpc('get_po_group_metrics', {
        user_id_param: user.id
      });
      if (error) {
        console.error('Error fetching PO group metrics:', error);
        throw error;
      }
      console.log('📊 PO group metrics fetched:', (data as any)?.length, 'POs');
      return (data || []) as Array<{
        po_number: string;
        total_line_items: number;
        asn_quantity: number;
      }>;
    },
    enabled: !!profile?.id,
    staleTime: 0,
    // Force fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });
  useEffect(() => {
    console.log('🔍 POTracker: Checking initial data fetch conditions', {
      hasProfile: !!profile,
      profileId: profile?.id,
      selectedCountry,
      profileLoading
    });

    // Always fetch when we have a user, don't wait for profile
    const fetchData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user && selectedCountry) {
        console.log('✅ POTracker: Auth confirmed, fetching POs directly', {
          userId: user.id,
          country: selectedCountry
        });
        fetchPOOrders(true); // Load ALL orders by default
        initializeQZ();

        // Country-specific settings
        if (selectedCountry === 'UAE') {
          setItemsPerPage(50);
        } else if (selectedCountry === 'KSA') {
          setItemsPerPage(25);
        }
      }
    };
    fetchData();
  }, [selectedCountry]); // Removed profile dependency

  useEffect(() => {
    console.log('📊 POTracker: poOrders updated', {
      length: poOrders.length,
      isLoading,
      selectedCountry,
      sampleOrders: poOrders.slice(0, 2).map(o => ({
        po: o.po_number,
        country: o.country
      }))
    });
  }, [poOrders, isLoading, selectedCountry]);

  // Listen to QZ Tray connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      console.log('🔌 QZ Tray connection status changed:', {
        connected
      });
      setQzConnected(connected);
      if (connected) {
        loadPrinters();
      }
    };
    qzConnectionManager.addConnectionListener(handleConnectionChange);

    // Check initial connection status
    const initialStatus = qzConnectionManager.getConnectionStatus();
    console.log('🔌 Initial QZ Tray status:', initialStatus);
    setQzConnected(initialStatus);
    return () => {
      qzConnectionManager.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  // Log QZ and printer state changes
  useEffect(() => {
    console.log('📋 Print Requirements State:', {
      qzConnected,
      selectedPrinter,
      availablePrinters: availablePrinters.length,
      selectedItemsCount: selectedForPrint.size,
      canPrint: qzConnected && selectedPrinter && selectedForPrint.size > 0
    });
  }, [qzConnected, selectedPrinter, availablePrinters, selectedForPrint.size]);
  const initializeQZ = async () => {
    console.log('🔌 Initializing QZ Tray connection...');
    try {
      const connected = await qzConnectionManager.connect();
      console.log('🔌 QZ Tray connection result:', {
        connected
      });
      setQzConnected(connected);
      if (connected) {
        const printers = await qzConnectionManager.getPrinters();
        console.log('🖨️ QZ Tray printers found:', {
          count: printers.length,
          printers
        });
        setAvailablePrinters(printers);

        // Set default printer
        const defaultPrinter = await qzConnectionManager.getDefaultPrinter();
        console.log('🎯 QZ Tray default printer:', defaultPrinter);
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
          console.log('📌 QZ Tray using first printer:', printers[0]);
        }
        toast({
          title: "QZ Tray Connected",
          description: `Found ${printers.length} printer(s)`
        });
      } else {
        console.warn('⚠️ QZ Tray connection failed - print button will be disabled');
        setQzConnected(false);
      }
    } catch (error) {
      console.error('❌ Failed to connect to QZ Tray:', error);
      setQzConnected(false);
      toast({
        title: "QZ Tray Connection Failed",
        description: "Make sure QZ Tray is running and try again",
        variant: "destructive"
      });
    }
  };

  // Refetch metrics when PO orders change - Fixed to prevent infinite loop
  useEffect(() => {
    if (!isLoading && refetchMetrics && refetchComprehensiveMetrics) {
      refetchMetrics();
      refetchComprehensiveMetrics();
    }
  }, [poOrders?.length, isLoading]); // Only depend on length, not the functions

  // Auto-expand Print Configuration when entering print step
  useEffect(() => {
    if (labelsStep === 'print') {
      console.log('📋 Auto-expanding Print Configuration (entered print step)');
      setIsPrintConfigCollapsed(false);
    }
  }, [labelsStep]);

  // Fetch inventory data for matching - Fetch ALL inventory across all countries
  const fetchInventoryData = useCallback(async () => {
    console.log('🔄 fetchInventoryData called, profile:', profile?.id);
    if (!profile?.id) {
      console.log('⚠️ No profile ID, skipping inventory fetch');
      return;
    }
    console.log('🚀 Starting inventory fetch WITH PAGINATION...');
    try {
      // Fetch ALL data using pagination to bypass Supabase limits
      let allAsinData: any[] = [];
      let allSkuData: any[] = [];
      let asinPage = 0;
      let skuPage = 0;
      const pageSize = 1000;

      // Fetch all ASIN inventory in batches
      while (true) {
        const {
          data,
          error
        } = await supabase.from('asin_inventory').select('*').eq('user_id', profile.id).order('created_at', {
          ascending: false
        }).range(asinPage * pageSize, (asinPage + 1) * pageSize - 1);
        if (error) {
          console.error('❌ Error fetching ASIN inventory page', asinPage, error);
          break;
        }
        if (!data || data.length === 0) break;
        allAsinData = [...allAsinData, ...data];
        console.log(`📦 Loaded ASIN page ${asinPage + 1}, total so far: ${allAsinData.length}`);
        if (data.length < pageSize) break; // Last page
        asinPage++;
      }

      // Fetch all SKU inventory in batches
      while (true) {
        const {
          data,
          error
        } = await supabase.from('sku_inventory').select('*').eq('user_id', profile.id).order('created_at', {
          ascending: false
        }).range(skuPage * pageSize, (skuPage + 1) * pageSize - 1);
        if (error) {
          console.error('❌ Error fetching SKU inventory page', skuPage, error);
          break;
        }
        if (!data || data.length === 0) break;
        allSkuData = [...allSkuData, ...data];
        console.log(`📦 Loaded SKU page ${skuPage + 1}, total so far: ${allSkuData.length}`);
        if (data.length < pageSize) break; // Last page
        skuPage++;
      }
      const asinData = allAsinData;
      const skuData = allSkuData;
      const hasTargetAsin = asinData.some(i => i.asin === 'B0DYG67SLZ');
      const targetAsinDetails = asinData.filter(i => i.asin === 'B0DYG67SLZ');
      console.log('✅ ALL Inventory Data Loaded:', {
        asinCount: asinData.length,
        skuCount: skuData.length,
        hasB0DYG67SLZ: hasTargetAsin,
        B0DYG67SLZ_details: targetAsinDetails,
        hasB0DYFRB7S6: asinData.some(i => i.asin === 'B0DYFRB7S6'),
        countries: [...new Set(asinData.map(i => i.country))],
        sampleAsins: asinData.slice(0, 10).map(item => ({
          asin: item.asin,
          serial: item.serial_number,
          qty: item.quantity,
          country: item.country
        }))
      });
      setInventoryData({
        asinInventory: asinData,
        skuInventory: skuData
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setInventoryData({
        asinInventory: [],
        skuInventory: []
      });
    }
  }, [profile?.id]);

  // OPTIMIZED: Function to find inventory match using Map lookups - 1000x faster!
  const findInventoryMatch = useCallback((asin: string, sunskySku?: string, poSku?: string, modelNumber?: string, orderSunskySku?: any) => {
    // Early exit if no identifiers
    if (!asin && !sunskySku && !poSku && !modelNumber) {
      return null;
    }

    // Check ASIN inventory FIRST using Map (O(1) lookup instead of O(n) filter)
    if (asin && inventoryMaps.asinMap.size > 0) {
      const asinKey = asin.trim().toUpperCase();
      const asinMatches = inventoryMaps.asinMap.get(asinKey);
      if (asinMatches && asinMatches.length > 0) {
        // Get all serial numbers from matching items (regardless of quantity)
        const serialNumbers = asinMatches.filter(item => item.serial_number && item.serial_number.trim()).map(item => item.serial_number.trim());
        const totalQuantity = asinMatches.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);

        // Show serial numbers if they exist, even for items with 0 quantity
        if (serialNumbers.length > 0) {
          return {
            type: 'ASIN',
            status: totalQuantity > 0 ? 'in-stock' : 'ordered',
            quantity: totalQuantity,
            identifier: asin,
            serialNumbers: serialNumbers,
            inventoryItems: asinMatches
          };
        }

        // If no serial numbers but positive quantity, still show as in stock
        if (totalQuantity > 0) {
          return {
            type: 'ASIN',
            status: 'in-stock',
            quantity: totalQuantity,
            identifier: asin,
            serialNumbers: null,
            inventoryItems: asinMatches
          };
        }
      }
    }

    // Check SKU inventory using Map lookups (O(1) instead of O(n))
    if (inventoryMaps.skuMap.size > 0) {
      const skusToCheck = [sunskySku, poSku, modelNumber, asin].filter(Boolean);
      for (const sku of skusToCheck) {
        const skuKey = sku.trim().toUpperCase();
        const skuMatch = inventoryMaps.skuMap.get(skuKey);
        if (skuMatch) {
          const quantity = parseInt(skuMatch.quantity) || 0;
          // Show SKU matches even with 0 quantity if they have a bin serial number
          if (quantity > 0 || skuMatch.bin_serial_number) {
            return {
              type: 'SKU',
              status: quantity > 0 ? skuMatch.status : 'ordered',
              quantity: quantity,
              identifier: sku,
              serialNumber: skuMatch.bin_serial_number,
              inventoryItem: skuMatch
            };
          }
        }
      }
    }

    // ONLY if no actual inventory is found, show Sunsky match as fallback
    if (orderSunskySku) {
      return {
        type: 'SUNSKY',
        status: 'sunsky-match',
        quantity: 1,
        identifier: orderSunskySku.sku_code,
        sunskyData: orderSunskySku
      };
    }
    return null;
  }, [inventoryMaps]);

  // Wrapper to enrich orders with inventory quantity before passing to print dialog
  const setPrintOrders = useCallback((orders: POOrder[]) => {
    const enriched = orders.map(order => {
      const match = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
      return {
        ...order,
        _inventoryQty: match && match.status === 'in-stock' ? match.quantity : 0,
        _inventoryStatus: match?.status || undefined,
      } as any;
    });
    setPrintOrdersBase(enriched);
  }, [findInventoryMatch]);

  // Memoized metrics calculations for all cards (PHASE 1: Performance optimization)
  const calculatedMetrics = useMemo(() => {
    const startTime = performance.now();
    console.log('📊 Calculating metrics for', poOrders.length, 'orders...');

    // In Stock - items with ASIN matches and quantity > 0
    const inStockOrders = poOrders.filter(order => {
      if (!order.asin) return false;
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
      return inventoryMatch && inventoryMatch.quantity > 0;
    });

    // Out of Stock - items with ASIN matches but quantity = 0
    const outOfStockOrders = poOrders.filter(order => {
      if (!order.asin) return false;
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
      return inventoryMatch && inventoryMatch.quantity === 0;
    });

    // Not Matched - items without sunsky_sku
    const notMatchedOrders = poOrders.filter(order => !order.sunsky_sku);

    // Matched - items with sunsky_sku
    const matchedOrders = poOrders.filter(order => order.sunsky_sku !== null);

    // Placed - items with supplier_order_number (placed to Sunsky source)
    const placedOrders = poOrders.filter(order => order.supplier_order_number);

    // Pending - items with sunsky_sku but NO supplier_order_number (matched but not placed to source)
    const pendingOrders = poOrders.filter(order => order.sunsky_sku && !order.supplier_order_number);

    // Calculate quantities
    const inStockQty = inStockOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const outOfStockQty = outOfStockOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const notMatchedQty = notMatchedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const matchedQty = matchedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const placedQty = placedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const pendingQty = pendingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    // Calculate total value if cost data available
    const totalValue = poOrders.reduce((sum, o) => sum + (o.unit_cost || 0) * (o.quantity || 0), 0);
    const placedValue = placedOrders.reduce((sum, o) => sum + (o.unit_cost || 0) * (o.quantity || 0), 0);
    const pendingValue = pendingOrders.reduce((sum, o) => sum + (o.unit_cost || 0) * (o.quantity || 0), 0);

    // Fulfillment rate
    const totalMatchedCount = matchedOrders.length;
    const fulfilledCount = placedOrders.length;
    const fulfillmentRate = totalMatchedCount > 0 ? fulfilledCount / totalMatchedCount * 100 : 0;

    // Calculate print metrics (NEW)
    const totalPrintedOrders = poOrders.filter(order => {
      const printedQty = order.printed_quantity || 0;
      return order.is_printed === true || printedQty > 0;
    });
    const partiallyPrintedOrders = poOrders.filter(order => {
      const printed = order.printed_quantity || 0;
      const total = order.quantity || 0;
      return printed > 0 && printed < total;
    });
    const fullyPrintedOrders = poOrders.filter(order => {
      const printed = order.printed_quantity || 0;
      const total = order.quantity || 0;
      return printed > 0 && printed >= total;
    });
    const notPrintedOrders = poOrders.filter(order => {
      const printedQty = order.printed_quantity || 0;
      return !order.is_printed && printedQty === 0;
    });

    // Calculate printed quantities
    const totalPrintedQty = poOrders.reduce((sum, o) => sum + (o.printed_quantity || 0), 0);
    const totalQty = poOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const printCompletionRate = totalQty > 0 ? totalPrintedQty / totalQty * 100 : 0;

    // Source breakdown (Sunsky matching)
    const sunskyMatchedOrders = poOrders.filter(order => order.sunsky_sku && (order.sunsky_sku.sku_code || order.sunsky_sku.id));
    const sunskyMatchedQty = sunskyMatchedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    // notMatchedQty already calculated above

    console.log('📊 Source Metrics:', {
      total: poOrders.length,
      sunskyMatched: sunskyMatchedOrders.length,
      notMatched: notMatchedOrders.length,
      sampleSunsky: sunskyMatchedOrders.slice(0, 2).map(o => ({
        sku_code: o.sku_code,
        sunsky_sku_code: o.sunsky_sku?.sku_code
      })),
      sampleNotMatched: notMatchedOrders.slice(0, 2).map(o => ({
        sku_code: o.sku_code,
        sunsky_sku: o.sunsky_sku
      }))
    });
    const endTime = performance.now();
    console.log('📊 Metrics calculated in', (endTime - startTime).toFixed(2), 'ms');
    return {
      inStock: {
        orders: inStockOrders,
        count: inStockOrders.length,
        qty: inStockQty
      },
      outOfStock: {
        orders: outOfStockOrders,
        count: outOfStockOrders.length,
        qty: outOfStockQty
      },
      notMatched: {
        orders: notMatchedOrders,
        count: notMatchedOrders.length,
        qty: notMatchedQty
      },
      matched: {
        orders: matchedOrders,
        count: matchedOrders.length,
        qty: matchedQty
      },
      placed: {
        orders: placedOrders,
        count: placedOrders.length,
        qty: placedQty,
        value: placedValue
      },
      pending: {
        orders: pendingOrders,
        count: pendingOrders.length,
        qty: pendingQty,
        value: pendingValue
      },
      totalValue,
      fulfillmentRate,
      printed: {
        totalPrinted: totalPrintedOrders.length,
        totalPrintedQty,
        fullyPrinted: fullyPrintedOrders.length,
        partiallyPrinted: partiallyPrintedOrders.length,
        notPrinted: notPrintedOrders.length,
        printCompletionRate
      },
      source: {
        sunskyMatched: {
          count: sunskyMatchedOrders.length,
          qty: sunskyMatchedQty,
          orders: sunskyMatchedOrders
        },
        notMatched: {
          count: notMatchedOrders.length,
          qty: notMatchedQty,
          orders: notMatchedOrders
        }
      }
    };
  }, [poOrders, inventoryMaps, findInventoryMatch]);

  // Fetch inventory data when profile loads
  useEffect(() => {
    console.log('🚀 POTracker mounted, profile:', profile?.id);
    if (profile?.id) {
      console.log('🚀 Calling fetchInventoryData...');
      fetchInventoryData();
    }
  }, [profile?.id, fetchInventoryData]);

  // Real-time subscription for inventory updates
  useEffect(() => {
    if (!profile?.id) return;
    console.log('🔄 Setting up real-time inventory subscription');
    const channel = supabase.channel('inventory-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'asin_inventory',
      filter: `user_id=eq.${profile.id}`
    }, payload => {
      console.log('📦 ASIN inventory updated:', payload);
      fetchInventoryData();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sku_inventory',
      filter: `user_id=eq.${profile.id}`
    }, payload => {
      console.log('📦 SKU inventory updated:', payload);
      fetchInventoryData();
    }).subscribe();
    return () => {
      console.log('🔄 Cleaning up inventory subscription');
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchInventoryData]);

  // Log inventory data changes
  useEffect(() => {
    if (inventoryData) {
      console.log('📦 Inventory State Updated:', {
        asinCount: inventoryData.asinInventory?.length || 0,
        skuCount: inventoryData.skuInventory?.length || 0,
        hasB0DYG67SLZ: inventoryData.asinInventory?.some(i => i.asin === 'B0DYG67SLZ')
      });
    }
  }, [inventoryData]);

  // Extract unique ship-to locations for filter dropdown
  const uniqueShipToLocations = useMemo(() => {
    const locations = new Set<string>();
    poOrders.forEach(order => {
      if (order.ship_to_location) {
        locations.add(order.ship_to_location);
      }
    });
    return ['all', ...Array.from(locations).sort()];
  }, [poOrders]);

  // Filter orders for label printing (exclude truly cancelled orders but keep fulfilled ones)
  const labelEligibleOrders = useMemo(() => {
    return poOrders.filter(order => order.status !== 'cancelled');
  }, [poOrders]);
  const filteredOrders = useMemo(() => {
    const filterStartTime = performance.now();
    let filtered = [...poOrders];
    console.log('🔍 FILTERING START:', {
      totalOrders: poOrders.length,
      selectedCountry,
      searchQuery: debouncedSearchQuery,
      statusFilter
    });

    // Debug specific PO before any filtering
    const debugPO = '4BO4YUAQ';
    const debugPOItems = poOrders.filter(o => o.po_number === debugPO);
    console.log(`🔍 PO ${debugPO} BEFORE FILTERING:`, {
      itemsFound: debugPOItems.length,
      totalQty: debugPOItems.reduce((sum, o) => sum + (o.quantity || 0), 0),
      statuses: [...new Set(debugPOItems.map(o => o.status))],
      countries: [...new Set(debugPOItems.map(o => o.country))]
    });

    // Apply strict country filtering - only show orders from selected country
    // Remove country filtering - show all POs regardless of selected country
    if (false) {
      const beforeCountryFilter = filtered.length;
      const countryFilteredOrders = filtered;

      // Debug specific PO after country filter
      const debugPOAfterCountry = countryFilteredOrders.filter(o => o.po_number === debugPO);
      console.log(`🔍 PO ${debugPO} AFTER COUNTRY FILTER:`, {
        itemsRemaining: debugPOAfterCountry.length,
        totalQty: debugPOAfterCountry.reduce((sum, o) => sum + (o.quantity || 0), 0)
      });

      // Always apply country filter strictly - no fallback
      filtered = countryFilteredOrders;
      console.log('🔍 FILTERING DEBUG: After country filter:', filtered.length, 'orders (was', beforeCountryFilter, 'for country', selectedCountry, ')');
      if (countryFilteredOrders.length === 0 && beforeCountryFilter > 0) {
        const availableCountries = [...new Set(poOrders.map(order => order.country).filter(Boolean))];
        console.log(`🌍 Available countries in data:`, availableCountries);
      }
    }

    // Use debounced search for all tabs to improve performance
    const currentSearchQuery = activeTab === 'labels' ? debouncedLabelSearch.trim() : debouncedSearchQuery.trim();

    // Combine search tags and current query for filtering
    const allSearchTerms = [...searchTags];
    if (currentSearchQuery) {
      allSearchTerms.push(currentSearchQuery);
    }
    if (allSearchTerms.length > 0) {
      const searchTerms = allSearchTerms.map(term => term.toLowerCase()).filter(term => term && term.length > 0);
      console.log('🔍 FILTERING DEBUG: Search terms:', searchTerms, 'Search type:', searchType);

      // Only filter if we have valid search terms
      if (searchTerms.length > 0) {
        filtered = filtered.filter(order => {
          // Check if ANY search term matches based on selected search type
          return searchTerms.some(lowerCaseQuery => {
            // EARLY EXIT: For PO number and title search, skip inventory lookups (much faster)
            if (searchType === 'po_number') {
              return order.po_number.toLowerCase().includes(lowerCaseQuery);
            }
            if (searchType === 'title') {
              return order.title?.toLowerCase().includes(lowerCaseQuery);
            }

            // Search based on selected type
            if (searchType === 'asin') {
              const asinMatch = order.asin?.toLowerCase().includes(lowerCaseQuery);
              // Debug specific ASIN searches
              if (lowerCaseQuery.includes('b0dyg3mgnt') || order.asin?.toLowerCase().includes('b0dyg3mgnt')) {
                console.log('🔍 ASIN SEARCH DEBUG:', {
                  searchQuery: lowerCaseQuery,
                  orderAsin: order.asin,
                  orderAsinLower: order.asin?.toLowerCase(),
                  matches: asinMatch,
                  country: order.country,
                  status: order.status,
                  poNumber: order.po_number
                });
              }
              return asinMatch;
            }
            if (searchType === 'sku') {
              // Check both order SKU and inventory SKU
              const basicSkuMatch = order.sku_code?.toLowerCase().includes(lowerCaseQuery) || order.model_number?.toLowerCase().includes(lowerCaseQuery);
              const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
              if (inventoryMatch && inventoryMatch.type === 'SKU' && inventoryMatch.inventoryItem) {
                const item = inventoryMatch.inventoryItem;
                return basicSkuMatch || item.sku_number?.toLowerCase().includes(lowerCaseQuery) || item.asin?.toLowerCase().includes(lowerCaseQuery);
              }
              return basicSkuMatch;
            }
            if (searchType === 'serial') {
              // Debug: Log what we're searching for and what's available
              if (lowerCaseQuery === '00340') {
                console.log('🔍 DEBUG SERIAL SEARCH "00340":', {
                  serialMapSize: inventoryMaps.serialMap.size,
                  allSerials: Array.from(inventoryMaps.serialMap.keys()),
                  serialsContaining00340: Array.from(inventoryMaps.serialMap.keys()).filter(s => s.includes('00340') || s.includes('00340'.toUpperCase())),
                  orderBeingChecked: {
                    po: order.po_number,
                    asin: order.asin,
                    sku: order.sku_code,
                    model: order.model_number,
                    title: order.title
                  }
                });
              }

              // OPTIMIZED: Search serial numbers DIRECTLY in the serialMap
              // Find inventory items with matching serial, then check if order matches those items

              // First, collect all ASINs/SKUs that have the searched serial number
              const matchingProducts = new Set<string>();
              for (const [serialKey, item] of inventoryMaps.serialMap.entries()) {
                if (serialKey.toLowerCase().includes(lowerCaseQuery)) {
                  // Add all identifiers from this inventory item
                  if (item.asin) matchingProducts.add(item.asin.trim().toUpperCase());
                  if (item.sku) matchingProducts.add(item.sku.trim().toUpperCase());
                  if (item.sku_number) matchingProducts.add(item.sku_number.trim().toUpperCase());
                  console.log('🔍 Found serial match in map:', {
                    serialKey,
                    itemASIN: item.asin,
                    itemSKU: item.sku || item.sku_number,
                    itemType: item.sku_number ? 'SKU' : 'ASIN'
                  });
                }
              }
              if (matchingProducts.size > 0) {
                console.log('📋 Products with serial "' + lowerCaseQuery + '":', Array.from(matchingProducts));
              }

              // Now check if THIS order matches any of those products
              const orderMatches = order.asin && matchingProducts.has(order.asin.trim().toUpperCase()) || order.sku_code && matchingProducts.has(order.sku_code.trim().toUpperCase()) || order.model_number && matchingProducts.has(order.model_number.trim().toUpperCase());
              if (orderMatches) {
                console.log('✅ SERIAL MATCH - Order has product with serial:', {
                  searchQuery: lowerCaseQuery,
                  orderPO: order.po_number,
                  orderASIN: order.asin,
                  orderSKU: order.sku_code,
                  orderModel: order.model_number,
                  matchingProducts: Array.from(matchingProducts)
                });
              }
              return orderMatches;
            }

            // Default 'all' - search across all fields
            const basicMatch = order.po_number.toLowerCase().includes(lowerCaseQuery) || order.sku_code?.toLowerCase().includes(lowerCaseQuery) || order.asin?.toLowerCase().includes(lowerCaseQuery) || order.model_number?.toLowerCase().includes(lowerCaseQuery) || order.title?.toLowerCase().includes(lowerCaseQuery);

            // Check inventory serial numbers and SKU for 'all' search
            const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
            let inventoryDataMatch = false;
            if (inventoryMatch) {
              // Check ASIN inventory serial numbers
              if (inventoryMatch.serialNumbers && inventoryMatch.serialNumbers.length > 0) {
                inventoryDataMatch = inventoryMatch.serialNumbers.some(serial => serial?.toLowerCase().includes(lowerCaseQuery));
              }
              // Check SKU inventory serial number (bin number)
              if (inventoryMatch.serialNumber) {
                inventoryDataMatch = inventoryDataMatch || inventoryMatch.serialNumber.toLowerCase().includes(lowerCaseQuery);
              }
              // Also check the identifier from inventory match (includes SKU codes)
              if (inventoryMatch.identifier) {
                inventoryDataMatch = inventoryDataMatch || inventoryMatch.identifier.toLowerCase().includes(lowerCaseQuery);
              }
              // Check inventory items' SKU numbers for SKU type matches
              if (inventoryMatch.type === 'SKU' && inventoryMatch.inventoryItem) {
                const item = inventoryMatch.inventoryItem;
                inventoryDataMatch = inventoryDataMatch || item.sku_number?.toLowerCase().includes(lowerCaseQuery) || item.asin?.toLowerCase().includes(lowerCaseQuery);
              }
            }
            return basicMatch || inventoryDataMatch;
          });
        });
        console.log('🔍 FILTERING DEBUG: After search filter:', filtered.length, 'orders');
      }
    }

    // Filter by selected POs when in overview tab and detailed view with selections
    if (activeTab === 'overview' && viewMode === 'detailed' && selectedPOsForLabels.size > 0) {
      const selectedPOsList = Array.from(selectedPOsForLabels);
      console.log('🔍 FILTERING DEBUG: Applying PO filter for:', selectedPOsList);
      const beforePOFilter = filtered.length;
      filtered = filtered.filter(order => {
        const matches = selectedPOsList.includes(order.po_number);
        if (!matches && selectedPOsList.includes('8RGH1C7S') && order.po_number === '8RGH1C7S') {
          console.log('🔍 FILTERING DEBUG: PO comparison issue - selected:', selectedPOsList[0], 'order:', order.po_number, 'equal:', selectedPOsList[0] === order.po_number);
        }
        return matches;
      });
      console.log('🔍 FILTERING DEBUG: After PO filter:', filtered.length, 'orders (was', beforePOFilter, ')');
      console.log('🔍 FILTERING DEBUG: Sample filtered PO numbers:', filtered.slice(0, 5).map(o => o.po_number));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
      console.log('🔍 FILTERING DEBUG: After status filter:', filtered.length, 'orders');
    }

    // Apply ship-to location filter
    if (shipToFilter !== 'all') {
      filtered = filtered.filter(order => order.ship_to_location === shipToFilter);
      console.log('🔍 FILTERING DEBUG: After ship-to filter:', filtered.length, 'orders');
    }

    // Apply printed status filter (NEW)
    if (printedFilter.length > 0) {
      filtered = filtered.filter(order => {
        const printedQty = order.printed_quantity || 0;
        const totalQty = order.quantity || 0;
        const isPrinted = order.is_printed || printedQty > 0;

        // Check if order matches any of the selected print statuses
        return printedFilter.some(status => {
          if (status === 'printed') {
            // Fully printed: printed_quantity >= quantity
            return isPrinted && printedQty >= totalQty;
          } else if (status === 'partial-printed') {
            // Partially printed: 0 < printed_quantity < quantity
            return isPrinted && printedQty > 0 && printedQty < totalQty;
          } else if (status === 'not-printed') {
            // Not printed: printed_quantity = 0 or is_printed = false
            return !isPrinted || printedQty === 0;
          }
          return false;
        });
      });
      console.log('🔍 FILTERING DEBUG: After print status filter:', filtered.length, 'orders');
    }

    // Apply source filter (Sunsky matching) (NEW)
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(order => {
        // Check if sunsky_sku exists and has actual data
        const hasSunskyMatch = order.sunsky_sku && (order.sunsky_sku.sku_code || order.sunsky_sku.id);
        if (sourceFilter === 'sunsky-matched') {
          return hasSunskyMatch;
        } else if (sourceFilter === 'not-matched') {
          return !hasSunskyMatch;
        }
      });
      console.log('🔍 FILTERING DEBUG: After source filter:', filtered.length, 'orders');
    }

    // Apply fulfillment status filter (NEW)
    if (fulfillmentFilter.length > 0) {
      filtered = filtered.filter(order => {
        const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
        if (!isFulfilledFromStock) {
          return false; // Not fulfilled from stock at all
        }

        // Extract fulfilled quantity from notes
        const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
        const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
        const totalQty = order.quantity || 0;
        return fulfillmentFilter.some(status => {
          if (status === 'fully-fulfilled') {
            // Fully fulfilled from stock: fulfilled quantity >= total quantity
            return fulfilledQty >= totalQty;
          } else if (status === 'partial-fulfilled') {
            // Partially fulfilled from stock: 0 < fulfilled quantity < total quantity
            return fulfilledQty > 0 && fulfilledQty < totalQty;
          }
          return false;
        });
      });
      console.log('🔍 FILTERING DEBUG: After fulfillment filter:', filtered.length, 'orders');
    }

    // Apply in-stock filter (uses same logic as Stock Qty column)
    if (instockFilter.length > 0) {
      filtered = filtered.filter(order => {
        // Check if fully fulfilled or fully printed (shown as "Closed" in Stock Qty column)
        const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
        const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
        const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
        const isFullyFulfilled = isFulfilledFromStock && fulfilledQty >= order.quantity;
        const isFullyPrinted = (order.printed_quantity || 0) >= order.quantity;
        
        // If closed (fully fulfilled or printed), treat as out-of-stock
        if (isFullyFulfilled || isFullyPrinted) {
          return instockFilter.includes('out-of-stock');
        }
        
        const match = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
        // Match the Stock Qty column: green badge shown when status === 'in-stock'
        const isInStock = match && match.status === 'in-stock';
        return instockFilter.some(status => {
          if (status === 'in-stock') return isInStock;
          if (status === 'out-of-stock') return !isInStock;
          return false;
        });
      });
      console.log('🔍 FILTERING DEBUG: After in-stock filter:', filtered.length, 'orders');
    }

    // Apply sorting (only if table reordering is not prevented)
    if (!preventTableReorder) {
      console.log('🔄 SORT: Applying sort - Field:', sortField, 'Direction:', sortDirection, 'Items to sort:', filtered.length);
      filtered.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        // Handle special case for in-stock quantity sorting
        if (sortField === 'instock_qty') {
          const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
          const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
          const aQty = aMatch && aMatch.status === 'in-stock' ? aMatch.quantity : 0;
          const bQty = bMatch && bMatch.status === 'in-stock' ? bMatch.quantity : 0;
          return sortDirection === 'asc' ? aQty - bQty : bQty - aQty;
        }
        // Handle special case for serial number sorting (from inventory match)
        if (sortField === 'serial_number_qty') {
          const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
          const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
          const aSN = aMatch?.serialNumbers?.[0] || aMatch?.serialNumber || aMatch?.inventoryItem?.serial_number || '';
          const bSN = bMatch?.serialNumbers?.[0] || bMatch?.serialNumber || bMatch?.inventoryItem?.serial_number || '';
          const aHas = aSN.length > 0;
          const bHas = bSN.length > 0;
          // Push blanks to bottom always
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          if (!aHas && !bHas) return 0;
          // Both have S/N — sort by value respecting direction
          const cmp = aSN.localeCompare(bSN, undefined, { numeric: true, sensitivity: 'base' });
          return sortDirection === 'asc' ? cmp : -cmp;
        }
        if (sortField === 'combined_title') {
          aValue = `${a.title || ''} ${a.asin || ''}`.toLowerCase();
          bValue = `${b.title || ''} ${b.asin || ''}`.toLowerCase();
        } else {
          aValue = a[sortField];
          bValue = b[sortField];
        }

        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

        // Handle numeric fields (quantity, unit_cost, total_cost)
        if (sortField === 'quantity' || sortField === 'unit_cost' || sortField === 'total_cost') {
          const aNum = Number(aValue) || 0;
          const bNum = Number(bValue) || 0;
          const result = sortDirection === 'asc' ? aNum - bNum : bNum - aNum;

          // Debug log for quantity sorting
          if (sortField === 'quantity') {
            console.log('🔄 SORT QUANTITY: Comparing', aNum, 'vs', bNum, '=> result:', result, 'direction:', sortDirection);
          }
          return result;
        }

        // Handle date fields
        if (sortField === 'order_date' || sortField === 'expected_delivery' || sortField === 'created_at' || sortField === 'updated_at') {
          const aDate = new Date(aValue as string).getTime();
          const bDate = new Date(bValue as string).getTime();
          return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
        }

        // Convert to string for comparison (text fields)
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      // Debug: show first few sorted items
      if (sortField === 'quantity') {
        console.log('🔄 SORT QUANTITY: First 5 sorted quantities:', filtered.slice(0, 5).map(o => o.quantity));
      }
    } else {
      console.log('🔄 SORT: Table reordering is prevented');
    }
    const filterEndTime = performance.now();
    const filterDuration = filterEndTime - filterStartTime;
    console.log('🔍 FILTERING DEBUG: Final filtered orders:', filtered.length, `(took ${filterDuration.toFixed(2)}ms)`);
    if (filterDuration > 100) {
      console.warn('⚠️ SLOW FILTER:', `${filterDuration.toFixed(2)}ms - Consider further optimization`);
    }
    return filtered;
  }, [poOrders, debouncedSearchQuery, debouncedLabelSearch, searchType, statusFilter, shipToFilter, printedFilter, sourceFilter, fulfillmentFilter, instockFilter, sortField, sortDirection, activeTab, viewMode, selectedPOsForLabels, labelEligibleOrders, preventTableReorder, selectedCountry, inventoryMaps, findInventoryMatch, searchTags]);

  // Helper function to get orders matching current print status filter
  const getOrdersByPrintStatus = useCallback(() => {
    if (printedFilter.length === 0) {
      // If no filter, return all non-cancelled orders
      return poOrders.filter(order => order.status !== 'cancelled');
    }
    return poOrders.filter(order => {
      if (order.status === 'cancelled') return false;
      const printedQty = order.printed_quantity || 0;
      const totalQty = order.quantity || 0;
      const isPrinted = order.is_printed || printedQty > 0;
      return printedFilter.some(status => {
        if (status === 'printed') {
          return isPrinted && printedQty >= totalQty;
        } else if (status === 'partial-printed') {
          return isPrinted && printedQty > 0 && printedQty < totalQty;
        } else if (status === 'not-printed') {
          return !isPrinted || printedQty === 0;
        }
        return false;
      });
    });
  }, [poOrders, printedFilter]);

  // Helper function to get orders count matching print status AND selected POs
  const getSelectedPOsOrdersByPrintStatus = useCallback(() => {
    // If no POs selected, return empty array
    if (selectedPOsForLabels.size === 0) {
      return [];
    }

    // Step 1: Filter by selected POs
    const selectedPOsList = Array.from(selectedPOsForLabels);
    const baseOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled');

    // Step 2: Apply print status filter
    if (printedFilter.length === 0) {
      return baseOrders;
    }
    return baseOrders.filter(order => {
      const printedQty = order.printed_quantity || 0;
      const totalQty = order.quantity || 0;
      const isPrinted = order.is_printed || printedQty > 0;
      return printedFilter.some(status => {
        if (status === 'printed') {
          return isPrinted && printedQty >= totalQty;
        } else if (status === 'partial-printed') {
          return isPrinted && printedQty > 0 && printedQty < totalQty;
        } else if (status === 'not-printed') {
          return !isPrinted || printedQty === 0;
        }
        return false;
      });
    });
  }, [poOrders, printedFilter, selectedPOsForLabels]);

  // Helper function to get orders matching source filter AND selected POs
  const getSelectedPOsOrdersBySource = useCallback(() => {
    if (selectedPOsForLabels.size === 0) return [];
    const selectedPOsList = Array.from(selectedPOsForLabels);
    const baseOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled');
    if (sourceFilter === 'all') return baseOrders;
    return baseOrders.filter(order => {
      const hasSunskyMatch = order.sunsky_sku && (order.sunsky_sku.sku_code || order.sunsky_sku.id);
      if (sourceFilter === 'sunsky-matched') return hasSunskyMatch;
      if (sourceFilter === 'not-matched') return !hasSunskyMatch;
      return true;
    });
  }, [poOrders, sourceFilter, selectedPOsForLabels]);

  // Helper function to get orders matching fulfillment filter AND selected POs
  const getSelectedPOsOrdersByFulfillment = useCallback(() => {
    if (selectedPOsForLabels.size === 0) return [];
    const selectedPOsList = Array.from(selectedPOsForLabels);
    const baseOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled');
    if (fulfillmentFilter.length === 0) return baseOrders;
    return baseOrders.filter(order => {
      const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
      if (!isFulfilledFromStock) return false;
      const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
      const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
      const totalQty = order.quantity || 0;
      return fulfillmentFilter.some(status => {
        if (status === 'fully-fulfilled') return fulfilledQty >= totalQty;
        if (status === 'partial-fulfilled') return fulfilledQty > 0 && fulfilledQty < totalQty;
        return false;
      });
    });
  }, [poOrders, fulfillmentFilter, selectedPOsForLabels]);

  // Helper function to get orders matching in-stock filter AND selected POs
  const getSelectedPOsOrdersByInstock = useCallback(() => {
    if (selectedPOsForLabels.size === 0) return [];
    const selectedPOsList = Array.from(selectedPOsForLabels);
    const baseOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled');
    if (instockFilter.length === 0) return baseOrders;
    return baseOrders.filter(order => {
      const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
      const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
      const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
      const isFullyFulfilled = isFulfilledFromStock && fulfilledQty >= order.quantity;
      const isFullyPrinted = (order.printed_quantity || 0) >= order.quantity;
      if (isFullyFulfilled || isFullyPrinted) {
        return instockFilter.includes('out-of-stock');
      }
      const match = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
      const isInStock = match && match.status === 'in-stock';
      return instockFilter.some(status => {
        if (status === 'in-stock') return isInStock;
        if (status === 'out-of-stock') return !isInStock;
        return false;
      });
    });
  }, [poOrders, instockFilter, selectedPOsForLabels, findInventoryMatch]);

  // Export PO data to CSV
  const exportPOData = useCallback(() => {
    try {
      // Get filtered orders based on current filters
      const ordersToExport = filteredOrders;
      if (ordersToExport.length === 0) {
        toast({
          title: "No data to export",
          description: "No PO orders match the current filters",
          variant: "destructive"
        });
        return;
      }

      // Define CSV headers
      const headers = ['PO Number', 'ASIN', 'Model Number', 'SKU Code', 'Title', 'Quantity', 'Status', 'Ship To Location', 'Unit Cost', 'Total Cost', 'Currency', 'Country', 'Order Date', 'Expected Delivery', 'Tracking Number', 'File Name', 'Notes', 'Created At', 'Is Printed'];

      // Convert orders to CSV rows
      const csvRows = ordersToExport.map(order => [order.po_number || '', order.asin || '', order.model_number || '', order.sku_code || '', order.title ? `"${order.title.replace(/"/g, '""')}"` : '', order.quantity || 0, order.status || '', order.ship_to_location || '', order.unit_cost || '', order.total_cost || '', order.currency || '', order.country || '', order.order_date || '', order.expected_delivery || '', order.tracking_number || '', order.file_name || '', order.notes ? `"${order.notes.replace(/"/g, '""')}"` : '', order.created_at || '', order.is_printed ? 'Yes' : 'No']);

      // Combine headers and rows
      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `po-orders-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Export successful",
        description: `Exported ${ordersToExport.length} PO orders to CSV`
      });
    } catch (error) {
      console.error('Error exporting PO data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export PO data",
        variant: "destructive"
      });
    }
  }, [filteredOrders, toast]);

  // Filtered PO Groups for labels search
  const filteredPOGroups = useMemo(() => {
    const groups: {
      [key: string]: POOrder[];
    } = {};

    // Use labelSearchQuery for the labels tab, searchQuery for others
    const query = activeTab === 'labels' ? labelSearchQuery : searchQuery;
    // For labels tab, use poOrders directly (excluding only cancelled), for other tabs use all orders
    let ordersToFilter = activeTab === 'labels' ? poOrders.filter(order => order.status !== 'cancelled') : [...poOrders];

    // Apply strict country filtering
    // Remove country filtering - show all POs regardless of selected country
    if (false) {
      const beforeCountryFilter = ordersToFilter.length;
      const countryFilteredOrders = ordersToFilter;

      // Country filter removed
      ordersToFilter = countryFilteredOrders;
      console.log('🔍 PO GROUPS DEBUG: After country filter:', ordersToFilter.length, 'orders (was', beforeCountryFilter, 'for country', selectedCountry, ')');

      // Debug specific PO
      const debugPO = '4LMT8FVZ';
      const debugOrders = ordersToFilter.filter(o => o.po_number === debugPO);
      if (debugOrders.length > 0) {
        console.log(`🔍 PO ${debugPO} in filteredPOGroups:`, {
          itemCount: debugOrders.length,
          totalQty: debugOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
          statuses: [...new Set(debugOrders.map(o => o.status))]
        });
      }
    }
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      ordersToFilter = ordersToFilter.filter(order => order.po_number.toLowerCase().includes(lowerCaseQuery) || order.asin?.toLowerCase().includes(lowerCaseQuery) || order.model_number?.toLowerCase().includes(lowerCaseQuery) || order.title?.toLowerCase().includes(lowerCaseQuery));
    }
    // Apply location filter
    if (selectedLocationFilter.size > 0) {
      ordersToFilter = ordersToFilter.filter(order => {
        if (!order.ship_to_location) return false;
        return Array.from(selectedLocationFilter).some(loc => order.ship_to_location?.includes(loc));
      });
    }
    ordersToFilter.forEach(order => {
      if (!groups[order.po_number]) {
        groups[order.po_number] = [];
      }
      groups[order.po_number].push(order);
    });
    const poGroups: POGroup[] = Object.entries(groups).map(([poNumber, orders]) => ({
      poNumber,
      orders
    }));
    return poGroups;
  }, [poOrders, labelEligibleOrders, labelSearchQuery, searchQuery, activeTab, selectedCountry, selectedLocationFilter]);
  const groupedPOOrders = useMemo(() => {
    console.log('📦 GROUPING START:', {
      filteredOrdersCount: filteredOrders.length,
      uniquePONumbers: [...new Set(filteredOrders.map(o => o.po_number))].length
    });
    const groups: {
      [key: string]: POOrder[];
    } = {};
    filteredOrders.forEach(order => {
      if (!groups[order.po_number]) {
        groups[order.po_number] = [];
      }
      groups[order.po_number].push(order);
    });

    // Calculate metrics for each PO group
    const poGroupsWithMetrics = Object.entries(groups).map(([poNumber, orders]) => {
      // Keep ALL orders for matched calculations
      const allOrdersInPO = orders;

      // Filter to only active orders for pending calculations
      const activeOrdersInPO = orders.filter((order: any) => order.status === 'pending' || order.status === 'placed' || order.status === 'received');
      const matchedBySource = {
        ASIN: 0,
        SKU: 0,
        SUNSKY: 0
      };
      const pendingBySource = {
        ASIN: 0,
        SKU: 0,
        SUNSKY: 0
      };
      const matchedUnitsBySource = {
        ASIN: 0,
        SKU: 0,
        SUNSKY: 0
      };
      const pendingUnitsBySource = {
        ASIN: 0,
        SKU: 0,
        SUNSKY: 0
      };

      // Calculate matched details from ALL orders (including closed)
      allOrdersInPO.forEach((order: any) => {
        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
        if (inventoryMatch) {
          matchedBySource[inventoryMatch.type]++;
          matchedUnitsBySource[inventoryMatch.type] += order.quantity || 0;
        }
      });

      // Calculate pending to place from ONLY active orders
      activeOrdersInPO.forEach((order: any) => {
        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
        if (inventoryMatch && order.status === 'pending' && !order.supplier_order_number) {
          pendingBySource[inventoryMatch.type]++;
          pendingUnitsBySource[inventoryMatch.type] += order.quantity || 0;
        }
      });

      // Calculate total in-stock quantity for this PO group
      const totalInStockQty = allOrdersInPO.reduce((sum, order: any) => {
        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
        if (inventoryMatch && inventoryMatch.status === 'in-stock') {
          return sum + (inventoryMatch.quantity || 0);
        }
        return sum;
      }, 0);
      return {
        poNumber,
        orders,
        metrics: {
          total_matched: matchedBySource.ASIN + matchedBySource.SKU + matchedBySource.SUNSKY,
          total_pending_to_place: pendingBySource.ASIN + pendingBySource.SKU + pendingBySource.SUNSKY,
          matched_asin: matchedBySource.ASIN,
          matched_sku: matchedBySource.SKU,
          matched_sunsky: matchedBySource.SUNSKY,
          pending_asin: pendingBySource.ASIN,
          pending_sku: pendingBySource.SKU,
          pending_sunsky: pendingBySource.SUNSKY,
          matchedBySource,
          pendingBySource,
          matchedUnitsBySource,
          pendingUnitsBySource,
          totalInStockQty
        }
      };
    });
    console.log('📦 GROUPING RESULT:', {
      totalPOGroups: poGroupsWithMetrics.length,
      firstFewPOs: poGroupsWithMetrics.slice(0, 5).map(g => g.poNumber),
      totalItemsInGroups: poGroupsWithMetrics.reduce((sum, g) => sum + g.orders.length, 0)
    });
    return poGroupsWithMetrics;
  }, [filteredOrders, findInventoryMatch]);
  // Apply sorting to grouped data
  const sortedGroupedPOOrders = useMemo(() => {
    if (viewMode !== 'grouped') return groupedPOOrders;
    return [...groupedPOOrders].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (groupedSortField) {
        case 'po_number':
          aValue = a.poNumber;
          bValue = b.poNumber;
          break;
        case 'ship_to':
          aValue = a.orders[0]?.ship_to_location || '';
          bValue = b.orders[0]?.ship_to_location || '';
          break;
        case 'po_items':
          aValue = a.orders.length;
          bValue = b.orders.length;
          break;
        case 'asn_qty':
          aValue = a.orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
          bValue = b.orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
          break;
        case 'matched_percentage':
          const aActiveOrders = a.orders.filter(o => ['pending', 'placed', 'received'].includes(o.status));
          const bActiveOrders = b.orders.filter(o => ['pending', 'placed', 'received'].includes(o.status));
          aValue = aActiveOrders.length > 0 ? a.metrics.total_matched / aActiveOrders.length : 0;
          bValue = bActiveOrders.length > 0 ? b.metrics.total_matched / bActiveOrders.length : 0;
          break;
        case 'total_matched':
          aValue = a.metrics.total_matched;
          bValue = b.metrics.total_matched;
          break;
        case 'matched_asin':
          aValue = a.metrics.matched_asin;
          bValue = b.metrics.matched_asin;
          break;
        case 'matched_sku':
          aValue = a.metrics.matched_sku;
          bValue = b.metrics.matched_sku;
          break;
        case 'matched_sunsky':
          aValue = a.metrics.matchedUnitsBySource?.SUNSKY || 0;
          bValue = b.metrics.matchedUnitsBySource?.SUNSKY || 0;
          break;
        case 'total_pending_to_place':
          aValue = a.metrics.total_pending_to_place;
          bValue = b.metrics.total_pending_to_place;
          break;
        case 'pending_asin':
          aValue = a.metrics.pending_asin;
          bValue = b.metrics.pending_asin;
          break;
        case 'pending_sku':
          aValue = a.metrics.pending_sku;
          bValue = b.metrics.pending_sku;
          break;
        case 'pending_sunsky':
          aValue = a.metrics.pendingUnitsBySource?.SUNSKY || 0;
          bValue = b.metrics.pendingUnitsBySource?.SUNSKY || 0;
          break;
        case 'instock_qty':
          aValue = a.metrics.totalInStockQty || 0;
          bValue = b.metrics.totalInStockQty || 0;
          break;
        default:
          return 0;
      }

      // Handle undefined values
      if (aValue === undefined) return groupedSortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined) return groupedSortDirection === 'asc' ? -1 : 1;

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return groupedSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return groupedSortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return groupedSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [groupedPOOrders, groupedSortField, groupedSortDirection, viewMode]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPOGroups = useMemo(() => {
    const paginated = sortedGroupedPOOrders.slice(startIndex, endIndex);
    console.log('📄 PAGINATION:', {
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      totalGroups: sortedGroupedPOOrders.length,
      paginatedGroups: paginated.length,
      showingPOs: paginated.map(g => g.poNumber)
    });
    return paginated;
  }, [sortedGroupedPOOrders, startIndex, endIndex, currentPage, itemsPerPage]);

  // Ref to store current ordersToDisplay for print operations
  const ordersToDisplayRef = useRef<POOrder[]>([]);

  // Stable row ordering: track the last known order of item IDs to prevent row jumping
  const stableLabelsOrderRef = useRef<Map<string, number>>(new Map());
  const prevLabelsFilterKeyRef = useRef<string>('');

  // Snapshot lock: freeze filtered result IDs so rows don't vanish mid-workflow
  const lockedFilterIdsRef = useRef<Set<string> | null>(null);
  const prevFilterValuesRef = useRef<string>('');

  const hasActiveFilters = useCallback(() => {
    return printedFilter.length > 0 ||
      sourceFilter !== 'all' ||
      fulfillmentFilter.length > 0 ||
      instockFilter.length > 0 ||
      barcodeFilter !== 'all';
  }, [printedFilter, sourceFilter, fulfillmentFilter, instockFilter, barcodeFilter]);

  const clearAllFiltersAndUnlock = useCallback(() => {
    setPrintedFilter([]);
    setSourceFilter('all');
    setFulfillmentFilter([]);
    setInstockFilter([]);
    setBarcodeFilter('all');
    lockedFilterIdsRef.current = null;
    prevFilterValuesRef.current = '';
  }, []);

  // Helper to preserve scroll position during pagination
  const preserveScrollAndSetPage = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, newPageOrUpdater: number | ((prev: number) => number)) => {
    const savedY = window.scrollY;
    setter(typeof newPageOrUpdater === 'function' ? newPageOrUpdater : () => newPageOrUpdater);
    requestAnimationFrame(() => {
      window.scrollTo(0, savedY);
    });
  }, []);

  // Handle print functionality with advanced settings
  const handleDirectPrint = async () => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray not connected",
        description: "Please ensure QZ Tray is running and try again",
        variant: "destructive"
      });
      return;
    }
    if (!selectedPrinter) {
      toast({
        title: "No printer selected",
        description: "Please select a printer first",
        variant: "destructive"
      });
      return;
    }
    if (selectedForPrint.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to print",
        variant: "destructive"
      });
      return;
    }
    setIsPrinting(true);
    console.log('🖨️ Print quantities:', {
      selectedForPrint: Array.from(selectedForPrint.entries()),
      customPrintQuantities: Array.from(customPrintQuantities.entries()),
      message: 'Using customPrintQuantities for actual print counts'
    });
    try {
      // Detect consolidated vs regular orders
      const selectedOrders: POOrder[] = [];
      const consolidatedSelections = new Map<string, {
        qty: number;
        orders: POOrder[];
      }>();
      for (const orderId of selectedForPrint.keys()) {
        const quantity = customPrintQuantities.get(orderId) || 1; // Get actual quantity from customPrintQuantities

        if (orderId.startsWith('consolidated-')) {
          // Find the consolidated order from the display list
          const displayedOrder = ordersToDisplayRef.current.find(o => o.id === orderId);
          if (displayedOrder?._consolidatedOrders) {
            consolidatedSelections.set(orderId, {
              qty: quantity,
              // Use quantity from customPrintQuantities
              orders: displayedOrder._consolidatedOrders
            });
            // Add all underlying orders
            selectedOrders.push(...displayedOrder._consolidatedOrders);
          }
        } else {
          // Regular order
          const order = poOrders.find(o => o.id === orderId);
          if (order) selectedOrders.push(order);
        }
      }
      console.log('🖨️ Print selections:', {
        consolidated: consolidatedSelections.size,
        regular: selectedOrders.length - Array.from(consolidatedSelections.values()).reduce((sum, c) => sum + c.orders.length, 0)
      });

      // Generate ZPL for each selected item
      let allZPLCodes: string[] = [];
      const processedConsolidatedGroups = new Set<string>();
      for (const order of selectedOrders) {
        // Check if this order belongs to a consolidated group
        const consolidatedEntry = Array.from(consolidatedSelections.entries()).find(([_, data]) => data.orders.some(o => o.id === order.id));
        if (consolidatedEntry) {
          const [consolidatedId, {
            qty: consolidatedQty
          }] = consolidatedEntry;

          // Only process this consolidated group once
          if (processedConsolidatedGroups.has(consolidatedId)) {
            continue;
          }
          processedConsolidatedGroups.add(consolidatedId);
          console.log(`📦 Printing consolidated item ${consolidatedId}: ${consolidatedQty} copies`);

          // Print based on consolidated quantity
          for (let i = 0; i < consolidatedQty; i++) {
            let zplCode = generateZPLFromTemplate(order, printSettings);
            allZPLCodes.push(zplCode);
          }
        } else {
          // Regular non-consolidated order
          const customQuantity = customPrintQuantities.get(order.id) || 1;
          for (let i = 0; i < customQuantity; i++) {
            let zplCode = generateZPLFromTemplate(order, printSettings);
            allZPLCodes.push(zplCode);
          }
        }
      }

      // Print all labels
      if (allZPLCodes.length === 0) {
        throw new Error("No labels generated");
      }
      const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
      const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');
      await qzConnectionManager.print(finalZPL, selectedPrinter);
      toast({
        title: "Labels printed successfully",
        description: `Printed ${allZPLCodes.length} labels to ${selectedPrinter}`
      });

      // Update printed quantities for each order in database
      console.group('🖨️ Bulk Print Status Update');
      console.log('📝 Updating print status for', selectedOrders.length, 'orders');
      setIsPrintStatusUpdating(true);
      const updatePromises = selectedOrders.map(async order => {
        // Check if this order is part of a consolidated group
        const consolidatedEntry = Array.from(consolidatedSelections.entries()).find(([_, data]) => data.orders.some(o => o.id === order.id));
        let copiesToRecord: number;
        if (consolidatedEntry) {
          const [_, {
            qty: consolidatedQty,
            orders: underlyingOrders
          }] = consolidatedEntry;

          // Distribute the consolidated quantity proportionally
          const totalQuantity = underlyingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
          const proportion = (order.quantity || 0) / totalQuantity;
          copiesToRecord = Math.round(consolidatedQty * proportion);
          console.log(`  📦 Consolidated order ${order.id}: Recording ${copiesToRecord}/${consolidatedQty} (${(proportion * 100).toFixed(1)}% of total)`);
        } else {
          // Regular order
          copiesToRecord = customPrintQuantities.get(order.id) || 1;
        }
        const newPrintedQuantity = (order.printed_quantity || 0) + copiesToRecord;
        console.log(`  📌 Order ${order.id}: ${order.printed_quantity || 0} + ${copiesToRecord} = ${newPrintedQuantity}`);
        const newStatus = newPrintedQuantity >= order.quantity ? 'closed' : order.status;
        const {
          error
        } = await supabase.from('po_orders').update({
          is_printed: true,
          printed_quantity: newPrintedQuantity,
          status: newStatus
        }).eq('id', order.id);
        if (error) {
          console.error(`  ❌ Failed to update order ${order.id}:`, error);
          throw error;
        }
        return {
          success: true,
          orderId: order.id,
          newPrintedQuantity
        };
      });
      const results = await Promise.all(updatePromises);
      console.log('✅ Database updates completed:', results);

      // Invalidate queries and refresh immediately (real-time will also update)
      queryClient.invalidateQueries({
        queryKey: ['po-orders']
      });
      queryClient.invalidateQueries({
        queryKey: ['po_metrics']
      });
      console.log('🔄 Triggering immediate data refresh...');
      await fetchPOOrders(true);
      console.log('✅ Data refresh completed');
      console.groupEnd();
      setSelectedForPrint(new Map());
      setIsPrintStatusUpdating(false);
      toast({
        title: "Print status updated",
        description: `${selectedOrders.length} item(s) marked as printed. Check the Print Status column for details.`,
        duration: 5000
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to print labels",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Save current PO selection as a named preset
  const saveCurrentSelectionAsPreset = useCallback((name: string) => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this preset.",
        variant: "destructive"
      });
      return;
    }
    if (selectedPOsForLabels.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one PO to save.",
        variant: "destructive"
      });
      return;
    }
    // Save to Supabase
    const saveToSupabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('po_selection_presets')
          .insert({
            user_id: user.id,
            name: name.trim(),
            po_numbers: Array.from(selectedPOsForLabels),
          })
          .select()
          .single();
        if (error) throw error;
        const newPreset: POSelectionPreset = {
          id: data.id,
          name: data.name,
          poNumbers: data.po_numbers || [],
          createdAt: data.created_at,
          lastUsed: data.last_used,
        };
        setSavedPresets(prev => [newPreset, ...prev]);
        setPresetNameInput('');
        setShowPresetsDialog(false);
        toast({
          title: "✅ Preset saved",
          description: `"${name}" saved with ${selectedPOsForLabels.size} PO(s).`
        });
      } catch (error) {
        console.error('Failed to save preset:', error);
        toast({ title: "Error", description: "Failed to save preset.", variant: "destructive" });
      }
    };
    saveToSupabase();
    trackAction({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      actionName: 'save_preset',
      actionType: 'preset_management',
      metadata: {
        preset_name: name,
        po_count: selectedPOsForLabels.size
      }
    });
  }, [selectedPOsForLabels, toast, trackAction]);

  // Load a saved preset
  const loadPreset = useCallback((preset: POSelectionPreset) => {
    setLabelSearchQuery('');

    // Filter to only include POs that exist
    const availablePOs = preset.poNumbers.filter(poNumber => {
      const poExists = poOrders.some(order => order.po_number === poNumber);
      return poExists;
    });
    if (availablePOs.length === 0) {
      toast({
        title: "Preset unavailable",
        description: `None of the POs in "${preset.name}" are currently available.`,
        variant: "default"
      });
      return;
    }
    setSelectedPOsForLabels(new Set(availablePOs));

    // Update last used timestamp in Supabase
    const now = new Date().toISOString();
    setSavedPresets(prev => prev.map(p => p.id === preset.id ? { ...p, lastUsed: now } : p));
    supabase.from('po_selection_presets').update({ last_used: now }).eq('id', preset.id).then();

    // Show notification
    if (availablePOs.length === preset.poNumbers.length) {
      toast({
        title: "✅ Preset loaded",
        description: `"${preset.name}" - ${availablePOs.length} PO(s) selected.`
      });
    } else {
      toast({
        title: "⚠️ Preset partially loaded",
        description: `"${preset.name}" - ${availablePOs.length} of ${preset.poNumbers.length} PO(s) available.`
      });
    }
    trackAction({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      actionName: 'load_preset',
      actionType: 'preset_management',
      metadata: {
        preset_name: preset.name,
        total_pos: preset.poNumbers.length,
        available_pos: availablePOs.length
      }
    });
  }, [poOrders, toast, trackAction]);

  // Delete a preset
  const deletePreset = useCallback(async (presetId: string) => {
    const preset = savedPresets.find(p => p.id === presetId);
    if (!preset) return;
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
    const { error } = await supabase.from('po_selection_presets').delete().eq('id', presetId);
    if (error) console.error('Failed to delete preset:', error);
    toast({
      title: "Preset deleted",
      description: `"${preset.name}" has been removed.`
    });
    trackAction({
      category: 'Amazon',
      subcategory: 'PO Tracker',
      actionName: 'delete_preset',
      actionType: 'preset_management',
      metadata: {
        preset_name: preset.name
      }
    });
  }, [savedPresets, toast, trackAction]);

  // Rename a preset
  const renamePreset = useCallback(async (presetId: string, newName: string) => {
    if (!newName.trim()) return;
    setSavedPresets(prev => prev.map(p => p.id === presetId ? { ...p, name: newName.trim() } : p));
    const { error } = await supabase.from('po_selection_presets').update({ name: newName.trim() }).eq('id', presetId);
    if (error) console.error('Failed to rename preset:', error);
    toast({
      title: "Preset renamed",
      description: `Preset renamed to "${newName}".`
    });
  }, [toast]);

  // Generate ZPL from template with proper sizing
  const generateZPLFromTemplate = (order: POOrder, settings: typeof printSettings): string => {
    const {
      template,
      dpi,
      pageSize
    } = settings;

    // Check if it's a custom template
    if (template !== 'default' && template !== 'compact' && template !== 'detailed' && template !== 'minimal' && labelTemplates) {
      const customTemplate = labelTemplates.find((t: any) => t.id === template);
      if (customTemplate && 'id' in customTemplate) {
        return generateZPLFromCustomTemplate(order, customTemplate, settings);
      }
    }

    // Get label dimensions based on page size or custom settings
    const dimensions = getLabelDimensions(pageSize, dpi, settings);
    switch (template) {
      case 'compact':
        return `^XA
^MMT
^PW${dimensions.width}
^LL${dimensions.height}
^LH0,0
^FO50,40^A0N,40,40^FD${order.sku_code || order.model_number || order.asin || 'N/A'}^FS
^FO50,100^A0N,25,25^FD${(order.title || order.model_number || 'Item').substring(0, 35)}^FS
^FO50,140^A0N,25,25^FDQty: ${order.quantity} | PO: ${order.po_number}^FS
^XZ`;
      case 'detailed':
        return `^XA
^MMT
^PW${dimensions.width}
^LL${dimensions.height}
^LH0,0
^FO50,40^A0N,50,50^FD${order.sku_code || order.model_number || order.asin || 'N/A'}^FS
^FO50,120^A0N,30,30^FD${(order.title || order.model_number || 'Item').substring(0, 30)}^FS
^FO50,170^A0N,30,30^FDQuantity: ${order.quantity}^FS
^FO50,220^A0N,25,25^FDPO Number: ${order.po_number}^FS
^FO50,270^A0N,25,25^FDStatus: ${order.status}^FS
^FO50,320^A0N,20,20^FDDate: ${new Date().toLocaleDateString()}^FS
^XZ`;
      case 'minimal':
        return `^XA
^MMT
^PW${dimensions.width}
^LL${dimensions.height}
^LH0,0
^FO50,60^A0N,60,60^FD${order.sku_code || order.model_number || order.asin || 'N/A'}^FS
^FO50,150^A0N,40,40^FDQty: ${order.quantity}^FS
^XZ`;
      default:
        // 'default'
        return `^XA
^MMT
^PW${dimensions.width}
^LL${dimensions.height}
^LH0,0
^FO50,40^A0N,50,50^FD${order.sku_code || order.model_number || order.asin || 'N/A'}^FS
^FO50,120^A0N,35,35^FD${(order.title || order.model_number || 'Item').substring(0, 25)}^FS
^FO50,180^A0N,35,35^FDQty: ${order.quantity}^FS
^FO50,240^A0N,25,25^FDPO: ${order.po_number}^FS
^XZ`;
    }
  };

  // Get label dimensions based on page size and DPI - optimized for actual label sizes
  const getLabelDimensions = (pageSize: string, dpi: number, settings: typeof printSettings) => {
    if (pageSize === 'custom') {
      return {
        width: Math.round(settings.customWidth / 25.4 * dpi),
        // Convert mm to dots
        height: Math.round(settings.customHeight / 25.4 * dpi)
      };
    }
    const presets = {
      '4x6': {
        width: Math.round(4.0 * dpi),
        height: Math.round(6.0 * dpi)
      },
      '4x3': {
        width: Math.round(4.0 * dpi),
        height: Math.round(3.0 * dpi)
      },
      '2x1': {
        width: Math.round(2.0 * dpi),
        height: Math.round(1.0 * dpi)
      },
      '3x2': {
        width: Math.round(3.0 * dpi),
        height: Math.round(2.0 * dpi)
      },
      'default': {
        width: Math.round(4.0 * dpi),
        height: Math.round(6.0 * dpi)
      }
    };
    return presets[pageSize as keyof typeof presets] || presets.default;
  };

  // Generate ZPL from custom template using PrintService
  const generateZPLFromCustomTemplate = (order: POOrder, template: any, settings: typeof printSettings): string => {
    try {
      // Create a LabelDoc from the template
      const labelDoc: LabelDoc = {
        id: template.id,
        name: template.name,
        size: {
          width: template.width || 100,
          height: template.height || 60,
          unit: 'mm'
        },
        elements: template.canvas_data?.elements || [],
        createdAt: template.created_at || new Date().toISOString(),
        updatedAt: template.updated_at || new Date().toISOString()
      };

      // Create a dataset with PO order data
      console.log('PO Order data for printing:', {
        po_number: order.po_number,
        sku_code: order.sku_code,
        model_number: order.model_number,
        asin: order.asin,
        title: order.title,
        quantity: order.quantity,
        status: order.status
      });
      const dataset: LabelDataset = {
        id: 'po-data',
        name: 'PO Order Data',
        description: 'Purchase Order Data',
        headers: ['sku', 'title', 'quantity', 'po_number', 'status', 'asin', 'model_number', 'PO Number', 'Priority'],
        data: [[order.sku_code || order.model_number || order.asin || 'N/A', order.title || 'No title available', order.quantity.toString(), order.po_number, order.status, order.asin || 'No ASIN', order.model_number || 'No model', order.po_number, order.priority?.toString() || '3' // Add duplicate with different case and priority
        ]],
        rowCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('Dataset for printing:', {
        headers: dataset.headers,
        data: dataset.data,
        po_number_value: dataset.data[0][3]
      });

      // Use PrintService to generate ZPL
      const printSettings = {
        format: 'zpl' as const,
        paperSize: 'custom' as const,
        orientation: 'portrait' as const,
        dpi: settings.dpi,
        copies: 1,
        labelsPerPage: 1,
        margin: 0,
        darkness: settings.darkness
      };
      return PrintService.generateZPL(labelDoc, dataset, printSettings);
    } catch (error) {
      console.error('Error generating ZPL from custom template:', error);
      // Fallback to basic ZPL
      const dimensions = getLabelDimensions('default', settings.dpi, settings);
      return `^XA
^MMT
^PW${dimensions.width}
^LL${dimensions.height}
^LH0,0
^FO50,40^A0N,50,50^FD${order.sku_code || order.model_number || order.asin || 'N/A'}^FS
^FO50,120^A0N,35,35^FD${(order.title || order.model_number || 'Item').substring(0, 25)}^FS
^FO50,180^A0N,35,35^FDQty: ${order.quantity}^FS
^FO50,240^A0N,25,25^FDPO: ${order.po_number}^FS
^XZ`;
    }
  };

  // Download ZPL file
  const handleDownloadZPL = () => {
    if (selectedForPrint.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to download",
        variant: "destructive"
      });
      return;
    }
    const selectedOrders = poOrders.filter(order => selectedForPrint.has(order.id));
    let allZPLCodes: string[] = [];
    for (const order of selectedOrders) {
      const copies = printSettings.copiesByQuantity ? order.quantity : printSettings.copies;
      for (let i = 0; i < copies; i++) {
        let zplCode = generateZPLFromTemplate(order, printSettings);
        allZPLCodes.push(zplCode);
      }
    }
    const finalZPL = allZPLCodes.join('\n');
    const blob = new Blob([finalZPL], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `po-labels-${new Date().toISOString().split('T')[0]}.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "ZPL file downloaded",
      description: `Downloaded ${allZPLCodes.length} labels`
    });
  };

  // Print single item with specified quantity
  const handleSingleItemPrint = async (order: POOrder, customQuantity?: number) => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray not connected",
        description: "Please ensure QZ Tray is running and try again",
        variant: "destructive"
      });
      return;
    }
    if (!selectedPrinter) {
      toast({
        title: "No printer selected",
        description: "Please select a printer first",
        variant: "destructive"
      });
      return;
    }
    try {
      // Prevent table reordering during print
      setPreventTableReorder(true);
      setPrintingItems(prev => new Set([...prev, order.id]));

      // Handle consolidated orders intelligently
      if (order._isConsolidated && order._consolidatedOrders && customQuantity) {
        console.log('🔄 Printing consolidated order with partial quantity:', {
          totalQuantity: order.quantity,
          requestedQuantity: customQuantity,
          underlyingOrders: order._consolidatedOrders.length
        });

        // Distribute partial quantity across underlying POs
        const underlyingOrders = [...order._consolidatedOrders].sort((a: any, b: any) => a.quantity - b.quantity // Sort by quantity ascending (print from smallest POs first)
        );
        let remainingToPrint = customQuantity;
        const printTasks: Array<{
          order: POOrder;
          qty: number;
        }> = [];
        for (const underlyingOrder of underlyingOrders) {
          if (remainingToPrint <= 0) break;
          const availableQty = underlyingOrder.quantity - (underlyingOrder.printed_quantity || 0);
          const printThisOrder = Math.min(availableQty, remainingToPrint);
          if (printThisOrder > 0) {
            printTasks.push({
              order: underlyingOrder,
              qty: printThisOrder
            });
            remainingToPrint -= printThisOrder;
          }
        }
        console.log('📋 Print distribution:', printTasks.map(t => ({
          po: t.order.po_number,
          printQty: t.qty,
          totalQty: t.order.quantity
        })));

        // Print each task
        let totalPrinted = 0;
        for (const {
          order: underlyingOrder,
          qty
        } of printTasks) {
          let allZPLCodes: string[] = [];
          for (let i = 0; i < qty; i++) {
            let zplCode = generateZPLFromTemplate(underlyingOrder, printSettings);
            allZPLCodes.push(zplCode);
          }
          const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
          const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');
          await qzConnectionManager.print(finalZPL, selectedPrinter);

          // Update printed quantity in database for this underlying order
          const newPrintedQuantity = (underlyingOrder.printed_quantity || 0) + qty;
          const newStatus = newPrintedQuantity >= underlyingOrder.quantity ? 'closed' : underlyingOrder.status;
          const {
            error
          } = await supabase.from('po_orders').update({
            is_printed: newPrintedQuantity >= underlyingOrder.quantity,
            printed_quantity: newPrintedQuantity,
            status: newStatus
          }).eq('id', underlyingOrder.id);
          if (error) {
            console.error(`❌ Failed to update order ${underlyingOrder.id}:`, error);
          } else {
            console.log(`✅ Updated ${underlyingOrder.po_number}: ${newPrintedQuantity}/${underlyingOrder.quantity}`);
          }
          totalPrinted += qty;
        }
        toast({
          title: "Labels printed successfully",
          description: `Printed ${totalPrinted} label(s) for ${order.asin || order.sku_code}`
        });

        // Clear custom quantity after successful print
        setCustomPrintQuantities(prev => {
          const newMap = new Map(prev);
          newMap.delete(order.id);
          return newMap;
        });

        // Refresh data
        console.log('🔄 Refreshing data from database...');
        queryClient.invalidateQueries({
          queryKey: ['po-orders']
        });
        await fetchPOOrders(true);
        console.log('✅ Data refresh completed');
        setPrintingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
        setTimeout(() => setPreventTableReorder(false), 500);
        return;
      }

      // Regular single order print
      const availableQty = order.quantity - (order.printed_quantity || 0);
      const requestedQty = customQuantity || (printSettings.copiesByQuantity ? order.quantity : printSettings.copies);
      console.log('🖨️ Print request:', {
        asin: order.asin,
        poNumber: order.po_number,
        totalQuantity: order.quantity,
        alreadyPrinted: order.printed_quantity,
        availableQty,
        requestedQty,
        customQuantitySet: !!customQuantity,
        orderId: order.id
      });

      // Validate quantity
      if (requestedQty > availableQty) {
        toast({
          title: "Invalid quantity",
          description: `Cannot print ${requestedQty} labels. Only ${availableQty} remaining.`,
          variant: "destructive"
        });
        setPrintingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
        setPreventTableReorder(false);
        return;
      }
      const copies = requestedQty;
      let allZPLCodes: string[] = [];
      for (let i = 0; i < copies; i++) {
        let zplCode = generateZPLFromTemplate(order, printSettings);
        allZPLCodes.push(zplCode);
      }

      // Set printer darkness and print
      const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
      const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');
      await qzConnectionManager.print(finalZPL, selectedPrinter);
      toast({
        title: "Label printed successfully",
        description: `Printed ${allZPLCodes.length} label(s) for ${order.sku_code || order.model_number || order.asin}`
      });

      // Update printed quantity in database
      console.group('🖨️ Single Print Status Update');
      setIsPrintStatusUpdating(true);
      const newPrintedQuantity = (order.printed_quantity || 0) + copies;
      console.log(`📝 Updating order ${order.id}: ${order.printed_quantity || 0} + ${copies} = ${newPrintedQuantity}`);
      const newStatus = newPrintedQuantity >= order.quantity ? 'closed' : order.status;
      const {
        error
      } = await supabase.from('po_orders').update({
        is_printed: newPrintedQuantity >= order.quantity,
        printed_quantity: newPrintedQuantity,
        status: newStatus
      }).eq('id', order.id);
      if (error) {
        console.error(`❌ Failed to update order ${order.id}:`, error);
        throw error;
      }
      console.log('✅ Database update completed');

      // Add delay before refresh to ensure database propagation
      console.log('⏳ Waiting for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force refresh and invalidate queries
      console.log('🔄 Refreshing data from database...');
      queryClient.invalidateQueries({
        queryKey: ['po-orders']
      });
      await fetchPOOrders(true);
      console.log('✅ Data refresh completed');
      console.groupEnd();
      setIsPrintStatusUpdating(false);

      // Clear custom quantity after successful print
      setCustomPrintQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(order.id);
        return newMap;
      });
      toast({
        title: "Print status updated",
        description: `Item marked as printed (${newPrintedQuantity}/${order.quantity})`
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to print label",
        variant: "destructive"
      });
    } finally {
      setPrintingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
      // Re-enable table reordering after a short delay
      setTimeout(() => setPreventTableReorder(false), 500);
    }
  };

  // Frontend-only reprint handler - doesn't update database
  // Handles consolidated orders by distributing labels across underlying POs
  const handleReprintWithoutTracking = async (order: POOrder, quantity: number = 1, isSingleReprint: boolean = false) => {
    if (!qzConnected || !selectedPrinter) {
      toast({
        title: "Printer not ready",
        description: "Please connect to QZ Tray and select a printer",
        variant: "destructive"
      });
      return;
    }
    setPrintingItems(prev => new Set(prev).add(order.id));
    try {
      let allZPLCodes: string[] = [];

      if (order._isConsolidated && order._consolidatedOrders && order._consolidatedOrders.length > 0) {
        // Consolidated order: distribute requested quantity across underlying POs proportionally
        if (isSingleReprint) {
          // Single reprint: use first underlying order for correct PO data
          const firstOrder = order._consolidatedOrders[0];
          allZPLCodes.push(generateZPLFromTemplate(firstOrder, printSettings));
        } else {
          // Distribute requested quantity proportionally across POs based on their printed_quantity
          const totalPrinted = order._consolidatedOrders.reduce((sum: number, o: any) => sum + (o.printed_quantity || 0), 0);
          let remaining = quantity;
          for (let idx = 0; idx < order._consolidatedOrders.length && remaining > 0; idx++) {
            const underlyingOrder = order._consolidatedOrders[idx];
            const orderPrinted = underlyingOrder.printed_quantity || 0;
            // Proportional share, last PO gets remainder
            const share = idx === order._consolidatedOrders.length - 1
              ? remaining
              : Math.min(Math.round((orderPrinted / totalPrinted) * quantity), remaining);
            for (let i = 0; i < share; i++) {
              allZPLCodes.push(generateZPLFromTemplate(underlyingOrder, printSettings));
            }
            remaining -= share;
          }
        }
      } else {
        // Non-consolidated order: use requested quantity directly
        for (let i = 0; i < quantity; i++) {
          allZPLCodes.push(generateZPLFromTemplate(order, printSettings));
        }
      }

      console.log('🔄 REPRINT (no tracking):', {
        asin: order.asin,
        poNumber: order.po_number,
        isConsolidated: !!order._isConsolidated,
        totalLabels: allZPLCodes.length,
        isSingleReprint,
        note: 'Frontend-only reprint, no database update'
      });

      const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
      const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');
      await qzConnectionManager.print(finalZPL, selectedPrinter);
      toast({
        title: "Label reprinted",
        description: `Reprinted ${allZPLCodes.length} label(s) - no tracking update`,
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Reprint error:', error);
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to reprint label",
        variant: "destructive"
      });
    } finally {
      setPrintingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Reprint ALL previously printed labels for selected POs
  const reprintAllPrintedItems = useMemo(() => {
    if (selectedPOsForLabels.size === 0) return [];
    const selectedPOsList = Array.from(selectedPOsForLabels);
    return poOrders.filter(order => 
      selectedPOsList.includes(order.po_number) && 
      order.status !== 'cancelled' && 
      (order.printed_quantity || 0) > 0
    );
  }, [poOrders, selectedPOsForLabels]);

  const reprintAllGroupedByPO = useMemo(() => {
    const grouped: Record<string, { items: POOrder[]; totalLabels: number }> = {};
    reprintAllPrintedItems.forEach(order => {
      if (!grouped[order.po_number]) {
        grouped[order.po_number] = { items: [], totalLabels: 0 };
      }
      grouped[order.po_number].items.push(order);
      grouped[order.po_number].totalLabels += (order.printed_quantity || 0);
    });
    return grouped;
  }, [reprintAllPrintedItems]);

  const handleReprintAllPrinted = async () => {
    if (!qzConnected || !selectedPrinter) {
      toast({
        title: "Printer not ready",
        description: "Please connect to QZ Tray and select a printer",
        variant: "destructive"
      });
      return;
    }
    setIsReprintingAll(true);
    try {
      let allZPLCodes: string[] = [];
      const poEntries = Object.entries(reprintAllGroupedByPO);
      for (const [poNumber, group] of poEntries) {
        for (const order of group.items) {
          const qty = order.printed_quantity || 0;
          for (let i = 0; i < qty; i++) {
            allZPLCodes.push(generateZPLFromTemplate(order, printSettings));
          }
        }
      }
      const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
      const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');
      await qzConnectionManager.print(finalZPL, selectedPrinter);
      const totalLabels = reprintAllPrintedItems.reduce((sum, o) => sum + (o.printed_quantity || 0), 0);
      toast({
        title: "✅ All labels reprinted",
        description: `Reprinted ${totalLabels} label(s) for ${reprintAllPrintedItems.length} item(s) across ${poEntries.length} PO(s)`,
      });
    } catch (error) {
      console.error('❌ Bulk reprint error:', error);
      toast({
        title: "Reprint failed",
        description: error instanceof Error ? error.message : "Failed to reprint labels",
        variant: "destructive"
      });
    } finally {
      setIsReprintingAll(false);
      setShowReprintAllDialog(false);
    }
  };

  const paginatedDetailedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Show loading skeleton during initial load
  if (isLoading && poOrders.length === 0) {
    return <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded"></div>
            <div className="h-10 w-24 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="p-6">
              <div className="h-4 w-32 bg-muted rounded mb-4"></div>
              <div className="h-8 w-20 bg-muted rounded mb-2"></div>
              <div className="h-3 w-40 bg-muted rounded"></div>
            </Card>)}
        </div>
        <Card className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">Loading PO Data...</p>
              {loadingStatus && <p className="text-sm text-muted-foreground">{loadingStatus}</p>}
              {loadingProgress > 0 && <div className="mt-4 w-64 mx-auto">
                  <Progress value={loadingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">{loadingProgress}%</p>
                </div>}
            </div>
          </div>
        </Card>
      </div>;
  }
  return <div className="space-y-6">


      <Tabs value={activeTab} onValueChange={newTab => {
      // Map tab values to unique subcategories
      const getSubcategoryForTab = (tab: string): string => {
        switch (tab) {
          case 'overview':
            return 'PO Tracker';
          case 'upload':
            return 'PO Upload';
          case 'labels':
            return 'PO Labels';
          case 'purchase-links':
            return 'PO Purchase Links';
          case 'profit-analyzer':
            return 'Profit Analyzer';
          case 'shipped-orders':
            return 'Shipped Orders';
          case 'fba-inventory':
            return 'FBA Inventory';
          default:
            return 'PO Tracker';
        }
      };
      trackTabChange({
        category: 'Amazon',
        subcategory: getSubcategoryForTab(newTab),
        fromTab: activeTab,
        toTab: newTab,
        tabTitle: newTab === 'overview' ? 'PO Overview' : newTab === 'upload' ? 'Uploads' : newTab === 'labels' ? 'Print Labels' : newTab === 'purchase-links' ? 'Purchase Links' : newTab === 'profit-analyzer' ? 'Profit Analyzer' : newTab === 'shipped-orders' ? 'Shipped Orders' : newTab === 'fba-inventory' ? 'FBA Inventory' : newTab
      });

      // Update URL with tab parameter
      setSearchParams({
        tab: newTab
      });
      setActiveTab(newTab);
    }} className="w-full">
        <TabsList className="grid w-full grid-cols-7 max-w-5xl h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="upload" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <FileUp className="h-4 w-4" />
            <span className="hidden sm:inline">Uploads</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">PO Overview</span>
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Labels</span>
          </TabsTrigger>
          <TabsTrigger value="profit-analyzer" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Profit</span>
          </TabsTrigger>
          <TabsTrigger value="shipped-orders" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Shipped</span>
          </TabsTrigger>
          <TabsTrigger value="fba-inventory" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">FBA</span>
          </TabsTrigger>
          <TabsTrigger value="purchase-links" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Links</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Compact Stat Bar */}
          <CompactStatBar
            items={[
              { icon: FileText, label: 'POs', value: comprehensiveMetrics?.unique_po_numbers || groupedPOOrders.length },
              { icon: Package, label: 'Items', value: comprehensiveMetrics?.total_line_items || poOrders.length, highlight: true },
              { icon: TrendingUp, label: 'In Stock', value: calculatedMetrics.inStock.count, onClick: () => handleMetricClick('in-stock'), isActive: selectedMetricFilter === 'in-stock' },
              { icon: CheckCircle, label: 'Matched', value: calculatedMetrics.matched.count, onClick: () => handleMetricClick('matched'), isActive: selectedMetricFilter === 'matched' },
              { icon: Truck, label: 'Placed', value: calculatedMetrics.placed.count, onClick: () => handleMetricClick('placed'), isActive: selectedMetricFilter === 'placed' },
              { icon: Clock, label: 'Pending', value: calculatedMetrics.pending.count, onClick: () => handleMetricClick('pending'), isActive: selectedMetricFilter === 'pending' },
              { icon: Printer, label: 'Printed', value: calculatedMetrics.printed.totalPrinted },
              { icon: TrendingUp, label: 'Print %', value: `${calculatedMetrics.printed.printCompletionRate.toFixed(1)}%` },
              { icon: Package, label: 'Sunsky', value: calculatedMetrics.source.sunskyMatched.count },
            ]}
          />

          {/* PHASE 4: Export All Metrics Button */}
          

          {/* Active filter indicator */}
          {selectedMetricFilter && <div className="flex items-center gap-2 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Filtering by: <span className="capitalize">{selectedMetricFilter.replace('-', ' ')}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMetricFilter(null)} className="ml-auto hover:bg-primary/10 rounded-lg">
                Clear Filter
              </Button>
            </div>}

          <div className="space-y-4">
            {/* Toolbar */}
            <ToolbarBar>
              <div className="relative flex-1 min-w-[400px] max-w-2xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <Input type="text" placeholder="Search PO number, ASIN, model, serial number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-10 h-8 text-sm rounded-lg" />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-spin z-10" />}
                {!isSearching && filteredOrders.length > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10">
                    {filteredOrders.length}
                  </span>}
              </div>
                
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      console.log('🔄 Refresh button clicked - loading ALL POs');
                      await fetchPOOrders(true);
                      refetchComprehensiveMetrics();
                      refetchMetrics();
                      toast({ title: "Success", description: "All PO data reloaded successfully" });
                    } catch (error) {
                      console.error('Error refreshing PO data:', error);
                      toast({ title: "Error", description: "Failed to refresh PO data", variant: "destructive" });
                    }
                  }} disabled={isLoading} title="Reload ALL PO orders from database" className="h-8 text-xs gap-1.5 rounded-lg">
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reload
                        </>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPOData} className="h-8 text-xs gap-1.5 rounded-lg" title="Export filtered PO orders to CSV">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)} className="h-8 text-xs gap-1.5 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5" />
                      Bulk Delete
                    </Button>
                  </div>
                  <ToolbarSpacer />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/30 rounded-lg p-0.5 gap-0.5">
                      <Button variant={viewMode === 'grouped' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grouped')} className="h-7 rounded-md px-3 text-xs">
                        Grouped
                      </Button>
                      <Button variant={viewMode === 'detailed' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('detailed')} className="h-7 rounded-md px-3 text-xs">
                        Line Items
                      </Button>
                    </div>
                    <Select value={statusFilter} onValueChange={value => setStatusFilter(value as POOrder['status'] | 'all')}>
                      <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                       <SelectContent className="bg-popover border-border shadow-medium z-50">
                         <SelectItem value="all">All Statuses</SelectItem>
                         <SelectItem value="pending">Pending</SelectItem>
                         <SelectItem value="placed">Placed</SelectItem>
                         <SelectItem value="received">Received</SelectItem>
                         <SelectItem value="cancelled">Cancelled</SelectItem>
                         <SelectItem value="closed">Closed</SelectItem>
                       </SelectContent>
                    </Select>
                    <Select value={shipToFilter} onValueChange={value => setShipToFilter(value)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {uniqueShipToLocations.filter(loc => loc !== 'all').map(location => <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
            </ToolbarBar>

                {/* Filter Status Indicators */}
                <div className="flex items-center justify-between p-4 bg-muted/20 backdrop-blur-sm rounded-xl border border-border/20 shadow-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-semibold text-primary">{groupedPOOrders.length}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-semibold">{[...new Set(poOrders.map(o => o.po_number))].length}</span>
                        <span className="text-muted-foreground"> PO Groups</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-semibold text-primary">{filteredOrders.length}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-semibold">{poOrders.length}</span>
                        <span className="text-muted-foreground"> Line Items</span>
                      </div>
                    </div>
                    
                    {/* Active Filters Display */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusFilter !== 'all' && <Badge variant="secondary" className="gap-1">
                          Status: {statusFilter}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setStatusFilter('all')} />
                        </Badge>}
                      {shipToFilter !== 'all' && <Badge variant="secondary" className="gap-1">
                          Location: {shipToFilter}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setShipToFilter('all')} />
                        </Badge>}
                      {searchQuery.trim() && <Badge variant="secondary" className="gap-1">
                          Search: "{searchQuery.trim()}"
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearchQuery('')} />
                        </Badge>}
                      {searchTags.length > 0 && searchTags.map((tag, idx) => <Badge key={idx} variant="secondary" className="gap-1">
                          Tag: "{tag}"
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearchTags(prev => prev.filter((_, i) => i !== idx))} />
                        </Badge>)}
                      {activeTab === 'overview' && viewMode === 'detailed' && selectedPOsForLabels.size > 0 && <Badge variant="secondary" className="gap-1">
                          PO Filter: {selectedPOsForLabels.size} selected
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSelectedPOsForLabels(new Set())} />
                        </Badge>}
                    </div>
                  </div>
                  
                  {/* Clear All Filters Button */}
                  {(statusFilter !== 'all' || shipToFilter !== 'all' || searchQuery.trim() || searchTags.length > 0 || activeTab === 'overview' && viewMode === 'detailed' && selectedPOsForLabels.size > 0) && <Button variant="outline" size="sm" onClick={() => {
                  setStatusFilter('all');
                  setShipToFilter('all');
                  setSearchQuery('');
                  setSearchTags([]);
                  setSelectedPOsForLabels(new Set());
                  toast({
                    title: "Filters cleared",
                    description: "All filters have been reset"
                  });
                }} className="border-2 border-destructive/50 text-destructive hover:bg-destructive/10">
                      <X className="h-4 w-4 mr-1" />
                      Clear All Filters
                    </Button>}
                </div>

                {/* Selected POs Filter Indicator */}
                {activeTab === 'overview' && viewMode === 'detailed' && selectedPOsForLabels.size > 0 && <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Showing items from {selectedPOsForLabels.size} selected PO{selectedPOsForLabels.size !== 1 ? 's' : ''}: 
                        <span className="font-mono ml-1">
                          {Array.from(selectedPOsForLabels).join(', ')}
                        </span>
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPOsForLabels(new Set())} className="text-blue-600 hover:text-blue-700">
                      <X className="h-4 w-4 mr-1" />
                      Clear filter
                    </Button>
                  </div>}

                <div className="rounded-lg border-2 border-border overflow-hidden">
                  {viewMode === 'grouped' ? <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                          <TableRow className="hover:bg-transparent border-b-2">
                            <TableHead className="w-[70px]">
                              Enable
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${groupedSortField === 'po_number' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => handleGroupedSort('po_number')}>
                              <div className="flex items-center gap-1">
                                <span>PO Number</span>
                                {groupedSortField === 'po_number' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${groupedSortField === 'ship_to' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => handleGroupedSort('ship_to')}>
                              <div className="flex items-center gap-1">
                                <span>Ship To</span>
                                {groupedSortField === 'ship_to' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                              </div>
                            </TableHead>
                             <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'po_items' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('po_items')}>
                              <div className="flex items-center gap-1.5">
                                <span>PO Items</span>
                                {groupedSortField === 'po_items' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'asn_qty' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('asn_qty')}>
                              <div className="flex items-center gap-1.5">
                                <span>ASN Qty</span>
                                {groupedSortField === 'asn_qty' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'matched_percentage' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('matched_percentage')}>
                              <div className="flex items-center gap-1.5">
                                <span>Matched %</span>
                                {groupedSortField === 'matched_percentage' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'matched_sunsky' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('matched_sunsky')}>
                              <div className="flex items-center gap-1.5">
                                <span>Matched Details</span>
                                {groupedSortField === 'matched_sunsky' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'pending_sunsky' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('pending_sunsky')}>
                              <div className="flex items-center gap-1.5">
                                <span>Pending to Place</span>
                                {groupedSortField === 'pending_sunsky' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className={`cursor-pointer select-none hover:bg-muted/20 transition-all text-xs font-medium uppercase tracking-wider ${groupedSortField === 'instock_qty' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleGroupedSort('instock_qty')}>
                              <div className="flex items-center gap-1.5">
                                <span>In-Stock Qty</span>
                                {groupedSortField === 'instock_qty' ? groupedSortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </div>
                            </TableHead>
                            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                         {paginatedPOGroups.map(({
                        poNumber,
                        orders
                      }) => {
                        const firstOrder = orders[0];
                        const ordersInPO = orders; // Alias for consistency

                        // Get metrics from database function - includes ALL items
                        const dbMetrics = poGroupMetrics?.find(m => m.po_number === poNumber);
                        const totalLineItems = dbMetrics?.total_line_items || orders.length;
                        // Use frontend calculation as fallback to ensure accuracy - count ALL items
                        const asnQuantity = dbMetrics?.asn_quantity || orders.reduce((sum, o) => sum + (o.quantity || 0), 0);

                        // Calculate matched percentage and source breakdown for display
                        const activeOrdersInPO = orders.filter((order: any) => order.status === 'pending' || order.status === 'placed' || order.status === 'received');

                        // Use pre-calculated metrics from groupedPOOrders
                        const group = groupedPOOrders.find(g => g.poNumber === poNumber);
                        const matchedBySource = group?.metrics.matchedBySource || {
                          ASIN: 0,
                          SKU: 0,
                          SUNSKY: 0
                        };
                        const pendingBySource = group?.metrics.pendingBySource || {
                          ASIN: 0,
                          SKU: 0,
                          SUNSKY: 0
                        };
                        const matchedCount = group?.metrics.total_matched || 0;
                        const matchedPercentage = activeOrdersInPO.length > 0 ? (matchedCount / activeOrdersInPO.length * 100).toFixed(0) : '0';
                        const statusCounts = orders.reduce((counts: any, order: any) => {
                          counts[order.status] = (counts[order.status] || 0) + 1;
                          return counts;
                        }, {});

                        // Check if PO has closed items (but don't disable it)
                        const hasClosedItems = ordersInPO.some(order => order.status === 'closed');

                        // Country-specific PO handling
                        const countryPrefix = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
                        const currencySymbol = selectedCountry === 'UAE' ? 'AED' : 'SAR';
                        const isDisabled = disabledPOs.has(poNumber);
                        return <TableRow key={poNumber} className={cn("border-b border-border/30 hover:bg-muted/30 hover:shadow-sm transition-all duration-150 ease-out", isDisabled && "opacity-40", hasClosedItems && !isDisabled && "opacity-75")}>
                                  <TableCell className="w-[70px] py-4">
                                    <Switch checked={!isDisabled} onCheckedChange={checked => {
                              const newDisabled = new Set(disabledPOs);
                              if (checked) {
                                newDisabled.delete(poNumber);
                              } else {
                                newDisabled.add(poNumber);
                              }
                              setDisabledPOs(newDisabled);
                            }} className="scale-75" />
                                  </TableCell>
                                 <TableCell className="font-mono text-sm py-4">
                                   <div className="flex items-center gap-2">
                                     <span className="text-xs opacity-60">{countryPrefix}</span>
                                      <Button variant="link" className="p-0 h-auto font-semibold text-left justify-start hover:text-primary transition-colors" onClick={() => navigate(`/po-details/${poNumber}`)}>
                                        {poNumber}
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50 transition-colors" onClick={e => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(poNumber);
                                toast({
                                  title: "Copied!",
                                  description: `PO Number "${poNumber}" copied to clipboard`
                                });
                              }} title="Copy PO Number">
                                      <Copy className="h-3 w-3" />
                                       </Button>
                                       {hasClosedItems && <Badge variant="secondary" className="text-xs rounded-full px-2.5 py-0.5">
                                          HAS FULFILLED
                                        </Badge>}
                                   </div>
                                 </TableCell>
                              <TableCell className="py-4">
                                <div className="text-xs text-muted-foreground truncate">
                                  {(() => {
                                const uniqueLocations = [...new Set(orders.map(o => o.ship_to_location).filter(Boolean))];
                                if (uniqueLocations.length === 0) return '-';
                                if (uniqueLocations.length === 1) return uniqueLocations[0];
                                return `${uniqueLocations[0]} +${uniqueLocations.length - 1}`;
                              })()}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-mono text-sm">{totalLineItems}</span>
                                  <span className="text-xs text-muted-foreground">SKUs</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-mono text-sm font-semibold">{asnQuantity}</span>
                                  <span className="text-xs text-muted-foreground">units</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{
                              background: parseInt(matchedPercentage) >= 80 ? 'hsl(var(--success) / 0.15)' : parseInt(matchedPercentage) >= 50 ? 'hsl(var(--warning) / 0.15)' : 'hsl(var(--destructive) / 0.15)',
                              color: parseInt(matchedPercentage) >= 80 ? 'hsl(var(--success))' : parseInt(matchedPercentage) >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'
                            }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {matchedPercentage}%
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {(() => {
                                const matchedUnits = group?.metrics.matchedUnitsBySource?.SUNSKY || 0;
                                if (matchedUnits > 0) {
                                  return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-500/25 transition-colors" onClick={e => {
                                    e.stopPropagation();
                                    handleGroupedSort('matched_sunsky');
                                  }} title="Total units matched with Source (including placed/closed orders)">
                                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                          {matchedUnits} units
                                        </div>;
                                } else {
                                  return <span className="text-xs text-muted-foreground">No Source matches</span>;
                                }
                              })()}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {(() => {
                                const pendingUnits = group?.metrics.pendingUnitsBySource?.SUNSKY || 0;
                                if (pendingUnits > 0) {
                                  return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-500/25 transition-colors" onClick={e => {
                                    e.stopPropagation();
                                    handleGroupedSort('pending_sunsky');
                                  }} title="Total units pending to place with Source (not in inventory)">
                                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                          {pendingUnits} units
                                        </div>;
                                } else {
                                  return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-700 dark:text-green-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                          ✓ All placed
                                        </div>;
                                }
                              })()}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-mono text-sm font-semibold">{group?.metrics.totalInStockQty || 0}</span>
                                  <span className="text-xs text-muted-foreground">units</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Button variant="outline" size="sm" onClick={() => navigate(`/po-details/${poNumber}`)} className="text-xs px-3 py-1.5 h-8 hover:bg-muted/50 transition-colors">
                                        View Details
                                      </Button>
                                      {(() => {
                                const orderWithBatch = orders.find(o => o.batch_id);
                                if (orderWithBatch?.batch_id) {
                                  return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300" title={`Batch ID: ${orderWithBatch.batch_id}`}>
                                          Batch: {orderWithBatch.batch_id.slice(0, 8)}
                                        </div>;
                                }
                                return null;
                              })()}
                                   </div>
                              </TableCell>
                             </TableRow>;
                      })}
                        </TableBody>
                      </Table>
                    </div> : <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                          <TableRow className="hover:bg-transparent border-b-2">
                            <TableHead className="w-[80px]">Image</TableHead>
                            <SortableTableHeader label="PO Number" sortKey="po_number" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Ship To" sortKey="ship_to_location" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="ASIN" sortKey="asin" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Model/SKU" sortKey="sku_code" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Title" sortKey="title" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Quantity" sortKey="quantity" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Status" sortKey="status" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <TableHead>Match Details</TableHead>
                            <TableHead>Placement Ready</TableHead>
                            <SortableTableHeader label="In-Stock Qty" sortKey="instock_qty" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <SortableTableHeader label="Cost" sortKey="unit_cost" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                       <TableBody>
                           {paginatedDetailedOrders.map(order => {
                        const isClosedOrder = order.status === 'closed';
                        const countryPrefix = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
                        const currencySymbol = selectedCountry === 'UAE' ? 'AED' : 'SAR';
                        const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
                        const canPlaceOrder = inventoryMatch && order.status === 'pending' && !order.supplier_order_number;
                        return <TableRow key={order.id} className={`
                                  ${isClosedOrder ? 'opacity-50 bg-muted/40 pointer-events-none cursor-not-allowed' : 'hover:bg-muted/10 transition-colors'}
                                `}>
                             <TableCell>
                               <div className={`w-10 h-10 bg-muted rounded border flex items-center justify-center ${isClosedOrder ? 'opacity-50' : ''}`}>
                                 <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                 </svg>
                               </div>
                             </TableCell>
                             <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs opacity-60">{countryPrefix}</span>
                                    <Button variant="link" className={`p-0 h-auto font-medium text-left justify-start ${isClosedOrder ? 'cursor-not-allowed' : ''}`} onClick={isClosedOrder ? undefined : () => navigate(`/po-details/${order.po_number}`)} disabled={isClosedOrder}>
                                      {order.po_number}
                                      {!isClosedOrder && <ExternalLink className="h-3 w-3 ml-1" />}
                                    </Button>
                                     {isClosedOrder && <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                                         ✓ Fulfilled
                                       </Badge>}
                                  </div>
                             </TableCell>
                             <TableCell>
                               <div className="text-sm text-muted-foreground">
                                 {order.ship_to_location || '-'}
                               </div>
                             </TableCell>
                             <TableCell>
                               <span className="text-sm">{order.asin || '-'}</span>
                             </TableCell>
                             <TableCell>
                               <div className="space-y-1">
                                 {order.model_number && <div className="text-sm font-medium">{order.model_number}</div>}
                                 {order.sku_code && order.sku_code !== order.model_number && <div className="text-xs text-muted-foreground">{order.sku_code}</div>}
                               </div>
                             </TableCell>
                             <TableCell>
                               <div className="max-w-[200px] truncate text-sm" title={order.title}>
                                 {order.title || '-'}
                               </div>
                             </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {order.quantity}
                              </Badge>
                            </TableCell>
                               <TableCell>
                                  <Badge variant={order.status === 'received' ? 'default' : order.status === 'placed' ? 'secondary' : order.status === 'pending' ? 'destructive' : order.status === 'closed' ? 'secondary' : 'outline'}>
                                   {order.status}
                                 </Badge>
                               </TableCell>
                            <TableCell>
                              {inventoryMatch && inventoryMatch.type === 'SUNSKY' ? <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50">
                                    Source
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Qty: {inventoryMatch.quantity}
                                  </span>
                                  {inventoryMatch.status === 'in-stock' && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                                      In Stock
                                    </Badge>}
                                </div> : <Badge variant="outline" className="text-xs text-muted-foreground">
                                  No Source match
                                </Badge>}
                            </TableCell>
                            <TableCell>
                              {canPlaceOrder ? <div className="flex items-center gap-1">
                                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                    Ready
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{inventoryMatch?.type}</span>
                                </div> : order.supplier_order_number ? <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                  Placed
                                </Badge> : !inventoryMatch ? <Badge variant="destructive">No Source</Badge> : <Badge variant="outline" className="text-muted-foreground">Not Pending</Badge>}
                            </TableCell>
                            <TableCell>
                              {(() => {
                              const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
                              if (inventoryMatch && inventoryMatch.status === 'in-stock') {
                                return <Badge variant="default" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50">
                                      {inventoryMatch.quantity} units
                                    </Badge>;
                              } else if (inventoryMatch && inventoryMatch.status === 'ordered') {
                                return <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                                      Ordered
                                    </Badge>;
                              } else {
                                return <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Not in stock
                                    </Badge>;
                              }
                            })()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.unit_cost && <div className="text-sm font-medium">
                                    {order.currency} {order.unit_cost}
                                  </div>}
                                {order.total_cost && <div className="text-xs text-muted-foreground">
                                    Total: {order.currency} {order.total_cost}
                                  </div>}
                              </div>
                            </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                setPrintMode('single');
                                setPrintOrders([order]);
                                setPrintDialogOpen(true);
                              }} title="Print this item">
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/po-details/${order.po_number}`)} disabled={isClosedOrder}>
                                      Details
                                    </Button>
                                  </div>
                                </TableCell>
                             </TableRow>;
                      })}
                       </TableBody>
                    </Table>
                    </div>}
                </div>

                <div className="flex items-center justify-between">
                  <Button onClick={() => preserveScrollAndSetPage(setCurrentPage, prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outline" size="sm">
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)}
                    {' '}(showing {viewMode === 'grouped' ? 'PO groups' : 'line items'})
                  </span>
                  <Button onClick={() => preserveScrollAndSetPage(setCurrentPage, prev => Math.min(prev + 1, Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)))} disabled={currentPage === Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)} variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upload Purchase Orders</CardTitle>
                  <p className="text-muted-foreground mt-2">
                    Upload a CSV file containing purchase orders to track.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                  console.log('🔄 Manual reload ALL POs triggered');
                  fetchPOOrders(true);
                }} className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load All POs
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteTodayUploads}>
                    <X className="h-4 w-4 mr-2" />
                    Delete Today's {selectedCountry} Uploads
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              {isLoading && <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {processingStatus || 'Processing Files...'}
                    </span>
                  </div>
                  <Progress value={processingProgress || 20} className="h-2" />
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {processingProgress < 30 ? 'Parsing and validating file contents...' : processingProgress < 60 ? 'Mapping columns and validating data...' : processingProgress < 90 ? 'Importing data and matching SKUs...' : 'Finalizing import process...'}
                  </p>
                </div>}
              
              <POFileUpload onFilesUpload={data => {
              // Update progress as we start processing
              setProcessingProgress(30);
              setProcessingStatus('Mapping and validating data...');

              // Handle file upload in the uploads section
              if (!profile) {
                toast({
                  title: "Error",
                  description: "User profile not loaded",
                  variant: "destructive"
                });
                setProcessingProgress(0);
                setProcessingStatus('');
                return;
              }
              if (!selectedCountry) {
                toast({
                  title: "Error",
                  description: "Please select a country",
                  variant: "destructive"
                });
                setProcessingProgress(0);
                setProcessingStatus('');
                return;
              }
              setProcessingProgress(60);
              setProcessingStatus('Processing purchase order data...');
              const mappedData = data.map((item: any) => ({
                po_number: item.po_number,
                ship_to_location: item.ship_to_location,
                asin: item.asin,
                model_number: item.model_number,
                title: item.title,
                quantity: item.quantity,
                external_id: item.external_id,
                external_id_type: item.external_id_type,
                file_name: item.file_name,
                country: selectedCountry
              }));
              setProcessingProgress(90);
              setProcessingStatus(`Importing to ${selectedCountry} database and matching SKUs...`);
              processPOFiles(mappedData, [], selectedCountry).then(() => {
                setProcessingProgress(100);
                setProcessingStatus(`Import completed successfully for ${selectedCountry}!`);

                // Country-specific post-processing
                toast({
                  title: `${selectedCountry} PO Import Complete`,
                  description: `Successfully imported ${mappedData.length} items for ${selectedCountry} operations`
                });
                setTimeout(() => {
                  setProcessingProgress(0);
                  setProcessingStatus('');
                }, 2000);
                fetchPOOrders(true);
              }).catch(error => {
                setProcessingProgress(0);
                setProcessingStatus('');
                console.error('Error processing files:', error);
              });
            }} isLoading={isLoading} loadingProgress={loadingProgress} loadingStatus={loadingStatus} currentPO={currentPO} currentItem={currentItem} uploadStats={uploadStats} poProgress={poProgress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels" className="space-y-6">
          {/* Smart Matching Assistant Panel */}
          <SmartMatchingPanel orders={poOrders} sunskySKUs={sunskySKUs} userId={profile?.id} />

          {labelsStep === 'list' ?
        // Step 1: PO List View
        <Card className="bg-card/50 backdrop-blur-sm border border-border/20 shadow-sm rounded-xl">
              <CardHeader className="pb-4 border-b border-border/10">
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Print Labels - Select Purchase Order
                </CardTitle>
                <p className="text-muted-foreground">
                  Select a purchase order to print labels for its items. All items will be shown including unmatched ones.
                </p>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                     {/* Saved Presets Quick Access */}
                     {savedPresets.length > 0 && <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/10 backdrop-blur-sm rounded-xl border border-border/20 shadow-sm">
                         <span className="text-sm text-muted-foreground font-medium">Quick Load:</span>
                         {savedPresets.sort((a, b) => (b.lastUsed || b.createdAt).localeCompare(a.lastUsed || a.createdAt)).slice(0, 3).map(preset => {
                  const availableCount = preset.poNumbers.filter(poNumber => {
                    const poExists = poOrders.some(order => order.po_number === poNumber);
                    return poExists;
                  }).length;
                  return <Button key={preset.id} variant="outline" size="sm" onClick={() => loadPreset(preset)} disabled={availableCount === 0} className="border border-border/30 hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200">
                                 <Package className="h-3 w-3 mr-2" />
                                 {preset.name}
                                 <Badge variant="secondary" className="ml-2">
                                   {availableCount}
                                 </Badge>
                               </Button>;
                })}
                         <Button variant="ghost" size="sm" onClick={() => setShowPresetsDialog(true)} className="text-primary">
                           View All ({savedPresets.length})
                         </Button>
                       </div>}

                     {/* Search Bar and Controls */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Left: Search */}
                        <div className="relative flex-1 min-w-[280px]">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                           <Input placeholder="Search PO number, ASIN, model, serial number..." value={labelSearchQuery} onChange={e => {
                    console.log('Label search query changed to:', e.target.value);
                    setLabelSearchQuery(e.target.value);
                  }} className="pl-9 pr-20 border border-border/30 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl shadow-sm transition-all duration-200" />
                         {isSearching && <Loader2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-spin z-10" />}
                         {labelSearchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2" onClick={() => {
                    console.log('Clearing label search');
                    setLabelSearchQuery('');
                  }}>
                            <X className="h-3 w-3" />
                          </Button>}
                      </div>

                        {/* Right: Location controls grouped */}
                        <div className="flex items-center gap-1 p-1 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/20">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant={selectedLocationFilter.size > 0 ? "default" : "ghost"} size="sm" className="gap-2 rounded-lg h-8 text-xs">
                                <MapPin className="h-3.5 w-3.5" />
                                {selectedLocationFilter.size === 0 ? 'All Locations' : selectedLocationFilter.size === 1 ? Array.from(selectedLocationFilter)[0] : `${selectedLocationFilter.size} Locations`}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto bg-popover z-50">
                              <DropdownMenuItem onClick={() => setSelectedLocationFilter(new Set())} className={selectedLocationFilter.size === 0 ? 'bg-accent' : ''}>
                                <MapPin className="h-4 w-4 mr-2" />
                                All Locations
                              </DropdownMenuItem>
                              {(() => {
                                const allLocations = [...new Set(
                                  poOrders
                                    .filter(o => o.status !== 'cancelled' && o.ship_to_location)
                                    .map(o => {
                                      const loc = o.ship_to_location!;
                                      const city = loc.split(',')[0]?.trim() || loc;
                                      return city;
                                    })
                                )].sort();
                                return allLocations.map(location => {
                                  const isActive = selectedLocationFilter.has(location);
                                  return (
                                    <DropdownMenuItem key={location} onClick={(e) => {
                                      e.preventDefault();
                                      const next = new Set(selectedLocationFilter);
                                      if (next.has(location)) {
                                        next.delete(location);
                                      } else {
                                        next.add(location);
                                      }
                                      setSelectedLocationFilter(next);
                                    }} className={cn(isActive && 'bg-accent')}>
                                      <Checkbox checked={isActive} className="h-3.5 w-3.5 mr-2" />
                                      {location}
                                      <Badge variant="secondary" className="ml-auto text-xs">
                                        {poOrders.filter(o => o.status !== 'cancelled' && o.ship_to_location?.includes(location)).length}
                                      </Badge>
                                    </DropdownMenuItem>
                                  );
                                });
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <div className="w-px h-5 bg-border/40" />
                          <Button
                            variant={allowMixedLocations ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setAllowMixedLocations(!allowMixedLocations)}
                            className={cn(
                              "gap-1.5 rounded-lg h-8 text-xs transition-all duration-200",
                              allowMixedLocations 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : "hover:bg-muted/50"
                            )}
                            title={allowMixedLocations ? "Mixed locations enabled" : "Allow selecting POs from different locations"}
                          >
                            {allowMixedLocations ? <Check className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            Mix
                          </Button>
                        </div>

                        <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                          {filteredPOGroups.length} PO{filteredPOGroups.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>

                     {/* Multi-select Controls */}
                     {selectedPOsForLabels.size > 0 && <div className="flex items-center justify-between p-4 bg-primary/5 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-semibold">
                              {selectedPOsForLabels.size} PO{selectedPOsForLabels.size !== 1 ? 's' : ''} selected
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => setSelectedPOsForLabels(new Set())} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                              Clear
                            </Button>
                          </div>
                           <div className="flex items-center gap-1.5 flex-wrap">
                             {/* Group 1: Selection actions */}
                             <Button variant="outline" size="sm" onClick={() => {
                    setPresetNameInput('');
                    setEditingPresetId(null);
                    setShowPresetsDialog(true);
                  }} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                               <Plus className="h-3.5 w-3.5 mr-1.5" />
                               Save
                             </Button>
                             <Button variant="outline" size="sm" disabled={selectedPOsForLabels.size === 0} onClick={() => setGenerateLinkDialogOpen(true)} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                               <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                               Generate Link
                             </Button>

                             <div className="w-px h-5 bg-border/30 mx-0.5" />

                             {/* Group 2: View/Print actions */}
                             <Button variant="outline" size="sm" disabled={selectedPOsForLabels.size === 0 || Array.from(selectedPOsForLabels).every(poNumber => {
                    const poGroup = filteredPOGroups.find(g => g.poNumber === poNumber);
                    return poGroup?.orders.every(order => order.status === 'closed') || false;
                  })} onClick={() => {
                    const selectedPONumbers = Array.from(selectedPOsForLabels);
                    console.log('🖨️ Print Preview: Selected POs:', selectedPONumbers.join(', '));
                    console.log('🖨️ Total poOrders in state:', poOrders.length);
                    const selectedOrders = poOrders.filter(order => selectedPONumbers.includes(order.po_number) && order.status !== 'cancelled');
                    console.log('🖨️ Orders passed to print dialog:', selectedOrders.length);
                    selectedPONumbers.forEach(po => {
                      const ordersForPO = selectedOrders.filter(o => o.po_number === po);
                      const uniqueASINs = new Set(ordersForPO.map(o => o.asin));
                      console.log(`  - ${po}: ${ordersForPO.length} items, ${ordersForPO.reduce((sum, o) => sum + o.quantity, 0)} units, ${uniqueASINs.size} ASINs`);
                    });
                    setPrintMode('bulk');
                    setPrintOrders(selectedOrders);
                    setPrintDialogOpen(true);
                  }} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                               <FileText className="h-3.5 w-3.5 mr-1.5" />
                               Print Preview
                             </Button>
                             <Button variant="outline" size="sm" disabled={Array.from(selectedPOsForLabels).every(poNumber => {
                    const poGroup = filteredPOGroups.find(g => g.poNumber === poNumber);
                    return poGroup?.orders.every(order => order.status === 'closed') || false;
                  })} onClick={() => {
                    console.log('🔍 VIEW ITEMS DEBUG: Selected POs:', Array.from(selectedPOsForLabels));
                    setSelectedPOForLabels(Array.from(selectedPOsForLabels)[0]);
                    setLabelsStep('print');
                    setActiveTab('labels');
                    setOriginalOrderPreserved(true);
                    setSortField('po_number');
                    setSortDirection('asc');
                    console.log('🔍 VIEW ITEMS DEBUG: Switched to print labels interface with original order preserved');
                  }} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                               <Package className="h-3.5 w-3.5 mr-1.5" />
                               View Items
                             </Button>
                             <Button variant="outline" size="sm" onClick={() => setActiveTab('purchase-links')} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs">
                               <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                               All Links
                             </Button>
                           </div>
                       </div>}

                  {/* PO Groups List */}
                  <div className="rounded-xl border border-border/20 overflow-hidden shadow-sm bg-card/30 backdrop-blur-sm overflow-x-auto">
                    {filteredPOGroups.length === 0 ? <Card className="p-8">
                        <div className="text-center">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
                          <p className="text-muted-foreground mb-4">
                            {labelSearchQuery ? 'No POs match your search criteria.' : 'Upload some PO data to start printing labels.'}
                          </p>
                          <Button variant="outline" onClick={() => setActiveTab('upload')}>
                            <FileUp className="h-4 w-4 mr-2" />
                            Upload PO Data
                          </Button>
                        </div>
                      </Card> : <Table>
                        <TableHeader className="sticky top-0 z-10">
                          <TableRow className="hover:bg-transparent border-b-2 border-border/30 bg-muted/90 backdrop-blur-md">
                            <TableHead className="w-[44px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                              <Checkbox
                                checked={filteredPOGroups.length > 0 && filteredPOGroups.every(g => selectedPOsForLabels.has(g.poNumber))}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const newSelected = new Set(selectedPOsForLabels);
                                    filteredPOGroups.forEach(g => newSelected.add(g.poNumber));
                                    setSelectedPOsForLabels(newSelected);
                                  } else {
                                    const newSelected = new Set(selectedPOsForLabels);
                                    filteredPOGroups.forEach(g => newSelected.delete(g.poNumber));
                                    setSelectedPOsForLabels(newSelected);
                                  }
                                }}
                                className="h-3.5 w-3.5"
                                title={`Select all ${filteredPOGroups.length} POs`}
                              />
                            </TableHead>
                            <TableHead className="min-w-[150px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">PO Number</TableHead>
                            <TableHead className="w-[160px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">Ship To</TableHead>
                            <TableHead className="w-[160px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">Size</TableHead>
                            <TableHead className="min-w-[220px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">Print Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                          {filteredPOGroups.map((group, index) => {
                      const selectedShipToLocation = (() => {
                        if (selectedPOsForLabels.size === 0) return null;
                        const firstSelectedPO = filteredPOGroups.find(g => selectedPOsForLabels.has(g.poNumber));
                        if (!firstSelectedPO) return null;
                        const locations = [...new Set(firstSelectedPO.orders.map(o => o.ship_to_location).filter(Boolean))];
                        return locations.length > 0 ? locations[0] : null;
                      })();

                      const groupShipToLocation = (() => {
                        const locations = [...new Set(group.orders.map(o => o.ship_to_location).filter(Boolean))];
                        return locations.length > 0 ? locations[0] : null;
                      })();

                      const isDisabledByLocation = !allowMixedLocations && selectedShipToLocation && groupShipToLocation && selectedShipToLocation !== groupShipToLocation && !selectedPOsForLabels.has(group.poNumber);
                      const hasClosedItems = group.orders.some(order => order.status === 'closed');
                      const isSelected = selectedPOsForLabels.has(group.poNumber);
                      const dbMetrics = poGroupMetrics?.find(m => m.po_number === group.poNumber);
                      const itemCount = dbMetrics?.total_line_items || group.orders.length;
                      const totalQty = dbMetrics?.asn_quantity || group.orders.reduce((sum, order) => sum + order.quantity, 0);
                      const printedCount = group.orders.filter(o => o.is_printed).length;
                      const totalCount = group.orders.length;
                      const printPercent = totalCount > 0 ? Math.round((printedCount / totalCount) * 100) : 0;
                      const printStatus = printedCount === totalCount ? 'complete' : printedCount > 0 ? 'partial' : 'pending';

                      return <TableRow 
                        key={group.poNumber} 
                        className={cn(
                          "transition-all duration-150 ease-out cursor-pointer border-b border-border/20",
                          index % 2 === 0 ? "bg-transparent" : "bg-muted/15",
                          isDisabledByLocation && "opacity-40 bg-muted/10 pointer-events-none cursor-not-allowed",
                          hasClosedItems && !isSelected && "opacity-75",
                          isSelected && "bg-primary/8 hover:bg-primary/12 border-l-2 border-l-primary",
                          !isSelected && !isDisabledByLocation && "hover:bg-muted/30 hover:border-l-2 hover:border-l-primary/40"
                        )}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('button')) {
                            if (isDisabledByLocation) return;
                            const newSelected = new Set(selectedPOsForLabels);
                            if (newSelected.has(group.poNumber)) {
                              newSelected.delete(group.poNumber);
                            } else {
                              newSelected.add(group.poNumber);
                            }
                            setSelectedPOsForLabels(newSelected);
                          }
                        }}
                      >
                            {/* Checkbox Column */}
                            <TableCell className="py-3">
                              <div className="flex items-center justify-center">
                                <Checkbox 
                                  checked={isSelected}
                                  className={cn(
                                    "transition-all duration-150",
                                    isSelected && "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground shadow-sm shadow-primary/20"
                                  )}
                                  onCheckedChange={() => {
                                    if (isDisabledByLocation) return;
                                    const newSelected = new Set(selectedPOsForLabels);
                                    if (newSelected.has(group.poNumber)) {
                                      newSelected.delete(group.poNumber);
                                    } else {
                                      newSelected.add(group.poNumber);
                                    }
                                    setSelectedPOsForLabels(newSelected);
                                  }}
                                />
                              </div>
                            </TableCell>
                            
                            {/* PO Number Column */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs opacity-60">
                                  {selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦'}
                                </span>
                                <span className={cn("font-semibold text-primary", isSelected && "text-primary")}>{group.poNumber}</span>
                                {hasClosedItems && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fulfilled</Badge>}
                                {isDisabledByLocation && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                    Diff. Location
                                  </Badge>}
                              </div>
                            </TableCell>
                            
                            {/* Ship To Column */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {(() => {
                                    const uniqueLocations = [...new Set(group.orders.map(o => o.ship_to_location).filter(Boolean))];
                                    if (uniqueLocations.length === 0) return '—';
                                    if (uniqueLocations.length === 1) return uniqueLocations[0];
                                    return `${uniqueLocations[0]} +${uniqueLocations.length - 1}`;
                                  })()}
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* Size Column (merged Items + Quantity) */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs text-muted-foreground">{totalQty.toLocaleString()} qty</span>
                              </div>
                            </TableCell>
                            
                            {/* Print Status Column */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 max-w-[80px]">
                                  <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        printStatus === 'complete' ? "bg-green-500" : printStatus === 'partial' ? "bg-amber-500" : "bg-muted-foreground/20"
                                      )}
                                      style={{ width: `${printPercent}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="text-[11px] text-muted-foreground tabular-nums w-[60px]">
                                  {printedCount}/{totalCount}
                                </span>
                                <Badge 
                                  variant={printStatus === 'complete' ? 'default' : 'outline'} 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    printStatus === 'complete' && "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
                                    printStatus === 'partial' && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                                    printStatus === 'pending' && "bg-muted/30"
                                  )}
                                >
                                  {printStatus === 'complete' ? 'Done' : printStatus === 'partial' ? 'Partial' : 'Pending'}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>;
                    })}
                        </TableBody>
                      </Table>}
                  </div>
                </div>
              </CardContent>
            </Card> :
        // Step 2: Label Printing Interface
        <div className="space-y-4">
              {/* Enhanced Modern Header with Animated Gradient */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-background border border-border/30 shadow-lg animate-fade-in">
                {/* Animated Decorative Elements */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-accent/15 via-accent/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse-soft" />
                
                <div className="relative p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      {/* Back Button with Enhanced Hover */}
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => {
                          setLabelsStep('list');
                          setSelectedPOForLabels(null);
                          setSelectedPOsForLabels(new Set());
                          setSelectedForPrint(new Map());
                          setOriginalOrderPreserved(false);
                        }} 
                        className="group relative h-12 px-5 font-semibold border-2 border-border/40 hover:border-primary/50 bg-background/80 backdrop-blur-sm hover:bg-primary/5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5"
                      >
                        <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                        <span>Back to PO List</span>
                      </Button>
                      
                      {/* Animated Separator */}
                      <div className="h-10 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent" />
                      
                      {/* Title Section with Enhanced Typography */}
                      <div className="flex items-center gap-4 animate-slide-in-left">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                          <div className="relative p-3.5 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow duration-300">
                            <Printer className="h-6 w-6 text-primary-foreground animate-icon-bounce" />
                          </div>
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text tracking-tight">
                            Print Labels
                          </h1>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium shadow-sm hover:shadow-md transition-shadow">
                              {selectedPOsForLabels.size > 1 
                                ? `${selectedPOsForLabels.size} Purchase Orders` 
                                : selectedPOForLabels || Array.from(selectedPOsForLabels)[0]}
                            </Badge>
                            <span className="text-sm text-muted-foreground/80">
                              • Select items and configure print settings
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Quick Stats in Header */}
                    <div className="hidden lg:flex items-center gap-3 animate-slide-in-right">
                      {(() => {
                        const selectedPOsList = selectedPOsForLabels.size > 0 
                          ? Array.from(selectedPOsForLabels) 
                          : selectedPOForLabels 
                            ? [selectedPOForLabels] 
                            : [];
                        const ordersCount = poOrders.filter(order => 
                          selectedPOsList.includes(order.po_number) && order.status !== 'cancelled'
                        ).length;
                        const unitsCount = poOrders
                          .filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled')
                          .reduce((sum, o) => sum + (o.quantity || 0), 0);
                        
                        return (
                          <>
                            <div className="group flex items-center gap-2.5 px-4 py-2.5 bg-background/70 backdrop-blur-md rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 shadow-sm hover:shadow-md cursor-default">
                              <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-semibold">{ordersCount}</span>
                              <span className="text-xs text-muted-foreground">items</span>
                            </div>
                            <div className="group flex items-center gap-2.5 px-4 py-2.5 bg-background/70 backdrop-blur-md rounded-xl border border-border/40 hover:border-accent-foreground/40 hover:bg-accent/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-default">
                              <div className="p-1.5 bg-accent/50 rounded-lg group-hover:bg-accent transition-colors">
                                <ShoppingCart className="h-4 w-4 text-accent-foreground" />
                              </div>
                              <span className="text-sm font-semibold">{unitsCount}</span>
                              <span className="text-xs text-muted-foreground">units</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Print Settings Panel with Collapsible Tabbed Interface */}
              <Card className="bg-card/50 backdrop-blur-sm border border-border/20 shadow-sm rounded-xl">
                <CardHeader className={cn("border-b border-border/20 cursor-pointer transition-all duration-200", isPrintConfigCollapsed ? "bg-muted/20 hover:bg-muted/30 py-3" : "bg-muted/10 hover:bg-muted/20 py-4")} onClick={() => setIsPrintConfigCollapsed(!isPrintConfigCollapsed)}>
                  {isPrintConfigCollapsed ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Title */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                    <Printer className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Print Settings</span>
                </div>
                
                <div className="h-4 w-px bg-border/30" />
                
                {/* QZ Status */}
                <div className="flex items-center gap-1.5 text-xs">
                  {qzConnected ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="text-success font-medium">QZ Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-warning" />
                      <span className="text-warning font-medium">Disconnected</span>
                    </>
                  )}
                </div>
                
                <div className="h-4 w-px bg-border/30" />
                
                {/* Printer Selection (inline) */}
                {qzConnected && availablePrinters.length > 0 && (
                  <>
                    <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                      <SelectTrigger className="h-7 w-[160px] text-xs bg-background/70 border-border/30">
                        <SelectValue placeholder="Select printer" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map(printer => (
                          <SelectItem key={printer} value={printer} className="text-xs">
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="h-4 w-px bg-border/30" />
                  </>
                )}
                
                {/* Selection Count */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={selectedForPrint.size > 0 ? 'font-medium' : 'text-muted-foreground'}>
                    Selected: {selectedForPrint.size}
                  </span>
                </div>
                
                <div className="flex-1" />
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button 
                    size="sm" 
                    onClick={handleDirectPrint} 
                    disabled={!qzConnected || !selectedPrinter || selectedForPrint.size === 0 || isPrinting}
                    className="h-7 text-xs bg-primary"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    {isPrinting ? 'Printing...' : `Print${selectedForPrint.size > 0 ? ` (${selectedForPrint.size})` : ''}`}
                  </Button>
                </div>
                
                {/* Expand Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0" 
                  onClick={e => {
                    e.stopPropagation();
                    setIsPrintConfigCollapsed(false);
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            ) :
              // Full expanded state - detailed header
              <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                          <Printer className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-foreground">
                            Print Settings
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Customize template, quality, and advanced options (optional)
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    </div>}
                </CardHeader>
                {!isPrintConfigCollapsed && <CardContent className="p-6">
                  <Tabs defaultValue="template" className="w-full" onValueChange={newTab => {
                trackTabChange({
                  category: 'Amazon',
                  subcategory: 'PO Tracker',
                  fromTab: 'template',
                  toTab: newTab,
                  tabTitle: `Print Config - ${newTab}`
                });
              }}>
                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-background/60 backdrop-blur-md p-1.5 rounded-xl border border-border/20 shadow-sm">
                      <TabsTrigger value="template" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        Template & Layout
                      </TabsTrigger>
                      <TabsTrigger value="quality" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        Print Quality
                      </TabsTrigger>
                      <TabsTrigger value="advanced" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        Advanced
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="template" className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Template Selection with Preview */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Label Template</Label>
                            <Badge variant="outline" className="text-xs">Choose Design</Badge>
                          </div>
                          <Select value={printSettings.template} onValueChange={value => {
                        setPrintSettings(prev => ({
                          ...prev,
                          template: value
                        }));

                        // Auto-size from template if it's a custom template and auto-size is enabled
                        if (value !== 'default' && value !== 'compact' && value !== 'detailed' && value !== 'minimal' && printSettings.autoSizeFromTemplate && printSettings.pageSize === 'custom' && labelTemplates) {
                          const selectedTemplate = (labelTemplates as any).find((t: any) => 'id' in t && t.id === value);
                          if (selectedTemplate && 'width' in selectedTemplate && 'height' in selectedTemplate) {
                            setPrintSettings(prev => ({
                              ...prev,
                              customWidth: selectedTemplate.width || 100,
                              customHeight: selectedTemplate.height || 60
                            }));
                          }
                        }
                      }}>
                            <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-medium z-50">
                              <SelectItem value="default" className="hover:bg-accent/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-2 bg-primary rounded-sm"></div>
                                  Default
                                </div>
                              </SelectItem>
                              <SelectItem value="compact" className="hover:bg-accent/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-2 bg-accent rounded-sm"></div>
                                  Compact
                                </div>
                              </SelectItem>
                              <SelectItem value="detailed" className="hover:bg-accent/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-2 bg-emerald rounded-sm"></div>
                                  Detailed
                                </div>
                              </SelectItem>
                              <SelectItem value="minimal" className="hover:bg-accent/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-2 bg-sky rounded-sm"></div>
                                  Minimal
                                </div>
                              </SelectItem>
                              {labelTemplates?.map((template: any) => 'id' in template && 'name' in template && <SelectItem key={template.id} value={template.id} className="hover:bg-accent/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-2 bg-gradient-to-r from-primary to-accent rounded-sm"></div>
                                    {template.name}
                                  </div>
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Page Size with Visual Indicators */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Label Size</Label>
                            <Badge variant="outline" className="text-xs">Dimensions</Badge>
                          </div>
                          <Select value={printSettings.pageSize} onValueChange={value => {
                        setPrintSettings(prev => ({
                          ...prev,
                          pageSize: value
                        }));

                        // Auto-size from template if custom template and auto-size enabled
                        if (value === 'custom' && printSettings.autoSizeFromTemplate && labelTemplates) {
                          const selectedTemplate = (labelTemplates as any).find((t: any) => 'id' in t && t.id === printSettings.template);
                          if (selectedTemplate && 'width' in selectedTemplate && 'height' in selectedTemplate) {
                            setPrintSettings(prev => ({
                              ...prev,
                              customWidth: selectedTemplate.width || 100,
                              customHeight: selectedTemplate.height || 60
                            }));
                          }
                        }
                      }}>
                            <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-medium z-50">
                              <SelectItem value="default">📄 Default (4×6")</SelectItem>
                              <SelectItem value="4x6">📄 4" × 6" (Standard)</SelectItem>
                              <SelectItem value="4x3">📄 4" × 3" (Medium)</SelectItem>
                              <SelectItem value="3x2">📄 3" × 2" (Small)</SelectItem>
                              <SelectItem value="2x1">📄 2" × 1" (Mini)</SelectItem>
                              <SelectItem value="custom">⚙️ Custom Size</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Custom Size Controls with Enhanced UI */}
                      {printSettings.pageSize === 'custom' && <div className="space-y-4 p-5 bg-muted/10 backdrop-blur-sm border border-border/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-primary/10 rounded-md">
                                <div className="w-3 h-3 bg-primary rounded-sm"></div>
                              </div>
                              <h4 className="text-sm font-semibold">Custom Label Dimensions</h4>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input id="auto-size" type="checkbox" checked={printSettings.autoSizeFromTemplate} onChange={e => {
                          const autoSize = e.target.checked;
                          setPrintSettings(prev => ({
                            ...prev,
                            autoSizeFromTemplate: autoSize
                          }));

                          // If enabling auto-size and we have a custom template selected
                          if (autoSize && printSettings.template !== 'default' && printSettings.template !== 'compact' && printSettings.template !== 'detailed' && printSettings.template !== 'minimal' && labelTemplates) {
                            const selectedTemplate = (labelTemplates as any).find((t: any) => 'id' in t && t.id === printSettings.template);
                            if (selectedTemplate && 'width' in selectedTemplate && 'height' in selectedTemplate) {
                              setPrintSettings(prev => ({
                                ...prev,
                                customWidth: selectedTemplate.width || 100,
                                customHeight: selectedTemplate.height || 60
                              }));
                            }
                          }
                        }} className="h-4 w-4 rounded border-border accent-primary" />
                              <Label htmlFor="auto-size" className="text-sm font-medium">Auto-size from template</Label>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                Width (mm)
                              </Label>
                              <Input type="number" min="10" max="300" value={printSettings.customWidth} onChange={e => setPrintSettings(prev => ({
                          ...prev,
                          customWidth: Math.max(10, parseInt(e.target.value) || 100)
                        }))} disabled={printSettings.autoSizeFromTemplate} className="bg-background/70 border-border/50 focus:border-primary/50 transition-colors" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-accent rounded-full"></div>
                                Height (mm)
                              </Label>
                              <Input type="number" min="10" max="300" value={printSettings.customHeight} onChange={e => setPrintSettings(prev => ({
                          ...prev,
                          customHeight: Math.max(10, parseInt(e.target.value) || 60)
                        }))} disabled={printSettings.autoSizeFromTemplate} className="bg-background/70 border-border/50 focus:border-primary/50 transition-colors" />
                            </div>
                          </div>
                        </div>}
                    </TabsContent>

                    <TabsContent value="quality" className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* DPI Selection with Quality Indicators */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Print Quality (DPI)</Label>
                            <Badge variant="outline" className="text-xs">Resolution</Badge>
                          </div>
                          <Select value={printSettings.dpi.toString()} onValueChange={value => setPrintSettings(prev => ({
                        ...prev,
                        dpi: parseInt(value) as 203 | 300
                      }))}>
                            <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-medium z-50">
                              <SelectItem value="203" className="hover:bg-accent/50">
                                <div className="flex items-center justify-between w-full">
                                  <span>203 DPI</span>
                                  <Badge variant="secondary" className="text-xs ml-2">Standard</Badge>
                                </div>
                              </SelectItem>
                              <SelectItem value="300" className="hover:bg-accent/50">
                                <div className="flex items-center justify-between w-full">
                                  <span>300 DPI</span>
                                  <Badge variant="default" className="text-xs ml-2">High Quality</Badge>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Darkness with Visual Slider */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">Print Darkness</Label>
                              <Badge variant="outline" className="text-xs">0-30</Badge>
                            </div>
                            <div className="text-sm font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                              {printSettings.darkness}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Input type="range" min="0" max="30" value={printSettings.darkness} onChange={e => setPrintSettings(prev => ({
                          ...prev,
                          darkness: parseInt(e.target.value)
                        }))} className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Light</span>
                              <span>Medium</span>
                              <span>Dark</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-6 animate-fade-in">
                      {/* Copy Settings with Enhanced UI */}
                      <div className="p-5 bg-muted/10 backdrop-blur-sm border border-border/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-accent/10 rounded-md">
                            <div className="w-3 h-3 bg-accent rounded-sm"></div>
                          </div>
                          <h4 className="text-sm font-semibold">Copy Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg border border-border/30">
                            <input id="copies-by-qty" type="checkbox" checked={printSettings.copiesByQuantity} onChange={e => setPrintSettings(prev => ({
                          ...prev,
                          copiesByQuantity: e.target.checked
                        }))} className="h-4 w-4 rounded border-border accent-primary" />
                            <div className="flex-1">
                              <Label htmlFor="copies-by-qty" className="text-sm font-medium cursor-pointer">
                                Print copies based on quantity
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Automatically print one label per item quantity
                              </p>
                            </div>
                          </div>
                          
                          {!printSettings.copiesByQuantity && <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/30 animate-slide-down">
                              <Label className="text-sm font-medium">Fixed copies per item:</Label>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPrintSettings(prev => ({
                            ...prev,
                            copies: Math.max(1, prev.copies - 1)
                          }))} className="h-8 w-8 p-0">
                                  -
                                </Button>
                                <Input type="number" min="1" max="10" value={printSettings.copies} onChange={e => setPrintSettings(prev => ({
                            ...prev,
                            copies: Math.max(1, parseInt(e.target.value) || 1)
                          }))} className="w-16 text-center bg-background/70" />
                                <Button variant="outline" size="sm" onClick={() => setPrintSettings(prev => ({
                            ...prev,
                            copies: Math.min(10, prev.copies + 1)
                          }))} className="h-8 w-8 p-0">
                                  +
                                </Button>
                              </div>
                            </div>}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>}

                {/* Print Action Section - Only in Expanded State */}
                {!isPrintConfigCollapsed && <CardContent className="p-4 border-t border-border/30 bg-gradient-to-b from-card/80 to-card max-h-[180px] overflow-y-auto">
                  {/* Compact Status Bar */}
                  <div className="flex items-center gap-4 mb-3 p-2.5 bg-gradient-to-r from-muted/30 to-muted/50 rounded-md border border-border/20 text-sm">
                    {/* QZ Status */}
                    <div className="flex items-center gap-1.5">
                      {qzConnected ? <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span className="text-foreground font-medium">QZ Connected</span>
                        </> : <>
                          <AlertCircle className="h-3.5 w-3.5 text-warning" />
                          <span className="text-warning-foreground font-medium">QZ Disconnected</span>
                        </>}
                    </div>

                    <div className="h-4 w-px bg-border/50"></div>

                    {/* Printer Selection */}
                    {qzConnected && availablePrinters.length > 0 ? <div className="flex items-center gap-2">
                        <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                          <SelectTrigger className="h-7 w-[160px] text-xs bg-background/70 border-border/50">
                            <SelectValue placeholder="Select printer" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-medium z-50">
                            {availablePrinters.map(printer => <SelectItem key={printer} value={printer} className="text-xs">
                                {printer}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div> : selectedPrinter ? <div className="flex items-center gap-1.5">
                        <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedPrinter}</span>
                      </div> : <div className="flex items-center gap-1.5">
                        <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">No Printer</span>
                      </div>}

                    <div className="h-4 w-px bg-border/50"></div>

                    {/* Selection Count */}
                    <div className="flex items-center gap-1.5">
                      {selectedForPrint.size > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className={selectedForPrint.size > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                        Selected: {selectedForPrint.size}
                      </span>
                    </div>
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="flex items-center justify-end p-2.5 bg-card/50 rounded-md border border-border/20">
                    {/* Primary Print Button */}
                    {(() => {
                  const isPrintDisabled = selectedForPrint.size === 0 || !qzConnected || !selectedPrinter || isPrinting || isPrintStatusUpdating;
                  const disabledReason = isPrintDisabled ? selectedForPrint.size === 0 ? 'No items selected' : !qzConnected ? 'QZ Tray not connected' : !selectedPrinter ? 'No printer selected' : isPrinting ? 'Currently printing' : isPrintStatusUpdating ? 'Updating print status' : 'Unknown' : 'Ready to print';
                  console.log('🎯 Print Button State:', {
                    isPrintDisabled,
                    selectedCount: selectedForPrint.size,
                    qzConnected,
                    selectedPrinter,
                    isPrinting,
                    isPrintStatusUpdating,
                    reason: disabledReason
                  });
                  return <Button size="sm" onClick={() => {
                    console.log('🖨️ Print clicked:', {
                      selection: selectedForPrint.size,
                      qz: qzConnected,
                      printer: selectedPrinter,
                      reason: disabledReason
                    });
                    handleDirectPrint();
                  }} disabled={isPrintDisabled} className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-glow hover:shadow-accent-glow transition-all h-8 text-xs min-w-[140px]">
                          {isPrinting ? <div className="flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Printing...</span>
                            </div> : isPrintStatusUpdating ? <div className="flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Updating...</span>
                            </div> : <div className="flex items-center gap-1.5">
                              <Printer className="h-3 w-3" />
                              <span>Print Labels</span>
                {selectedForPrint.size > 0 && (() => {
                        const totalPrintQty = Array.from(customPrintQuantities.values()).reduce((sum, qty) => sum + qty, 0);
                        return <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-background/20 text-primary-foreground">
                      {totalPrintQty || selectedForPrint.size}
                    </Badge>;
                      })()}
                            </div>}
                        </Button>;
                })()}

                {/* Reprint All Printed Labels Button */}
                {reprintAllPrintedItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReprintAllDialog(true)}
                    disabled={!qzConnected || !selectedPrinter || isReprintingAll}
                    className="border border-border/30 hover:bg-amber-500/10 hover:border-amber-500/30 hover:shadow-sm rounded-lg transition-all duration-200 h-8 text-xs"
                  >
                    {isReprintingAll ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Reprinting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        <span>Reprint All Labels</span>
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {reprintAllPrintedItems.reduce((sum, o) => sum + (o.printed_quantity || 0), 0)}
                        </Badge>
                      </div>
                    )}
                  </Button>
                )}
                  </div>

                  {/* Compact Connection Alert */}
                  {!qzConnected && <div className="mt-3 p-2.5 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-md animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-warning-foreground">
                              QZ Tray Required
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Labels will download instead
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={initializeQZ} className="h-7 text-xs hover:bg-warning/10">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      </div>
                    </div>}
                  </CardContent>}
              </Card>

              {/* Enhanced Items Selection Table with Refined Styling */}
              <Card className="bg-card/50 backdrop-blur-sm border border-border/20 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden animate-fade-in">
                <CardHeader className="bg-gradient-to-r from-muted/20 via-muted/10 to-transparent backdrop-blur-sm border-b border-border/20 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20 group-hover:border-primary/30 transition-colors">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                            Select Items to Print
                          </CardTitle>
                          <p className="text-sm text-muted-foreground/80 mt-1">
                            Choose which items to include in your print job
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Toolbar */}
                      <div className="flex items-center gap-3">
                        {originalOrderPreserved && <Button variant="outline" size="sm" onClick={() => setOriginalOrderPreserved(false)} className="text-xs border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200">
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Enable Sorting
                          </Button>}
                        
                        <Button variant="outline" size="sm" onClick={() => {
                    const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : [];
                    const allPOOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number)).filter(order => order.status !== 'cancelled');
                    const currentPageIds = new Set(allPOOrders.map(order => order.id));
                    const allSelected = Array.from(currentPageIds).every(id => selectedForPrint.has(id));
                    if (allSelected) {
                      setSelectedForPrint(prev => {
                        const newMap = new Map(prev);
                        currentPageIds.forEach(id => newMap.delete(id));
                        return newMap;
                      });
                    } else {
                      setSelectedForPrint(prev => {
                        const newMap = new Map(prev);
                        currentPageIds.forEach(id => newMap.set(id, 1)); // Default quantity of 1
                        return newMap;
                      });
                    }
                  }} className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200">
                            {(() => {
                      const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : [];
                      const allPOOrders = poOrders.filter(order => selectedPOsList.includes(order.po_number)).filter(order => order.status !== 'cancelled');
                      const allSelected = allPOOrders.every(order => selectedForPrint.has(order.id));
                      return allSelected && allPOOrders.length > 0 ? <>
                                <Square className="h-3 w-3 mr-1" />
                                Unselect All
                              </> : <>
                                <CheckSquare className="h-3 w-3 mr-1" />
                                Select All
                              </>;
                    })()}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowQuantityMatchingDialog(true)}
                          className="border border-border/30 hover:bg-muted/50 hover:shadow-sm rounded-lg transition-all duration-200"
                        >
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Qty Report
                        </Button>
                        
                        <Badge variant={selectedForPrint.size > 0 ? "default" : "outline"} className={`font-medium transition-colors ${selectedForPrint.size > 0 ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${selectedForPrint.size > 0 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                            {selectedForPrint.size} selected
                          </div>
                        </Badge>
                      </div>
                    </div>
                </CardHeader>

                {/* Enhanced Modern Metrics Dashboard with Animations */}
                <div className="px-5 py-5 bg-gradient-to-r from-muted/10 via-background to-muted/10 border-b border-border/20">
                  {(() => {
                const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : [];
                const ordersForMetrics = poOrders.filter(order => selectedPOsList.includes(order.po_number) && order.status !== 'cancelled');

                // Calculate metrics
                const totalItems = ordersForMetrics.length;
                const totalUnits = ordersForMetrics.reduce((sum, o) => sum + (o.quantity || 0), 0);
                const printedItems = ordersForMetrics.filter(o => (o.printed_quantity || 0) > 0).length;
                const printedUnits = ordersForMetrics.reduce((sum, o) => sum + (o.printed_quantity || 0), 0);
                const fullyPrintedItems = ordersForMetrics.filter(o => (o.printed_quantity || 0) >= (o.quantity || 0) && (o.printed_quantity || 0) > 0).length;
                const partiallyPrintedItems = ordersForMetrics.filter(o => {
                  const printed = o.printed_quantity || 0;
                  const total = o.quantity || 0;
                  return printed > 0 && printed < total;
                }).length;
                const pendingItems = totalItems - printedItems;
                const pendingUnits = totalUnits - printedUnits;

                // Sunsky matching metrics
                const sunskyMatchedItems = ordersForMetrics.filter(o => o.sunsky_sku && (o.sunsky_sku.sku_code || o.sunsky_sku.id)).length;
                const sunskyPrintedItems = ordersForMetrics.filter(o => o.sunsky_sku && (o.sunsky_sku.sku_code || o.sunsky_sku.id) && (o.printed_quantity || 0) > 0).length;
                const sunskyPrintedUnits = ordersForMetrics.filter(o => o.sunsky_sku && (o.sunsky_sku.sku_code || o.sunsky_sku.id) && (o.printed_quantity || 0) > 0).reduce((sum, o) => sum + (o.printed_quantity || 0), 0);
                const sunskyPendingItems = ordersForMetrics.filter(o => o.sunsky_sku && (o.sunsky_sku.sku_code || o.sunsky_sku.id) && (o.quantity || 0) - (o.printed_quantity || 0) > 0).length;
                const sunskyPendingUnits = ordersForMetrics.filter(o => o.sunsky_sku && (o.sunsky_sku.sku_code || o.sunsky_sku.id)).reduce((sum, o) => sum + Math.max(0, (o.quantity || 0) - (o.printed_quantity || 0)), 0);
                
                const printProgress = totalUnits > 0 ? Math.round((printedUnits / totalUnits) * 100) : 0;
                
                return <div className="space-y-4">
                        {/* Enhanced Metrics Cards Grid with Staggered Animation */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 stagger-children">
                          {/* Total Items Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-background via-background to-muted/30 rounded-xl border border-border/40 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                                  <Package className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                              </div>
                              <div className="text-2xl font-bold text-foreground tracking-tight">{totalItems}</div>
                              <div className="text-xs text-muted-foreground/80 mt-1 font-medium">{totalUnits} units</div>
                            </div>
                          </div>
                          
                          {/* Printed Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-emerald-50/80 via-green-50/50 to-green-100/40 dark:from-green-950/40 dark:via-green-900/30 dark:to-green-950/20 rounded-xl border border-green-200/60 dark:border-green-800/40 shadow-sm hover:shadow-lg hover:shadow-green-500/5 hover:border-green-400/50 dark:hover:border-green-600/50 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/15 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-green-500/15 rounded-lg group-hover:bg-green-500/25 transition-colors duration-300">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Printed</span>
                              </div>
                              <div className="text-2xl font-bold text-green-700 dark:text-green-400 tracking-tight">{printedItems}</div>
                              <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1 font-medium">{printedUnits} units</div>
                            </div>
                          </div>
                          
                          {/* Pending Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-orange-100/40 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-orange-950/20 rounded-xl border border-orange-200/60 dark:border-orange-800/40 shadow-sm hover:shadow-lg hover:shadow-orange-500/5 hover:border-orange-400/50 dark:hover:border-orange-600/50 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/15 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-orange-500/15 rounded-lg group-hover:bg-orange-500/25 transition-colors duration-300">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Pending</span>
                              </div>
                              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400 tracking-tight">{pendingItems}</div>
                              <div className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1 font-medium">{pendingUnits} units</div>
                            </div>
                          </div>
                          
                          {/* Partial Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-yellow-50/80 via-amber-50/50 to-yellow-100/40 dark:from-yellow-950/40 dark:via-yellow-900/30 dark:to-yellow-950/20 rounded-xl border border-yellow-200/60 dark:border-yellow-800/40 shadow-sm hover:shadow-lg hover:shadow-yellow-500/5 hover:border-yellow-400/50 dark:hover:border-yellow-600/50 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-yellow-500/15 rounded-lg group-hover:bg-yellow-500/25 transition-colors duration-300">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Partial</span>
                              </div>
                              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 tracking-tight">{partiallyPrintedItems}</div>
                              <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-1 font-medium">items</div>
                            </div>
                          </div>
                          
                          {/* Sunsky Matched Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-sky-50/80 via-blue-50/50 to-blue-100/40 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-800/40 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-400/50 dark:hover:border-blue-600/50 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/15 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-blue-500/15 rounded-lg group-hover:bg-blue-500/25 transition-colors duration-300">
                                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Sunsky</span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">{sunskyMatchedItems}</span>
                                <span className="text-xs text-blue-600/60 font-medium">matched</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs mt-1.5 font-medium">
                                <span className="text-green-600 dark:text-green-400">✓ {sunskyPrintedItems}</span>
                                <span className="text-muted-foreground/50">|</span>
                                <span className="text-orange-600 dark:text-orange-400">⏳ {sunskyPendingItems}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Card */}
                          <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-violet-50/80 via-purple-50/50 to-purple-100/40 dark:from-purple-950/40 dark:via-purple-900/30 dark:to-purple-950/20 rounded-xl border border-purple-200/60 dark:border-purple-800/40 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-400/50 dark:hover:border-purple-600/50 hover:-translate-y-0.5 transition-all duration-300 animate-stagger-fade">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/15 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-1.5 bg-purple-500/15 rounded-lg group-hover:bg-purple-500/25 transition-colors duration-300">
                                  <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Progress</span>
                              </div>
                              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 tracking-tight">{printProgress}%</div>
                              <div className="w-full h-2 bg-purple-200/60 dark:bg-purple-900/50 rounded-full mt-2.5 overflow-hidden shadow-inner">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 via-purple-500 to-violet-500 rounded-full transition-all duration-700 ease-out relative"
                                  style={{ width: `${printProgress}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>;
              })()}
                </div>

                <CardContent className="px-4 py-5">
                  {/* Modern Search & Filter Section */}
                  <div className="mb-6 space-y-4">
                    {/* Search Bar Row */}
                    <div className="flex gap-3">
                      {/* Search Options Panel */}
                      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm rounded-xl border border-border/30 shadow-sm">
                        {/* Search Type */}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Search className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                            <SelectTrigger className="w-[120px] h-8 border-none bg-transparent focus:ring-0 text-sm font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-lg z-[100]">
                              <SelectItem value="all">All Fields</SelectItem>
                              <SelectItem value="asin">ASIN Only</SelectItem>
                              <SelectItem value="sku">SKU Only</SelectItem>
                              <SelectItem value="serial">Serial Number</SelectItem>
                              <SelectItem value="title">Title Only</SelectItem>
                              <SelectItem value="po_number">PO Number</SelectItem>
                              <SelectItem value="barcode">Scanned Barcode</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="h-6 w-px bg-border/50" />
                        
                        {/* Chip Mode */}
                        <div className="flex items-center gap-2">
                          <Select value={chipMode} onValueChange={(value: 'auto' | 'manual') => setChipMode(value)}>
                            <SelectTrigger className="w-[100px] h-8 border-none bg-transparent focus:ring-0 text-sm">
                              <SelectValue placeholder="Chip Mode" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-lg z-[100]">
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {chipMode === 'auto' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-background/60 rounded-lg">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              <Input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={chipDelay} 
                                onChange={e => setChipDelay(Math.max(1, Math.min(10, parseInt(e.target.value) || 2)))} 
                                className="w-10 h-6 border-none bg-transparent text-center p-0 focus-visible:ring-0 text-sm font-medium" 
                              />
                              <span className="text-xs text-muted-foreground">sec</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Main Search Input */}
                      <div className="relative group flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                          <div className="p-1.5 bg-primary/10 rounded-lg group-focus-within:bg-primary/20 transition-colors">
                            <Search className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-14 pr-12 py-3 min-h-[52px] bg-gradient-to-r from-background to-muted/10 backdrop-blur-sm border-2 border-border/30 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/5 hover:border-primary/30 transition-all duration-300 rounded-xl">
                          {searchTags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-3 py-1.5 text-sm flex items-center gap-1.5 border-0 shadow-md hover:shadow-lg transition-shadow animate-scale-in"
                            >
                              {tag}
                              <button 
                                onClick={() => setSearchTags(prev => prev.filter((_, i) => i !== index))} 
                                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <input 
                            type="text" 
                            placeholder={searchTags.length === 0 
                              ? searchType === 'all' ? "Search by SKU, title, ASIN, serial, barcode..." 
                              : searchType === 'asin' ? "Search by ASIN..." 
                              : searchType === 'sku' ? "Search by SKU..." 
                              : searchType === 'serial' ? "Search by Serial Number..." 
                              : searchType === 'title' ? "Search by Title..." 
                              : searchType === 'po_number' ? "Search by PO Number..." 
                              : "Search by Scanned Barcode..." 
                              : "Add another search term..."
                            }
                            value={labelSearchQuery} 
                            onChange={e => setLabelSearchQuery(e.target.value)} 
                            onKeyDown={e => {
                              if (e.key === 'Enter' && labelSearchQuery.trim()) {
                                e.preventDefault();
                                const trimmedQuery = labelSearchQuery.trim();
                                if (!searchTags.includes(trimmedQuery)) {
                                  setSearchTags(prev => [...prev, trimmedQuery]);
                                  setLabelSearchQuery('');
                                }
                              }
                              if (e.key === 'Backspace' && !labelSearchQuery && searchTags.length > 0) {
                                setSearchTags(prev => prev.slice(0, -1));
                              }
                            }} 
                            className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/70" 
                          />
                        </div>
                        {(labelSearchQuery || searchTags.length > 0) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors z-10 rounded-lg" 
                            onClick={() => {
                              setLabelSearchQuery('');
                              setSearchTags([]);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Filter Pills Row */}
                    <div className="flex items-center gap-3 flex-wrap p-3 bg-gradient-to-r from-muted/20 via-transparent to-muted/20 rounded-xl border border-border/20">
                      {/* Snapshot Lock Indicator */}
                      {hasActiveFilters() && lockedFilterIdsRef.current && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-primary">
                            Results locked ({lockedFilterIdsRef.current.size} items)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-xs text-primary hover:text-primary hover:bg-primary/20"
                            onClick={clearAllFiltersAndUnlock}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear & Refresh
                          </Button>
                        </div>
                      )}
                      {/* Print Status Filter */}
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Print Status:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[200px] border border-border/30 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200 justify-between">
                              <span className="text-sm">{printedFilter.length > 0 ? `${printedFilter.length} selected` : 'All Items'}</span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-4 z-50 bg-background/95 backdrop-blur-md border border-border/20 rounded-xl shadow-lg" align="start">
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox id="print-printed" checked={printedFilter.includes('printed')} onCheckedChange={checked => {
                                if (checked) {
                                  setPrintedFilter([...printedFilter, 'printed']);
                                } else {
                                  setPrintedFilter(printedFilter.filter(f => f !== 'printed'));
                                }
                              }} />
                                  <Label htmlFor="print-printed" className="text-sm cursor-pointer">
                                    ✓ Fully Printed
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="print-partial" checked={printedFilter.includes('partial-printed')} onCheckedChange={checked => {
                                if (checked) {
                                  setPrintedFilter([...printedFilter, 'partial-printed']);
                                } else {
                                  setPrintedFilter(printedFilter.filter(f => f !== 'partial-printed'));
                                }
                              }} />
                                  <Label htmlFor="print-partial" className="text-sm cursor-pointer">
                                    ⚠ Partially Printed
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="print-not" checked={printedFilter.includes('not-printed')} onCheckedChange={checked => {
                                if (checked) {
                                  setPrintedFilter([...printedFilter, 'not-printed']);
                                } else {
                                  setPrintedFilter(printedFilter.filter(f => f !== 'not-printed'));
                                }
                              }} />
                                  <Label htmlFor="print-not" className="text-sm cursor-pointer">
                                    ○ Not Printed
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {printedFilter.length > 0 && <Button variant="ghost" size="sm" onClick={() => setPrintedFilter([])} className="h-8 px-2 text-xs hover:bg-destructive/10">
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>}
                        
                        {/* Print Preview Button */}
              <Button variant="default" size="sm" disabled={selectedPOsForLabels.size === 0 || poOrders.length === 0} title={selectedPOsForLabels.size === 0 ? "Select POs first to preview labels" : "Preview labels for selected POs"} onClick={() => {
                      const filteredOrders = getSelectedPOsOrdersByPrintStatus();
                      console.log('🖨️ Print Preview by Status:', {
                        selectedPOs: Array.from(selectedPOsForLabels),
                        printedFilter,
                        matchingOrders: filteredOrders.length
                      });
                      if (filteredOrders.length === 0) {
                        toast({
                          title: "No Items to Preview",
                          description: "No items from selected POs match the print status filter.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setPrintMode('bulk');
                      setPrintOrders(filteredOrders);
                      setPrintDialogOpen(true);
                    }} className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Print Preview
                          {printedFilter.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                              {getSelectedPOsOrdersByPrintStatus().length}
                            </Badge>}
                        </Button>
                      </div>

                      {/* Vertical Divider */}
                      <div className="h-8 w-px bg-border" />

                      {/* Source Filter */}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Source:</span>
                        <Select value={sourceFilter} onValueChange={value => setSourceFilter(value as 'all' | 'sunsky-matched' | 'not-matched')}>
                          <SelectTrigger className="w-[200px] border border-border/30 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            <SelectItem value="sunsky-matched">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                Sunsky Matched
                              </div>
                            </SelectItem>
                            <SelectItem value="not-matched">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                Not Matched
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {sourceFilter !== 'all' && <Button variant="ghost" size="sm" onClick={() => setSourceFilter('all')} className="h-8 px-2 text-xs hover:bg-destructive/10">
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>}
                        {/* Source Print Preview */}
                        <Button variant="default" size="sm" disabled={selectedPOsForLabels.size === 0 || poOrders.length === 0} title="Preview labels filtered by source" onClick={() => {
                          const filtered = getSelectedPOsOrdersBySource();
                          if (filtered.length === 0) {
                            toast({ title: "No Items to Preview", description: "No items match the source filter.", variant: "destructive" });
                            return;
                          }
                          setPrintMode('bulk');
                          setPrintOrders(filtered);
                          setPrintDialogOpen(true);
                        }} className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Print Preview
                          {sourceFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{getSelectedPOsOrdersBySource().length}</Badge>}
                        </Button>
                      </div>

                      {/* Vertical Divider */}
                      <div className="h-8 w-px bg-border" />

                      {/* Fulfillment Status Filter */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Fulfillment:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[200px] border border-border/30 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200 justify-between">
                              <span className="text-sm">{fulfillmentFilter.length > 0 ? `${fulfillmentFilter.length} selected` : 'All Items'}</span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-4 z-50 bg-background/95 backdrop-blur-md border border-border/20 rounded-xl shadow-lg" align="start">
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox id="fulfill-fully" checked={fulfillmentFilter.includes('fully-fulfilled')} onCheckedChange={checked => {
                                if (checked) {
                                  setFulfillmentFilter([...fulfillmentFilter, 'fully-fulfilled']);
                                } else {
                                  setFulfillmentFilter(fulfillmentFilter.filter(f => f !== 'fully-fulfilled'));
                                }
                              }} />
                                  <Label htmlFor="fulfill-fully" className="text-sm cursor-pointer">
                                    ✓ Fully Fulfilled from Stock
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="fulfill-partial" checked={fulfillmentFilter.includes('partial-fulfilled')} onCheckedChange={checked => {
                                if (checked) {
                                  setFulfillmentFilter([...fulfillmentFilter, 'partial-fulfilled']);
                                } else {
                                  setFulfillmentFilter(fulfillmentFilter.filter(f => f !== 'partial-fulfilled'));
                                }
                              }} />
                                  <Label htmlFor="fulfill-partial" className="text-sm cursor-pointer">
                                    ⚠ Partially Fulfilled from Stock
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {fulfillmentFilter.length > 0 && <Button variant="ghost" size="sm" onClick={() => setFulfillmentFilter([])} className="h-8 px-2 text-xs hover:bg-destructive/10">
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>}
                        {/* Fulfillment Print Preview */}
                        <Button variant="default" size="sm" disabled={selectedPOsForLabels.size === 0 || poOrders.length === 0} title="Preview labels filtered by fulfillment" onClick={() => {
                          const filtered = getSelectedPOsOrdersByFulfillment();
                          if (filtered.length === 0) {
                            toast({ title: "No Items to Preview", description: "No items match the fulfillment filter.", variant: "destructive" });
                            return;
                          }
                          setPrintMode('bulk');
                          setPrintOrders(filtered);
                          setPrintDialogOpen(true);
                        }} className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Print Preview
                          {fulfillmentFilter.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{getSelectedPOsOrdersByFulfillment().length}</Badge>}
                        </Button>
                      </div>

                      {/* Vertical Divider */}
                      <div className="h-8 w-px bg-border" />

                      {/* In-Stock Filter */}
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">In Stock:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[200px] border border-border/30 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg shadow-sm transition-all duration-200 justify-between">
                              <span className="text-sm">{instockFilter.length > 0 ? `${instockFilter.length} selected` : 'All Items'}</span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-4 z-50 bg-background/95 backdrop-blur-md border border-border/20 rounded-xl shadow-lg" align="start">
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox id="instock-yes" checked={instockFilter.includes('in-stock')} onCheckedChange={checked => {
                                    if (checked) {
                                      setInstockFilter([...instockFilter, 'in-stock']);
                                    } else {
                                      setInstockFilter(instockFilter.filter(f => f !== 'in-stock'));
                                    }
                                  }} />
                                  <Label htmlFor="instock-yes" className="text-sm cursor-pointer">
                                    ✓ In Stock
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox id="instock-no" checked={instockFilter.includes('out-of-stock')} onCheckedChange={checked => {
                                    if (checked) {
                                      setInstockFilter([...instockFilter, 'out-of-stock']);
                                    } else {
                                      setInstockFilter(instockFilter.filter(f => f !== 'out-of-stock'));
                                    }
                                  }} />
                                  <Label htmlFor="instock-no" className="text-sm cursor-pointer">
                                    ○ Out of Stock
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {instockFilter.length > 0 && <Button variant="ghost" size="sm" onClick={() => setInstockFilter([])} className="h-8 px-2 text-xs hover:bg-destructive/10">
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>}
                        {/* In-Stock Print Preview */}
                        <Button variant="default" size="sm" disabled={selectedPOsForLabels.size === 0 || poOrders.length === 0} title="Preview labels filtered by stock status" onClick={() => {
                          const filtered = getSelectedPOsOrdersByInstock();
                          if (filtered.length === 0) {
                            toast({ title: "No Items to Preview", description: "No items match the in-stock filter.", variant: "destructive" });
                            return;
                          }
                          setPrintMode('bulk');
                          setPrintOrders(filtered);
                          setPrintDialogOpen(true);
                        }} className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Print Preview
                          {instockFilter.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{getSelectedPOsOrdersByInstock().length}</Badge>}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modern Table Container */}
                  <div className="rounded-2xl border border-border/30 overflow-hidden shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm">
                    <Table className="w-full table-fixed">
                      <TableHeader className="bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 backdrop-blur-md sticky top-0 z-10">
                        <TableRow className="border-b-2 border-border/30">
                          <TableHead className="w-12 font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center justify-center">
                              <div className="p-1.5 bg-primary/10 rounded-lg">
                                <CheckSquare className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                          </TableHead>
                          <TableHead className="w-20 font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-muted/50 rounded">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Image</span>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-primary/5 select-none min-w-[140px] max-w-[180px] font-bold transition-all duration-200 border-r border-border/10 bg-transparent py-4 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`} onClick={() => !originalOrderPreserved && handleSort('sku_code')}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-primary to-primary/70 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">SKU/Model</span>
                              {sortField === 'sku_code' && !originalOrderPreserved && (
                                <div className={`p-1 rounded-md bg-primary/10 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'} transition-transform duration-200`}>
                                  <ChevronUp className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              {originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' && (
                                <Badge variant="outline" className="text-[10px] ml-auto bg-muted/50">Original</Badge>
                              )}
                            </div>
                          </TableHead>
                          <TableHead className={`w-[220px] min-w-[220px] font-bold border-r border-border/10 bg-transparent py-4 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-sm flex-shrink-0"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Stock</span>
                              <div className="flex items-center ml-auto rounded-lg border border-border/40 overflow-hidden bg-muted/30">
                                <button
                                  onClick={(e) => { e.stopPropagation(); !originalOrderPreserved && handleSort('serial_number_qty'); }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer rounded-l-md ${sortField === 'serial_number_qty' ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'hover:bg-muted/80 text-muted-foreground'}`}
                                  title="Sort by Serial Number"
                                >
                                  S/N
                                  {sortField === 'serial_number_qty' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </button>
                                <div className="w-px h-5 bg-border/60" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); !originalOrderPreserved && handleSort('instock_qty'); }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer rounded-r-md ${sortField === 'instock_qty' ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'hover:bg-muted/80 text-muted-foreground'}`}
                                  title="Sort by In-Stock Quantity"
                                >
                                  Qty
                                  {sortField === 'instock_qty' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-primary/5 select-none min-w-[250px] max-w-[350px] font-bold transition-all duration-200 border-r border-border/10 bg-transparent py-4 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`} onClick={() => !originalOrderPreserved && handleSort('combined_title')}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-accent to-accent/70 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Title & ASIN</span>
                              {sortField === 'combined_title' && !originalOrderPreserved && (
                                <div className={`p-1 rounded-md bg-accent/10 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'} transition-transform duration-200`}>
                                  <ChevronUp className="h-3 w-3 text-accent" />
                                </div>
                              )}
                            </div>
                          </TableHead>
                          {/* Shipped Qty Header - NEW */}
                          <TableHead className="min-w-[100px] font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Shipped Qty</span>
                            </div>
                          </TableHead>
                          {/* FBA Inventory Qty Header - NEW */}
                          <TableHead className="min-w-[100px] font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">FBA Inv Qty</span>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-primary/5 select-none font-bold transition-all duration-200 border-r border-border/10 bg-transparent py-4 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`} onClick={() => !originalOrderPreserved && handleSort('quantity')}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">PO Qty</span>
                              {sortField === 'quantity' && !originalOrderPreserved && (
                                <div className={`p-1 rounded-md bg-emerald-500/10 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'} transition-transform duration-200`}>
                                  <ChevronUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="min-w-[100px] font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-sky-500 to-sky-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Print Qty</span>
                            </div>
                          </TableHead>
                          <TableHead className="min-w-[160px] font-bold border-r border-border/10 bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Print Status</span>
                            </div>
                          </TableHead>
                          <TableHead className="min-w-[140px] font-bold border-r border-border/10 bg-transparent py-4 cursor-pointer hover:bg-primary/5" onClick={() => handleSort('scanned_barcode' as any)}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Scanned Barcode</span>
                              {sortField === 'scanned_barcode' && (
                                <ChevronUp className={`h-3 w-3 text-primary transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ml-1 ${barcodeFilter !== 'all' ? 'text-primary' : 'text-muted-foreground'}`}>
                                    <Filter className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40">
                                  <DropdownMenuItem onClick={() => setBarcodeFilter('all')} className={barcodeFilter === 'all' ? 'bg-primary/10' : ''}>
                                    All
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setBarcodeFilter('has-barcode')} className={barcodeFilter === 'has-barcode' ? 'bg-primary/10' : ''}>
                                    Has Barcode
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setBarcodeFilter('no-barcode')} className={barcodeFilter === 'no-barcode' ? 'bg-primary/10' : ''}>
                                    No Barcode
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableHead>
                          <TableHead className="min-w-[100px] font-bold bg-transparent py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full shadow-sm"></div>
                              <span className="text-foreground text-xs uppercase tracking-wider">Actions</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                        <TableBody className="divide-y divide-border/10">
                           {(() => {
                      const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : [];

                      // Debug: Log the filtering steps
                      console.log('🔍 Print Labels Filtering Debug:', {
                        selectedPOs: selectedPOsList,
                        selectedCountry,
                        labelEligibleOrdersCount: labelEligibleOrders.length,
                        poOrdersCount: poOrders.length
                      });

                      // Use poOrders directly (all orders including closed) and filter by selected POs
                      let ordersForSelectedPOs = poOrders.filter(order => {
                        const poMatch = selectedPOsList.includes(order.po_number);
                        const statusMatch = order.status !== 'cancelled'; // Exclude only cancelled
                        return poMatch && statusMatch;
                      }).filter(order => {
                        // If we have search tags, use them for filtering
                        if (searchTags.length === 0 && !labelSearchQuery) return true;
                        const allSearchTerms = [...searchTags];
                        if (labelSearchQuery.trim()) {
                          allSearchTerms.push(labelSearchQuery.trim());
                        }

                        // Check if order matches ANY of the search terms
                        return allSearchTerms.some(term => {
                          const lowerTerm = term.toLowerCase();
                          
                          // Check standard fields
                          const standardMatch = order.po_number?.toLowerCase().includes(lowerTerm) || 
                            order.sku_code?.toLowerCase().includes(lowerTerm) || 
                            order.asin?.toLowerCase().includes(lowerTerm) || 
                            order.model_number?.toLowerCase().includes(lowerTerm) || 
                            order.title?.toLowerCase().includes(lowerTerm) || 
                            order.serial_number?.toLowerCase().includes(lowerTerm);
                          
                          // Check scanned barcodes for this order
                          const orderBarcodes = barcodesByOrderId.get(order.id) || [];
                          const barcodeMatch = orderBarcodes.some(bc => 
                            bc.barcode?.toLowerCase().includes(lowerTerm)
                          );
                          
                          return standardMatch || barcodeMatch;
                        });
                      }).filter(order => {
                        // Apply printed status filter
                        if (printedFilter.length === 0) return true;
                        const printedQty = order.printed_quantity || 0;
                        const totalQty = order.quantity || 0;
                        const isPrinted = order.is_printed || printedQty > 0;
                        return printedFilter.some(status => {
                          if (status === 'printed') {
                            return isPrinted && printedQty >= totalQty;
                          } else if (status === 'partial-printed') {
                            return isPrinted && printedQty > 0 && printedQty < totalQty;
                          } else if (status === 'not-printed') {
                            return !isPrinted || printedQty === 0;
                          }
                          return false;
                        });
                      }).filter(order => {
                        // Apply source filter (Sunsky matching)
                        if (sourceFilter === 'all') return true;
                        const hasSunskyMatch = order.sunsky_sku && (order.sunsky_sku.sku_code || order.sunsky_sku.id);
                        if (sourceFilter === 'sunsky-matched') {
                          return hasSunskyMatch;
                        } else if (sourceFilter === 'not-matched') {
                          return !hasSunskyMatch;
                        }
                        return true;
                      }).filter(order => {
                        // Apply fulfillment status filter
                        if (fulfillmentFilter.length === 0) return true;
                        const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
                        if (!isFulfilledFromStock) {
                          return false; // Not fulfilled from stock at all
                        }

                        // Extract fulfilled quantity from notes
                        const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                        const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                        const totalQty = order.quantity || 0;
                        return fulfillmentFilter.some(status => {
                          if (status === 'fully-fulfilled') {
                            // Fully fulfilled from stock: fulfilled quantity >= total quantity
                            return fulfilledQty >= totalQty;
                          } else if (status === 'partial-fulfilled') {
                            // Partially fulfilled from stock: 0 < fulfilled quantity < total quantity
                            return fulfilledQty > 0 && fulfilledQty < totalQty;
                          }
                          return false;
                        });
                      }).filter(order => {
                        // Apply barcode filter
                        if (barcodeFilter === 'all') return true;
                        const orderBarcodes = barcodesByOrderId.get(order.id) || [];
                        // For consolidated orders, check all sub-orders
                        const consolidatedBarcodes = (order as any)._consolidatedOrders 
                          ? (order as any)._consolidatedOrders.flatMap((o: any) => barcodesByOrderId.get(o.id) || [])
                          : [];
                        const allBarcodes = [...orderBarcodes, ...consolidatedBarcodes];
                        const hasBarcode = allBarcodes.length > 0;
                        if (barcodeFilter === 'has-barcode') {
                          return hasBarcode;
                        } else if (barcodeFilter === 'no-barcode') {
                          return !hasBarcode;
                        }
                        return true;
                      }).filter(order => {
                        // Apply in-stock filter
                        if (instockFilter.length === 0) return true;
                        const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
                        const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                        const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                        const isFullyFulfilled = isFulfilledFromStock && fulfilledQty >= order.quantity;
                        const isFullyPrinted = (order.printed_quantity || 0) >= order.quantity;
                        if (isFullyFulfilled || isFullyPrinted) {
                          return instockFilter.includes('out-of-stock');
                        }
                        const match = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
                        const isInStock = match && match.status === 'in-stock';
                        return instockFilter.some(status => {
                          if (status === 'in-stock') return isInStock;
                          if (status === 'out-of-stock') return !isInStock;
                          return false;
                        });
                      });

                      // === SNAPSHOT LOCK MECHANISM ===
                      const filtersActive = hasActiveFilters();
                      const filterKey = JSON.stringify({ printedFilter, sourceFilter, fulfillmentFilter, instockFilter, barcodeFilter });

                      if (!filtersActive) {
                        // No filters active → clear lock
                        lockedFilterIdsRef.current = null;
                        prevFilterValuesRef.current = '';
                      } else if (filterKey !== prevFilterValuesRef.current) {
                        // Filter combination changed → reset lock so new filter evaluates fresh
                        lockedFilterIdsRef.current = null;
                        prevFilterValuesRef.current = filterKey;
                      }

                      if (filtersActive && !lockedFilterIdsRef.current) {
                        // First render with these filters → snapshot the matching IDs
                        const ids = new Set(ordersForSelectedPOs.map(o => o.id));
                        // Also include sub-order IDs from consolidated orders
                        ordersForSelectedPOs.forEach(o => {
                          if ((o as any)._consolidatedOrders) {
                            (o as any)._consolidatedOrders.forEach((sub: any) => ids.add(sub.id));
                          }
                        });
                        lockedFilterIdsRef.current = ids;
                      }

                      if (filtersActive && lockedFilterIdsRef.current) {
                        // Use locked IDs: re-filter from the full (unfiltered) set for selected POs
                        const allUnfilteredForPOs = poOrders.filter(order => {
                          const poMatch = selectedPOsList.includes(order.po_number);
                          const statusMatch = order.status !== 'cancelled';
                          return poMatch && statusMatch;
                        });
                        ordersForSelectedPOs = allUnfilteredForPOs.filter(
                          o => lockedFilterIdsRef.current!.has(o.id)
                        );
                      }

                      // NEW: Consolidate orders by ASIN when multiple POs are selected
                      let ordersToDisplay: POOrder[] = ordersForSelectedPOs;
                      if (selectedPOsList.length > 1 && consolidatedViewMode === 'merged') {
                        console.log('🔄 CONSOLIDATING: Multiple POs selected, merging items by ASIN');

                        // Group orders by ASIN
                        const asinGroups = new Map<string, POOrder[]>();
                        ordersForSelectedPOs.forEach(order => {
                          const key = order.asin || `no-asin-${order.id}`; // Fallback for orders without ASIN

                          if (!asinGroups.has(key)) {
                            asinGroups.set(key, []);
                          }
                          asinGroups.get(key)!.push(order);
                        });
                        console.log('📦 ASIN Groups:', Array.from(asinGroups.entries()).map(([asin, orders]) => ({
                          asin,
                          count: orders.length,
                          orderIds: orders.map(o => o.id),
                          poNumbers: orders.map(o => o.po_number)
                        })));

                        // Create consolidated orders
                        ordersToDisplay = Array.from(asinGroups.values()).map((group): POOrder => {
                          if (group.length === 1) {
                            // Single order for this ASIN, return as-is
                            return group[0];
                          }

                          // Multiple orders for this ASIN - merge them
                          const baseOrder = {
                            ...group[0]
                          }; // Use first order as base

                          // Sum up quantities
                          const totalQuantity = group.reduce((sum, order) => sum + (order.quantity || 0), 0);
                          const totalPrintedQuantity = group.reduce((sum, order) => sum + (order.printed_quantity || 0), 0);

                          // Collect all PO numbers
                          const poNumbers = [...new Set(group.map(o => o.po_number))];

                          // Collect all ship-to locations
                          const shipToLocations = [...new Set(group.map(o => o.ship_to_location).filter(Boolean))];
                          const consolidatedId = `consolidated-${baseOrder.asin}-${group.map(o => o.id).join('-')}`;
                          console.log(`🔗 CONSOLIDATED ${baseOrder.asin}:`, {
                            consolidatedId,
                            asin: baseOrder.asin,
                            underlyingOrderCount: group.length,
                            underlyingOrderIds: group.map(o => o.id),
                            poNumbers,
                            totalQuantity
                          });

                          // Calculate print status
                          const allPrinted = group.every(order => order.is_printed === true);
                          const anyPrinted = group.some(order => order.is_printed === true);

                          // Calculate fulfillment from underlying orders
                          const fulfilledOrders = group.filter(o => o.notes?.includes('Fulfilled from stock:'));
                          const totalFulfilledQty = group.reduce((sum, o) => {
                            const match = o.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                            return sum + (match ? parseInt(match[1]) : 0);
                          }, 0);

                          // Build consolidated notes with fulfillment info
                          let consolidatedNotes = `Consolidated from ${poNumbers.length} PO(s): ${poNumbers.join(', ')}`;
                          if (totalFulfilledQty > 0) {
                            consolidatedNotes += ` | Fulfilled from stock: ${totalFulfilledQty}`;
                          }

                          // Return consolidated order
                          return {
                            ...baseOrder,
                            id: consolidatedId,
                            quantity: totalQuantity,
                            printed_quantity: totalPrintedQuantity,
                            is_printed: allPrinted,
                            _partiallyPrinted: anyPrinted && !allPrinted,
                            ship_to_location: shipToLocations.length > 1 ? `Multiple (${shipToLocations.length})` : shipToLocations[0] || baseOrder.ship_to_location,
                            notes: consolidatedNotes,
                            // Store original orders for reference
                            _consolidatedOrders: group,
                            _isConsolidated: true,
                            _totalFulfilledFromStock: totalFulfilledQty,
                            _fulfilledOrderCount: fulfilledOrders.length
                          };
                        });

                        // Update ref for print operations
                        ordersToDisplayRef.current = ordersToDisplay;
                        console.log('🔄 CONSOLIDATION RESULT:', {
                          originalCount: ordersForSelectedPOs.length,
                          consolidatedCount: ordersToDisplay.length,
                          reduction: ordersForSelectedPOs.length - ordersToDisplay.length
                        });
                      } else {
                        console.log('📋 Single PO selected, no consolidation needed');
                        // Update ref for print operations (non-consolidated view)
                        ordersToDisplayRef.current = ordersToDisplay;
                      }

                      // Stable row ordering: compute a filter key to detect filter changes vs data-only changes
                      const currentFilterKey = JSON.stringify({
                        selectedPOs: selectedPOsList.sort().join(','),
                        searchTags, labelSearchQuery, printedFilter, sourceFilter,
                        fulfillmentFilter, instockFilter, barcodeFilter, sortField, sortDirection
                      });
                      const filtersChanged = currentFilterKey !== prevLabelsFilterKeyRef.current;
                      if (filtersChanged) {
                        prevLabelsFilterKeyRef.current = currentFilterKey;
                        stableLabelsOrderRef.current = new Map();
                      }

                      // Apply sorting to labels tab (only if not preserving original order)
                      if (!originalOrderPreserved) {
                        ordersToDisplay.sort((a, b) => {
                          // Handle synthetic sort fields for stock column
                          if (sortField === 'instock_qty') {
                            const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
                            const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
                            const aQty = aMatch && aMatch.status === 'in-stock' ? aMatch.quantity : 0;
                            const bQty = bMatch && bMatch.status === 'in-stock' ? bMatch.quantity : 0;
                            const result = sortDirection === 'asc' ? aQty - bQty : bQty - aQty;
                            if (result !== 0) return result;
                            const stableMap = stableLabelsOrderRef.current;
                            return (stableMap.get(a.id) ?? Infinity) - (stableMap.get(b.id) ?? Infinity);
                          }
                          if (sortField === 'serial_number_qty') {
                            const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
                            const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
                            const aSN = aMatch?.serialNumbers?.[0] || aMatch?.serialNumber || aMatch?.inventoryItem?.serial_number || '';
                            const bSN = bMatch?.serialNumbers?.[0] || bMatch?.serialNumber || bMatch?.inventoryItem?.serial_number || '';
                            const aHas = aSN.length > 0;
                            const bHas = bSN.length > 0;
                            // Push blanks to bottom always
                            if (aHas && !bHas) return -1;
                            if (!aHas && bHas) return 1;
                            if (!aHas && !bHas) {
                              const stableMap = stableLabelsOrderRef.current;
                              return (stableMap.get(a.id) ?? Infinity) - (stableMap.get(b.id) ?? Infinity);
                            }
                            const cmp = aSN.localeCompare(bSN, undefined, { numeric: true, sensitivity: 'base' });
                            const result = sortDirection === 'asc' ? cmp : -cmp;
                            if (result !== 0) return result;
                            const stableMap = stableLabelsOrderRef.current;
                            return (stableMap.get(a.id) ?? Infinity) - (stableMap.get(b.id) ?? Infinity);
                          }

                          let aValue: string | number | undefined;
                          let bValue: string | number | undefined;
                          if (sortField === 'combined_title') {
                            aValue = `${a.title || ''} ${a.asin || ''}`.toLowerCase();
                            bValue = `${b.title || ''} ${b.asin || ''}`.toLowerCase();
                          } else if (sortField === 'scanned_barcode') {
                            const aOrderBarcodes = barcodesByOrderId.get(a.id) || [];
                            const aConsolidatedBarcodes = a._consolidatedOrders 
                              ? a._consolidatedOrders.flatMap((o: any) => barcodesByOrderId.get(o.id) || [])
                              : [];
                            const bOrderBarcodes = barcodesByOrderId.get(b.id) || [];
                            const bConsolidatedBarcodes = b._consolidatedOrders 
                              ? b._consolidatedOrders.flatMap((o: any) => barcodesByOrderId.get(o.id) || [])
                              : [];
                            aValue = [...aOrderBarcodes, ...aConsolidatedBarcodes][0]?.barcode || '';
                            bValue = [...bOrderBarcodes, ...bConsolidatedBarcodes][0]?.barcode || '';
                          } else {
                            aValue = a[sortField];
                            bValue = b[sortField];
                          }

                          if (aValue === undefined && bValue === undefined) return 0;
                          if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
                          if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

                          if (sortField === 'quantity' || sortField === 'unit_cost' || sortField === 'total_cost') {
                            const aNum = Number(aValue) || 0;
                            const bNum = Number(bValue) || 0;
                            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                          }

                          if (sortField === 'order_date' || sortField === 'expected_delivery' || sortField === 'created_at' || sortField === 'updated_at') {
                            const aDate = new Date(aValue as string).getTime();
                            const bDate = new Date(bValue as string).getTime();
                            return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
                          }

                          const aStr = String(aValue).toLowerCase();
                          const bStr = String(bValue).toLowerCase();
                          if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
                          if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;

                          // Tiebreaker: use stable order index to prevent row jumping
                          const stableMap = stableLabelsOrderRef.current;
                          const aIdx = stableMap.get(a.id) ?? Infinity;
                          const bIdx = stableMap.get(b.id) ?? Infinity;
                          return aIdx - bIdx;
                        });
                      }

                      // Store the current order for future tiebreaking (only when filters changed or first render)
                      if (filtersChanged || stableLabelsOrderRef.current.size === 0) {
                        const newMap = new Map<string, number>();
                        ordersToDisplay.forEach((order, idx) => newMap.set(order.id, idx));
                        stableLabelsOrderRef.current = newMap;
                      }
                      console.log('🔍 Print Labels After Filtering:', {
                        ordersCount: ordersToDisplay.length,
                        totalQuantity: ordersToDisplay.reduce((sum, o) => sum + (o.quantity || 0), 0),
                        statuses: [...new Set(ordersToDisplay.map(o => o.status))]
                      });
                      const startIndex = (labelCurrentPage - 1) * labelItemsPerPage;
                      const endIndex = startIndex + labelItemsPerPage;
                      const paginatedOrders = ordersToDisplay.slice(startIndex, endIndex);
                      return paginatedOrders.map((order, index) => {
                        return <React.Fragment key={order.id}>
                              <TableRow className={`group hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 transition-all duration-300 border-b border-border ${selectedForPrint.has(order.id) ? 'bg-primary/10 border-primary/30' : ''} ${order.printed_quantity >= order.quantity ? 'bg-green-50 dark:bg-green-950/20' : ''} ${order._partiallyPrinted ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''} ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                {/* Enhanced Checkbox Cell */}
                                <TableCell className="w-12 border-r border-border/50 bg-background/50">
                                   <div className="flex items-center justify-center">
                                     <Checkbox checked={order._isConsolidated ? order._consolidatedOrders && order._consolidatedOrders.length > 0 ? order._consolidatedOrders.every((o: any) => selectedForPrint.has(o.id)) : selectedForPrint.has(order.id) : selectedForPrint.has(order.id)} onCheckedChange={checked => {
                                  const newSelected = new Map(selectedForPrint);
                                  console.log('🔘 Checkbox clicked:', {
                                    orderId: order.id,
                                    asin: order.asin,
                                    isConsolidated: order._isConsolidated,
                                    hasConsolidatedOrders: !!order._consolidatedOrders,
                                    consolidatedOrdersCount: order._consolidatedOrders?.length || 0,
                                    checked: checked,
                                    currentSize: selectedForPrint.size
                                  });
                                  if (order._isConsolidated) {
                                    // For consolidated items, select/deselect all underlying orders
                                    if (order._consolidatedOrders && order._consolidatedOrders.length > 0) {
                                      if (checked) {
                                        order._consolidatedOrders.forEach((o: any) => {
                                          newSelected.set(o.id, 1);
                                        });
                                        // Store custom quantity using CONSOLIDATED order ID for consistency
                                        setCustomPrintQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(order.id, 1); // Use consolidated order ID
                                          return newMap;
                                        });
                                        console.log('✅ Added consolidated orders:', order._consolidatedOrders.map((o: any) => o.id));
                                      } else {
                                        order._consolidatedOrders.forEach((o: any) => {
                                          newSelected.delete(o.id);
                                        });
                                        // Clear using consolidated order ID
                                        setCustomPrintQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(order.id);
                                          return newMap;
                                        });
                                        console.log('❌ Removed consolidated orders:', order._consolidatedOrders.map((o: any) => o.id));
                                      }
                                    } else {
                                      // FALLBACK: _consolidatedOrders missing, use consolidated order ID
                                      console.warn('⚠️ Consolidated order missing _consolidatedOrders array:', {
                                        orderId: order.id,
                                        asin: order.asin,
                                        fallbackToConsolidatedId: true
                                      });
                                      if (checked) {
                                        newSelected.set(order.id, 1);
                                        // Initialize custom quantity to 1
                                        setCustomPrintQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(order.id, 1);
                                          return newMap;
                                        });
                                        console.log('✅ Added consolidated order (fallback):', order.id);
                                      } else {
                                        newSelected.delete(order.id);
                                        // Clear custom quantity on deselection
                                        setCustomPrintQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(order.id);
                                          return newMap;
                                        });
                                        console.log('❌ Removed consolidated order (fallback):', order.id);
                                      }
                                    }
                                  } else {
                                    if (checked) {
                                      newSelected.set(order.id, 1); // Default quantity of 1
                                      // Initialize custom quantity to 1
                                      setCustomPrintQuantities(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(order.id, 1);
                                        return newMap;
                                      });
                                      console.log('✅ Added single order:', order.id);
                                    } else {
                                      newSelected.delete(order.id);
                                      // Clear custom quantity on deselection
                                      setCustomPrintQuantities(prev => {
                                        const newMap = new Map(prev);
                                        newMap.delete(order.id);
                                        return newMap;
                                      });
                                      console.log('❌ Removed single order:', order.id);
                                    }
                                  }
                                  console.log('📊 New selection state:', {
                                    newSize: newSelected.size,
                                    selectedIds: Array.from(newSelected.keys())
                                  });
                                  setSelectedForPrint(prev => new Map(newSelected));
                                }} className="group-hover:scale-110 transition-transform" />
                                  </div>
                                </TableCell>

                                 {/* Enhanced Image Cell */}
                                 <TableCell className="w-20 border-r border-border/50 p-3">
                                   {(() => {
                                const productImage = order.asin ? getImageByAsin(order.asin) : null;
                                console.log('🖼️ Image lookup for ASIN:', order.asin, 'Found:', !!productImage, 'URL:', productImage?.image_url);
                                return productImage ? <Popover>
                                       <PopoverTrigger asChild>
                                          <div className="w-16 h-16 rounded-lg border border-border/30 overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary/50 hover:shadow-soft transition-all duration-300 group-hover:scale-105 bg-background/80">
                                            <img src={productImage.image_url} alt={`Product image for ${order.asin}`} className="w-full h-full object-contain" onError={e => {
                                        console.log('🖼️ Image failed to load:', productImage.image_url);
                                        e.currentTarget.style.display = 'none';
                                      }} onLoad={() => {
                                        console.log('🖼️ Image loaded successfully:', productImage.image_url);
                                      }} />
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" className="w-80 p-3 bg-popover/95 backdrop-blur-sm border-border/50 shadow-strong">
                                          <div className="w-full h-64 rounded-xl overflow-hidden bg-background/50 border border-border/30">
                                            <img src={productImage.image_url} alt={`Product image for ${order.asin}`} className="w-full h-full object-contain" />
                                          </div>
                                          <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-muted/30 rounded-lg">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span className="text-xs font-mono text-muted-foreground">ASIN: {order.asin}</span>
                                          </div>
                                        </PopoverContent>
                                      </Popover> : <div className="w-16 h-16 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40 group-hover:from-muted/30 group-hover:to-muted/50 transition-all duration-300">
                                       <div className="text-center">
                                         <ImageIcon className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
                                         <div className="text-xs text-muted-foreground/70 font-medium">No Image</div>
                                         {order.asin && <div className="text-xs text-muted-foreground/50 font-mono mt-1 bg-muted/30 px-1 rounded" title={`ASIN: ${order.asin}`}>
                                             {order.asin.slice(0, 6)}...
                                           </div>}
                                       </div>
                                     </div>;
                              })()}
                                </TableCell>

                                 {/* Enhanced SKU/Model Cell with Matching System */}
                                 <TableCell className="min-w-[180px] max-w-[220px] border-r border-border/50 p-3">
                                   <div className="flex flex-col gap-2 overflow-hidden">
                                     {order.sku_code && <div className="flex items-start gap-2">
                                         <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                                         <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono break-all bg-primary/10 text-primary border-primary/20 flex-1 min-w-0">
                                           {order.sku_code}
                                         </Badge>
                                       </div>}
                                     {order.model_number && order.model_number !== order.sku_code && <div className="flex items-start gap-2">
                                         <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1"></div>
                                         <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono break-all bg-accent/10 text-accent border-accent/20 flex-1 min-w-0">
                                           {order.model_number}
                                         </Badge>
                                       </div>}
                                     
                                     {/* Sunsky Matching Indicator */}
                                     {order.sunsky_sku && (order.sunsky_sku.sku_code || order.sunsky_sku.id) ? <div className="flex items-center gap-2">
                                         <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                         <Badge variant="outline" className="text-xs px-2 py-1 font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                           Source Matched
                                         </Badge>
                                       </div> : <div className="flex items-center gap-2">
                                         <Info className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                         <Badge variant="outline" className="text-xs px-2 py-1 font-medium bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30">
                                           No Match
                                         </Badge>
                                       </div>}
                                     
                                     {!order.sku_code && !order.model_number && <div className="flex items-center gap-2">
                                         <div className="w-2 h-2 bg-muted-foreground rounded-full flex-shrink-0"></div>
                                         <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-muted">N/A</span>
                                       </div>}
                                   </div>
                                 </TableCell>

                                 {/* In-Stock Qty Cell */}
                <TableCell className="min-w-[120px] border-r border-border/50 p-3">
                  {(() => {
                                // Check if fully fulfilled from stock
                                const isFulfilledFromStock = order.notes?.includes('Fulfilled from stock:');
                                const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                                const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                                const isFullyFulfilled = isFulfilledFromStock && fulfilledQty >= order.quantity;

                                // Check if fully printed
                                const isFullyPrinted = (order.printed_quantity || 0) >= order.quantity;

                                // If fully fulfilled OR fully printed → Show "Closed"
                                if (isFullyFulfilled || isFullyPrinted) {
                                  return <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-muted rounded-full flex-shrink-0"></div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-xs px-2 py-1 font-medium bg-muted/50 text-muted-foreground border border-border rounded-md cursor-pointer hover:bg-muted/70 transition-colors inline-flex items-center">
                                <XCircle className="w-3 h-3 mr-1" />
                                Closed
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="start">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                  <XCircle className="w-4 h-4 text-muted-foreground" />
                                  <h4 className="font-semibold text-sm">Closure Details</h4>
                                </div>
                                
                                {isFullyFulfilled && <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <span className="font-medium text-sm text-green-700 dark:text-green-400">Fulfilled from Stock</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>Quantity: {fulfilledQty} units</div>
                                      {order.updated_at && <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{format(new Date(order.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                                        </div>}
                                    </div>
                                    {order.notes && order.notes.includes('/') && <div className="text-xs text-muted-foreground mt-1">
                                        <div className="font-medium">Serial Numbers:</div>
                                        <div className="text-xs bg-white dark:bg-gray-900 p-2 rounded mt-1 max-h-20 overflow-y-auto">
                                          {order.notes.match(/\/([^)]+)/)?.[1]}
                                        </div>
                                      </div>}
                                  </div>}
                                
                                {isFullyPrinted && <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2">
                                      <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      <span className="font-medium text-sm text-blue-700 dark:text-blue-400">Fully Printed</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>Printed: {order.printed_quantity || 0} / {order.quantity} units</div>
                                      {order.label_printed_at && <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{format(new Date(order.label_printed_at), 'MMM dd, yyyy HH:mm')}</span>
                                        </div>}
                                    </div>
                                  </div>}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>;
                                }
                                const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
                                if (inventoryMatch && inventoryMatch.status === 'in-stock') {
                                  return <div className="flex flex-col gap-2">
                                             {/* Clickable Quantity badge with fulfill from stock */}
                                             <Badge variant="default" className="text-xs px-2 py-1 font-medium bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30 cursor-pointer hover:bg-green-500/20 hover:scale-105 transition-all w-fit" onClick={() => {
                                      setFulfillDialogOrder({
                                        asin: order.asin,
                                        title: order.title,
                                        po_number: order.po_number,
                                        quantity: order.quantity,
                                        isConsolidated: order._isConsolidated || false,
                                        consolidatedOrders: order._consolidatedOrders ? order._consolidatedOrders.map((po: any) => ({
                                          po_number: po.po_number,
                                          quantity: po.quantity,
                                          ship_to_location: po.ship_to_location
                                        })) : []
                                      });
                                      setFulfillDialogOpen(true);
                                    }} title="Click to fulfill from stock">
                                               <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                 <span>{inventoryMatch.quantity} units</span>
                                                 <Package className="h-3 w-3 ml-1" />
                                               </div>
                                             </Badge>
                                             
                                             {/* Serial numbers badge - ASIN matches */}
                                             {inventoryMatch.serialNumbers && inventoryMatch.serialNumbers.length > 0 && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 max-w-[180px] truncate">
                                                   SN: {inventoryMatch.serialNumbers.slice(0, 3).join(', ')}
                                                   {inventoryMatch.serialNumbers.length > 3 && ` +${inventoryMatch.serialNumbers.length - 3}`}
                                                 </Badge>
                                               </div>}
                                             
                                             {/* Bin number badge - SKU matches */}
                                             {inventoryMatch.type.startsWith('SKU') && inventoryMatch.serialNumber && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                                   Bin: {inventoryMatch.serialNumber}
                                                 </Badge>
                                               </div>}
                                           </div>;
                                } else {
                                  // Show PO-specific status instead of inventory replenishment status
                                  const poStatus = order.status?.toLowerCase();
                                  return <div className="flex flex-col gap-2">
                                             {/* PO Status Badge */}
                                             {poStatus === 'received' && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="default" className="text-xs px-2 py-1 font-medium bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30">
                                                   <CheckCircle className="w-3 h-3 mr-1" />
                                                   Received
                                                 </Badge>
                                               </div>}
                                             
                                             {poStatus === 'placed' && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="default" className="text-xs px-2 py-1 font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                                   <ShoppingCart className="w-3 h-3 mr-1" />
                                                   Placed with Supplier
                                                 </Badge>
                                               </div>}
                                             
                                             {poStatus === 'closed' && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="outline" className="text-xs px-2 py-1 font-medium bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30">
                                                   <XCircle className="w-3 h-3 mr-1" />
                                                   Closed
                                                 </Badge>
                                               </div>}
                                             
                                             {poStatus === 'pending' && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="outline" className="text-xs px-2 py-1 font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                                   <Clock className="w-3 h-3 mr-1" />
                                                   Pending
                                                 </Badge>
                                               </div>}
                                             
                                             {poStatus === 'cancelled' && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="destructive" className="text-xs px-2 py-1 font-medium bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                                                   <XCircle className="w-3 h-3 mr-1" />
                                                   Cancelled
                                                 </Badge>
                                               </div>}
                                             
                                             {/* Show supplier order number for placed/closed/received statuses */}
                                             {(poStatus === 'placed' || poStatus === 'closed' || poStatus === 'received') && order.supplier_order_number && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                                 <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                   Order: {order.supplier_order_number}
                                                 </Badge>
                                               </div>}
                                             
                                             {/* Show tracking number/URL for placed/closed/received statuses */}
                                             {(poStatus === 'placed' || poStatus === 'closed' || poStatus === 'received') && order.tracking_number && <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                                 {order.tracking_url ? <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 font-medium font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-md hover:bg-purple-500/20 transition-colors flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                     <Truck className="h-3 w-3" />
                                                     {order.tracking_number}
                                                   </a> : <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                     <Truck className="h-3 w-3 mr-1" />
                                                     {order.tracking_number}
                                                   </Badge>}
                                               </div>}
                                           </div>;
                                }
                              })()}
                                  </TableCell>

                                 {/* Enhanced Title & ASIN Cell */}
                                 <TableCell className="border-r border-border/50 p-3">
                                  <div className="flex flex-col gap-2">
                                    <div className="text-sm font-medium break-words text-foreground group-hover:text-primary/80 transition-colors" title={order.title}>
                                      {order.title || 'No title available'}
                                    </div>
                                    
                                    {/* Show consolidation badge if this is a merged item */}
                                    {order._isConsolidated && <Badge variant="secondary" className="text-xs px-2 py-1 font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 w-fit">
                                        <Package className="w-3 h-3 mr-1" />
                                        {order._consolidatedOrders.length} SKUs
                                      </Badge>}
                                    
                                    {/* ASIN display only */}
                                    {order.asin && <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"></div>
                                        <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30">
                                          {order.asin}
                                        </Badge>
                                      </div>}
                                  </div>
                                 </TableCell>

                                 {/* Shipped Qty Cell - NEW */}
                                 <TableCell className="min-w-[100px] border-r border-border/50 p-3">
                                   {(() => {
                                     const asinKey = order.asin?.toUpperCase();
                                     const shippedQty = asinKey ? (shippedQtyMap.get(asinKey) || 0) : 0;
                                     if (shippedQty > 0) {
                                       return (
                                         <Badge variant="default" className="text-xs px-2 py-1 font-medium font-mono bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                           {shippedQty.toLocaleString()}
                                         </Badge>
                                       );
                                     }
                                     return (
                                       <span className="text-xs text-muted-foreground">-</span>
                                     );
                                   })()}
                                 </TableCell>

                                 {/* FBA Inventory Qty Cell - NEW */}
                                 <TableCell className="min-w-[100px] border-r border-border/50 p-3">
                                   {(() => {
                                     const asinKey = order.asin?.toUpperCase();
                                     const fbaQty = asinKey ? (fbaQtyMap.get(asinKey) || 0) : 0;
                                     if (fbaQty > 0) {
                                       return (
                                         <Badge variant="default" className="text-xs px-2 py-1 font-medium font-mono bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                           {fbaQty.toLocaleString()}
                                         </Badge>
                                       );
                                     }
                                     return (
                                       <span className="text-xs text-muted-foreground">-</span>
                                     );
                                   })()}
                                 </TableCell>


                                    {/* Enhanced Quantity Cell with PO Numbers */}
                                    <TableCell className="border-r border-border/50 p-3">
                                     <div className="flex flex-col gap-2">
                                        <div className="flex flex-col gap-2">
                                          {order.status === 'closed' && order.notes?.includes('Fulfilled from stock:') ? <div className="flex flex-col gap-2">
                                              {/* PO Number Badge */}
                                              <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 w-fit">
                                                PO: {order.po_number}
                                              </Badge>
                                              
                                              <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 w-fit">
                                                 {(() => {
                                        const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                                        const originalMatch = order.notes?.match(/Original quantity:\s*(\d+)/);
                                        const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                                        // If original quantity not in notes, assume fulfilled quantity was the original
                                        const originalQty = originalMatch ? parseInt(originalMatch[1]) : fulfilledQty > 0 ? fulfilledQty : 1;
                                        return `Fulfilled: ${fulfilledQty}/${originalQty}`;
                                      })()}
                                              </Badge>
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                                <div className="text-xs text-foreground font-medium">
                                                  From Stock
                                                </div>
                                              </div>
                                            </div> : <div className="flex flex-col gap-2">
                                               {/* PO Number(s) Display */}
                                               {order._isConsolidated ? <div className="flex flex-wrap gap-1">
                                                   {order._consolidatedOrders.map((po: any, idx: number) => <Badge key={idx} variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                                       {po.po_number}
                                                     </Badge>)}
                                                 </div> : <Badge variant="outline" className="text-xs px-2 py-1 font-medium font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 w-fit">
                                                   PO: {order.po_number}
                                                 </Badge>}
                                               
                                               <div className="flex items-center gap-2">
                                                 {/* Quantity display - NOT clickable anymore */}
                                                 <Badge variant="secondary" className={`text-xs px-2 py-1 font-medium font-mono ${order._isConsolidated ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'}`}>
                                                   {order._isConsolidated ? `Total: ${order.quantity}` : `Qty: ${order.quantity}`}
                                                 </Badge>
                                                 
                                                 {/* Breakdown Popover for Consolidated Items */}
                                                 {order._isConsolidated && <Popover>
                                                     <PopoverTrigger asChild>
                                                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-purple-500/10 transition-colors" title="View printed labels breakdown">
                                                         <ChevronDown className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                       </Button>
                                                     </PopoverTrigger>
                                                     <PopoverContent side="right" align="start" className="w-96 p-0 border-purple-500/30 shadow-lg">
                                                       <div className="p-4 space-y-3 bg-gradient-to-br from-purple-500/5 to-background">
                                                         {/* Header */}
                                                         <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border">
                                                           <Package className="h-4 w-4 text-purple-600" />
                                                           <span>Printed Labels Breakdown</span>
                                                           <Badge variant="outline" className="ml-auto text-xs font-mono">
                                                             {order.asin}
                                                           </Badge>
                                                         </div>
                                                         
                                                         {/* Per-PO Breakdown */}
                                                         <div className="space-y-2 max-h-64 overflow-y-auto">
                                                           {order._consolidatedOrders.map((po: any, idx: number) => <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-md border border-border/50 hover:border-purple-500/30 transition-colors">
                                                               <div className="flex items-center gap-3">
                                                                 <Badge variant="outline" className="font-mono text-xs">
                                                                   {po.po_number}
                                                                 </Badge>
                                                                 <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                                   {po.ship_to_location || 'No location'}
                                                                 </div>
                                                               </div>
                                                               
                                                               <div className="flex items-center gap-3">
                                                                 <div className="text-sm text-right">
                                                                   <span className="font-semibold text-foreground">{po.quantity}</span>
                                                                   <span className="text-muted-foreground text-xs ml-1">units</span>
                                                                 </div>
                                                                 
                                                                 {po.printed_quantity > 0 ? po.printed_quantity >= po.quantity ? <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-300 text-xs font-medium">
                                                                       ✓ Printed ({po.printed_quantity}/{po.quantity})
                                                                     </Badge> : <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 text-xs font-medium">
                                                                       ⚠ Partial ({po.printed_quantity}/{po.quantity})
                                                                     </Badge> : <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 text-xs">
                                                                     ○ Not Printed
                                                                   </Badge>}
                                                               </div>
                                                             </div>)}
                                                         </div>
                                                         
                                                         {/* Summary Footer */}
                                                         <div className="pt-3 mt-2 border-t border-border flex items-center justify-between text-sm bg-muted/20 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                                                           <span className="font-semibold text-foreground">Total:</span>
                                                           <div className="flex items-center gap-3">
                                                             <span className="font-semibold text-foreground">{order.quantity} units</span>
                                                             {order.printed_quantity > 0 && <div className="flex items-center gap-1">
                                                                 <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                                                                 <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                                   {order.printed_quantity} printed ({Math.round(order.printed_quantity / order.quantity * 100)}%)
                                                                 </span>
                                                               </div>}
                                                           </div>
                                                         </div>
                                                       </div>
                                                     </PopoverContent>
                                                   </Popover>}
                                               </div>
                                               
                                               {/* Show PO count for consolidated items */}
                                               {order._isConsolidated && <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                                   From {order._consolidatedOrders.length} PO(s) • 
                                                  {order.printed_quantity > 0 ? <span className="text-green-600 dark:text-green-400 ml-1">
                                                      {order.printed_quantity} printed
                                                    </span> : <span className="text-muted-foreground ml-1">None printed</span>}
                                                </div>}
                                            </div>}
                                       </div>
                                     </div>
                                   </TableCell>

                                     {/* Enhanced Print Qty Cell - MOVED BEFORE Print Status */}
                                     <TableCell className="w-24 border-r border-border/50 p-3">
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                  // Check if this item (or its consolidated items) are selected
                                  const isSelected = order._isConsolidated ? order._consolidatedOrders.some((o: any) => selectedForPrint.has(o.id)) : selectedForPrint.has(order.id);

                                  // Calculate available quantity (total - already printed)
                                  const availableQty = order.quantity - (order.printed_quantity || 0);
                                  const maxQty = Math.max(1, availableQty);

                                  // Get custom quantity or default to 1 when selected
                                  const qtyValue = customPrintQuantities.get(order.id) || (isSelected ? 1 : '');
                                  return <>
                                              <Input type="number" min="1" max={maxQty} placeholder="Qty" className="w-16 h-8 text-center bg-background border-2 border-border focus:border-primary group-hover:border-primary/50 transition-colors font-mono text-foreground" value={isSelected ? qtyValue : ''} onChange={e => {
                                      const value = parseInt(e.target.value) || 1;
                                      const clampedValue = Math.min(Math.max(1, value), maxQty);
                                      console.log('📝 Custom qty changed:', {
                                        value,
                                        clampedValue,
                                        maxQty,
                                        availableQty
                                      });
                                      if (isSelected) {
                                        setCustomPrintQuantities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(order.id, clampedValue);
                                          return newMap;
                                        });
                                      }
                                    }} disabled={!isSelected || printingItems.has(order.id) || availableQty <= 0} />
                                              {!isSelected && <span className="text-xs text-muted-foreground whitespace-nowrap">Select first</span>}
                                              {isSelected && availableQty <= 0 && <span className="text-xs text-orange-500 whitespace-nowrap">All printed</span>}
                                            </>;
                                })()}
                                      </div>
                                    </TableCell>

                                   {/* Merged Print Status Cell - MOVED AFTER Print Qty */}
                                   <TableCell className="min-w-[160px] border-r border-border/50 p-3">
                                     <div className="flex flex-col gap-2">
                                       {order.printed_quantity > 0 ? order.printed_quantity >= order.quantity ? (
                                         <div className="flex flex-col gap-1.5">
                                           <Badge variant="default" className="text-xs px-2 py-1 font-medium bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30 cursor-pointer hover:bg-green-500/25 transition-colors w-fit" onClick={() => {
                                             setPrintHistoryOrder(order);
                                             setPrintHistoryDialogOpen(true);
                                           }}>
                                             <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                                             <Printer className="h-3 w-3 mr-1" />
                                             Fully Printed
                                           </Badge>
                                           <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-medium bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 w-fit">
                                             <Check className="w-3 h-3 mr-1" />
                                             Printed: {order.printed_quantity}
                                           </Badge>
                                         </div>
                                       ) : (
                                         <div className="flex flex-col gap-1.5">
                                           <Badge variant="default" className="text-xs px-2 py-1 font-medium bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/25 transition-colors w-fit" onClick={() => {
                                             setPrintHistoryOrder(order);
                                             setPrintHistoryDialogOpen(true);
                                           }}>
                                             <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></div>
                                             <AlertCircle className="h-3 w-3 mr-1" />
                                             Partial ({order.printed_quantity}/{order.quantity})
                                           </Badge>
                                           <div className="flex flex-wrap gap-1">
                                             <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-medium bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 w-fit">
                                               Printed: {order.printed_quantity}
                                             </Badge>
                                             <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 w-fit">
                                               Remaining: {order.quantity - order.printed_quantity}
                                             </Badge>
                                           </div>
                                         </div>
                                       ) : (
                                         <Badge variant="outline" className="text-xs px-2 py-1 font-medium bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30 w-fit">
                                           <div className="w-2 h-2 bg-gray-500 rounded-full mr-1.5"></div>
                                           Not Printed
                                         </Badge>
                                       )}
                                     </div>
                                   </TableCell>

                                 {/* Scanned Barcode Cell */}
                                 <TableCell className="border-r border-border/50 p-3">
                                   <div className="flex flex-wrap gap-1">
                                     {(() => {
                                       // Get barcodes for this order (handle consolidated orders)
                                       const orderIds = order._isConsolidated 
                                         ? order._consolidatedOrders.map((o: any) => o.id) 
                                         : [order.id];
                                       
                                       const orderBarcodes = orderIds.flatMap(id => barcodesByOrderId.get(id) || []);
                                       
                                       if (orderBarcodes.length === 0) {
                                         return (
                                           <span className="text-xs text-muted-foreground italic">No barcode</span>
                                         );
                                       }
                                       
                                       return orderBarcodes.map((bc, idx) => (
                                         <Badge 
                                           key={bc.id || idx}
                                           variant="outline" 
                                           className="text-xs px-2 py-1 font-mono bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
                                         >
                                           {bc.barcode}
                                         </Badge>
                                       ));
                                     })()}
                                   </div>
                                 </TableCell>

                                  <TableCell className="p-3">
                                    <div className="flex flex-col gap-2">
                                      {/* Main Print Button */}
                                       <Button variant="outline" size="sm" className="h-8 w-full" onClick={() => {
                                  const availableQty = order.quantity - (order.printed_quantity || 0);
                                  const printQty = customPrintQuantities.get(order.id);

                                  // Require explicit quantity - don't default to full available
                                  if (!printQty || printQty <= 0) {
                                    toast({
                                      title: "Enter print quantity",
                                      description: "Please enter the number of labels to print",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  if (printQty > availableQty) {
                                    toast({
                                      title: "Invalid quantity",
                                      description: `Cannot print ${printQty} labels. Only ${availableQty} available.`,
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  handleSingleItemPrint(order, printQty);
                                }} disabled={(() => {
                                  // Check if item is selected (handle both consolidated and single orders)
                                  const isSelected = order._isConsolidated ? order._consolidatedOrders && order._consolidatedOrders.length > 0 ? order._consolidatedOrders.some((o: any) => selectedForPrint.has(o.id)) : selectedForPrint.has(order.id) : selectedForPrint.has(order.id);
                                  const availableQty = order.quantity - (order.printed_quantity || 0);
                                  return !qzConnected || !selectedPrinter || printingItems.has(order.id) || !isSelected || availableQty <= 0;
                                })()}>
                                       {printingItems.has(order.id) ? <div className="flex items-center gap-2">
                                           <Loader2 className="h-3 w-3 animate-spin" />
                                           <span className="text-xs">Printing...</span>
                                         </div> : <div className="flex items-center gap-2">
                                           <Printer className="h-3 w-3" />
                                           <span className="text-xs font-medium">
                                             Print {customPrintQuantities.get(order.id) || '(Set Qty)'}
                                           </span>
                                         </div>}
                                     </Button>
                                    
                                     {/* Single Reprint - prints 1 label for quick check */}
                                     {order.printed_quantity > 0 && <Button variant="outline" size="sm" className="h-8 w-full hover:bg-blue-500/10 hover:border-blue-500/30" onClick={() => {
                                    handleReprintWithoutTracking(order, 1, true);
                                  }} disabled={!qzConnected || !selectedPrinter || printingItems.has(order.id)}>
                                          <div className="flex items-center gap-2">
                                            <RefreshCw className="h-3 w-3" />
                                            <span className="text-xs font-medium">Reprint 1</span>
                                          </div>
                                        </Button>}
                                     
                                     {/* Reprint Custom Qty - opens dialog to input quantity */}
                                     {order.printed_quantity > 0 && <Button variant="outline" size="sm" className="h-8 w-full hover:bg-amber-500/10 hover:border-amber-500/30" onClick={() => {
                                    setItemReprintOrder(order);
                                    setItemReprintQty(String(order.printed_quantity));
                                    setShowItemReprintDialog(true);
                                  }} disabled={!qzConnected || !selectedPrinter || printingItems.has(order.id)}>
                                          <div className="flex items-center gap-2">
                                            <RefreshCw className="h-3 w-3" />
                                            <span className="text-xs font-medium">Reprint All ({order.printed_quantity})</span>
                                          </div>
                                        </Button>}
                                   
                                    {/* Mark ALL as Printed (without printing) */}
                                    <Button variant="outline" size="sm" onClick={async () => {
                                      const availableQty = order.quantity - (order.printed_quantity || 0);
                                      if (availableQty <= 0) return;
                                      try {
                                        setIsPrintStatusUpdating(true);
                                        
                                        if (order._isConsolidated && order._consolidatedOrders && order._consolidatedOrders.length > 0) {
                                          // Update each underlying order to its full quantity
                                          for (const subOrder of order._consolidatedOrders) {
                                            const subQty = subOrder.quantity || 0;
                                            const { error } = await supabase.from('po_orders').update({
                                              printed_quantity: subQty,
                                              is_printed: true
                                            }).eq('id', subOrder.id);
                                            if (error) throw error;
                                          }
                                        } else {
                                          const { error } = await supabase.from('po_orders').update({
                                            printed_quantity: order.quantity,
                                            is_printed: true
                                          }).eq('id', order.id);
                                          if (error) throw error;
                                        }
                                        
                                        toast({
                                          title: "Marked All as Printed",
                                          description: `${availableQty} labels marked as printed for ${order.asin || order.sku_code}`
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['po-orders'] });
                                        await fetchPOOrders(true);
                                      } catch (error) {
                                        console.error('Error marking as printed:', error);
                                        toast({ title: "Error", description: "Failed to mark as printed", variant: "destructive" });
                                      } finally {
                                        setIsPrintStatusUpdating(false);
                                      }
                                    }} disabled={(order.quantity - (order.printed_quantity || 0)) <= 0 || isPrintStatusUpdating} className="w-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700 text-green-600 transition-all duration-300">
                                      <div className="flex items-center gap-2">
                                        {isPrintStatusUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                        <span className="text-xs font-medium">{isPrintStatusUpdating ? 'Updating...' : `Mark All (${order.quantity - (order.printed_quantity || 0)})`}</span>
                                      </div>
                                    </Button>

                                    {/* Mark Custom Qty as Printed (without printing) */}
                                     <Button variant="outline" size="sm" onClick={async () => {
                                       const markQty = customPrintQuantities.get(order.id);
                                       const availableQty = order.quantity - (order.printed_quantity || 0);
                                       if (!markQty || markQty <= 0) {
                                         toast({ title: "Enter quantity", description: "Please set a quantity in the Print Qty column first", variant: "destructive" });
                                         return;
                                       }
                                       if (markQty > availableQty) {
                                         toast({ title: "Invalid quantity", description: `Cannot mark ${markQty}. Only ${availableQty} remaining.`, variant: "destructive" });
                                         return;
                                       }
                                       try {
                                         setIsPrintStatusUpdating(true);
                                         
                                         if (order._isConsolidated && order._consolidatedOrders && order._consolidatedOrders.length > 0) {
                                           // Distribute markQty across underlying orders sequentially
                                           let remaining = markQty;
                                           for (const subOrder of order._consolidatedOrders) {
                                             if (remaining <= 0) break;
                                             const subAvailable = (subOrder.quantity || 0) - (subOrder.printed_quantity || 0);
                                             if (subAvailable <= 0) continue;
                                             const toMark = Math.min(remaining, subAvailable);
                                             const newSubPrinted = (subOrder.printed_quantity || 0) + toMark;
                                             const { error } = await supabase.from('po_orders').update({
                                               printed_quantity: newSubPrinted,
                                               is_printed: newSubPrinted >= (subOrder.quantity || 0)
                                             }).eq('id', subOrder.id);
                                             if (error) throw error;
                                             remaining -= toMark;
                                           }
                                         } else {
                                           const newPrintedQty = (order.printed_quantity || 0) + markQty;
                                           const { error } = await supabase.from('po_orders').update({
                                             printed_quantity: newPrintedQty,
                                             is_printed: newPrintedQty >= order.quantity
                                           }).eq('id', order.id);
                                           if (error) throw error;
                                         }
                                         
                                         toast({
                                           title: "Marked as Printed",
                                           description: `${markQty} labels marked as printed for ${order.asin || order.sku_code}`
                                         });
                                         queryClient.invalidateQueries({ queryKey: ['po-orders'] });
                                         await fetchPOOrders(true);
                                       } catch (error) {
                                         console.error('Error marking as printed:', error);
                                         toast({ title: "Error", description: "Failed to mark as printed", variant: "destructive" });
                                       } finally {
                                         setIsPrintStatusUpdating(false);
                                       }
                                     }} disabled={!customPrintQuantities.get(order.id) || customPrintQuantities.get(order.id) <= 0 || (order.quantity - (order.printed_quantity || 0)) <= 0 || isPrintStatusUpdating} className="w-full border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 text-emerald-600 transition-all duration-300">
                                      <div className="flex items-center gap-2">
                                        {isPrintStatusUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                        <span className="text-xs font-medium">{isPrintStatusUpdating ? 'Updating...' : `Mark ${customPrintQuantities.get(order.id) || '(Set Qty)'}`}</span>
                                      </div>
                                    </Button>
                                   </div>
                                 </TableCell>
                                </TableRow>
                              </React.Fragment>;
                      });
                    })()}
                       </TableBody>
                     </Table>
                   </div>
                   
                     {/* Enhanced Pagination Controls */}
                       {(() => {
                const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : [];
                const ordersForSelectedPOs = poOrders.filter(order => selectedPOsList.includes(order.po_number)).filter(order => order.status !== 'cancelled').filter(order => !labelSearchQuery || order.po_number.toLowerCase().includes(labelSearchQuery.toLowerCase()) || order.sku_code?.toLowerCase().includes(labelSearchQuery.toLowerCase()) || order.asin?.toLowerCase().includes(labelSearchQuery.toLowerCase()) || order.model_number?.toLowerCase().includes(labelSearchQuery.toLowerCase()) || order.title?.toLowerCase().includes(labelSearchQuery.toLowerCase()));
                const totalPages = Math.ceil(ordersForSelectedPOs.length / labelItemsPerPage);
                if (totalPages <= 1) return null;
                return <div className="flex items-center justify-between px-6 py-4 border-t border-border/30 bg-gradient-to-r from-muted/20 to-muted/30">
                           <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-primary rounded-full"></div>
                               <p className="text-sm text-muted-foreground font-medium">
                                 Page {labelCurrentPage} of {totalPages}
                               </p>
                             </div>
                             <div className="text-sm text-muted-foreground">
                               ({ordersForSelectedPOs.length} items total)
                             </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Button variant="outline" size="sm" onClick={() => preserveScrollAndSetPage(setLabelCurrentPage, prev => Math.max(1, prev - 1))} disabled={labelCurrentPage === 1} className="hover:bg-primary/10 hover:border-primary/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-primary/20 to-accent/20"></div>
                                Previous
                              </div>
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({
                        length: Math.min(5, totalPages)
                      }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, labelCurrentPage - 2)) + i;
                        return <Button key={pageNum} variant={pageNum === labelCurrentPage ? "default" : "outline"} size="sm" onClick={() => preserveScrollAndSetPage(setLabelCurrentPage, pageNum)} className={`w-8 h-8 p-0 ${pageNum === labelCurrentPage ? 'bg-primary text-primary-foreground shadow-glow' : 'hover:bg-accent/10 hover:border-accent/30'} transition-all`}>
                                    {pageNum}
                                  </Button>;
                      })}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => preserveScrollAndSetPage(setLabelCurrentPage, prev => Math.min(totalPages, prev + 1))} disabled={labelCurrentPage === totalPages} className="hover:bg-primary/10 hover:border-primary/30 transition-colors">
                              <div className="flex items-center gap-2">
                                Next
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-accent/20 to-primary/20"></div>
                              </div>
                            </Button>
                          </div>
                        </div>;
              })()}
                  </CardContent>
               </Card>
             </div>}
         </TabsContent>

        <TabsContent value="purchase-links" className="space-y-6">
          {/* Section 1: Purchase Links */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-foreground">Purchase Links</h2>
            </div>
            <PurchaseLinkManagement />
            <PurchaseUpdatesPanel />
          </div>

          {/* Section 2: Invoices */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
            </div>
            <PurchaseInvoiceList />
          </div>
        </TabsContent>


        <TabsContent value="profit-analyzer" className="space-y-6">
          <ProductProfitAnalyzer />
        </TabsContent>

        <TabsContent value="shipped-orders" className="space-y-6">
          <ShippedOrdersUpload />
        </TabsContent>

        <TabsContent value="fba-inventory" className="space-y-6">
          <FBAInventoryUpload />
        </TabsContent>

      </Tabs>

      {/* Bulk Delete POs Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Bulk Delete POs
            </DialogTitle>
          </DialogHeader>
          
          {bulkDeleteStep === 'input' ? <div className="space-y-4">
              <div>
                <Label>Paste PO Numbers</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter PO numbers separated by commas, spaces, or new lines
                </p>
                <Textarea value={bulkDeleteInput} onChange={e => setBulkDeleteInput(e.target.value)} placeholder="Example: PO001, PO002, PO003 or one per line" className="min-h-[150px] font-mono" />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => {
              const parsed = parsePONumbers(bulkDeleteInput);
              const matches = matchPONumbers(parsed);
              setBulkDeleteMatches(matches);
              setBulkDeleteStep('confirm');
            }} disabled={!bulkDeleteInput.trim()}>
                  Check Matches
                </Button>
                <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div> : <div className="space-y-4">
              {/* Matched POs */}
              <div className="border rounded-lg p-4 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">
                    Matched POs: {bulkDeleteMatches.matched.length}
                  </h4>
                </div>
                {bulkDeleteMatches.matched.length > 0 ? <div className="max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {bulkDeleteMatches.matched.map((po, idx) => <Badge key={idx} variant="destructive">{po}</Badge>)}
                    </div>
                  </div> : <p className="text-sm text-muted-foreground">No matches found</p>}
              </div>
              
              {/* Not Found POs */}
              {bulkDeleteMatches.notFound.length > 0 && <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold">
                      Not Found: {bulkDeleteMatches.notFound.length}
                    </h4>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {bulkDeleteMatches.notFound.map((po, idx) => <Badge key={idx} variant="outline">{po}</Badge>)}
                    </div>
                  </div>
                </div>}
              
              {/* Warning Message */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive">Warning</h4>
                    <p className="text-sm text-muted-foreground">
                      This action will permanently delete <strong>{bulkDeleteMatches.matched.length} PO(s)</strong> and 
                      all associated line items from the database. This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeletingPOs || bulkDeleteMatches.matched.length === 0}>
                  {isDeletingPOs ? <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </> : <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {bulkDeleteMatches.matched.length} PO(s)
                    </>}
                </Button>
                <Button variant="outline" onClick={() => {
              setBulkDeleteStep('input');
              setBulkDeleteMatches({
                matched: [],
                notFound: []
              });
            }} disabled={isDeletingPOs}>
                  Back
                </Button>
                <Button variant="ghost" onClick={() => {
              setShowBulkDeleteDialog(false);
              setBulkDeleteInput('');
              setBulkDeleteMatches({
                matched: [],
                notFound: []
              });
              setBulkDeleteStep('input');
            }} disabled={isDeletingPOs}>
                  Cancel
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Bulk Close Confirmation Dialog */}
      {/* PO Selection Presets Management Dialog */}
      <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage PO Selection Presets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Save New Preset Section */}
            {selectedPOsForLabels.size > 0 && !editingPresetId && <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Save current selection ({selectedPOsForLabels.size} PO(s))</Label>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Enter preset name (e.g., 'Morning Batch')" value={presetNameInput} onChange={e => setPresetNameInput(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter') {
                      saveCurrentSelectionAsPreset(presetNameInput);
                    }
                  }} />
                      <Button onClick={() => saveCurrentSelectionAsPreset(presetNameInput)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Saved Presets List */}
            <div className="space-y-2">
              <Label>Saved Presets ({savedPresets.length})</Label>
              {savedPresets.length === 0 ? <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No saved presets yet.</p>
                    <p className="text-sm">Select POs and save them for quick access.</p>
                  </CardContent>
                </Card> : <div className="space-y-2">
                  {savedPresets.sort((a, b) => (b.lastUsed || b.createdAt).localeCompare(a.lastUsed || a.createdAt)).map(preset => {
                const availableCount = preset.poNumbers.filter(poNumber => {
                  const poExists = poOrders.some(order => order.po_number === poNumber);
                  return poExists;
                }).length;
                const isEditing = editingPresetId === preset.id;
                return <Card key={preset.id} className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {isEditing ? <Input value={presetNameInput} onChange={e => setPresetNameInput(e.target.value)} onKeyDown={e => {
                          if (e.key === 'Enter') {
                            renamePreset(preset.id, presetNameInput);
                            setEditingPresetId(null);
                          } else if (e.key === 'Escape') {
                            setEditingPresetId(null);
                          }
                        }} autoFocus /> : <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{preset.name}</span>
                                      <Badge variant="secondary">
                                        {availableCount}/{preset.poNumbers.length} PO(s)
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Created: {new Date(preset.createdAt).toLocaleDateString()}
                                      {preset.lastUsed && ` • Last used: ${new Date(preset.lastUsed).toLocaleDateString()}`}
                                    </div>
                                  </div>}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isEditing ? <>
                                    <Button size="sm" variant="ghost" onClick={() => {
                            renamePreset(preset.id, presetNameInput);
                            setEditingPresetId(null);
                          }}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingPresetId(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </> : <>
                                    <Button size="sm" variant="default" onClick={() => {
                            loadPreset(preset);
                            setShowPresetsDialog(false);
                          }} disabled={availableCount === 0}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Load
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => {
                            setEditingPresetId(preset.id);
                            setPresetNameInput(preset.name);
                          }}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => {
                            if (confirm(`Delete preset "${preset.name}"?`)) {
                              deletePreset(preset.id);
                            }
                          }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>;
              })}
                </div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <POPrintDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen} orders={printOrders} mode={printMode} title={printMode === 'single' ? 'Print Item' : 'Print Purchase Order Items'} />
      
      {/* Fulfill from Stock Dialog */}
      <FulfillFromStockDialog 
        open={fulfillDialogOpen} 
        onOpenChange={(open) => {
          setFulfillDialogOpen(open);
          // When dialog closes, invalidate cache to ensure fresh data
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['po-orders'] });
          }
        }} 
        orderInfo={fulfillDialogOrder} 
        onConfirm={handleFulfillFromStock} 
        isLoading={isFulfilling} 
      />
      
      {/* Generate Purchase Link Dialog */}
      <GeneratePurchaseLinkDialog 
        open={generateLinkDialogOpen} 
        onOpenChange={setGenerateLinkDialogOpen} 
        poNumbers={Array.from(selectedPOsForLabels)}
        allOrders={poOrders
          .filter(o => selectedPOsForLabels.has(o.po_number))
          .map(o => ({ id: o.id, asin: o.asin, title: o.title, sku_code: o.sku_code, model_number: o.model_number, po_number: o.po_number, quantity: o.quantity }))}
      />

      {/* Print History Dialog */}
      {printHistoryOrder && <PrintHistoryDialog open={printHistoryDialogOpen} onOpenChange={setPrintHistoryDialogOpen} order={printHistoryOrder} />}
      
      {/* Quantity Matching Report Dialog */}
      <POQuantityMatchingDialog 
        open={showQuantityMatchingDialog} 
        onOpenChange={setShowQuantityMatchingDialog}
        preSelectedPOs={selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : selectedPOForLabels ? [selectedPOForLabels] : []}
      />

      {/* Reprint All Printed Labels - Two-Step Confirmation Dialog */}
      <AlertDialog open={showReprintAllDialog} onOpenChange={(open) => {
        setShowReprintAllDialog(open);
        if (!open) {
          setReprintConfirmStep(1);
          setReprintConfirmChecked(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {reprintConfirmStep === 1 ? 'Reprint All Printed Labels?' : '⚠️ Final Confirmation'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {reprintConfirmStep === 1 ? (
                  <>
                    <p>You are about to reprint <strong>{reprintAllPrintedItems.reduce((sum, o) => sum + (o.printed_quantity || 0), 0)} labels</strong> for <strong>{reprintAllPrintedItems.length} items</strong> across <strong>{Object.keys(reprintAllGroupedByPO).length} PO(s)</strong>.</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {Object.entries(reprintAllGroupedByPO).map(([po, group]) => (
                        <div key={po} className="flex items-center justify-between text-xs">
                          <span className="font-mono font-medium">{po}</span>
                          <span className="text-muted-foreground">{group.items.length} items · {group.totalLabels} labels</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">This will NOT update print tracking in the database. Labels will be sent directly to the printer.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-destructive">This action will send <strong>{reprintAllPrintedItems.reduce((sum, o) => sum + (o.printed_quantity || 0), 0)} labels</strong> to the printer. This cannot be undone.</p>
                    <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <Checkbox
                        id="confirm-reprint"
                        checked={reprintConfirmChecked}
                        onCheckedChange={(checked) => setReprintConfirmChecked(checked === true)}
                      />
                      <label htmlFor="confirm-reprint" className="text-sm font-medium cursor-pointer select-none">
                        I confirm I want to reprint all {reprintAllPrintedItems.reduce((sum, o) => sum + (o.printed_quantity || 0), 0)} labels
                      </label>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReprintingAll} onClick={() => {
              setReprintConfirmStep(1);
              setReprintConfirmChecked(false);
            }}>Cancel</AlertDialogCancel>
            {reprintConfirmStep === 1 ? (
              <Button
                onClick={() => setReprintConfirmStep(2)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Continue
              </Button>
            ) : (
              <AlertDialogAction
                onClick={handleReprintAllPrinted}
                disabled={isReprintingAll || !reprintConfirmChecked}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isReprintingAll ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reprinting...
                  </div>
                ) : (
                  'Yes, Reprint All'
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item-level Reprint Qty Dialog */}
      <Dialog open={showItemReprintDialog} onOpenChange={(open) => {
        setShowItemReprintDialog(open);
        if (!open) {
          setItemReprintOrder(null);
          setItemReprintQty('1');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Reprint Labels
            </DialogTitle>
          </DialogHeader>
          {itemReprintOrder && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><strong>ASIN:</strong> {itemReprintOrder.asin || 'N/A'}</p>
                <p><strong>SKU:</strong> {itemReprintOrder.sku_code || 'N/A'}</p>
                {itemReprintOrder._isConsolidated && itemReprintOrder._consolidatedOrders ? (
                  <p><strong>POs:</strong> {itemReprintOrder._consolidatedOrders.map((o: any) => o.po_number).join(', ')}</p>
                ) : (
                  <p><strong>PO:</strong> {itemReprintOrder.po_number}</p>
                )}
                <p><strong>Previously Printed:</strong> {itemReprintOrder.printed_quantity}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reprint-qty">Quantity to Reprint</Label>
                <Input
                  id="reprint-qty"
                  type="number"
                  min="1"
                  max={itemReprintOrder.printed_quantity}
                  value={itemReprintQty}
                  onChange={(e) => setItemReprintQty(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Max: {itemReprintOrder.printed_quantity} (total printed)
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowItemReprintDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={!itemReprintQty || parseInt(itemReprintQty) < 1 || parseInt(itemReprintQty) > (itemReprintOrder.printed_quantity || 0) || printingItems.has(itemReprintOrder.id)}
                  onClick={() => {
                    const qty = parseInt(itemReprintQty);
                    if (itemReprintOrder && qty > 0) {
                      handleReprintWithoutTracking(itemReprintOrder, qty, false);
                      setShowItemReprintDialog(false);
                      setItemReprintOrder(null);
                      setItemReprintQty('1');
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Reprint {itemReprintQty ? parseInt(itemReprintQty) || 0 : 0} Label(s)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
};
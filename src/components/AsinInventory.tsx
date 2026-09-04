import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useLabelPrintSettings } from '@/hooks/usePrintSettings';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database, ChevronDown, ChevronUp, Loader2, CheckCircle, Image, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useAsinInventoryPaginated } from '@/hooks/useAsinInventoryPaginated';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog, EnhancedStockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { MultiSerialNumberEditor } from './MultiSerialNumberEditor';
import { TitleEditor } from './TitleEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
import { BulkTitleUpload } from './BulkTitleUpload';
import { FetchTitlesPreviewDialog } from './FetchTitlesPreviewDialog';
import { BulkSerialCleanup } from './BulkSerialCleanup';
import { SunskyCostAnalyzer } from './SunskyCostAnalyzer';
import { SimpleWarehouseManager } from './SimpleWarehouseManager';
import { SerialSequencingAdvisor } from './SerialSequencingAdvisor';
import { DisableItemsDialog } from './DisableItemsDialog';
import { EnableItemDialog } from './EnableItemDialog';
import { PrintQuantityDialog } from './PrintQuantityDialog';

// Enhanced control panel components
import { ActionSection } from './inventory/ActionSection';
import { EnhancedActionButton } from './inventory/EnhancedActionButton';
import { QuickControlsBar } from './inventory/QuickControlsBar';
import { LabelPrintingCard } from './inventory/LabelPrintingCard';
import { DisplayFiltersToggle } from './inventory/DisplayFiltersToggle';
import { InventoryMatchingTool } from './inventory/matching/InventoryMatchingTool';
import { PerformanceIndicator } from './inventory/PerformanceIndicator';
import { ClipboardList } from 'lucide-react';

import { useWarehouseManager } from '@/hooks/useWarehouseManager';
import { useComprehensivePerformance } from '@/hooks/useComprehensivePerformance';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { useCountry } from '@/contexts/CountryContext';
import { useProductImages } from '@/hooks/useProductImages';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, LabelElement, PrintSettings } from '@/types/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
export function AsinInventory() {
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMethod, setSearchMethod] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber' | 'restock' | 'exportMode' | 'performance'>('dateAdded');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date>();
  const [dateFilterTo, setDateFilterTo] = useState<Date>();
  const [showDisabledItems, setShowDisabledItems] = useState(false);
  
  // Bulk add progress state
  const [bulkAddProgress, setBulkAddProgress] = useState({ 
    current: 0, 
    total: 0, 
    isProcessing: false 
  });
  
  // Debounce search term for performance (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Reset to page 1 when filters change (searchMethod removed - debounce handles it)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo, showDisabledItems]);
  
  // Get full inventory for exports (loads ALL items)
  const fullInventoryHook = useAsinInventory();
  const { 
    inventory: fullInventory, 
    loading: fullInventoryLoading,
    loadingProgress: fullInventoryProgress,
    loadError: fullInventoryError,
    refetch: retryFullInventory 
  } = fullInventoryHook;
  
  // Use paginated hook with server-side filtering
  const {
    inventory,
    totalCount,
    totalPages,
    loading,
    isFetching, // LAYER 4: Get isFetching for accurate loading indicator
    addItem,
    updateItemStatus,
    bulkAdd,
    restockItem,
    updateQuantity,
    updateSku,
    updateSerialNumber,
    updateTitle,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    toggleItemActive,
    refetch,
    getNextSerialsBatch,
    addAdditionalSerial,
    removeAdditionalSerial
  } = useAsinInventoryPaginated(currentPage, itemsPerPage, {
    searchTerm: debouncedSearchTerm,
    searchMethod,
    statusFilter,
    sortBy,
    sortOrder,
    quickFilter,
    dateFilterFrom,
    dateFilterTo,
    showDisabledItems
  });
  const {
    user
  } = useUserProfile();
  const {
    runTitleFetch
  } = useBackgroundTasks();
  const { getImageByAsin, isLoading: imagesLoading, productImages, refreshImages } = useProductImages();
  
  // Comprehensive performance analytics for performance column
  const { performanceMap, loading: performanceLoading } = useComprehensivePerformance();
  
  // Detect duplicate items in raw inventory (before filtering)
  const duplicateWarning = useMemo(() => {
    if (loading || inventory.length === 0) return null;
    
    const seen = new Map<string, number>();
    let duplicateCount = 0;
    
    inventory.forEach(item => {
      const key = `${item.asin}-${item.serialNumber}`;
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count > 0) duplicateCount++;
    });
    
    if (duplicateCount > 0) {
      return {
        count: duplicateCount,
        message: `⚠️ Found ${duplicateCount} duplicate record(s) in inventory. These have been automatically hidden from view.`
      };
    }
    
    return null;
  }, [inventory, loading]);

  // Show warning toast when duplicates detected
  useEffect(() => {
    if (duplicateWarning && !loading) {
      toast({
        title: "Duplicates Detected",
        description: duplicateWarning.message,
        variant: "default",
        duration: 5000,
      });
    }
  }, [duplicateWarning?.count]);
  
  // Missing serial numbers calculation
  const missingSerialNumbers = useMemo(() => {
    // Wait for full inventory to load before calculating
    if (fullInventoryLoading || fullInventory.length === 0) {
      console.log('⏳ Waiting for full inventory to load...');
      return [];
    }
    
    console.log(`🔄 Calculating missing serials from ${fullInventory.length} items`);
    
    // Extract all serial numbers and convert to numbers from FULL inventory
    const serialNumbers = fullInventory
      .map(item => item.serialNumber)
      .filter(serial => serial && /^\d{5}$/.test(serial)) // Only 5-digit numbers
      .map(serial => parseInt(serial, 10))
      .sort((a, b) => a - b);
    
    if (serialNumbers.length === 0) return [];
    
    const missing: number[] = [];
    const maxSerial = Math.max(...serialNumbers);
    
    // Find missing numbers from 1 to max
    for (let i = 1; i <= maxSerial; i++) {
      if (!serialNumbers.includes(i)) {
        missing.push(i);
      }
    }
    
    console.log(`📊 Found ${missing.length} missing serial numbers (range: 1-${maxSerial})`);
    return missing;
  }, [fullInventory, fullInventoryLoading]);
  
  // Get next available serial number (queries database directly)
  const getNextSerialNumber = async (itemTitle?: string) => {
    // Don't suggest a number if full inventory is still loading
    if (fullInventoryLoading) {
      toast({
        title: "Please wait",
        description: "Inventory is still loading. Please try again in a moment.",
        variant: "default",
      });
      throw new Error('Inventory still loading');
    }
    
    // Query database directly for fresh data with optional title for category-aware assignment
    const nextSerial = await fullInventoryHook.getNextAvailableSerial(itemTitle);
    
    if (!nextSerial) {
      toast({
        title: "Error",
        description: "Could not generate next serial number. Please try again.",
        variant: "destructive",
      });
      throw new Error('Failed to generate next serial number');
    }
    
    return nextSerial;
  };
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isMissingNumbersDialogOpen, setIsMissingNumbersDialogOpen] = useState(false);
  const [isMatchingToolOpen, setIsMatchingToolOpen] = useState(false);
  
  // Duplicate serial numbers dialog
  const [isDuplicatesDialogOpen, setIsDuplicatesDialogOpen] = useState(false);
  const [duplicateSerialItems, setDuplicateSerialItems] = useState<AsinInventoryItem[]>([]);
  
  // Disable items feature
  const [itemsToDisable, setItemsToDisable] = useState<AsinInventoryItem[]>([]);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [itemToEnable, setItemToEnable] = useState<AsinInventoryItem | null>(null);
  const [isEnableDialogOpen, setIsEnableDialogOpen] = useState(false);
  
  // Print quantity dialog state
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemToPrint, setItemToPrint] = useState<AsinInventoryItem | null>(null);
  
  // Export mode settings - stored in database for persistence across devices
  const [exportModes, setExportModes] = useState<Record<string, 'global' | 'local'>>({});
  const [exportModesLoaded, setExportModesLoaded] = useState(false);

  // Load export modes from database
  useEffect(() => {
    const loadExportModes = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('export_mode_preferences')
          .select('item_id, export_mode')
          .eq('user_id', user.id as any)
          .eq('item_type', 'asin_inventory' as any);

        if (error) {
          console.error('❌ Failed to load export modes from database:', error);
          return;
        }

        const modesMap: Record<string, 'global' | 'local'> = {};
        if (data && Array.isArray(data)) {
          data.forEach((pref: any) => {
            modesMap[pref.item_id] = pref.export_mode as 'global' | 'local';
          });
        }

        console.log('🔧 Loading export modes from database:', modesMap);
        setExportModes(modesMap);
        setExportModesLoaded(true);
      } catch (error) {
        console.error('❌ Error loading export modes:', error);
        setExportModesLoaded(true);
      }
    };

    loadExportModes();
  }, [user?.id]);

  // Save export mode to database
  const saveExportMode = async (itemId: string, mode: 'global' | 'local') => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('export_mode_preferences')
        .upsert({
          user_id: user.id as any,
          item_id: itemId as any,
          item_type: 'asin_inventory' as any,
          export_mode: mode as any
        } as any, {
          onConflict: 'user_id,item_id,item_type'
        });

      if (error) {
        console.error('❌ Failed to save export mode:', error);
        toast({
          title: "Error",
          description: "Failed to save export mode preference",
          variant: "destructive"
        });
        return;
      }

      console.log('💾 Saved export mode to database:', { itemId, mode });
    } catch (error) {
      console.error('❌ Error saving export mode:', error);
    }
  };

  // Debug: Monitor when inventory loads and export modes relationship
  useEffect(() => {
    if (inventory.length > 0 && exportModesLoaded) {
      console.log('📦 Inventory loaded with export modes relationship:', {
        inventoryCount: inventory.length,
        exportModesCount: Object.keys(exportModes).length,
        sampleInventoryIds: inventory.slice(0, 3).map(item => ({ id: item.id, asin: item.asin })),
        sampleExportModes: Object.entries(exportModes).slice(0, 3)
      });
      
      // Check if any inventory items have export modes set
      const itemsWithModes = inventory.filter(item => exportModes[item.id]);
      console.log('🎯 Items with export modes set:', itemsWithModes.length, '/', inventory.length);
    }
  }, [inventory, exportModes, exportModesLoaded]);
  
  // Client-side re-sort for fields that can't be sorted server-side (exportMode, performance)
  // and apply performanceFilter
  const processedInventory = useMemo(() => {
    let items = [...inventory];

    // Apply performanceFilter client-side
    if (performanceFilter !== 'all') {
      items = items.filter(item => {
        const perf = performanceMap.get(item.id);
        if (!perf) return performanceFilter === 'No Sales';
        return perf.performance_category === performanceFilter;
      });
    }

    // Client-side re-sort for exportMode
    if (sortBy === 'exportMode') {
      items.sort((a, b) => {
        const aMode = exportModes[a.id] || 'global';
        const bMode = exportModes[b.id] || 'global';
        const cmp = aMode.localeCompare(bMode);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    // Client-side re-sort for performance
    if (sortBy === 'performance') {
      items.sort((a, b) => {
        const aPerf = performanceMap.get(a.id);
        const bPerf = performanceMap.get(b.id);
        const aScore = aPerf?.performance_score ?? -1;
        const bScore = bPerf?.performance_score ?? -1;
        const cmp = aScore - bScore;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return items;
  }, [inventory, sortBy, sortOrder, performanceFilter, performanceMap, exportModes]);

  // Modern printing state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  
  // Image preview states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  
  // Toggle states for Metrics and Features sections
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  // Image preview handlers
  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsPreviewDialogOpen(true);
  };

  // Component for displaying product images - v4.0 with retry logic and caching
  const ProductImage = ({ asin }: { asin: string }) => {
    const [retryCount, setRetryCount] = useState(0);
    const [imageError, setImageError] = useState(false);
    const maxRetries = 2;
    
    const productImage = getImageByAsin(asin);
    
    // Reset error state when productImages changes (after refresh)
    useEffect(() => {
      setImageError(false);
      setRetryCount(0);
    }, [productImages]);
    
    // Always show loading state when images are still being fetched
    if (imagesLoading) {
      return (
        <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border flex-shrink-0 animate-pulse">
          <div className="w-4 h-4 bg-muted-foreground/50 rounded animate-spin border-2 border-transparent border-t-muted-foreground/50"></div>
        </div>
      );
    }
    
    if (!productImage || imageError) {
      return (
        <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-border flex-shrink-0 gap-1">
          <Eye className="w-5 h-5 text-muted-foreground" />
          {retryCount > 0 && (
            <span className="text-[10px] text-muted-foreground">No image</span>
          )}
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="w-20 h-20 min-w-[5rem] min-h-[5rem] rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-colors flex-shrink-0"
          >
            <img 
              src={productImage.image_url} 
              alt={`Product image for ${asin}`}
              className="w-full h-full object-contain"
              loading="lazy"
              onError={(e) => {
                console.warn(`Image load failed for ASIN ${asin}, retry ${retryCount}/${maxRetries}`);
                if (retryCount < maxRetries) {
                  setRetryCount(prev => prev + 1);
                  // Force re-render to retry
                  setTimeout(() => {
                    e.currentTarget.src = productImage.image_url + `?retry=${retryCount}`;
                  }, 500);
                } else {
                  setImageError(true);
                }
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-80 p-2">
          <div className="w-full h-64 rounded-lg overflow-hidden bg-white">
            <img 
              src={productImage.image_url} 
              alt={`Product preview for ${asin}`}
              className="w-full h-full object-contain"
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  // Use warehouse management from hook
  const {
    selectedWarehouse
  } = useWarehouseManager();
  const { toast } = useToast();
  const { printSettings, setPrintSettings, getPrintSettings } = useLabelPrintSettings();
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    sku: string;
    title: string;
    quantity: number;
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
    sku: '',
    title: '',
    quantity: 0,
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');
  const [nextAvailableSerial, setNextAvailableSerial] = useState<string>('');

  // Load next available serial number for display
  useEffect(() => {
    const loadNextSerial = async () => {
      const next = await getNextSerialNumber();
      setNextAvailableSerial(next);
    };
    
    if (!fullInventoryLoading) {
      loadNextSerial();
    }
  }, [fullInventory, fullInventoryLoading]);

  // Inventory is already filtered and paginated by the backend hook
  const handleAddItem = async () => {
    if (!newItem.asin.trim() || !newItem.sku.trim() || !newItem.title.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN, SKU, and Title are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate ASIN in current inventory (LAYER 1: UI validation)
    const duplicateAsin = fullInventory.find(item => 
      item.asin.toLowerCase() === newItem.asin.toLowerCase().trim()
    );
    if (duplicateAsin) {
      toast({
        title: "Duplicate ASIN",
        description: `ASIN "${newItem.asin}" already exists in inventory (Serial: ${duplicateAsin.serialNumber}). Each ASIN must be unique.`,
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate SKU in current inventory (if SKU is provided)
    if (newItem.sku && newItem.sku.trim()) {
      const duplicateSku = inventory.find(item => item.sku && item.sku.toLowerCase() === newItem.sku.toLowerCase().trim());
      if (duplicateSku) {
        toast({
          title: "Duplicate SKU",
          description: `SKU "${newItem.sku}" already exists in inventory. Each SKU must be unique.`,
          variant: "destructive"
        });
        return;
      }
    }
    // Auto-set status based on quantity only
    const status = newItem.quantity === 0 ? 'out-of-stock' : 'in-stock';
    
    await addItem({
      ...newItem,
      status,
      dateAdded: new Date().toISOString()
    });
    setIsAddDialogOpen(false);
    // Reset form with blank fields
    setNewItem({
      asin: '',
      serialNumber: '',
      sku: '',
      title: '',
      quantity: 0,
      notes: ''
    });
  };
  
  const handleUseSerialNumber = (serialNumber: string) => {
    setNewItem(prev => ({ ...prev, serialNumber }));
    setIsMissingNumbersDialogOpen(false);
    setIsAddDialogOpen(true);
  };
  const handleBulkAdd = async () => {
    try {
      if (!bulkText.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter some data to import",
          variant: "destructive"
        });
        return;
      }
      const lines = bulkText.trim().split('\n');
      const items = [];
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 1 && parts[0].trim()) { // Only ASIN is mandatory
          const quantity = parseInt(parts[4]) || 0; // Allow 0 quantity
          const status = quantity === 0 ? 'out-of-stock' : 'in-stock'; // Auto-set based on quantity
          
          items.push({
            asin: parts[0].trim(), // Mandatory ASIN
            serialNumber: parts[1]?.trim() || '', // Optional
            sku: parts[2]?.trim() || '', // Optional
            status: status, // Auto-set to 'out-of-stock' if quantity is 0
            quantity: quantity,
            notes: parts[5]?.trim() || '', // Optional
            dateAdded: new Date().toISOString()
          });
        }
      }
      if (items.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid items found in the input",
          variant: "destructive"
        });
        return;
      }

      // Skip duplicates instead of blocking: existing ASINs/SKUs/serials are skipped,
      // only new items are added
      const skippedReasons: string[] = [];
      const seenSkus = new Set();
      const seenSerials = new Set();
      const seenAsins = new Set(); // Track ASINs within bulk data
      const validItems: typeof items = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check for duplicate ASIN in existing inventory
        const duplicateAsin = fullInventory.find(existing =>
          existing.asin.toLowerCase() === item.asin.toLowerCase()
        );
        if (duplicateAsin) {
          skippedReasons.push(`Row ${i + 1}: ASIN "${item.asin}" already exists`);
          continue;
        }

        // Check for duplicate ASIN within bulk data
        if (seenAsins.has(item.asin.toLowerCase())) {
          skippedReasons.push(`Row ${i + 1}: ASIN "${item.asin}" duplicated in input`);
          continue;
        }
        seenAsins.add(item.asin.toLowerCase());

        // Check for duplicate SKU (if provided)
        if (item.sku && item.sku.trim()) {
          const duplicateSku = inventory.find(existing => existing.sku && existing.sku.toLowerCase() === item.sku.toLowerCase());
          if (duplicateSku) {
            skippedReasons.push(`Row ${i + 1}: SKU "${item.sku}" already exists`);
            continue;
          }

          if (seenSkus.has(item.sku.toLowerCase())) {
            skippedReasons.push(`Row ${i + 1}: SKU "${item.sku}" duplicated in input`);
            continue;
          }
          seenSkus.add(item.sku.toLowerCase());
        }

        // Check for duplicate SERIAL NUMBER (if provided)
        if (item.serialNumber && item.serialNumber.trim()) {
          const duplicateSerial = inventory.find(existing =>
            existing.serialNumber === item.serialNumber
          );
          if (duplicateSerial) {
            skippedReasons.push(`Row ${i + 1}: Serial "${item.serialNumber}" already used by "${duplicateSerial.asin}"`);
            continue;
          }

          if (seenSerials.has(item.serialNumber)) {
            skippedReasons.push(`Row ${i + 1}: Serial "${item.serialNumber}" duplicated in input`);
            continue;
          }
          seenSerials.add(item.serialNumber);
        }

        validItems.push(item);
      }

      if (validItems.length === 0) {
        toast({
          title: "Nothing to Add",
          description: `All ${items.length} item(s) already exist or are duplicated. ${skippedReasons.slice(0, 3).join(', ')}${skippedReasons.length > 3 ? '...' : ''}`,
          variant: "destructive"
        });
        return;
      }

      if (skippedReasons.length > 0) {
        toast({
          title: `${skippedReasons.length} item(s) skipped`,
          description: `${skippedReasons.slice(0, 3).join(', ')}${skippedReasons.length > 3 ? ` …and ${skippedReasons.length - 3} more` : ''}`,
        });
      }

      // Use items as-is - no auto serial number assignment
      const itemsWithAutoSerial = items;

      // Start bulk add with progress tracking
      setBulkAddProgress({ current: 0, total: itemsWithAutoSerial.length, isProcessing: true });
      
      await bulkAdd(itemsWithAutoSerial, (current, total) => {
        setBulkAddProgress({ current, total, isProcessing: true });
      });
      
      // Show completion state briefly
      setBulkAddProgress({ 
        current: itemsWithAutoSerial.length, 
        total: itemsWithAutoSerial.length, 
        isProcessing: false 
      });
      
      // Auto-close after showing completion
      setTimeout(() => {
        setBulkText('');
        setIsBulkDialogOpen(false);
        setBulkAddProgress({ current: 0, total: 0, isProcessing: false });
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Bulk Add Failed",
        description: error.message || "An unexpected error occurred while adding items",
        variant: "destructive"
      });
    }
  };
  
  // Handle disabling items
  const handleDisableItems = (items: AsinInventoryItem[]) => {
    setItemsToDisable(items);
    setIsDisableDialogOpen(true);
  };
  
  const confirmDisableItems = async () => {
    for (const item of itemsToDisable) {
      await toggleItemActive(item.id, false);
    }
    setItemsToDisable([]);
    setSelectedItems(new Set()); // Clear selection
  };
  
  // Handle enabling items
  const handleEnableItem = (item: AsinInventoryItem) => {
    setItemToEnable(item);
    setIsEnableDialogOpen(true);
  };
  
  const confirmEnableItem = async () => {
    if (itemToEnable) {
      await toggleItemActive(itemToEnable.id, true);
      setItemToEnable(null);
    }
  };
  
  const exportInventory = () => {
    // Export ALL inventory items (filters ignored to ensure complete export)
    const dataToExport = fullInventory;
    
    const csvData = [['SKU', 'UPC', 'ASIN', 'Title', 'Warehouse', 'Warehouse name', 'Available units', 'Status'],
      ...dataToExport.map(item => {
        // Get the export mode for this item (default to 'global')
        const exportMode = exportModes[item.id] || 'global';
        
        // Set quantity based on export mode:
        // Global: use stock quantity
        // Local: always use 100 units regardless of actual stock
        const exportQuantity = exportMode === 'local' 
          ? 100
          : item.quantity;
        
        return [
          item.sku || '', // SKU
          '', // UPC (blank)
          item.asin, // ASIN
          item.title || '', // Title
          selectedWarehouse?.code || '', // Warehouse
          selectedWarehouse?.name || '', // Warehouse name
          exportQuantity.toString(), // Available units
          'active' // Status (active for all)
        ];
      })];
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asin-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Complete",
      description: `Exported all ${dataToExport.length} items from inventory (filters ignored)`
    });
  };

  // Full export with all columns for all inventory items
  const exportFullInventory = () => {
    const allItems = fullInventory;
    if (allItems.length === 0) {
      toast({ title: "No Data", description: "No inventory items to export", variant: "destructive" });
      return;
    }

    const headers = [
      'ID', 'ASIN', 'Serial Number', 'Additional Serial Numbers', 'SKU', 'Title',
      'Status', 'Quantity', 'Date Added', 'Date Sold', 'Notes',
      'Restock Date', 'Restock Quantity', 'Last Restock Date',
      'Eligible for Restock', 'Manual Restock Override', 'Is Active',
      'First Stock Added At'
    ];

    const csvRows = allItems.map(item => [
      item.id,
      item.asin,
      item.serialNumber || '',
      (item.additionalSerialNumbers || []).join('; '),
      item.sku || '',
      item.title || '',
      item.status,
      item.quantity.toString(),
      item.dateAdded || '',
      item.dateSold || '',
      item.notes || '',
      item.restockDate || '',
      item.restockQuantity?.toString() || '',
      item.lastRestockDate || '',
      item.eligible_for_restock?.toString() || '',
      item.manual_restock_override?.toString() || '',
      item.isActive?.toString() || '',
      item.first_stock_added_at || ''
    ]);

    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asin-inventory-full-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: "Full Export Complete",
      description: `Exported ${allItems.length} inventory items with all columns`
    });
  };
  const emailInventory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-inventory-email', {
        body: {
          inventory: inventory,
          userEmail: user?.email
        }
      });
      if (error) throw error;
      toast({
        title: "Email Sent",
        description: "Inventory report sent to your email"
      });
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Could not send email report",
        variant: "destructive"
      });
    }
  };
  // Enhanced updateQuantity that handles merged ASINs
  const handleQuantityUpdate = async (mergedItem: any, newTotalQuantity: number, reason?: string) => {
    if (!mergedItem.individualItems || mergedItem.individualItems.length === 1) {
      // Single item, use normal update
      await updateQuantity(mergedItem.id, newTotalQuantity, reason);
    } else {
      // Multiple items merged, distribute the quantity change
      const currentTotalQuantity = mergedItem.quantity;
      const quantityChange = newTotalQuantity - currentTotalQuantity;

      // Sort individual items by quantity (descending) to handle reductions better
      const sortedItems = [...mergedItem.individualItems].sort((a, b) => b.quantity - a.quantity);
      let remainingChange = quantityChange;
      for (const item of sortedItems) {
        if (remainingChange === 0) break;
        if (remainingChange > 0) {
          // Adding stock - add to the first item
          if (item === sortedItems[0]) {
            await updateQuantity(item.id, item.quantity + remainingChange, reason);
            remainingChange = 0;
          }
        } else {
          // Reducing stock - reduce from items with stock
          const canReduce = Math.min(item.quantity, Math.abs(remainingChange));
          if (canReduce > 0) {
            await updateQuantity(item.id, item.quantity - canReduce, reason);
            remainingChange += canReduce;
          }
        }
      }
    }
  };
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Inventory data refreshed"
    });
  };
  // Removed handleFetchTitlesFromSunsky - now using FetchTitlesPreviewDialog component

  // Find all items with duplicate serial numbers
  const serialNumberMap = useMemo(() => {
    const map = new Map<string, AsinInventoryItem[]>();
    fullInventory.forEach(item => {
      if (item.serialNumber) {
        const existing = map.get(item.serialNumber) || [];
        existing.push(item);
        map.set(item.serialNumber, existing);
      }
    });
    return map;
  }, [fullInventory]);

  // Check if a serial number has duplicates
  const hasDuplicateSerial = (serialNumber: string) => {
    const items = serialNumberMap.get(serialNumber);
    return items && items.length > 1;
  };

  // Show duplicate serial numbers dialog
  const handleViewDuplicates = (serialNumber: string) => {
    const duplicates = serialNumberMap.get(serialNumber) || [];
    setDuplicateSerialItems(duplicates);
    setIsDuplicatesDialogOpen(true);
  };

  // Delete/clear a serial number
  const handleDeleteSerial = async (itemId: string) => {
    try {
      await updateSerialNumber(itemId, '');
      // Toast is already shown by updateSerialNumber
    } catch (error) {
      // Error toast is already shown by updateSerialNumber
      console.error('Failed to delete serial number:', error);
    }
  };

  // Initialize QZ Tray and templates
  useEffect(() => {
    initializeQZ();
    loadTemplates();
  }, []);

  const initializeQZ = async () => {
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        setQzConnected(true);
        const printers = await qzConnectionManager.getPrinters();
        setAvailablePrinters(printers);
        
        // Set default printer
        const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
        const defaultPrinter = savedDefaultPrinter || (await qzConnectionManager.getDefaultPrinter());
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
    }
  };

  // Handler to save template selection automatically
  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplate(templateId);
    localStorage.setItem('savedLabelTemplate', templateId);
  };

  // Handler to save printer selection automatically
  const handlePrinterSelection = (printer: string) => {
    setSelectedPrinter(printer);
    if (printer) localStorage.setItem('qz-default-printer', printer);
  };

  const loadTemplates = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('label_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableTemplates(templates || []);

      // Load saved template
      const savedTemplate = localStorage.getItem('savedLabelTemplate');
      if (savedTemplate && templates && Array.isArray(templates) && templates.some((t: any) => t?.id === savedTemplate)) {
        setSelectedTemplate(savedTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Create dataset from inventory items with optional serial number override
  const createDatasetFromItems = (items: AsinInventoryItem[], overrideSerial?: string): LabelDataset => {
    return {
      id: 'inventory-data',
      name: 'Inventory Data',
      description: 'ASIN Inventory Items',
      headers: ['ASIN', 'SKU', 'Title', 'Serial', 'Quantity', 'Status'],
      data: items.map(item => [
        item.asin,
        item.sku || 'No SKU',
        item.title || `Product ${item.asin}`,
        overrideSerial || item.serialNumber || '',
        item.quantity.toString(),
        item.status
      ]),
      rowCount: items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Open print dialog for an item
  const openPrintDialog = (item: AsinInventoryItem) => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray Not Connected",
        description: "Please connect QZ Tray from the status indicator in the header first",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a label template first",
        variant: "destructive"
      });
      return;
    }

    setItemToPrint(item);
    setIsPrintDialogOpen(true);
  };

  // Print single item with specified quantity and serial number
  const handlePrintItem = async (item: AsinInventoryItem, quantity: number = 1, serialNumber?: string) => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray Not Connected",
        description: "Please connect QZ Tray from the status indicator in the header first",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a label template first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get template data
      const { data: template, error } = await supabase
        .from('label_templates')
        .select('*')
        .eq('id', selectedTemplate as any)
        .maybeSingle();

      if (error) throw error;
      if (!template) throw new Error('Template not found');

      // Create LabelDoc from template
      const labelDoc: LabelDoc = {
        id: (template as any).id,
        name: (template as any).name,
        size: {
          width: (template as any).width || 100,
          height: (template as any).height || 60,
          unit: 'mm'
        },
        elements: ((template as any).canvas_data as any)?.elements || [],
        createdAt: (template as any).created_at,
        updatedAt: (template as any).updated_at
      };

      // Create dataset with single item, using override serial if provided
      const dataset = createDatasetFromItems([item], serialNumber);

      // Validate template elements have data mappings (case-insensitive)
      const unmappedElements = labelDoc.elements.filter(el => 
        (el.type === 'text' || el.type === 'multitext' || el.type === 'barcode' || el.type === 'qr') && 
        (!el.dataColumn || !dataset.headers.some(h => h.toLowerCase() === el.dataColumn?.toLowerCase()))
      );

      if (unmappedElements.length > 0) {
        console.warn('Template elements without data mapping:', unmappedElements);
        toast({
          title: "Template Info",
          description: `${unmappedElements.length} element(s) will show sample text. To fix: Edit template and map elements to: ${dataset.headers.join(', ')}`,
        });
      }

      console.log('Printing with data:', {
        headers: dataset.headers,
        dataRow: dataset.data[0],
        elements: labelDoc.elements.map(el => ({ type: el.type, dataColumn: el.dataColumn, text: el.text })),
        copies: quantity
      });

      // Generate ZPL using PrintService with quantity
      const printSettingsWithQty = { ...getPrintSettings(), copies: quantity };
      const zplCode = PrintService.generateZPL(labelDoc, dataset, printSettingsWithQty);

      // Print using QZ Tray
      await qzConnectionManager.print(zplCode, selectedPrinter);

      toast({
        title: "Labels Printed",
        description: `Printed ${quantity} label${quantity > 1 ? 's' : ''} for ${item.asin}`,
      });
    } catch (error) {
      console.error('Error printing item:', error);
      toast({
        title: "Print Failed",
        description: "Could not print label. Please check template and QZ Tray connection.",
        variant: "destructive"
      });
    }
  };

  // Print selected items
  const handleBulkPrint = async () => {
    if (!qzConnected) {
      toast({
        title: "QZ Tray Not Connected",
        description: "Please connect QZ Tray from the status indicator in the header first",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a label template first",
        variant: "destructive"
      });
      return;
    }

    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to print",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get selected items
      const selectedInventoryItems = inventory.filter(item => selectedItems.has(item.id));

      // Get template data
      const { data: template, error } = await supabase
        .from('label_templates')
        .select('*')
        .eq('id', selectedTemplate as any)
        .maybeSingle();

      if (error) throw error;
      if (!template) throw new Error('Template not found');

      // Create LabelDoc from template
      const labelDoc: LabelDoc = {
        id: (template as any).id,
        name: (template as any).name,
        size: {
          width: (template as any).width || 100,
          height: (template as any).height || 60,
          unit: 'mm'
        },
        elements: ((template as any).canvas_data as any)?.elements || [],
        createdAt: (template as any).created_at,
        updatedAt: (template as any).updated_at
      };

      // Create dataset with selected items
      const dataset = createDatasetFromItems(selectedInventoryItems);

      // Generate ZPL using PrintService
      const zplCode = PrintService.generateZPL(labelDoc, dataset, getPrintSettings());

      // Print using QZ Tray
      await qzConnectionManager.print(zplCode, selectedPrinter);

      toast({
        title: "Labels Printed",
        description: `Printed ${selectedInventoryItems.length} labels`,
      });

      // Clear selection
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error bulk printing:', error);
      toast({
        title: "Print Failed",
        description: "Could not print labels. Please check template and QZ Tray connection.",
        variant: "destructive"
      });
    }
  };

  
  // Handle restock eligibility change
  if (loading || fullInventoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse text-lg">Loading your inventory...</p>
          
          {fullInventoryProgress && fullInventoryProgress.total > 0 && (
            <div className="w-full space-y-3">
              <Progress value={fullInventoryProgress.percentage} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {fullInventoryProgress.current.toLocaleString()} / {fullInventoryProgress.total.toLocaleString()} items
                </span>
                <span className="font-medium text-primary">{fullInventoryProgress.percentage}%</span>
              </div>
            </div>
          )}
          
          {fullInventoryError && (
            <div className="w-full space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Loading failed</span>
              </div>
              <p className="text-sm text-muted-foreground">{fullInventoryError}</p>
              <Button 
                variant="outline" 
                onClick={() => retryFullInventory()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return <div className="space-y-4 max-w-[95vw] mx-auto p-6">
      <DisableItemsDialog
        open={isDisableDialogOpen}
        onOpenChange={setIsDisableDialogOpen}
        items={itemsToDisable}
        onConfirm={confirmDisableItems}
      />
      <EnableItemDialog
        open={isEnableDialogOpen}
        onOpenChange={setIsEnableDialogOpen}
        item={itemToEnable}
        onConfirm={confirmEnableItem}
      />
      {/* Toggle Buttons Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Inventory Metrics Button - 30-Day Background Chart */}
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className={cn(
            "relative w-full h-24 rounded-xl border-2 overflow-hidden transition-all duration-300",
            "bg-gradient-to-br from-card to-card/80 hover:shadow-lg",
            showMetrics ? "border-primary/50 shadow-md" : "border-border hover:border-primary/30"
          )}
        >
          {/* 30-Day Background Area Chart */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <defs>
                <linearGradient id="chartGradient30" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,35 L3,32 L7,28 L10,30 L13,25 L17,22 L20,26 L23,20 L27,18 L30,22 L33,15 L37,18 L40,12 L43,16 L47,10 L50,14 L53,8 L57,12 L60,6 L63,10 L67,8 L70,5 L73,9 L77,6 L80,10 L83,4 L87,8 L90,5 L93,9 L97,6 L100,8 L100,40 L0,40 Z"
                fill="url(#chartGradient30)"
                className={cn(isFetching && "animate-pulse")}
              />
              <path
                d="M0,35 L3,32 L7,28 L10,30 L13,25 L17,22 L20,26 L23,20 L27,18 L30,22 L33,15 L37,18 L40,12 L43,16 L47,10 L50,14 L53,8 L57,12 L60,6 L63,10 L67,8 L70,5 L73,9 L77,6 L80,10 L83,4 L87,8 L90,5 L93,9 L97,6 L100,8"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="0.8"
                strokeLinecap="round"
                className={cn(isFetching && "animate-pulse")}
              />
            </svg>
          </div>

          {/* Content overlay */}
          <div className="relative z-10 h-full flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-lg bg-primary/10 border border-primary/20",
                isFetching && "animate-pulse"
              )}>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Inventory Metrics</span>
                  {isFetching && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-primary">
                  {totalCount.toLocaleString()} ASINs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">30 days</span>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                showMetrics && "rotate-180"
              )} />
            </div>
          </div>
        </button>

        {/* Inventory Features Button - Matching Size */}
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className={cn(
            "relative w-full h-24 rounded-xl border-2 overflow-hidden transition-all duration-300",
            "bg-gradient-to-br from-card to-card/80 hover:shadow-lg",
            showFeatures ? "border-purple-500/50 shadow-md" : "border-border hover:border-purple-500/30"
          )}
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_1px,transparent_1px)] bg-[length:20px_20px]" />
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Layers className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-foreground">Inventory Features</span>
                <p className="text-sm text-muted-foreground">Manage & configure</p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              showFeatures && "rotate-180"
            )} />
          </div>
        </button>
      </div>

      {/* Conditional Metrics Section */}
      {showMetrics && (
        <div className="animate-fade-in">
          <InventoryMetrics 
            showOnlyAsin={true} 
            activeStatusFilter={statusFilter}
          />
        </div>
      )}

      {/* Conditional Features Section */}
      {showFeatures && (
        <Card className="border-2 border-purple-500/30 shadow-lg bg-gradient-to-r from-card to-purple-500/5 animate-fade-in">
          <CardContent className="p-6 space-y-4">
            {/* Display Filters Toggle */}
            <DisplayFiltersToggle
              showDisabledItems={showDisabledItems}
              onShowDisabledChange={(checked) => {
                console.log('🔄 Toggle Show Disabled Items:', checked);
                setShowDisabledItems(checked);
              }}
              disabledCount={showDisabledItems ? totalCount : undefined}
            />

            {/* Action Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              
              {/* Section 1: Data Entry & Import */}
              <ActionSection
                title="DATA ENTRY & IMPORT"
                icon={Plus}
                color="emerald"
                badge={missingSerialNumbers.length > 0 ? missingSerialNumbers.length : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {/* Add New Item */}
                  {/* Add New Item - trigger only, dialog rendered outside */}
                  <EnhancedActionButton
                    label="Add Item"
                    icon={Plus}
                    variant="emerald"
                    tooltip="Add a new ASIN item to inventory"
                    onClick={() => setIsAddDialogOpen(true)}
                  />

                  {/* Inventory Matching Tool */}
                  <EnhancedActionButton
                    label="Match Inventory"
                    icon={ClipboardList}
                    variant="emerald"
                    tooltip="Upload a list to match against inventory"
                    onClick={() => setIsMatchingToolOpen(true)}
                  />

                  {/* Bulk Add Items */}
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <EnhancedActionButton
                        label="Bulk Add"
                        icon={Upload}
                        variant="emerald"
                        tooltip="Add multiple items at once"
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Bulk Add ASIN Items</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bulkText">
                            Paste tab-separated data (Only ASIN is required, other fields are optional)
                          </Label>
                          <Textarea 
                            id="bulkText" 
                            value={bulkText} 
                            onChange={e => setBulkText(e.target.value)} 
                            placeholder="B123456789	SN001	SKU123	in-stock	5	Optional notes&#10;B987654321		SKU456		0	Zero qty item (auto-sold)&#10;B555555555			in-stock	3	Only ASIN and quantity" 
                            rows={8} 
                            className="font-mono text-sm"
                            disabled={bulkAddProgress.isProcessing}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                          <p><strong>Required:</strong> ASIN (first field only)</p>
                          <p><strong>Optional:</strong> Serial Number → SKU → Status → Quantity → Notes</p>
                          <p><strong>Note:</strong> Items with 0 quantity are automatically marked as 'out-of-stock'</p>
                        </div>

                        {/* Progress Section */}
                        {bulkAddProgress.isProcessing && (
                          <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 font-medium">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Adding items...
                              </span>
                              <span className="font-semibold tabular-nums">
                                {bulkAddProgress.current} / {bulkAddProgress.total}
                              </span>
                            </div>
                            <Progress 
                              value={(bulkAddProgress.current / bulkAddProgress.total) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Completion Message */}
                        {bulkAddProgress.current === bulkAddProgress.total && 
                          bulkAddProgress.total > 0 && 
                          !bulkAddProgress.isProcessing && (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Successfully added {bulkAddProgress.total} items!</span>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsBulkDialogOpen(false)}
                          disabled={bulkAddProgress.isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBulkAdd}
                          disabled={bulkAddProgress.isProcessing}
                        >
                          {bulkAddProgress.isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Items'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Missing Numbers */}
                  {missingSerialNumbers.length > 0 && (
                    <EnhancedActionButton
                      label="Missing Numbers"
                      icon={Hash}
                      variant="orange"
                      badge={missingSerialNumbers.length}
                      onClick={() => setIsMissingNumbersDialogOpen(true)}
                      tooltip="View and use missing serial numbers"
                    />
                  )}

                  {/* Serial Number Sequencing Advisor */}
                  <SerialSequencingAdvisor
                    inventory={fullInventory}
                    onComplete={() => { refetch(); retryFullInventory(); }}
                  />
                </div>
              </ActionSection>

              {/* Section 2: Bulk Data Management */}
              <ActionSection
                title="BULK DATA MANAGEMENT"
                icon={Edit}
                color="blue"
              >
                <div className="flex flex-wrap gap-2">
                  {/* Bulk SKU Update */}
                  <BulkSkuUpload inventory={fullInventory} onSkuUpdate={bulkUpdateSkus} />

                  {/* Bulk Title Update */}
                  <BulkTitleUpload inventory={fullInventory} onTitleUpdate={bulkUpdateTitles} />

                  {/* Fetch Titles from Source - with preview */}
                  <FetchTitlesPreviewDialog 
                    inventory={fullInventory}
                    onFetchTitles={runTitleFetch}
                    onTitleUpdate={bulkUpdateTitles}
                  />

                  {/* Bulk Serial Number Cleanup */}
                  <BulkSerialCleanup 
                    inventory={fullInventory}
                    onComplete={() => { refetch(); retryFullInventory(); }}
                  />

                  {/* Sunsky Cost Analyzer */}
                  <SunskyCostAnalyzer 
                    inventory={fullInventory}
                    onComplete={() => { refetch(); retryFullInventory(); }}
                  />
                </div>
              </ActionSection>

              {/* Section 3: Data Export */}
              <ActionSection
                title="DATA EXPORT"
                icon={Download}
                color="orange"
              >
                <div className="flex flex-wrap gap-2">
                  <EnhancedActionButton
                    label="Export CSV"
                    icon={Download}
                    variant="orange"
                    onClick={exportInventory}
                    tooltip="Download inventory as CSV file"
                  />
                  <EnhancedActionButton
                    label="Full Export"
                    icon={Database}
                    variant="orange"
                    onClick={exportFullInventory}
                    tooltip="Export all in-stock items with every available column"
                  />
                  <EnhancedActionButton
                    label="Email Export"
                    icon={Mail}
                    variant="orange"
                    onClick={emailInventory}
                    tooltip="Send inventory report to your email"
                  />
                </div>
              </ActionSection>

              {/* Section 4: System & Refresh */}
              <ActionSection
                title="SYSTEM & REFRESH"
                icon={Settings}
                color="cyan"
              >
                <div className="flex flex-wrap gap-2">
                  {/* Warehouse Settings */}
                  <SimpleWarehouseManager />

                  <EnhancedActionButton
                    label="Refresh Images"
                    icon={Image}
                    variant="cyan"
                    onClick={refreshImages}
                    tooltip="Refresh product images from database"
                  />
                  <EnhancedActionButton
                    label="Refresh All"
                    icon={RefreshCw}
                    variant="cyan"
                    onClick={handleRefresh}
                    tooltip="Refresh all inventory data"
                  />
                </div>
              </ActionSection>
            </div>

            {/* Label Printing Card - Full Width */}
            <LabelPrintingCard
              availableTemplates={availableTemplates}
              selectedTemplate={selectedTemplate}
              onTemplateChange={handleTemplateSelection}
              printDarkness={printSettings.darkness}
              onDarknessChange={(value) => setPrintSettings({...printSettings, darkness: value})}
              selectedItemsCount={selectedItems.size}
              qzConnected={qzConnected}
              onPrint={handleBulkPrint}
              availablePrinters={availablePrinters}
              selectedPrinter={selectedPrinter}
              onPrinterChange={handlePrinterSelection}
            />
          </CardContent>
        </Card>
      )}

      {/* Prominent Search Bar */}
      <Card className="border-2 border-input border-l-4 border-l-primary shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Modern Search Bar */}
            <div className="relative">
              <div className="flex items-stretch gap-0 bg-background rounded-xl border-2 border-green-500 shadow-lg overflow-hidden hover:shadow-xl hover:border-green-600 transition-all duration-300">
                <Select value={searchMethod} onValueChange={(value: 'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes') => setSearchMethod(value)}>
                  <SelectTrigger className="w-52 h-14 border-0 border-r border-border bg-muted/30 hover:bg-muted/50 transition-colors rounded-none focus:ring-0 focus:ring-offset-0">
                    <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                      <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                   <SelectContent className="bg-background border shadow-xl min-w-[208px]">
                     <SelectItem value="all">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Search className="w-4 h-4 flex-shrink-0" />
                         <span>All Fields</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="asin">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Package className="w-4 h-4 flex-shrink-0" />
                         <span>ASIN</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="sku">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Hash className="w-4 h-4 flex-shrink-0" />
                         <span>SKU</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="serial">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Hash className="w-4 h-4 flex-shrink-0" />
                         <span>Serial Number</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="title">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <FileText className="w-4 h-4 flex-shrink-0" />
                         <span>Title</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="notes">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <Edit3 className="w-4 h-4 flex-shrink-0" />
                         <span>Notes</span>
                       </div>
                     </SelectItem>
                   </SelectContent>
                  </Select>
                  
                  <div className="relative flex-1">
                     <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                     <Input placeholder={searchMethod === 'all' ? "Search across all fields..." : searchMethod === 'asin' ? "Search by ASIN..." : searchMethod === 'sku' ? "Search by SKU..." : searchMethod === 'serial' ? "Search by Serial Number..." : searchMethod === 'title' ? "Search by Title..." : "Search by Notes..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-4 h-14 text-base border-0 bg-transparent focus:ring-0 focus:ring-offset-0 rounded-none placeholder:text-muted-foreground/60" />
                     {/* Show spinner only during actual search API calls */}
                     {isFetching && searchTerm && (
                       <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                         <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                       </div>
                     )}
                   </div>
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="px-3 text-muted-foreground hover:text-foreground transition-colors">
                     <X className="w-4 h-4" />
                   </button>}
              </div>
            </div>


            {/* Quick Filters Row */}
            

            {/* Date Filter Section - Only show when out-of-stock filter is active */}
            {quickFilter === 'out-of-stock' && <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Date Filter:
                </Label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">From:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFilterFrom && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterFrom ? format(dateFilterFrom, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFilterFrom} onSelect={setDateFilterFrom} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">To:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFilterTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterTo ? format(dateFilterTo, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFilterTo} onSelect={setDateFilterTo} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => {
                setDateFilterFrom(undefined);
                setDateFilterTo(undefined);
              }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4 mr-2" />
                    Clear Dates
                  </Button>
                </div>
              </div>}

            {/* Quick Controls Bar */}
            <QuickControlsBar
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              viewMode={viewMode}
              setViewMode={setViewMode}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              currentPage={currentPage}
              totalCount={totalCount}
              onAddItem={() => setIsAddDialogOpen(true)}
              performanceFilter={performanceFilter}
              setPerformanceFilter={setPerformanceFilter}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Display */}
      {inventory.length === 0 ? <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm || statusFilter !== 'all' || quickFilter !== 'all' ? "Try adjusting your filters or search terms" : "Get started by adding your first inventory item"}
            </p>
            {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>}
          </CardContent>
        </Card> : viewMode === 'table' ? <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50">
                   <tr className="border-b">
                     <th className="w-12 p-3 text-left border-r">
                         <Checkbox checked={selectedItems.size === processedInventory.length && processedInventory.length > 0} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedItems(new Set(processedInventory.map(item => item.id)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }} />
                      </th>
                      <th className="min-w-80 p-3 text-left font-medium border-r">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'title') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('title');
                      setSortOrder('asc');
                    }
                  }}>
                          Product Info
                          {sortBy === 'title' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                      <th className="w-28 p-3 text-left font-medium border-r">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => {
                    if (sortBy === 'serialNumber') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('serialNumber');
                      setSortOrder('asc');
                    }
                  }}>
                          Serial Number
                          {sortBy === 'serialNumber' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                     <th className="w-16 p-3 text-center font-medium border-r">
                       <button className="flex items-center justify-center gap-2 hover:text-primary transition-colors w-full" onClick={() => {
                    if (sortBy === 'quantity') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('quantity');
                      setSortOrder('desc');
                    }
                  }}>
                         Qty
                         {sortBy === 'quantity' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                       </button>
                     </th>
                      <th className="w-20 p-3 text-center font-medium border-r">
                        <button className="flex items-center justify-center gap-2 hover:text-primary transition-colors w-full" onClick={() => {
                    if (sortBy === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('status');
                      setSortOrder('asc');
                    }
                  }}>
                          Status
                          {sortBy === 'status' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                        </button>
                      </th>
                       <th className="w-20 p-3 text-center font-medium border-r">
                         <button className="flex items-center justify-center gap-2 hover:text-primary transition-colors w-full" onClick={() => {
                    if (sortBy === 'restock') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('restock');
                      setSortOrder('desc');
                    }
                  }}>
                           <RefreshCw className="w-4 h-4" />
                           Restock
                           {sortBy === 'restock' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                         </button>
                       </th>
                       <th className="w-20 p-3 text-center font-medium border-r">
                         <button className="flex items-center justify-center gap-2 hover:text-primary transition-colors w-full" onClick={() => {
                    if (sortBy === 'exportMode') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('exportMode');
                      setSortOrder('asc');
                    }
                  }}>
                           <Download className="w-4 h-4" />
                           Export
                           {sortBy === 'exportMode' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                         </button>
                       </th>
                       <th className="w-32 p-3 text-center font-medium border-r">
                         <button className="flex items-center justify-center gap-2 hover:text-primary transition-colors w-full" onClick={() => {
                    if (sortBy === 'performance') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('performance');
                      setSortOrder('desc');
                    }
                  }}>
                           <Activity className="w-4 h-4" />
                           Performance
                           {sortBy === 'performance' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                         </button>
                       </th>
                       <th className="w-32 p-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {processedInventory.map(item => <tr key={item.id} className={cn(
                     "border-b hover:bg-muted/25 transition-colors",
                     item.isActive === false && "bg-destructive/10 border-l-4 border-l-destructive"
                   )}>
                       <td className="p-3 border-r align-middle">
                         <div className="flex justify-center">
                           <Checkbox 
                             checked={item.isActive === false}
                             className={cn(
                               item.isActive === false && "data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                             )}
                             onCheckedChange={checked => {
                               if (checked) {
                                 // User is trying to check (disable the item)
                                 handleDisableItems([item]);
                               } else {
                                 // User is trying to uncheck (enable the item)
                                 handleEnableItem(item);
                               }
                             }} 
                           />
                         </div>
                       </td>
                          <td className="p-3 border-r align-middle">
                            <div className="flex items-center gap-3">
                              <ProductImage asin={item.asin} />
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "font-medium text-sm max-w-xs break-words",
                                    item.isActive === false && "line-through opacity-60"
                                  )}>
                                    {item.title || 'No title'}
                                  </div>
                                  {item.isActive === false && (
                                    <Badge variant="destructive" className="text-xs font-bold animate-pulse">
                                      DISABLED
                                    </Badge>
                                  )}
                                </div>
                                <div className={cn(
                                  "font-mono text-xs text-muted-foreground",
                                  item.isActive === false && "opacity-60"
                                )}>
                                  ASIN: {item.asin}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">SKU:</span>
                                  <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-sm border-r align-middle">
                            <div className="flex items-center justify-center">
                              <MultiSerialNumberEditor 
                                currentSerialNumber={item.serialNumber}
                                additionalSerialNumbers={item.additionalSerialNumbers}
                                onUpdatePrimary={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)}
                                onDeletePrimary={() => handleDeleteSerial(item.id)}
                                onAddAdditional={(serial) => addAdditionalSerial(item.id, serial)}
                                onRemoveAdditional={(serial) => removeAdditionalSerial(item.id, serial)}
                                hasDuplicates={hasDuplicateSerial(item.serialNumber)}
                                onViewDuplicates={() => handleViewDuplicates(item.serialNumber)}
                                getNextSerial={fullInventoryLoading ? undefined : () => getNextSerialNumber(item.title)}
                                itemTitle={item.title}
                              />
                            </div>
                          </td>
                      <td className="p-3 border-r align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-semibold text-sm ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {item.quantity}
                          </span>
                          {item.quantity <= 5 && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                        </div>
                        </td>
                          <td className="p-3 border-r align-middle">
                           <div className="flex items-center justify-center">
                              <Badge 
                                variant={
                                  item.quantity > 0 
                                    ? 'default' 
                                    : item.status === 'no-stock'
                                      ? 'secondary'
                                      : item.status === 'sold' || item.status === 'out-of-stock'
                                        ? 'destructive' 
                                        : item.status === 'ordered' 
                                          ? 'secondary'
                                          : item.status === 'reserved' 
                                            ? 'outline'
                                            : item.status === 'damaged'
                                              ? 'destructive'
                                              : 'secondary'
                                } 
                                className={`text-xs ${item.quantity === 0 && item.status === 'no-stock' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/15' : ''}`}
                            >
                              {item.quantity > 0 
                                ? 'In Stock' 
                                : item.status === 'no-stock'
                                  ? 'No Stock'
                                  : item.status === 'sold' || item.status === 'out-of-stock'
                                    ? 'Out of Stock (Sold)' 
                                    : item.status === 'ordered'
                                      ? 'Ordered'
                                      : item.status === 'reserved' 
                                        ? 'Reserved' 
                                        : item.status === 'damaged'
                                          ? 'Damaged'
                                          : 'No Stock'}
                            </Badge>
                          </div>
                         </td>
                          <td className="p-3 border-r align-middle">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`restock-${item.id}`}
                                    checked={item.eligible_for_restock}
                                    onCheckedChange={async (checked) => {
                                     try {
                                       const { error } = await supabase
                                         .from('asin_inventory')
                                         .update({ 
                                           eligible_for_restock: !!checked,
                                           manual_restock_override: true
                                         } as any)
                                         .eq('id', item.id as any);
                                      
                                      if (error) throw error;
                                      
                                      await refetch();
                                      toast({
                                        title: checked ? "Enabled for restock" : "Disabled for restock",
                                        description: `${item.asin} (${item.serialNumber})`,
                                      });
                                    } catch (error) {
                                      console.error('Failed to update restock eligibility:', error);
                                      toast({
                                        title: "Update failed",
                                        description: "Could not update restock eligibility",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                   className={`border-2 border-muted-foreground/30 hover:border-primary/60 transition-colors ${
                                     item.eligible_for_restock && item.status !== 'no-stock'
                                       ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' 
                                       : 'data-[state=unchecked]:bg-red-500 data-[state=unchecked]:border-red-500'
                                   }`}
                                 />
                                 <Label htmlFor={`restock-${item.id}`} className="text-sm font-medium">
                                   {item.status === 'no-stock' 
                                     ? 'N/A' 
                                     : item.eligible_for_restock 
                                       ? 'Eligible' 
                                       : 'Not Eligible'
                                   }
                                 </Label>
                               </div>
                              <div className="text-xs text-center text-muted-foreground">
                                {item.status === 'no-stock' 
                                  ? 'No-stock items excluded from restock' 
                                  : item.eligible_for_restock 
                                    ? 'Auto-enabled: sold in last 90 days' 
                                    : 'No sales in last 90 days'
                                }
                              </div>
                            </div>
                          </td>
                          <td className="p-3 border-r align-middle">
                            <div className="flex flex-col items-center gap-2">
                               <div className="flex items-center gap-2">
                                 <Switch
                                   id={`export-mode-${item.id}`}
                                   checked={exportModes[item.id] === 'local'}
                                   disabled={!exportModesLoaded}
                                   onCheckedChange={async (checked) => {
                                    const newMode = checked ? 'local' : 'global';
                                    console.log('🔄 Export mode change:', {
                                      itemId: item.id,
                                      asin: item.asin,
                                      currentMode: exportModes[item.id],
                                      newMode
                                    });
                                    
                                    // Update local state immediately for better UX
                                    setExportModes(prev => ({
                                      ...prev,
                                      [item.id]: newMode
                                    }));
                                    
                                    // Save to database
                                    await saveExportMode(item.id, newMode);
                                  }}
                                   className={`border-2 border-muted-foreground/30 hover:border-primary/60 transition-colors ${
                                     exportModes[item.id] === 'local' 
                                       ? 'data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500' 
                                       : 'data-[state=unchecked]:bg-green-500 data-[state=unchecked]:border-green-500'
                                   }`}
                                 />
                                 <Label htmlFor={`export-mode-${item.id}`} className="text-sm font-medium">
                                   {exportModes[item.id] === 'local' ? 'Local' : 'Global'}
                                 </Label>
                               </div>
                                <div className="text-xs text-center text-muted-foreground">
                                  {exportModes[item.id] === 'local' ? 
                                    'Export mode is Local (qty: 100 always)' : 
                                    'Export mode is Global (uses stock qty)'
                                  }
                               </div>
                            </div>
                          </td>
                          <td className="p-3 border-r align-middle">
                            {(() => {
                              const perfData = performanceMap.get(item.id);
                              return (
                                <PerformanceIndicator
                                  performanceData={perfData ? {
                                    total_units_sold_lifetime: perfData.total_units_sold_lifetime,
                                    total_units_restocked: perfData.total_units_restocked,
                                    po_units_sold: perfData.po_units_sold ?? 0,
                                    b2b_units_sold: perfData.b2b_units_sold ?? 0,
                                    days_in_inventory: perfData.days_in_inventory,
                                    avg_days_to_sellout: perfData.avg_days_to_sellout,
                                    sales_velocity_7d: perfData.sales_velocity_7d,
                                    sales_velocity_30d: perfData.sales_velocity_30d,
                                    sales_velocity_90d: perfData.sales_velocity_90d,
                                    sales_velocity_lifetime: perfData.sales_velocity_lifetime,
                                    performance_score: perfData.performance_score,
                                    performance_category: perfData.performance_category,
                                    stock_days_remaining: perfData.stock_days_remaining,
                                    turnover_ratio: perfData.turnover_ratio,
                                    last_sale_date: perfData.last_sale_date
                                  } : null}
                                />
                              );
                            })()}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item, newQuantity, reason)} />
                              <EnhancedStockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-8 h-8 p-0" 
                                onClick={() => openPrintDialog(item)} 
                                title="Print Label"
                                disabled={!qzConnected || !selectedTemplate}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {processedInventory.map(item => <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-6">
                 <div className="space-y-4">
                   <div className="flex items-start justify-between">
                     <div className="flex items-center gap-2">
                       <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={checked => {
                  const newSelected = new Set(selectedItems);
                  if (checked) {
                    newSelected.add(item.id);
                  } else {
                    newSelected.delete(item.id);
                  }
                  setSelectedItems(newSelected);
                }} />
                        <Badge 
                          variant={
                            item.quantity > 0 
                              ? 'default' 
                              : item.status === 'no-stock'
                                ? 'secondary'
                                : item.status === 'sold' || item.status === 'out-of-stock'
                                  ? 'destructive' 
                                  : item.status === 'ordered' 
                                    ? 'secondary'
                                    : item.status === 'reserved' 
                                      ? 'outline'
                                      : item.status === 'damaged'
                                        ? 'destructive'
                                        : 'secondary'
                          }
                        >
                          {item.quantity > 0 
                            ? 'IN STOCK' 
                            : item.status === 'no-stock'
                              ? 'NO STOCK'
                              : item.status === 'sold' || item.status === 'out-of-stock'
                                ? 'OUT OF STOCK (SOLD)' 
                                : item.status === 'ordered'
                                  ? 'ORDERED'
                                  : item.status === 'reserved' 
                                    ? 'RESERVED' 
                                    : item.status === 'damaged'
                                      ? 'DAMAGED'
                                      : 'NO STOCK'}
                        </Badge>
                     </div>
                     <ProductImage asin={item.asin} />
                   </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ASIN</Label>
                      <p className="font-mono text-sm">{item.asin}</p>
                    </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Serial Number</Label>
                        <MultiSerialNumberEditor 
                          currentSerialNumber={item.serialNumber}
                          additionalSerialNumbers={item.additionalSerialNumbers}
                          onUpdatePrimary={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)}
                          onDeletePrimary={() => handleDeleteSerial(item.id)}
                          onAddAdditional={(serial) => addAdditionalSerial(item.id, serial)}
                          onRemoveAdditional={(serial) => removeAdditionalSerial(item.id, serial)}
                          hasDuplicates={hasDuplicateSerial(item.serialNumber)}
                          onViewDuplicates={() => handleViewDuplicates(item.serialNumber)}
                          getNextSerial={fullInventoryLoading ? undefined : () => getNextSerialNumber(item.title)}
                          itemTitle={item.title}
                        />
                      </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">SKU</Label>
                       <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                     </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity <= 5 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </div>
                   </div>
                    <div className="flex items-center gap-2">
                      <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item, newQuantity, reason)} />
                      <EnhancedStockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                    </div>
                </div>
              </CardContent>
            </Card>)}
        </div>}
        
        {/* Pagination */}
        {totalCount > itemsPerPage && <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                
                {Array.from({
            length: Math.min(5, totalPages)
          }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
            }
            return <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>;
          })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>}
                
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <Select value={itemsPerPage.toString()} onValueChange={value => {
        setItemsPerPage(Number(value));
        setCurrentPage(1);
      }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>}
        
        {/* Image Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Product Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Product preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="text-center text-muted-foreground">Failed to load image</div>';
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Missing Serial Numbers Dialog */}
        <Dialog open={isMissingNumbersDialogOpen} onOpenChange={setIsMissingNumbersDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Missing Serial Numbers ({missingSerialNumbers.length})
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                These serial numbers are missing from your sequence. You can reuse them to maintain continuity:
              </div>
              
              <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                <div className="grid grid-cols-5 gap-2">
                  {missingSerialNumbers.map((num) => (
                    <Button
                      key={num}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs h-8"
                      onClick={() => handleUseSerialNumber(num.toString().padStart(5, '0'))}
                    >
                      {num.toString().padStart(5, '0')}
                    </Button>
                  ))}
                </div>
                
                {missingSerialNumbers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Hash className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    No missing serial numbers found. Your sequence is continuous!
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Click any number to use it for a new item. The next available number will be: <span className="font-mono font-semibold">{nextAvailableSerial || 'Loading...'}</span>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMissingNumbersDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Serial Numbers Dialog */}
        <Dialog open={isDuplicatesDialogOpen} onOpenChange={setIsDuplicatesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Duplicate Serial Numbers ({duplicateSerialItems.length} items)
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                The following items share the same serial number. Each item should have a unique serial number.
              </div>
              
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium">Serial</th>
                      <th className="text-left p-3 text-xs font-medium">ASIN</th>
                      <th className="text-left p-3 text-xs font-medium">SKU</th>
                      <th className="text-left p-3 text-xs font-medium">Title</th>
                      <th className="text-left p-3 text-xs font-medium">Status</th>
                      <th className="text-left p-3 text-xs font-medium">Qty</th>
                      <th className="text-right p-3 text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateSerialItems.map((item, idx) => (
                      <tr key={item.id} className={cn("border-b hover:bg-muted/50", idx % 2 === 0 && "bg-muted/20")}>
                        <td className="p-3 font-mono text-sm font-semibold text-destructive">{item.serialNumber}</td>
                        <td className="p-3 font-mono text-sm">{item.asin}</td>
                        <td className="p-3 text-sm">{item.sku || '-'}</td>
                        <td className="p-3 text-sm max-w-xs truncate">{item.title || '-'}</td>
                        <td className="p-3">
                          <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{item.quantity}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const nextSerial = await getNextSerialNumber(item.title);
                                  if (nextSerial) {
                                    await updateSerialNumber(item.id, nextSerial);
                                    // Refresh duplicate list
                                    const updatedDuplicates = duplicateSerialItems.filter(i => i.id !== item.id);
                                    setDuplicateSerialItems(updatedDuplicates);
                                    if (updatedDuplicates.length === 0) {
                                      setIsDuplicatesDialogOpen(false);
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error auto-assigning serial:', error);
                                  // Error toast already shown by updateSerialNumber
                                }
                              }}
                              title="Auto-assign next available serial"
                            >
                              <Hash className="w-3 h-3 mr-1" />
                              Auto
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSerial(item.id)}
                              className="text-destructive hover:text-destructive"
                              title="Delete serial number"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {duplicateSerialItems.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Check className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    No duplicate serial numbers found. All serials are unique!
                  </div>
                )}
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">How to fix duplicates:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>Click "Auto" to assign the next available serial number automatically</li>
                    <li>Click the trash icon to clear the serial number</li>
                    <li>Or manually edit the serial number in the inventory table</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDuplicatesDialogOpen(false);
                  setDuplicateSerialItems([]);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Quantity Dialog */}
        <PrintQuantityDialog
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          itemName={itemToPrint?.asin || ''}
          serialNumbers={itemToPrint ? [
            itemToPrint.serialNumber,
            ...(itemToPrint.additionalSerialNumbers || [])
          ].filter(Boolean) : []}
          defaultQuantity={1}
          onConfirm={(quantity, selectedSerial) => {
            if (itemToPrint) {
              handlePrintItem(itemToPrint, quantity, selectedSerial);
            }
          }}
        />

        {/* Add New Item Dialog - rendered outside conditional section */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New ASIN Item
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="asin">ASIN <span className="text-destructive">*</span></Label>
                <Input id="asin" value={newItem.asin} onChange={e => setNewItem({
                  ...newItem,
                  asin: e.target.value
                })} placeholder="Enter ASIN..." />
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number (Optional)</Label>
                <Input 
                  id="serialNumber" 
                  value={newItem.serialNumber} 
                  onChange={e => setNewItem({
                    ...newItem,
                    serialNumber: e.target.value
                  })} 
                  placeholder="Enter Serial Number (optional)..." 
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                <Input id="sku" value={newItem.sku} onChange={e => setNewItem({
                  ...newItem,
                  sku: e.target.value
                })} placeholder="Enter SKU..." />
              </div>
              <div>
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" value={newItem.title} onChange={e => setNewItem({
                  ...newItem,
                  title: e.target.value
                })} placeholder="Enter title..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inventory Matching Tool */}
        <InventoryMatchingTool
          open={isMatchingToolOpen}
          onOpenChange={setIsMatchingToolOpen}
        />
    </div>;
}
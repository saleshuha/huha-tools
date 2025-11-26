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
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useAsinInventoryPaginated } from '@/hooks/useAsinInventoryPaginated';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog, EnhancedStockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { SerialNumberEditor } from './SerialNumberEditor';
import { TitleEditor } from './TitleEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
import { BulkTitleUpload } from './BulkTitleUpload';
import { SimpleWarehouseManager } from './SimpleWarehouseManager';
import { DisableItemsDialog } from './DisableItemsDialog';
import { EnableItemDialog } from './EnableItemDialog';

import { useWarehouseManager } from '@/hooks/useWarehouseManager';
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
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchMethod, setSearchMethod] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber'>('dateAdded');
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
  const { inventory: fullInventory, loading: fullInventoryLoading } = fullInventoryHook;
  
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
    refetch
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
  const getNextSerialNumber = async () => {
    // Don't suggest a number if full inventory is still loading
    if (fullInventoryLoading) {
      toast({
        title: "Please wait",
        description: "Inventory is still loading. Please try again in a moment.",
        variant: "default",
      });
      throw new Error('Inventory still loading');
    }
    
    // Query database directly for fresh data
    const nextSerial = await fullInventoryHook.getNextAvailableSerial();
    
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
  
  // Duplicate serial numbers dialog
  const [isDuplicatesDialogOpen, setIsDuplicatesDialogOpen] = useState(false);
  const [duplicateSerialItems, setDuplicateSerialItems] = useState<AsinInventoryItem[]>([]);
  
  // Disable items feature
  const [itemsToDisable, setItemsToDisable] = useState<AsinInventoryItem[]>([]);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [itemToEnable, setItemToEnable] = useState<AsinInventoryItem | null>(null);
  const [isEnableDialogOpen, setIsEnableDialogOpen] = useState(false);
  
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
    quantity: 1,
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
    if (!newItem.asin.trim() || !newItem.serialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN and Serial Number are required",
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
    // Reset form with next available serial
    const nextSerial = await getNextSerialNumber();
    setNewItem({
      asin: '',
      serialNumber: nextSerial,
      sku: '',
      title: '',
      quantity: 1,
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

      // Validate for duplicates
      const validationErrors = [];
      const seenSkus = new Set();
      const seenSerials = new Set();
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check for duplicate SKU (if provided)
        if (item.sku && item.sku.trim()) {
          const duplicateSku = inventory.find(existing => existing.sku && existing.sku.toLowerCase() === item.sku.toLowerCase());
          if (duplicateSku) {
            validationErrors.push(`Row ${i + 1}: SKU "${item.sku}" already exists in inventory`);
            continue;
          }

          // Check for duplicate SKU within bulk data
          if (seenSkus.has(item.sku.toLowerCase())) {
            validationErrors.push(`Row ${i + 1}: SKU "${item.sku}" appears multiple times in bulk data`);
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
            validationErrors.push(
              `Row ${i + 1}: Serial "${item.serialNumber}" already used by ASIN "${duplicateSerial.asin}"`
            );
            continue;
          }

          // Check for duplicate serial within bulk data
          if (seenSerials.has(item.serialNumber)) {
            validationErrors.push(
              `Row ${i + 1}: Serial "${item.serialNumber}" appears multiple times in bulk data`
            );
            continue;
          }
          seenSerials.add(item.serialNumber);
        }
      }
      
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Errors",
          description: `Found ${validationErrors.length} duplicate(s): ${validationErrors.slice(0, 3).join(', ')}${validationErrors.length > 3 ? '...' : ''}`,
          variant: "destructive"
        });
        return;
      }

      // Auto-assign serial numbers for items without serials using ATOMIC counter
      const itemsWithAutoSerial = [];
      for (const item of items) {
        if (!item.serialNumber || item.serialNumber.trim() === '') {
          try {
            const nextSerial = await getNextSerialNumber();
            if (!nextSerial) {
              toast({
                title: "Error",
                description: "Failed to generate serial number",
                variant: "destructive",
              });
              return;
            }
            itemsWithAutoSerial.push({
              ...item,
              serialNumber: nextSerial
            });
          } catch (error: any) {
            toast({
              title: "Serial Generation Error",
              description: error.message || "Failed to generate serial number for item",
              variant: "destructive",
            });
            return;
          }
        } else {
          itemsWithAutoSerial.push(item);
        }
      }

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
        // Local: use default quantity (100 if has stock, 0 if no stock)
        const exportQuantity = exportMode === 'local' 
          ? (item.quantity === 0 ? 0 : 100)
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
  const handleFetchTitlesFromSunsky = async () => {
    // Get items with SKU Numbers but missing titles
    const itemsNeedingTitles = inventory.filter(item => item.sku && item.sku.trim() && !item.title);
    if (itemsNeedingTitles.length === 0) {
      toast({
        title: "No Items to Update",
        description: "All items either have titles or are missing SKU numbers"
      });
      return;
    }

    // Start background task for title fetching
    await runTitleFetch(itemsNeedingTitles, async titleUpdates => {
      // The background task will handle the API calls
      // When updates are ready, save them to the database
      if (titleUpdates.length > 0) {
        await bulkUpdateTitles(titleUpdates);
      }
    });
  };

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

  // Create dataset from inventory items
  const createDatasetFromItems = (items: AsinInventoryItem[]): LabelDataset => {
    return {
      id: 'inventory-data',
      name: 'Inventory Data',
      description: 'ASIN Inventory Items',
      headers: ['ASIN', 'SKU', 'Title', 'Serial', 'Quantity', 'Status'],
      data: items.map(item => [
        item.asin,
        item.sku || 'No SKU',
        item.title || `Product ${item.asin}`,
        item.serialNumber || '',
        item.quantity.toString(),
        item.status
      ]),
      rowCount: items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Print single item
  const handlePrintItem = async (item: AsinInventoryItem) => {
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

      // Create dataset with single item
      const dataset = createDatasetFromItems([item]);

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
        elements: labelDoc.elements.map(el => ({ type: el.type, dataColumn: el.dataColumn, text: el.text }))
      });

      // Generate ZPL using PrintService
      const zplCode = PrintService.generateZPL(labelDoc, dataset, getPrintSettings());

      // Print using QZ Tray
      await qzConnectionManager.print(zplCode, selectedPrinter);

      toast({
        title: "Label Printed",
        description: `Printed label for ${item.asin}`,
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
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading your inventory...</p>
        </div>
      </div>;
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
      {/* Header with Stats */}
      <div className="space-y-6">
        <InventoryMetrics 
          showOnlyAsin={true} 
          activeStatusFilter={statusFilter}
        />
        
      </div>

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

            {/* Features Toggle */}
            <Collapsible open={isFeaturesOpen} onOpenChange={setIsFeaturesOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 bg-gradient-to-r from-background to-muted/50 border border-border/60 hover:border-primary/60 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md transition-all duration-300 rounded-lg"
                >
                  {isFeaturesOpen ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Features
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Show Features
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-6">
                {/* Display Filters Toggle Area */}
                <div className="flex items-center gap-4 mb-6 p-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-sm font-medium">🔍 Display Filters:</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-disabled"
                      checked={showDisabledItems}
                      onCheckedChange={(checked) => {
                        console.log('🔄 Toggle Show Disabled Items:', checked);
                        setShowDisabledItems(checked);
                      }}
                    />
                    <Label htmlFor="show-disabled" className="text-sm cursor-pointer">
                      Show Only Disabled Items {showDisabledItems && `(${totalCount})`}
                    </Label>
                  </div>
                </div>

                {/* Action Buttons - Organized by Functionality */}
                <div className="space-y-4">
                  {/* Section 1: Data Entry & Import */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                      📥 DATA ENTRY & IMPORT
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {/* Add New Item */}
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Item
                          </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          Add New ASIN Item
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="asin">ASIN</Label>
                          <Input id="asin" value={newItem.asin} onChange={e => setNewItem({
                          ...newItem,
                          asin: e.target.value
                        })} placeholder="Enter ASIN..." />
                        </div>
                         <div>
                           <Label htmlFor="serialNumber">Serial Number</Label>
                           <div className="flex gap-2">
                             <Input 
                               id="serialNumber" 
                               value={newItem.serialNumber} 
                               onChange={e => setNewItem({
                                 ...newItem,
                                 serialNumber: e.target.value
                               })} 
                               placeholder="Enter Serial Number..." 
                               className="flex-1"
                             />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const nextSerial = await getNextSerialNumber();
                                  setNewItem(prev => ({ ...prev, serialNumber: nextSerial }));
                                }}
                                title="Use next available serial number"
                              >
                                <Hash className="w-4 h-4" />
                              </Button>
                           </div>
                         </div>
                         <div>
                           <Label htmlFor="sku">SKU (Optional)</Label>
                           <Input id="sku" value={newItem.sku} onChange={e => setNewItem({
                          ...newItem,
                          sku: e.target.value
                        })} placeholder="Enter SKU (optional)" />
                         </div>
                         <div>
                           <Label htmlFor="title">Title (Optional)</Label>
                           <Input id="title" value={newItem.title} onChange={e => setNewItem({
                          ...newItem,
                          title: e.target.value
                        })} placeholder="Enter title (optional)" />
                         </div>
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" type="number" min="0" value={newItem.quantity} onChange={e => {
                              const value = parseInt(e.target.value);
                              setNewItem({
                                ...newItem,
                                quantity: value >= 0 ? value : 0
                              });
                            }} />
                          </div>
                         <div>
                           <Label htmlFor="notes">Notes (Optional)</Label>
                           <Textarea id="notes" value={newItem.notes} onChange={e => setNewItem({
                          ...newItem,
                          notes: e.target.value
                        })} placeholder="Add any notes..." rows={2} />
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

                  {/* Bulk Add Items */}
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Add Items
                      </Button>
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
                            <p><strong>Status:</strong> Auto-assigned based on quantity (0 = out-of-stock, &gt;0 = in-stock)</p>
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
                    <Button 
                      size="sm"
                      variant="outline" 
                      onClick={() => setIsMissingNumbersDialogOpen(true)}
                    >
                      <Hash className="w-4 h-4 mr-2" />
                      Missing Numbers ({missingSerialNumbers.length})
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Section 2: Bulk Data Management */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                  ✏️ BULK DATA MANAGEMENT
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* Bulk SKU Update */}
                  <BulkSkuUpload inventory={inventory} onSkuUpdate={bulkUpdateSkus} />

                  {/* Bulk Title Update */}
                  <BulkTitleUpload inventory={inventory} onTitleUpdate={bulkUpdateTitles} />

                  {/* Fetch Titles from Source */}
                  <Button size="sm" variant="outline" onClick={handleFetchTitlesFromSunsky}>
                    <Database className="w-4 h-4 mr-2" />
                    Fetch Titles from Source
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Section 3: Label Printing */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                  🖨️ LABEL PRINTING
                </h3>
                <Card className="p-4 bg-muted/50 border-border">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                      <Label className="text-sm font-semibold">Label Template</Label>
                      <Select value={selectedTemplate || ''} onValueChange={handleTemplateSelection}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {availableTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Darkness Control */}
                    <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                      <Label className="text-sm font-semibold">Print Darkness (0-30)</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="space-y-2">
                          <Slider
                            value={[printSettings.darkness]}
                            onValueChange={(value) => {
                              console.log('Darkness changed to:', value[0]);
                              setPrintSettings({...printSettings, darkness: value[0]});
                            }}
                            max={30}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Light (0)</span>
                            <Badge variant="secondary" className="font-mono font-bold">
                              {printSettings.darkness}
                            </Badge>
                            <span className="text-muted-foreground">Dark (30)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold opacity-0">Action</Label>
                      <Button 
                        size="default" 
                        onClick={handleBulkPrint}
                        disabled={!qzConnected || !selectedTemplate || selectedItems.size === 0}
                        className="h-[42px]"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Selected ({selectedItems.size})
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <Separator className="my-4" />

              {/* Section 4: Data Export */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                  📤 DATA EXPORT
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* Export */}
                  <Button size="sm" variant="outline" onClick={exportInventory}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>

                  {/* Email Export */}
                  <Button size="sm" variant="outline" onClick={emailInventory}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email Export
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Section 5: System & Refresh */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                  ⚙️ SYSTEM & REFRESH
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* Warehouse Settings */}
                  <SimpleWarehouseManager />

                  {/* Refresh Images */}
                  <Button size="sm" variant="outline" onClick={refreshImages}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Images
                  </Button>

                  {/* Refresh All */}
                  <Button size="sm" variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh All
                  </Button>
                </div>
              </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

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

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-background border">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="no-stock">No Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-background">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8">
                    <List className="w-4 h-4 mr-1" />
                    Table
                  </Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8">
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                </div>
              </div>

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={value => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20 bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Info */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Results:</Label>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </div>
              </div>
            </div>
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
                        <Checkbox checked={selectedItems.size === inventory.length && inventory.length > 0} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedItems(new Set(inventory.map(item => item.id)));
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
                         <div className="flex items-center justify-center gap-2">
                           <RefreshCw className="w-4 h-4" />
                           Restock
                         </div>
                       </th>
                       <th className="w-20 p-3 text-center font-medium border-r">
                         <div className="flex items-center justify-center gap-2">
                           <Download className="w-4 h-4" />
                           Export Mode
                         </div>
                       </th>
                       <th className="w-32 p-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {inventory.map(item => <tr key={item.id} className={cn(
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
                              <SerialNumberEditor 
                                currentSerialNumber={item.serialNumber} 
                                onUpdate={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)}
                                onDelete={() => handleDeleteSerial(item.id)}
                                onViewDuplicates={() => handleViewDuplicates(item.serialNumber)}
                                hasDuplicates={hasDuplicateSerial(item.serialNumber)}
                                getNextSerial={fullInventoryLoading ? undefined : getNextSerialNumber}
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
                                   'Export mode is Local (qty: 100 if stock > 0, else 0)' : 
                                   'Export mode is Global (uses stock qty)'
                                 }
                              </div>
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => handleQuantityUpdate(item, newQuantity, reason)} />
                              <EnhancedStockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-8 h-8 p-0" 
                                onClick={() => handlePrintItem(item)} 
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
          {inventory.map(item => <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
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
                        <SerialNumberEditor 
                          currentSerialNumber={item.serialNumber} 
                          onUpdate={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)}
                          onDelete={() => handleDeleteSerial(item.id)}
                          onViewDuplicates={() => handleViewDuplicates(item.serialNumber)}
                          hasDuplicates={hasDuplicateSerial(item.serialNumber)}
                          getNextSerial={fullInventoryLoading ? undefined : getNextSerialNumber}
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
                                  const nextSerial = await getNextSerialNumber();
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
    </div>;
}
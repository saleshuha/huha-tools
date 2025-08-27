import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Search, Plus, Download, AlertCircle, CheckCircle2, Package, Globe, Calendar, RefreshCw, Filter, Grid, List, Settings, Eye, Save, RotateCcw, Play, Pause, X, PauseCircle, PlayCircle, XCircle, Trash2, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useExportHistory } from "@/hooks/useExportHistory";
import { DateRange } from "react-day-picker";
import { SunskyCredentialsManager } from "./SunskyCredentialsManager";
import { useSKUManager } from "@/hooks/useSKUManager";
import { useImportJobs } from "@/hooks/useImportJobs";
import type { ImportJob } from "@/hooks/useImportJobs";
import { usePOOrders } from "@/hooks/usePOOrders";
import { useParallelPOProcessor } from "./ParallelPOProcessor";
import { ReAuthDialog } from "@/components/amazon/ReAuthDialog";
import { generateExcelFile } from "@/utils/excelExport";
import { useBackgroundTasks } from "@/contexts/BackgroundTasksContext";
import { useConcurrentSunskyExport } from "@/hooks/useConcurrentSunskyExport";

interface SunskyProduct {
  // Core product fields
  id: number;
  itemNo: string;
  groupItemNo?: string;
  name: string;
  description?: string;
  brandName?: string;
  categoryId?: number;
  
  // Pricing and availability
  price: string;
  priceList?: Array<{ key: number; value: string }>;
  convertedPrice?: number;
  convertedCurrency?: string;
  stock: number;
  moq?: number;
  clearance?: boolean;
  orgPrice?: string;
  priceExpired?: string;
  
  // Physical properties
  unitWeight?: string;
  packQty?: number;
  unitLength?: number;
  unitWidth?: number;
  unitHeight?: number;
  packWeight?: string;
  packLength?: number;
  packWidth?: number;
  packHeight?: number;
  
  // Logistics and timing
  warehouse: string;
  leadTime: string;
  leadTimeLevel?: number;
  
  // Product details
  barcode?: string;
  status?: number;
  picCount?: number;
  baseImgCount?: number;
  videoUrl?: string;
  modelLabel?: string;
  modelList?: Array<{ key: string; value: string }>;
  optionList?: {
    display: string;
    items: Array<{ itemNo: string; keywords: string }>;
  };
  
  // Dates
  gmtListed?: string;
  gmtModified?: string;
  
  // Capabilities
  oem?: boolean;
  withLogo?: boolean;
  containsBattery?: boolean;
  giftItemNo?: string;
  
  // Compatibility and specs
  brands?: Array<{
    brand: { name: string };
    models: Array<{ name: string }>;
  }>;
  params?: Array<{
    name: string;
    values: string[];
  }>;
  paramsTable?: string;
  
  // Legacy fields for compatibility
  dimensions?: string;
  images?: string[];
  specifications?: Record<string, any>;
}

interface SunskyCategory {
  id: number;
  name: string;
  parentId?: number;
  level?: number;
  hasChildren?: boolean;
  children?: SunskyCategory[];
  status?: number;
}

interface SunskyBrand {
  id: number;
  name: string;
}

interface SearchFilters {
  keyword?: string;
  categoryId?: number;
  brandId?: number;
  priceMin?: number;
  priceMax?: number;
  stockMin?: number;
  leadTimeLevel?: number;
  clearance?: boolean;
  oem?: boolean;
  withLogo?: boolean;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Status mapping functions
const getCategoryStatusText = (status?: number): string => {
  switch (status) {
    case 1: return 'Valid';
    case 2: return 'Deleted';
    default: return status ? `Unknown (${status})` : '';
  }
};

const getProductStatusText = (status?: number): string => {
  switch (status) {
    case 1: return 'Valid';
    case 2: return 'Deleted';
    case 3: return 'Out of stock';
    case 4: return 'Hidden (too old)';
    default: return status ? `Unknown (${status})` : '';
  }
};

const getStatusBadgeVariant = (status?: number, isCategory = false): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) return 'outline';
  
  if (isCategory) {
    switch (status) {
      case 1: return 'default'; // Valid
      case 2: return 'destructive'; // Deleted
      default: return 'outline';
    }
  } else {
    switch (status) {
      case 1: return 'default'; // Valid
      case 2: return 'destructive'; // Deleted
      case 3: return 'secondary'; // Out of stock
      case 4: return 'outline'; // Hidden
      default: return 'outline';
    }
  }
};

export const SunskySKUImporter: React.FC = () => {
  const { toast } = useToast();
  const { addTask, updateTask, cancelTask, isTaskCancelled, runConcurrentExport } = useBackgroundTasks();
  const { profile } = useUserProfile();
  const { sunskySKUs, isLoading: skusLoading, fetchSKUs, totalCount, refreshSKUs, addSKUs } = useSKUManager();
  const { jobs, isLoading: jobsLoading, createImportJob, fetchJobs } = useImportJobs();
  const { getPOModelNumbers } = usePOOrders();
  const { addExportEntry, updateExportEntry, exportHistory: savedExportHistory } = useExportHistory();
  const { 
    startConcurrentExport,
    isExporting: isConcurrentExporting,
    exportProgress: concurrentExportProgress,
    overallProgress: concurrentOverallProgress,
    exportStatus: concurrentExportStatus,
    exportResults: concurrentExportResults,
    cancelExport: cancelConcurrentExport
  } = useConcurrentSunskyExport();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [leadTimeLevel, setLeadTimeLevel] = useState<string>('any');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [stockMin, setStockMin] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categories, setCategories] = useState<SunskyCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SunskyCategory[]>([]);
  const [brands, setBrands] = useState<SunskyBrand[]>([]);
  const [products, setProducts] = useState<SunskyProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isSearchingPO, setIsSearchingPO] = useState(false);
  const [poSearchProgress, setPOSearchProgress] = useState(0);
  const [poSearchStats, setPOSearchStats] = useState({
    totalItems: 0,
    totalPOItems: 0,
    totalUniqueItems: 0,
    alreadyImportedCount: 0,
    searchedItems: 0,
    skippedItems: 0,
    matchedItems: 0,
    errorItems: 0,
    currentItem: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedProduct, setSelectedProduct] = useState<SunskyProduct | null>(null);
  const [categoryFetchMode, setCategoryFetchMode] = useState<'top' | 'all' | 'modified'>('top');
  const [modifiedSinceDate, setModifiedSinceDate] = useState<string>('');
  const [fetchingCategories, setFetchingCategories] = useState(false);
  const [fetchingSubCategories, setFetchingSubCategories] = useState(false);
  const [fetchingBrands, setFetchingBrands] = useState(false);
  
  // Header management  
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([
    'itemNo', 'name', 'brandName', 'stock', 'leadTime', 'warehouse', 'price', 'convertedPrice'
  ]);
  const [showHeaderSelector, setShowHeaderSelector] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  
  // Job details dialog
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  const [showClearAuthDialog, setShowClearAuthDialog] = useState(false);
  
  // Pagination for import jobs
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsPerPage] = useState(5);
  
  // API selection
  const [availableAPIs, setAvailableAPIs] = useState<Array<{id: string, name: string, is_active: boolean}>>([]);
  const [selectedAPI, setSelectedAPI] = useState<string>('');
  const [selectedSearchAPI, setSelectedSearchAPI] = useState<string>('');
  const [selectedJobAPI, setSelectedJobAPI] = useState<string>('');
  
  // Export by status feature
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportTotalItems, setExportTotalItems] = useState(0);
  const [selectedExportStatus, setSelectedExportStatus] = useState<number>(1);
  const [currentExportTaskId, setCurrentExportTaskId] = useState<string | null>(null);
  const [exportResults, setExportResults] = useState<{
    products: SunskyProduct[];
    categories: Map<number, { name: string; products: SunskyProduct[] }>;
    totalFound: number;
  } | null>(null);

  // Export history
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    status: 'completed' | 'cancelled' | 'failed';
    totalItems: number;
    categories: string;
    apiKeys: number;
    filename?: string;
    error?: string;
  }>>([]);

  // Enhanced export features
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [exportSubCategory, setExportSubCategory] = useState<string>('all');
  const [exportPageSize, setExportPageSize] = useState<number>(100);
  const [searchPageSize, setSearchPageSize] = useState<number>(50);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([
    'itemNo', 'name', 'brandName', 'price', 'stock', 'status', 'leadTime', 'warehouse', 'moq'
  ]);
  const [availableExportColumns, setAvailableExportColumns] = useState<string[]>([
    'itemNo', 'name', 'brandName', 'price', 'stock', 'status', 'leadTime', 'warehouse', 'moq',
    'categoryId', 'description', 'unitWeight', 'packQty', 'unitLength', 'unitWidth', 'unitHeight',
    'packWeight', 'packLength', 'packWidth', 'packHeight', 'barcode', 'orgPrice', 'priceExpired',
    'picCount', 'baseImgCount', 'videoUrl', 'gmtListed', 'gmtModified', 'oem', 'withLogo', 'containsBattery'
  ]);
  const [selectedExportAPIs, setSelectedExportAPIs] = useState<string[]>([]);
  const [runInBackground, setRunInBackground] = useState<boolean>(false);
  
  // SKU table column management - match search results headers
  const [skuTableHeaders, setSkuTableHeaders] = useState<string[]>([
    'sku_code', 'title', 'cost', 'currency', 'weight', 'country', 'created_at'
  ]);
  const [availableSkuHeaders] = useState<string[]>([
    'sku_code', 'title', 'description', 'cost', 'currency', 'weight', 'country', 'created_at',
    'brand', 'category', 'stock', 'moq', 'lead_time', 'price', 'warehouse', 'barcode',
    'unit_weight', 'pack_qty', 'dimensions', 'pack_weight', 'pack_dimensions', 'clearance',
    'oem', 'with_logo', 'contains_battery', 'status', 'video_url', 'gmt_listed', 'gmt_modified'
  ]);

  // SKU Pagination
  const [skuCurrentPage, setSkuCurrentPage] = useState(1);
  const [skuItemsPerPage, setSkuItemsPerPage] = useState(25);
  const skuTotalPages = Math.ceil(totalCount / skuItemsPerPage);
  const skuStartIndex = (skuCurrentPage - 1) * skuItemsPerPage;
  const skuEndIndex = skuStartIndex + skuItemsPerPage;
  const paginatedSKUs = sunskySKUs.slice(skuStartIndex, skuEndIndex);

  // Handle concurrent export results when they become available
  useEffect(() => {
    if (concurrentExportResults && !isExporting && isConcurrentExporting === false) {
      const handleConcurrentExportComplete = async () => {
        try {
          const categoryName = exportCategory === 'all' ? 'All Categories' : 
            categories.find(c => c.id.toString() === exportCategory)?.name || 'Unknown';
          
          const apiKeysWithNames = availableAPIs.filter(api => api.is_active).map(api => ({ 
            id: api.id, 
            name: api.name 
          }));

          // Save to export history
          await addExportEntry({
            export_type: 'status_export',
            filters: {
              status: selectedExportStatus,
              category: exportCategory,
              subCategory: exportSubCategory,
              categoryName,
              columns: selectedExportColumns,
              pageSize: exportPageSize,
              maxPages: Number.MAX_SAFE_INTEGER,
              apiKeys: apiKeysWithNames
            },
            total_items: concurrentExportResults.totalFound,
            status: 'completed',
            metadata: {
              categories: categoryName,
              apiKeys: apiKeysWithNames.length,
              concurrent: true
            }
          });

          // Generate Excel file for download
          const filePath = await generateExcelFile({
            data: concurrentExportResults.products,
            categoriesMap: concurrentExportResults.categoriesMap,
            config: {
              status: selectedExportStatus,
              categoryName,
              columns: selectedExportColumns,
              apiKeys: apiKeysWithNames.length,
              pageSize: exportPageSize
            },
            saveToStorage: false // For foreground, trigger download instead
          });

          // Set export results for display
          setExportResults({
            products: concurrentExportResults.products,
            categories: concurrentExportResults.categoriesMap,
            totalFound: concurrentExportResults.totalFound
          });

          toast({
            title: "Export Complete",
            description: `Successfully exported ${concurrentExportResults.totalFound} products using ${apiKeysWithNames.length} API keys concurrently.`
          });
          
        } catch (error) {
          console.error('Error handling concurrent export results:', error);
          toast({
            title: "Export Processing Error",
            description: "Export completed but failed to process results",
            variant: "destructive"
          });
        }
      };

      handleConcurrentExportComplete();
    }
  }, [concurrentExportResults, isExporting, isConcurrentExporting, exportCategory, categories, availableAPIs, selectedExportStatus, exportSubCategory, selectedExportColumns, exportPageSize, addExportEntry, toast]);

  // Save column preferences
  const saveColumnPreferences = async () => {
    try {
      const { error } = await supabase
        .from('noon_file_headers')
        .upsert({
          user_id: profile?.id,
          file_type: 'sunsky_sku_columns',
          headers: skuTableHeaders,
          store_name: 'sunsky_importer'
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Column preferences saved"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    }
  };

  // Load column preferences
  const loadColumnPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('noon_file_headers')
        .select('headers')
        .eq('user_id', profile?.id)
        .eq('file_type', 'sunsky_sku_columns')
        .eq('store_name', 'sunsky_importer')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.headers) {
        setSkuTableHeaders(data.headers);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Task control functions
  const pauseJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('sunsky_import_jobs')
        .update({ paused: true })
        .eq('id', jobId)
        .eq('user_id', profile?.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Import job paused"
      });
      await fetchJobs();
    } catch (error) {
      console.error('Error pausing job:', error);
      toast({
        title: "Error",
        description: "Failed to pause job",
        variant: "destructive"
      });
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('sunsky_import_jobs')
        .update({ paused: false })
        .eq('id', jobId)
        .eq('user_id', profile?.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Import job resumed"
      });
      await fetchJobs();
    } catch (error) {
      console.error('Error resuming job:', error);
      toast({
        title: "Error",
        description: "Failed to resume job",
        variant: "destructive"
      });
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('sunsky_import_jobs')
        .update({ 
          cancelled: true,
          status: 'cancelled'
        })
        .eq('id', jobId)
        .eq('user_id', profile?.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Import job cancelled"
      });
      await fetchJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive"
      });
    }
  };

  // Clear all SKUs function
  const clearAllSKUs = async () => {
    try {
      const { error } = await supabase
        .from('sunsky_skus')
        .delete()
        .eq('user_id', profile?.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "All imported SKUs have been cleared"
      });
      
      // Refresh the SKU list
      fetchSKUs(1, false);
    } catch (error) {
      console.error('Error clearing SKUs:', error);
      toast({
        title: "Error",
        description: "Failed to clear SKUs",
        variant: "destructive"
      });
    }
  };

  // Export by status functionality with concurrent API support
  const exportProductsByStatus = async (runInBg: boolean = false) => {
    if (!selectedExportStatus) {
      toast({
        title: "Error",
        description: "Please select a product status to export",
        variant: "destructive"
      });
      return;
    }

    // Determine which APIs to use
    const apiIds = selectedExportAPIs.length > 0 ? selectedExportAPIs : 
                   availableAPIs.filter(api => api.is_active).map(api => api.id);
    
    if (apiIds.length === 0) {
      toast({
        title: "Error",
        description: "No active API keys available",
        variant: "destructive"
      });
      return;
    }

    const categoryName = exportCategory !== 'all' ? 
      (exportSubCategory !== 'all' ? 
        subCategories.find(c => c.id.toString() === exportSubCategory)?.name || 'Unknown Subcategory' :
        categories.find(c => c.id.toString() === exportCategory)?.name || 'Unknown Category'
      ) : 'All Categories';

    // Prepare API key objects with names
    const apiKeysWithNames = apiIds.map(id => {
      const api = availableAPIs.find(a => a.id === id);
      return { id, name: api?.name || `API ${id.substring(0, 8)}` };
    });

    const exportConfig = {
      status: selectedExportStatus,
      categoryId: exportSubCategory !== 'all' ? parseInt(exportSubCategory) : 
                 (exportCategory !== 'all' ? parseInt(exportCategory) : undefined),
      pageSize: exportPageSize,
        maxPages: Number.MAX_SAFE_INTEGER, // Unlimited pages
      columns: selectedExportColumns,
      apiKeys: apiKeysWithNames,
      statusText: getProductStatusText(selectedExportStatus),
      categoryName
    };

    if (runInBg) {
      // Create background task with concurrent API support
      try {
        const taskId = await runConcurrentExport(
          exportConfig,
          (progressData) => {
            // Handle progress updates
            setCurrentExportTaskId(progressData);
          },
          async (results) => {
            // Handle completion
            try {
              // Save to export history
              await addExportEntry({
                export_type: 'status_export',
                filters: exportConfig,
                total_items: results.totalFound,
                status: 'completed',
                metadata: {
                  categories: categoryName,
                  apiKeys: apiKeysWithNames.length,
                  duration: Date.now() - Date.now()
                }
              });

              // Generate Excel and save to storage
              const filePath = await generateExcelFile({
                data: results.products,
                categoriesMap: results.categoriesMap,
                config: {
                  status: selectedExportStatus,
                  categoryName,
                  columns: selectedExportColumns,
                  apiKeys: apiKeysWithNames.length,
                  pageSize: exportPageSize
                },
                saveToStorage: true
              });

              // Update export entry with file path if file was created
              if (filePath) {
                await updateExportEntry(savedExportHistory[0]?.id || 'temp', { file_path: filePath });
              }

              updateTask(taskId, {
                status: 'completed',
                progress: 100,
                totalItems: results.totalFound,
                processedItems: results.totalFound,
                endTime: new Date(),
                metadata: {
                  ...exportConfig,
                  exportId: results.exportId,
                  filePath: filePath || ''
                }
              });

              toast({
                title: "Background Export Complete",
                description: `Successfully exported ${results.totalFound} products using ${apiKeysWithNames.length} API keys concurrently.`
              });
            } catch (error) {
              console.error('Error saving background export:', error);
              updateTask(taskId, {
                status: 'error',
                error: error.message,
                endTime: new Date()
              });
            }
          }
        );
        
        setCurrentExportTaskId(taskId);
      } catch (error) {
        console.error('Error starting background export:', error);
        toast({
          title: "Export Error", 
          description: "Failed to start background export",
          variant: "destructive"
        });
      }
      
      return;
    }

    // Run in foreground with concurrent processing
    try {
      setIsExporting(true);
      
      const apiKeysWithNames = availableAPIs.filter(api => api.is_active).map(api => ({ 
        id: api.id, 
        name: api.name 
      }));

      if (apiKeysWithNames.length === 0) {
        toast({
          title: "No API Keys",
          description: "Please add and activate at least one API key",
          variant: "destructive"
        });
        setIsExporting(false);
        return;
      }

      const categoryName = exportCategory === 'all' ? 'All Categories' : 
        categories.find(c => c.id.toString() === exportCategory)?.name || 'Unknown';

      const exportConfig = {
        status: selectedExportStatus,
        categoryId: exportSubCategory !== 'all' ? parseInt(exportSubCategory) : 
                   (exportCategory !== 'all' ? parseInt(exportCategory) : undefined),
        pageSize: exportPageSize,
        maxPages: Number.MAX_SAFE_INTEGER, // Unlimited pages
        columns: selectedExportColumns,
        apiKeys: apiKeysWithNames
      };

      // Start concurrent export
      try {
        const exportId = await startConcurrentExport(exportConfig);
        
        // Wait for the concurrent export to complete and results to be available
        // The hook manages its own state, so we need to wait for completion
        console.log('Concurrent export completed with ID:', exportId);
        
        // The results are now available in the hook's state
        // We'll handle the success in a useEffect that watches concurrentExportResults
        
      } catch (concurrentError) {
        console.error('Concurrent export failed:', concurrentError);
        throw concurrentError; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Error during concurrent export:', error);
      
      // More specific error messages based on error type
      let errorMessage = "Failed to complete concurrent export";
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Export Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Reset export state
      setExportResults(null);
    } finally {
      setIsExporting(false);
    }
  };

  const processExport = async (apiIds: string[], isBackground: boolean = false, taskId?: string) => {
    const updateProgress = (progress: number, status: string, totalItems?: number, processedItems?: number, estimatedTotal?: number) => {
      if (isBackground && taskId) {
        updateTask(taskId, {
          progress,
          status: 'processing',
          name: `Sunsky Export - ${status}`,
          totalItems,
          processedItems
        });
      } else {
        setExportProgress(progress);
        setExportStatus(status);
        if (estimatedTotal !== undefined) {
          setExportTotalItems(estimatedTotal);
        }
      }
    };

    if (!isBackground) {
      setIsExporting(true);
      setExportProgress(0);
      setExportStatus('Initializing export...');
      setExportTotalItems(0);
      setExportResults(null);
      setCurrentExportTaskId(taskId || null);
    }

    try {
      const allProducts: SunskyProduct[] = [];
      const categoriesMap = new Map<number, { name: string; products: SunskyProduct[] }>();
      let currentPage = 1;
      let totalProcessed = 0;
      let estimatedTotal = 0;
      let hasMore = true;
      const perKeyDelay = 250; // 250ms delay per API key for level 9 limits
      let currentApiIndex = 0;
      let isCancelled = false;

      updateProgress(5, 'Fetching categories...');
      
      // Get all main categories first
      const categoriesResponse = await callSunskyAPI('getCategories', {
        mode: 'all',
        parentId: '0',
        modifiedSince: ''
      }, apiIds[0]);

      if (categoriesResponse?.result !== 'success' || !categoriesResponse?.data) {
        throw new Error('Failed to fetch categories');
      }

      // Initialize categories map
      const allCategories = categoriesResponse.data as SunskyCategory[];
      allCategories.forEach(cat => {
        categoriesMap.set(cat.id, { name: cat.name, products: [] });
      });

      // Get subcategories if needed
      if (exportCategory !== 'all' && exportSubCategory === 'all') {
        updateProgress(10, 'Fetching subcategories...');
        
        const subCatsResponse = await callSunskyAPI('getCategories', {
          parentId: exportCategory,
          mode: 'subcategories',
          modifiedSince: ''
        }, apiIds[0]);

        if (subCatsResponse?.result === 'success' && subCatsResponse?.data) {
          const subcats = subCatsResponse.data as SunskyCategory[];
          subcats.forEach(cat => {
            categoriesMap.set(cat.id, { name: cat.name, products: [] });
          });
        }
      }

      const statusText = getProductStatusText(selectedExportStatus);
      const categoryText = exportCategory !== 'all' ? 
        (exportSubCategory !== 'all' ? 
          subCategories.find(c => c.id.toString() === exportSubCategory)?.name || 'Unknown Subcategory' :
          categories.find(c => c.id.toString() === exportCategory)?.name || 'Unknown Category'
        ) : 'All Categories';

      updateProgress(15, `Getting total product count for ${statusText} products from ${categoryText}...`);

      // First, get the total count by fetching page 1 with small pageSize
      let actualTotalProducts = 0;
      let actualTotalPages = 0;

      try {
        // Determine effective category ID for filtering
        let effectiveCategoryId = undefined;
        if (exportSubCategory !== 'all') {
          effectiveCategoryId = parseInt(exportSubCategory);
        } else if (exportCategory !== 'all') {
          effectiveCategoryId = parseInt(exportCategory);
        }

        const countParams: any = {
          page: 1,
          pageSize: exportPageSize, // Use actual page size to get better estimate
          status: selectedExportStatus,
          lang: 'en'
        };

        if (effectiveCategoryId) {
          countParams.categoryId = effectiveCategoryId;
        }

        const countResponse = await callSunskyAPI('searchProducts', countParams, apiIds[0]);
        
        if (countResponse?.result === 'success' && countResponse?.data?.products) {
          // Extract total information from response
          if (countResponse.data.totalResults) {
            actualTotalProducts = countResponse.data.totalResults;
            actualTotalPages = Math.ceil(actualTotalProducts / exportPageSize);
          } else if (countResponse.data.products && countResponse.data.products.length > 0) {
            // Better estimate: if we got a full page, estimate based on typical catalog sizes
            const firstPageCount = countResponse.data.products.length;
            if (firstPageCount === exportPageSize) {
              // Full page returned, estimate conservatively
              actualTotalProducts = firstPageCount * 20; // More reasonable estimate
              actualTotalPages = 20;
            } else {
              // Partial page, this might be all the data
              actualTotalProducts = firstPageCount;
              actualTotalPages = 1;
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch total count, using estimates:', error);
        actualTotalProducts = 500; // More reasonable fallback estimate
        actualTotalPages = Math.ceil(actualTotalProducts / exportPageSize);
      }

      updateProgress(20, `Starting export... (estimated ${actualTotalProducts} products across ~${actualTotalPages} pages)`, actualTotalProducts, 0, actualTotalProducts);

      const maxPages = actualTotalPages; // Fetch all available pages
      
      while (hasMore && currentPage <= maxPages && !isCancelled) {
        // Check if task was cancelled (for background tasks)
        if (isBackground && taskId) {
          const tasks = isBackground ? await new Promise(resolve => {
            // Access current tasks from context - simplified check
            resolve([]);
          }) : [];
        }

        try {
          const currentApiId = apiIds[currentApiIndex % apiIds.length];
          
          const progressPercentage = Math.min(95, 20 + Math.round(((currentPage - 1) / actualTotalPages) * 75));
          
          updateProgress(
            progressPercentage, 
            `Fetching page ${currentPage}/${actualTotalPages} (${totalProcessed}/${actualTotalProducts} products) - API ${currentApiIndex % apiIds.length + 1}`,
            actualTotalProducts,
            totalProcessed,
            actualTotalProducts
          );

          // Determine effective category ID for filtering
          let effectiveCategoryId = undefined;
          if (exportSubCategory !== 'all') {
            effectiveCategoryId = parseInt(exportSubCategory);
          } else if (exportCategory !== 'all') {
            effectiveCategoryId = parseInt(exportCategory);
          }

          const searchParams: any = {
            page: currentPage,
            pageSize: exportPageSize,
            status: selectedExportStatus,
            lang: 'en'
          };

          if (effectiveCategoryId) {
            searchParams.categoryId = effectiveCategoryId;
          }

          const response = await callSunskyAPI('searchProducts', searchParams, currentApiId);

          if (response?.result !== 'success') {
            console.warn(`Failed to fetch page ${currentPage} with API ${currentApiId}:`, response);
            
            // Try next API or break if all failed
            currentApiIndex++;
            if (currentApiIndex >= apiIds.length) {
              break;
            }
            continue;
          }

          const pageProducts = response.data?.products || [];
          
          if (pageProducts.length === 0) {
            hasMore = false;
            break;
          }

          // Update available columns based on first page
          if (currentPage === 1 && pageProducts.length > 0) {
            const firstProduct = pageProducts[0];
            const detectedColumns = Object.keys(firstProduct);
            const allColumns = [...new Set([...availableExportColumns, ...detectedColumns])];
            setAvailableExportColumns(allColumns);
            
            // Update actual totals if we have better information from the response
            if (response.data.totalResults && response.data.totalResults !== actualTotalProducts) {
              actualTotalProducts = response.data.totalResults;
              actualTotalPages = Math.ceil(actualTotalProducts / exportPageSize);
              updateProgress(
                progressPercentage, 
                `Updated total: ${actualTotalProducts} products across ${actualTotalPages} pages`,
                actualTotalProducts,
                totalProcessed,
                actualTotalProducts
              );
            } else if (pageProducts.length < exportPageSize && currentPage > 1) {
              // We got less than a full page - update our estimate
              const estimatedFromCurrentProgress = totalProcessed + (pageProducts.length * (actualTotalPages - currentPage));
              if (estimatedFromCurrentProgress < actualTotalProducts) {
                actualTotalProducts = Math.max(totalProcessed + pageProducts.length, estimatedFromCurrentProgress);
                actualTotalPages = currentPage + Math.ceil((actualTotalProducts - totalProcessed) / exportPageSize);
              }
            }
          }

          // Process products and organize by category
          pageProducts.forEach((product: SunskyProduct) => {
            allProducts.push(product);
            
            if (product.categoryId && categoriesMap.has(product.categoryId)) {
              categoriesMap.get(product.categoryId)?.products.push(product);
            } else {
              // Handle products without category or unknown category
              if (!categoriesMap.has(0)) {
                categoriesMap.set(0, { name: 'Uncategorized', products: [] });
              }
              categoriesMap.get(0)?.products.push(product);
            }
          });

          totalProcessed += pageProducts.length;
          currentPage++;
          currentApiIndex++;

          // Check if we have more pages
          if (pageProducts.length < exportPageSize) {
            hasMore = false;
          }

          // Rate limiting delay per API key
          if (hasMore) {
            const delay = perKeyDelay;
            const progressPercentage = Math.min(95, 20 + Math.round(((currentPage - 1) / actualTotalPages) * 75));
            updateProgress(
              progressPercentage, 
              `Rate limiting... waiting ${delay}ms (${totalProcessed}/${actualTotalProducts} products)`,
              actualTotalProducts,
              totalProcessed,
              actualTotalProducts
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (pageError) {
          console.error(`Error fetching page ${currentPage}:`, pageError);
          currentApiIndex++;
          if (currentApiIndex >= apiIds.length * 2) { // Allow some retries
            hasMore = false;
          }
        }
      }

      const finalResults = {
        products: allProducts,
        categories: categoriesMap,
        totalFound: totalProcessed
      };

      if (isBackground && taskId) {
        updateTask(taskId, {
          progress: 90,
          status: 'processing',
          totalItems: totalProcessed,
          processedItems: totalProcessed
        });

        // Generate Excel in background
        await generateLegacyExcelFile(finalResults, taskId);
        
        updateTask(taskId, {
          progress: 100,
          status: 'completed',
          totalItems: totalProcessed,
          processedItems: totalProcessed
        });

        toast({
          title: "Export Complete",
          description: `Background export completed. Found ${totalProcessed} products.`
        });
        
      } else {
        setExportResults(finalResults);
        updateProgress(100, `Export complete! Found ${totalProcessed}/${actualTotalProducts} products across ${categoriesMap.size} categories`, actualTotalProducts, totalProcessed, actualTotalProducts);

        toast({
          title: "Export Complete",
          description: `Successfully fetched ${totalProcessed} ${statusText} products from ${categoryText}`
        });
      }

    } catch (error) {
      console.error('Export error:', error);
      
      if (isBackground && taskId) {
        updateTask(taskId, {
          status: 'error',
          progress: 0
        });
      } else {
        setExportStatus('Export failed');
      }
      
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export products",
        variant: "destructive"
      });
    } finally {
      if (!isBackground) {
        setIsExporting(false);
      }
    }
  };

  const processExportInBackground = async (taskId: string, apiIds: string[]) => {
    await processExport(apiIds, true, taskId);
  };

  const generateLegacyExcelFile = async (results: any, taskId?: string) => {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();

      // Create summary sheet
      const categoryText = exportCategory !== 'all' ? 
        (exportSubCategory !== 'all' ? 
          subCategories.find(c => c.id.toString() === exportSubCategory)?.name || 'Unknown Subcategory' :
          categories.find(c => c.id.toString() === exportCategory)?.name || 'Unknown Category'
        ) : 'All Categories';

      const summaryData = [
        ['Export Summary'],
        ['Status', getProductStatusText(selectedExportStatus)],
        ['Category Filter', categoryText],
        ['Total Products', results.totalFound.toString()],
        ['Total Categories', results.categoriesMap.size.toString()],
        ['Export Date', new Date().toLocaleString()],
        ['Page Size', exportPageSize.toString()],
        ['API Keys Used', selectedExportAPIs.length || availableAPIs.filter(api => api.is_active).length],
        [],
        ['Category', 'Product Count'],
      ];

      results.categoriesMap.forEach((category: any, categoryId: number) => {
        summaryData.push([category.name, category.products.length.toString()]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Create detailed products sheet with selected columns
      const productsData = [selectedExportColumns];

      results.categoriesMap.forEach((category: any) => {
        category.products.forEach((product: any) => {
          const row = selectedExportColumns.map(column => {
            switch (column) {
              case 'status':
                return getProductStatusText(product.status);
              case 'dimensions':
                return `${product.unitLength || ''}x${product.unitWidth || ''}x${product.unitHeight || ''}`;
              case 'pack_dimensions':
                return `${product.packLength || ''}x${product.packWidth || ''}x${product.packHeight || ''}`;
              case 'category':
                return category.name;
              default:
                return product[column] || '';
            }
          });
          productsData.push(row);
        });
      });

      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

      // Create category-specific sheets (limit to top 10 categories by product count)
      const sortedCategories = Array.from(results.categoriesMap.entries())
        .sort(([,a], [,b]) => b.products.length - a.products.length)
        .slice(0, 10);

      sortedCategories.forEach(([categoryId, category]) => {
        const categoryData = [selectedExportColumns];

        category.products.forEach((product: any) => {
          const row = selectedExportColumns.map(column => {
            switch (column) {
              case 'status':
                return getProductStatusText(product.status);
              case 'dimensions':
                return `${product.unitLength || ''}x${product.unitWidth || ''}x${product.unitHeight || ''}`;
              case 'pack_dimensions':
                return `${product.packLength || ''}x${product.packWidth || ''}x${product.packHeight || ''}`;
              case 'category':
                return category.name;
              default:
                return product[column] || '';
            }
          });
          categoryData.push(row);
        });

        const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
        const sheetName = category.name ? category.name.substring(0, 31) : `Category ${categoryId}`;
        XLSX.utils.book_append_sheet(workbook, categorySheet, sheetName);
      });

      // Download the file
      const statusSlug = getProductStatusText(selectedExportStatus).toLowerCase().replace(/\s+/g, '_');
      const categorySlug = categoryText.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      const fileName = `sunsky_export_${statusSlug}_${categorySlug}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Download Started",
        description: `Downloading ${fileName}`
      });

    } catch (error) {
      console.error('Excel generation error:', error);
      if (taskId) {
        updateTask(taskId, {
          status: 'error',
          progress: 0
        });
      }
      throw error;
    }
  };

  // Download results as Excel
  const downloadExportResults = () => {
    if (!exportResults) return;
    generateLegacyExcelFile(exportResults);
  };

  // Load available APIs
  const loadAvailableAPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('sunsky_credentials')
        .select('id, api_key, is_active')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const apis = (data || []).map((cred, index) => ({
        id: cred.id,
        name: `API Key ${index + 1} (${cred.api_key.substring(0, 8)}...)`,
        is_active: cred.is_active
      }));
      
      setAvailableAPIs(apis);
      
      // Set default selected API to first active one
      const defaultAPI = apis.find(api => api.is_active)?.id || apis[0]?.id || '';
      if (defaultAPI) {
        if (!selectedAPI) {
          setSelectedAPI(defaultAPI);
        }
        if (!selectedSearchAPI) {
          setSelectedSearchAPI(defaultAPI);
        }
        if (!selectedJobAPI) {
          setSelectedJobAPI(defaultAPI);
        }
      }
    } catch (error) {
      console.error('Error loading APIs:', error);
    }
  };

  // Update credentials check to use any active API key
  const checkStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sunsky_credentials')
        .select('is_active')
        .eq('user_id', profile?.id)
        .eq('is_active', true)
        .limit(1);
      
      if (error) throw error;
      setHasCredentials(!!data && data.length > 0);
      
      // Load available APIs when checking credentials
      await loadAvailableAPIs();
    } catch (error) {
      console.error('Error checking credentials:', error);
      setHasCredentials(false);
    }
  };
  const toggleApiKeyActive = async (apiKeyId: string, makeActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'toggleApiKeyActive',
          apiId: apiKeyId,
          isActive: makeActive
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Success",
          description: makeActive ? "API key activated" : "API key deactivated",
        });
        
        // Refresh the available APIs list
        await loadAvailableAPIs();
        await checkCredentialsStatus();
      } else {
        throw new Error(data.message || 'Failed to update API key status');
      }
    } catch (error) {
      console.error('Error updating API key status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update API key status",
        variant: "destructive",
      });
    }
  };

  const checkCredentialsStatus = checkStatus;

  const callSunskyAPI = async (action: string, data: any, apiId?: string) => {
    console.log('Calling Sunsky API:', { action, data, apiId, selectedAPI });
    try {
      const { data: response, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action, 
          ...data,
          apiId: apiId || selectedSearchAPI || selectedAPI // Use specified API or default search API
        }
      });

      console.log('Sunsky API response:', { response, error });

      if (error) throw error;
      
      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response has result field, return the full response for proper parsing
        if ('result' in response) {
          return response;
        }
        // If response has success field, transform to expected structure
        if ('success' in response) {
          return {
            result: response.success ? 'success' : 'error',
            data: response.data || response,
            message: response.message
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Sunsky API error:', error);
      throw error;
    }
  };

  // Initialize parallel processor after all required functions are defined
  // Remove the parallel processor hook since we're using background processing
  // const { processModelNumbersInParallel } = useParallelPOProcessor({
  //   profile,
  //   callSunskyAPI,
  //   setPOSearchStats,
  //   setPOSearchProgress,
  //   fetchSKUs,
  //   fetchJobs
  // });

  const loadCategories = async (apiId?: string) => {
    if (!hasCredentials) {
      console.log('Skipping loadCategories - no credentials');
      return;
    }
    
    console.log('Loading main categories with API ID:', apiId);
    setFetchingCategories(true);
    try {
      const result = await callSunskyAPI('getCategories', {
        mode: 'top', // Load main categories
        parentId: '0', // Explicitly request top-level categories
        modifiedSince: modifiedSinceDate
      }, apiId);
      
      console.log('Main categories result:', result);
      
      // Handle both response structures
      const isSuccess = result.result === 'success' || result.success === true;
      const data = result.data || [];
      const error = result.error || result.message;
      
      if (isSuccess && data.length > 0) {
        setCategories(data);
        // Reset subcategories when main categories change
        setSubCategories([]);
        setSelectedSubCategory('all');
        toast({
          title: "Success",
          description: `Loaded ${data.length} main categories`
        });
      } else {
        console.error('Categories API error:', error);
        throw new Error(error || 'Failed to load categories');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setFetchingCategories(false);
    }
  };

  const loadSubCategories = async (categoryId: string, apiId?: string) => {
    if (!hasCredentials || categoryId === 'all') {
      setSubCategories([]);
      return;
    }
    
    console.log('Loading subcategories for category:', categoryId);
    setFetchingSubCategories(true);
    try {
      const result = await callSunskyAPI('getCategories', { 
        parentId: categoryId,
        mode: 'subcategories',
        modifiedSince: modifiedSinceDate
      }, apiId || selectedSearchAPI);
      
      // Handle both response structures
      const isSuccess = result.result === 'success' || result.success === true;
      const data = result.data || [];
      
      if (isSuccess) {
        setSubCategories(data);
        console.log(`Loaded ${data.length} subcategories for category ${categoryId}`);
      } else {
        throw new Error(result.error || result.message || 'Failed to load subcategories');
      }
    } catch (error) {
      console.error('Error loading sub-categories:', error);
      toast({
        title: "Error",
        description: "Failed to load sub-categories",
        variant: "destructive"
      });
    } finally {
      setFetchingSubCategories(false);
    }
  };

  const loadBrands = async (apiId?: string, categoryId?: string) => {
    if (!hasCredentials) {
      console.log('Skipping loadBrands - no credentials');
      return;
    }
    
    console.log('Loading brands with API ID:', apiId, 'categoryId:', categoryId);
    setFetchingBrands(true);
    try {
      const params: any = {};
      if (categoryId && categoryId !== 'all') {
        params.categoryId = categoryId;
      }
      
      const result = await callSunskyAPI('getBrands', params, apiId);
      
      console.log('Brands result:', result);
      
      // Handle both response structures
      const isSuccess = result.result === 'success' || result.success === true;
      const data = result.data || [];
      
      if (isSuccess) {
        setBrands(data);
        console.log('Set brands:', data.length || 0);
        if (data.length === 0) {
          toast({
            title: "Info",
            description: "No brands found for this category",
          });
        }
      } else {
        console.error('Brands API error:', result.error || result.message);
        setBrands([]); // Clear brands on error
        toast({
          title: "Warning",
          description: "Could not load brands, showing all products",
        });
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      setBrands([]); // Clear brands on error
      toast({
        title: "Warning",
        description: "Could not load brands, showing all products",
      });
    } finally {
      setFetchingBrands(false);
    }
  };

  const searchProducts = async (page = 1, apiId?: string) => {
    if (!hasCredentials) return;
    
    setLoading(true);
    try {
      const filters: SearchFilters = {
        keyword: searchTerm || undefined,
        categoryId: selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
        brandId: selectedBrand && selectedBrand !== 'all' ? parseInt(selectedBrand) : undefined,
        priceMin: priceMin ? parseFloat(priceMin) : undefined,
        priceMax: priceMax ? parseFloat(priceMax) : undefined,
        stockMin: stockMin ? parseInt(stockMin) : undefined,
        leadTimeLevel: leadTimeLevel && leadTimeLevel !== 'any' ? parseInt(leadTimeLevel) : undefined,
        dateFrom: dateRange?.from?.toISOString().split('T')[0],
        dateTo: dateRange?.to?.toISOString().split('T')[0]
      };

                  const result = await callSunskyAPI('searchProducts', {
                    filters,
                    page,
                    pageSize: searchPageSize
                  }, apiId || selectedSearchAPI);
      
      console.log('Search products API response:', result);
      
      if (result.result === 'success') {
        setProducts(result.data?.products || []);
        setCurrentPage(page);
        setTotalPages(Math.ceil((result.data?.total || 0) / 20));
        
        // Extract all headers from first product and set them as selected
        if (result.data?.products?.length > 0) {
          const productKeys = Object.keys(result.data.products[0]);
          setAvailableHeaders(productKeys);
          // Auto-select all available headers to show all columns
          setSelectedHeaders(productKeys);
        }
        
        toast({
          title: "Search Complete",
          description: `Found ${result.data?.total || 0} products`
        });
      } else {
        console.error('Search products failed:', result);
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductDetails = async (itemNo: string) => {
    if (!hasCredentials) return null;
    
    try {
      const result = await callSunskyAPI('getProductDetails', { itemNo });
      
      console.log('Get product details API response:', result);
      
      if (result.result === 'success') {
        return result.data;
      } else {
        console.error('Product details API error:', result.error);
        throw new Error(result.error || 'Product details API failed');
      }
    } catch (error) {
      console.error('Error getting product details:', error);
      return null;
    }
  };

  const importSelectedSKUs = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select products to import",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    
    try {
      const productList = Array.from(selectedProducts);
      const total = productList.length;
      let imported = 0;
      let errors = 0;

      for (const itemNo of productList) {
        try {
          console.log(`Getting details for ${itemNo}...`);
          const productDetails = await getProductDetails(itemNo);
          
          if (productDetails) {
            console.log(`Importing ${itemNo} to database...`);
            const { data: insertedData, error } = await supabase
              .from('sunsky_skus')
              .upsert({
                user_id: profile?.id,
                sku_code: productDetails.itemNo,
                title: productDetails.name || '',
                cost: productDetails.convertedPrice || parseFloat(productDetails.price || '0') || 0,
                weight: productDetails.unitWeight ? parseFloat(productDetails.unitWeight) : 0,
                currency: productDetails.convertedCurrency || 'USD',
                country: profile?.country || 'UAE',
                product_data: productDetails
              }, {
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false
              })
              .select();

            if (!error) {
              imported++;
              console.log(`Successfully imported ${itemNo}`, insertedData);
            } else {
              console.error(`Error importing ${itemNo}:`, error);
              errors++;
            }
          } else {
            console.log(`No details found for ${itemNo}`);
            errors++;
          }
        } catch (error) {
          console.error(`Error importing ${itemNo}:`, error);
          errors++;
        }
        
        setImportProgress(((imported + errors) / total) * 100);
      }

      // Force refresh the SKU list
      console.log('Forcing SKU list refresh after manual import...');
      try {
        // Clear cache and force refresh
        await fetchSKUs(1, false); // Force refresh without cache
        console.log('SKU list refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing SKU list:', refreshError);
        // Fallback: try the refresh function
        try {
          await refreshSKUs();
        } catch (fallbackError) {
          console.error('Fallback refresh also failed:', fallbackError);
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${imported} out of ${total} SKUs${errors > 0 ? ` (${errors} errors)` : ''}`
      });
      
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error during import:', error);
      toast({
        title: "Import Error",
        description: "Failed to import SKUs",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Search PO model numbers in Sunsky and import matching items with background processing
  const handleSearchPOModelNumbers = async () => {
    if (!hasCredentials) {
      toast({
        title: "API Credentials Required",
        description: "Please configure your Sunsky API credentials first",
        variant: "destructive"
      });
      return;
    }

    setIsSearchingPO(true);
    setPOSearchProgress(0);

    try {
      // Get model numbers data from PO orders
      const modelData = await getPOModelNumbers();
      
      if (modelData.uniqueCount === 0) {
        toast({
          title: "No Model Numbers Found", 
          description: `Searched ${modelData.totalUniqueCount || 0} PO records but found no model numbers. Check console for details.`,
          variant: "default"
        });
        return;
      }

      // Show enhanced diagnostics
      toast({
        title: `Found ${modelData.uniqueCount} Model Numbers`,
        description: `Total PO items: ${modelData.totalCount} | Unique models: ${modelData.uniqueCount} | Already imported: ${modelData.alreadyImportedCount} | Processing ALL models...`,
        variant: "default"
      });

      console.log(`🎯 STARTING PO MODEL SEARCH:`, {
        totalPOItems: modelData.totalCount,
        uniqueModels: modelData.uniqueCount,
        alreadyImported: modelData.alreadyImportedCount,
        willProcess: modelData.uniqueCount
      });

      // Create import job first
      const { data: importJob } = await supabase
        .from('sunsky_import_jobs')
        .insert({
          user_id: profile?.id,
          type: 'po_search',
          criteria: { 
            source: 'po_model_numbers', 
            total_models: modelData.totalCount,
            unique_models: modelData.uniqueCount,
            api_keys_used: 3 // Will be updated by background function
          },
          status: 'pending',
          total_items: modelData.uniqueCount,
          processed_items: 0,
          success_count: 0,
          error_count: 0,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!importJob) {
        throw new Error('Failed to create import job');
      }

      // Start background processing
      const response = await supabase.functions.invoke('process-po-background', {
        body: { 
          action: 'start',
          jobId: importJob.id,
          modelData: modelData
        }
      });

      if (response.error) {
        throw new Error('Failed to start background processing');
      }

      // Initialize stats for UI
      setPOSearchStats({
        totalItems: modelData.uniqueCount,
        totalPOItems: modelData.totalCount,
        totalUniqueItems: modelData.totalUniqueCount,
        alreadyImportedCount: modelData.alreadyImportedCount,
        searchedItems: 0,
        skippedItems: 0,
        matchedItems: 0,
        errorItems: 0,
        currentItem: 'Started background processing...'
      });

      // Start polling for job progress
      pollJobProgress(importJob.id);

      toast({
        title: "Background Processing Started",
        description: `Processing ${modelData.uniqueCount} unique model numbers in the background. You can continue working on other features.`,
      });

    } catch (error) {
      console.error('Error starting background processing:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to start background processing",
        variant: "destructive"
      });
    } finally {
      setIsSearchingPO(false);
    }
  };

  // Poll job progress
  const pollJobProgress = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('sunsky_import_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error || !job) {
          clearInterval(pollInterval);
          return;
        }

        // Update progress
        const progress = job.total_items > 0 ? Math.floor((job.processed_items / job.total_items) * 100) : 0;
        setPOSearchProgress(progress);

        // Update stats
        setPOSearchStats(prev => ({
          ...prev,
          searchedItems: job.processed_items,
          matchedItems: job.success_count,
          errorItems: job.error_count,
          currentItem: job.status === 'completed' ? 'Completed!' : 
                      job.status === 'error' ? 'Failed!' : 
                      `Processing... (${job.processed_items}/${job.total_items})`
        }));

        // Check if job is complete
        if (job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') {
          clearInterval(pollInterval);
          
          if (job.status === 'completed') {
            // Refresh data
            await fetchSKUs(1, false);
            await fetchJobs();
            
            toast({
              title: "Background Processing Complete",
              description: `Successfully processed ${job.success_count} items. ${job.error_count} errors.`,
            });
          } else if (job.status === 'error') {
            toast({
              title: "Background Processing Failed",
              description: job.last_error || "Processing failed with unknown error",
              variant: "destructive"
            });
          }

          setIsSearchingPO(false);
          setPOSearchProgress(100);
        }

      } catch (error) {
        console.error('Error polling job progress:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Clear interval after 30 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30 * 60 * 1000);
  };

  const createCategoryImportJob = async (categoryId: string, categoryName: string) => {
    try {
      const result = await createImportJob('category', {
        categoryId: parseInt(categoryId),
        categoryName
      });
      
      if (result.success) {
        toast({
          title: "Job Created",
          description: `Import job created for category: ${categoryName}`
        });
        await fetchJobs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating category import job:', error);
      toast({
        title: "Error",
        description: "Failed to create import job",
        variant: "destructive"
      });
    }
  };

  const toggleProductSelection = (itemNo: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(itemNo)) {
      newSelected.delete(itemNo);
    } else {
      newSelected.add(itemNo);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.itemNo)));
    }
  };

  const formatFieldValue = (field: string, value: any) => {
    if (value === null || value === undefined) return '-';
    
    switch (field) {
      case 'price':
      case 'convertedPrice':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : `$${value}`;
      case 'stock':
        return value.toLocaleString();
      case 'leadTime':
        return `${value} days`;
      case 'unitWeight':
      case 'packWeight':
        return `${value}g`;
      case 'gmtListed':
      case 'gmtModified':
        return new Date(value).toLocaleDateString();
      default:
        return value.toString();
    }
  };

  const saveHeaderSelection = () => {
    setShowHeaderSelector(false);
    toast({
      title: "Headers Updated",
      description: "Display headers have been updated"
    });
  };

  useEffect(() => {
    if (profile?.id) {
      checkCredentialsStatus();
      fetchSKUs(1);
      fetchJobs();
      loadColumnPreferences();
      loadAvailableAPIs();
    }
  }, [profile?.id, fetchSKUs, fetchJobs]);

  useEffect(() => {
    if (hasCredentials && selectedAPI) {
      loadCategories(selectedAPI);
      loadBrands(selectedAPI);
    }
  }, [hasCredentials, selectedAPI]);

  // Load categories and brands when search API is selected
  useEffect(() => {
    if (hasCredentials && selectedSearchAPI) {
      loadCategories(selectedSearchAPI);
      loadBrands(selectedSearchAPI);
    }
  }, [hasCredentials, selectedSearchAPI]);

  useEffect(() => {
    if (selectedCategory !== 'all' && selectedSearchAPI) {
      loadSubCategories(selectedCategory, selectedSearchAPI);
      // Also reload brands when category changes to get category-specific brands
      loadBrands(selectedSearchAPI, selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory('all');
      // Load all brands when no specific category is selected
      if (selectedSearchAPI) {
        loadBrands(selectedSearchAPI);
      }
    }
  }, [selectedCategory, selectedSearchAPI]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sunsky SKU Importer</h1>
          <p className="text-muted-foreground">
            Search, view, and import products from Sunsky marketplace
          </p>
        </div>
      </div>

      {!hasCredentials && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please configure your Sunsky API credentials in the Settings tab to start importing SKUs.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="search">Search & Import</TabsTrigger>
          <TabsTrigger value="jobs">Import Jobs</TabsTrigger>
          <TabsTrigger value="skus">Imported SKUs</TabsTrigger>
          <TabsTrigger value="export-status">Export by Status</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
          {/* Search Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Products
              </CardTitle>
              <CardDescription>
                Search and filter products from Sunsky marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Selection for Search */}
              <div className="space-y-2">
                <Label htmlFor="search-api">Select API for Search</Label>
                <Select value={selectedSearchAPI} onValueChange={setSelectedSearchAPI}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose API credentials" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAPIs.map((api) => (
                      <SelectItem key={api.id} value={api.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${api.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {api.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PO Model Numbers Search Progress */}
              {isSearchingPO && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5 animate-pulse" />
                      Searching PO Model Numbers
                    </CardTitle>
                    <CardDescription>
                      Searching your PO model numbers in Sunsky marketplace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Overall Progress</span>
                        <span>{Math.round(poSearchProgress)}%</span>
                      </div>
                      <Progress value={poSearchProgress} className="h-3" />
                    </div>

                    {/* Current Item */}
                    {poSearchStats.currentItem && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Currently Searching:</Label>
                        <div className="text-sm font-mono bg-muted/50 p-2 rounded border">
                          {poSearchStats.currentItem}
                        </div>
                      </div>
                    )}

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-foreground">
                          {poSearchStats.totalItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Need Processing</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-primary">
                          {poSearchStats.totalPOItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Total in POs</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {poSearchStats.totalUniqueItems || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Unique</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-orange-600">
                          {poSearchStats.alreadyImportedCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Already Imported</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">
                          {poSearchStats.matchedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Found</div>
                      </div>
                    </div>

                    {/* Progress Breakdown */}
                    {poSearchStats.totalItems > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Progress Breakdown:</Label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Completion:</span>
                            <span className="font-medium">
                              {((poSearchStats.searchedItems / poSearchStats.totalItems) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Success Rate:</span>
                            <span className="font-medium text-green-600">
                              {poSearchStats.searchedItems > 0 
                                ? ((poSearchStats.matchedItems / poSearchStats.searchedItems) * 100).toFixed(1) 
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Term</Label>
                  <Input
                    id="search"
                    placeholder="Enter product name or keyword..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Main Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={fetchingCategories}>
                    <SelectTrigger>
                      <SelectValue placeholder={fetchingCategories ? "Loading categories..." : "Select main category"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.filter(category => category.id && category.name).map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(subCategories.length > 0 || fetchingSubCategories) && (
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub-Category</Label>
                    <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory} disabled={fetchingSubCategories}>
                      <SelectTrigger>
                        <SelectValue placeholder={fetchingSubCategories ? "Loading subcategories..." : "Select sub-category"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sub-Categories</SelectItem>
                        {subCategories.filter(subCategory => subCategory.id && subCategory.name).map((subCategory) => (
                          <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                            {subCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {subCategories.length === 0 && !fetchingSubCategories && (
                      <p className="text-sm text-muted-foreground">No subcategories available for this category</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand} disabled={fetchingBrands}>
                    <SelectTrigger>
                      <SelectValue placeholder={fetchingBrands ? "Loading brands..." : "Select brand"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.filter(brand => brand.id && brand.name).map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {brands.length === 0 && !fetchingBrands && (
                    <p className="text-sm text-muted-foreground">No brands available for this category</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price-min">Min Price ($)</Label>
                  <Input
                    id="price-min"
                    type="number"
                    placeholder="0.00"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price-max">Max Price ($)</Label>
                  <Input
                    id="price-max"
                    type="number"
                    placeholder="1000.00"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-min">Min Stock</Label>
                  <Input
                    id="stock-min"
                    type="number"
                    placeholder="1"
                    value={stockMin}
                    onChange={(e) => setStockMin(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-time">Lead Time Level</Label>
                  <Select value={leadTimeLevel} onValueChange={setLeadTimeLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any lead time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1-3 days</SelectItem>
                      <SelectItem value="2">4-7 days</SelectItem>
                      <SelectItem value="3">8-15 days</SelectItem>
                      <SelectItem value="4">16+ days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={() => searchProducts(1, selectedSearchAPI)}
                  disabled={!hasCredentials || loading || !selectedSearchAPI}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search Products
                </Button>

                <Button
                  disabled={!hasCredentials || isSearchingPO}
                  onClick={handleSearchPOModelNumbers}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {isSearchingPO ? 'Searching PO Items...' : 'Search PO Model Numbers'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedSubCategory('all');
                    setSelectedBrand('all');
                    setPriceMin('');
                    setPriceMax('');
                    setStockMin('');
                    setLeadTimeLevel('any');
                    setDateRange(undefined);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>

                {/* Header Selector */}
                <Dialog open={showHeaderSelector} onOpenChange={setShowHeaderSelector}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={availableHeaders.length === 0}>
                      <Settings className="h-4 w-4 mr-2" />
                      Customize Headers
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Display Headers</DialogTitle>
                      <DialogDescription>
                        Choose which product fields to display in the results table
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {availableHeaders.map((header) => (
                        <div key={header} className="flex items-center space-x-2">
                          <Checkbox
                            id={header}
                            checked={selectedHeaders.includes(header)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedHeaders([...selectedHeaders, header]);
                              } else {
                                setSelectedHeaders(selectedHeaders.filter(h => h !== header));
                              }
                            }}
                          />
                          <Label htmlFor={header} className="text-sm">
                            {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowHeaderSelector(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveHeaderSelection}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Selection
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Search Results ({products.length} products)
                    </CardTitle>
                    <CardDescription>
                      Select products to import to your SKU inventory
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllProducts}
                    >
                      {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      onClick={importSelectedSKUs}
                      disabled={selectedProducts.size === 0 || importing}
                      size="sm"
                    >
                      {importing ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Import Selected ({selectedProducts.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {importing && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Importing SKUs...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                {isSearchingPO && poSearchProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Searching PO Model Numbers...</span>
                      <span>{Math.round(poSearchProgress)}%</span>
                    </div>
                    <Progress value={poSearchProgress} className="h-2" />
                  </div>
                )}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedProducts.size === products.length && products.length > 0}
                            onCheckedChange={selectAllProducts}
                          />
                        </TableHead>
                        {selectedHeaders.map((header) => (
                          <TableHead key={header}>
                            {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </TableHead>
                        ))}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.itemNo}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(product.itemNo)}
                              onCheckedChange={() => toggleProductSelection(product.itemNo)}
                            />
                          </TableCell>
                          {selectedHeaders.map((header) => (
                            <TableCell key={header} className="max-w-xs truncate">
                              {formatFieldValue(header, product[header as keyof SunskyProduct])}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage - 1, selectedSearchAPI)}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = Math.max(1, currentPage - 2) + i;
                          if (page > totalPages) return null;
                          return (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => searchProducts(page, selectedSearchAPI)}
                              disabled={loading}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(currentPage + 1, selectedSearchAPI)}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="jobs" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Create Category Import Job */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Category Import Job
                </CardTitle>
                <CardDescription>
                  Import all products from a specific category in the background
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* API Selection for Jobs */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="job-api">Select API for Import Job</Label>
                  <Select value={selectedJobAPI} onValueChange={setSelectedJobAPI}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose API credentials" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAPIs.map((api) => (
                        <SelectItem key={api.id} value={api.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${api.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                            {api.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="job-category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category to import" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(category => category.id && category.name).map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      const category = categories.find(c => c.id.toString() === selectedCategory);
                      if (category) {
                        createCategoryImportJob(selectedCategory, category.name);
                      }
                    }}
                    disabled={!hasCredentials || !selectedCategory || selectedCategory === 'all' || !selectedJobAPI}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Jobs List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Import Jobs
                    </CardTitle>
                    <CardDescription>
                      Monitor the status of your import tasks
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => fetchJobs()}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Jobs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No import jobs yet</p>
                    <p className="text-sm">Create category import jobs to track progress</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {jobs
                        .slice((jobsCurrentPage - 1) * jobsPerPage, jobsCurrentPage * jobsPerPage)
                        .map((job) => (
                        <div 
                          key={job.id} 
                          className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDetailsDialog(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'processing' ? 'secondary' :
                                  job.status === 'failed' ? 'destructive' : 'outline'
                                }
                              >
                                {job.status}
                              </Badge>
                              <div>
                                <span className="font-medium capitalize">{job.type}</span>
                                {job.total_items && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({job.processed_items || 0}/{job.total_items} items)
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {job.status === 'processing' && !job.paused && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pauseJob(job.id);
                                  }}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {job.status === 'processing' && job.paused && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resumeJob(job.id);
                                  }}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {(job.status === 'processing' || job.status === 'queued') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelJob(job.id);
                                  }}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <div className="text-xs text-muted-foreground text-right">
                                <div>{new Date(job.created_at).toLocaleDateString()}</div>
                                {job.started_at && (
                                  <div>{new Date(job.started_at).toLocaleTimeString()}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress bar for active jobs */}
                          {job.total_items && job.status === 'processing' && (
                            <div className="mt-2">
                              <Progress 
                                value={(job.processed_items / job.total_items) * 100} 
                                className="h-2" 
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Jobs Pagination */}
                    {jobs.length > jobsPerPage && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (jobsCurrentPage > 1) setJobsCurrentPage(jobsCurrentPage - 1);
                                }}
                                className={jobsCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.ceil(jobs.length / jobsPerPage) }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setJobsCurrentPage(page);
                                  }}
                                  isActive={page === jobsCurrentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            
                            <PaginationItem>
                              <PaginationNext 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (jobsCurrentPage < Math.ceil(jobs.length / jobsPerPage)) {
                                    setJobsCurrentPage(jobsCurrentPage + 1);
                                  }
                                }}
                                className={jobsCurrentPage === Math.ceil(jobs.length / jobsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="skus" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Imported SKUs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Imported SKUs ({totalCount})
                    </CardTitle>
                    <CardDescription>
                      View and manage your imported Sunsky SKUs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="items-per-page" className="text-sm">
                        Items per page:
                      </Label>
                      <Select 
                        value={skuItemsPerPage.toString()} 
                        onValueChange={(value) => {
                          setSkuItemsPerPage(parseInt(value));
                          setSkuCurrentPage(1); // Reset to first page
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Columns
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Select Columns to Display</DialogTitle>
                          <DialogDescription>
                            Choose which columns you want to see in the SKU table
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                            {availableSkuHeaders.map((header) => (
                              <div key={header} className="flex items-center space-x-3">
                                <Checkbox
                                  id={header}
                                  checked={skuTableHeaders.includes(header)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSkuTableHeaders([...skuTableHeaders, header]);
                                    } else {
                                      setSkuTableHeaders(skuTableHeaders.filter(h => h !== header));
                                    }
                                  }}
                                />
                                <Label 
                                  htmlFor={header}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between pt-4 border-t">
                            <Button 
                              onClick={() => {
                                saveColumnPreferences();
                                setShowColumnDialog(false);
                              }}
                              variant="default"
                              size="sm"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save & Close
                            </Button>
                            <Button 
                              onClick={() => setShowColumnDialog(false)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      onClick={() => fetchSKUs(1, false)}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    
                    <Button 
                      onClick={() => setShowClearAuthDialog(true)}
                      variant="destructive"
                      size="sm"
                      disabled={sunskySKUs.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {skusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : sunskySKUs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4" />
                    <p>No SKUs imported yet</p>
                    <p className="text-sm">Use the search tab to import SKUs from Sunsky</p>
                  </div>
                ) : (
                  <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {skuTableHeaders.map((header) => (
                            <TableHead key={header}>
                              {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSKUs.map((sku) => (
                          <TableRow key={sku.id}>
                            {skuTableHeaders.map((header) => (
                              <TableCell key={header} className={header === 'sku_code' ? 'font-mono' : header === 'title' ? 'max-w-xs truncate' : header === 'created_at' ? 'text-sm text-muted-foreground' : ''}>
                                 {(() => {
                                   const productData = sku?.product_data || {};
                                   
                                   // Handle specific fields
                                   if (header === 'created_at') {
                                     return new Date(sku[header as keyof typeof sku] as string).toLocaleDateString();
                                   } else if (header === 'cost' && sku.cost) {
                                     return sku.cost.toFixed(2);
                                   } else if (header === 'weight' && sku.weight) {
                                     return `${sku.weight}kg`;
                                   } else if (header === 'brand' && productData.brandName) {
                                     return productData.brandName;
                                   } else if (header === 'category' && productData.categoryName) {
                                     return productData.categoryName;
                                   } else if (header === 'stock' && productData.stock !== undefined) {
                                     return productData.stock.toString();
                                   } else if (header === 'moq' && productData.moq !== undefined) {
                                     return productData.moq.toString();
                                   } else if (header === 'lead_time' && productData.leadTime) {
                                     return `${productData.leadTime} days`;
                                   } else if (header === 'price' && productData.price) {
                                     return `$${parseFloat(productData.price).toFixed(2)}`;
                                   } else if (header === 'warehouse' && productData.warehouse) {
                                     return productData.warehouse;
                                   } else if (header === 'barcode' && productData.barcode) {
                                     return productData.barcode;
                                   } else if (header === 'unit_weight' && productData.unitWeight) {
                                     return `${productData.unitWeight}kg`;
                                   } else if (header === 'pack_qty' && productData.packQty) {
                                     return productData.packQty.toString();
                                   } else if (header === 'dimensions' && (productData.unitLength || productData.unitWidth || productData.unitHeight)) {
                                     return `${productData.unitLength || 0}×${productData.unitWidth || 0}×${productData.unitHeight || 0}cm`;
                                   } else if (header === 'pack_weight' && productData.packWeight) {
                                     return `${productData.packWeight}kg`;
                                   } else if (header === 'pack_dimensions' && (productData.packLength || productData.packWidth || productData.packHeight)) {
                                     return `${productData.packLength || 0}×${productData.packWidth || 0}×${productData.packHeight || 0}cm`;
                                   } else if (header === 'clearance' && productData.clearance !== undefined) {
                                     return productData.clearance ? 'Yes' : 'No';
                                   } else if (header === 'oem' && productData.oem !== undefined) {
                                     return productData.oem ? 'Yes' : 'No';
                                   } else if (header === 'with_logo' && productData.withLogo !== undefined) {
                                     return productData.withLogo ? 'Yes' : 'No';
                                   } else if (header === 'contains_battery' && productData.containsBattery !== undefined) {
                                     return productData.containsBattery ? 'Yes' : 'No';
                                   } else if (header === 'status' && productData.status !== undefined) {
                                      return (
                                        <Badge 
                                          variant={getStatusBadgeVariant(productData.status, false)}
                                          className="text-xs"
                                        >
                                          {getProductStatusText(productData.status)}
                                        </Badge>
                                      );
                                   } else if (header === 'video_url' && productData.videoUrl) {
                                     return productData.videoUrl;
                                   } else if (header === 'gmt_listed' && productData.gmtListed) {
                                     return new Date(productData.gmtListed).toLocaleDateString();
                                   } else if (header === 'gmt_modified' && productData.gmtModified) {
                                     return new Date(productData.gmtModified).toLocaleDateString();
                                   } else if (header === 'description' && productData.description) {
                                     return productData.description;
                                   } else {
                                     return (sku[header as keyof typeof sku] as string) || '-';
                                   }
                                 })()}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                       </TableBody>
                     </Table>
                   </div>
                   
                   {/* SKU Pagination */}
                   {skuTotalPages > 1 && (
                     <div className="mt-6 flex items-center justify-between">
                       <div className="text-sm text-muted-foreground">
                         Showing {skuStartIndex + 1} to {Math.min(skuEndIndex, totalCount)} of {totalCount} results
                       </div>
                       
                       <Pagination>
                         <PaginationContent>
                           <PaginationItem>
                             <PaginationPrevious 
                               href="#"
                               onClick={(e) => {
                                 e.preventDefault();
                                 if (skuCurrentPage > 1) setSkuCurrentPage(skuCurrentPage - 1);
                               }}
                               className={skuCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                             />
                           </PaginationItem>
                           
                           {/* Show first page */}
                           {skuCurrentPage > 3 && (
                             <>
                               <PaginationItem>
                                 <PaginationLink
                                   href="#"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setSkuCurrentPage(1);
                                   }}
                                   className="cursor-pointer"
                                 >
                                   1
                                 </PaginationLink>
                               </PaginationItem>
                               {skuCurrentPage > 4 && (
                                 <PaginationItem>
                                   <span className="px-3 py-2">...</span>
                                 </PaginationItem>
                               )}
                             </>
                           )}
                           
                           {/* Show current page and neighbors */}
                           {Array.from({ length: skuTotalPages }, (_, i) => i + 1)
                             .filter(page => 
                               page >= Math.max(1, skuCurrentPage - 2) && 
                               page <= Math.min(skuTotalPages, skuCurrentPage + 2)
                             )
                             .map((page) => (
                               <PaginationItem key={page}>
                                 <PaginationLink
                                   href="#"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setSkuCurrentPage(page);
                                   }}
                                   isActive={page === skuCurrentPage}
                                   className="cursor-pointer"
                                 >
                                   {page}
                                 </PaginationLink>
                               </PaginationItem>
                             ))}
                           
                           {/* Show last page */}
                           {skuCurrentPage < skuTotalPages - 2 && (
                             <>
                               {skuCurrentPage < skuTotalPages - 3 && (
                                 <PaginationItem>
                                   <span className="px-3 py-2">...</span>
                                 </PaginationItem>
                               )}
                               <PaginationItem>
                                 <PaginationLink
                                   href="#"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setSkuCurrentPage(skuTotalPages);
                                   }}
                                   className="cursor-pointer"
                                 >
                                   {skuTotalPages}
                                 </PaginationLink>
                               </PaginationItem>
                             </>
                           )}
                           
                           <PaginationItem>
                             <PaginationNext 
                               href="#"
                               onClick={(e) => {
                                 e.preventDefault();
                                 if (skuCurrentPage < skuTotalPages) {
                                   setSkuCurrentPage(skuCurrentPage + 1);
                                 }
                               }}
                               className={skuCurrentPage === skuTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                             />
                           </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
               </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="export-status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Products by Status
              </CardTitle>
              <CardDescription>
                Export products filtered by their status and category with advanced options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Product Status */}
                <div className="space-y-2">
                  <Label htmlFor="export-status">Product Status</Label>
                  <Select value={selectedExportStatus.toString()} onValueChange={(value) => setSelectedExportStatus(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status to export" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Valid</SelectItem>
                      <SelectItem value="2">Deleted</SelectItem>
                      <SelectItem value="3">Out of Stock</SelectItem>
                      <SelectItem value="4">Hidden (too old)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label htmlFor="export-category">Category</Label>
                  <Select value={exportCategory} onValueChange={setExportCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory Filter */}
                <div className="space-y-2">
                  <Label htmlFor="export-subcategory">Subcategory</Label>
                  <Select 
                    value={exportSubCategory} 
                    onValueChange={setExportSubCategory}
                    disabled={exportCategory === 'all'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {subCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {exportCategory !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSubCategories(exportCategory, selectedSearchAPI)}
                      disabled={fetchingSubCategories}
                      className="w-full mt-2"
                    >
                      {fetchingSubCategories ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Load Subcategories
                    </Button>
                  )}
                </div>

                {/* Page Size */}
                <div className="space-y-2">
                  <Label htmlFor="export-page-size">Page Size</Label>
                  <Select value={exportPageSize.toString()} onValueChange={(value) => setExportPageSize(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* API Keys Selection */}
                <div className="space-y-2">
                  <Label>API Keys</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedExportAPIs.length > 0 ? `${selectedExportAPIs.length} selected` : 'Use active keys'}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {availableAPIs.filter(api => api.is_active).map((api) => (
                        <DropdownMenuCheckboxItem
                          key={api.id}
                          checked={selectedExportAPIs.includes(api.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExportAPIs([...selectedExportAPIs, api.id]);
                            } else {
                              setSelectedExportAPIs(selectedExportAPIs.filter(id => id !== api.id));
                            }
                          }}
                        >
                          {api.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Background Processing */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="run-background" 
                    checked={runInBackground}
                    onCheckedChange={(checked) => setRunInBackground(checked === true)}
                  />
                  <Label htmlFor="run-background" className="text-sm">
                    Run in background
                  </Label>
                </div>
              </div>

              {/* Column Selection */}
              <div className="space-y-2">
                <Label>Export Columns</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedExportColumns.length} columns selected
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
                    {availableExportColumns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column}
                        checked={selectedExportColumns.includes(column)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExportColumns([...selectedExportColumns, column]);
                          } else {
                            setSelectedExportColumns(selectedExportColumns.filter(col => col !== column));
                          }
                        }}
                      >
                        {column}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Export Actions */}
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => exportProductsByStatus(false)} 
                  disabled={isExporting || !hasCredentials}
                  className="flex-1"
                >
                  {isExporting || isConcurrentExporting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {isExporting || isConcurrentExporting ? 'Exporting...' : 'Export Now'}
                </Button>
                
                {runInBackground && (
                  <Button 
                    onClick={() => exportProductsByStatus(true)} 
                   disabled={isExporting || isConcurrentExporting || !hasCredentials}
                    variant="secondary"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run in Background
                  </Button>
                )}
              </div>

              {/* Export Info */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Current Settings:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Page size: {exportPageSize} products/request</li>
                      <li>Rate limit: 250ms delay per API key</li>
                      <li>Max pages: Unlimited (fetches all available)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Using APIs:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {(selectedExportAPIs.length > 0 ? selectedExportAPIs : availableAPIs.filter(api => api.is_active).map(api => api.id)).map((apiId, index) => {
                        const api = availableAPIs.find(a => a.id === apiId);
                        return (
                          <li key={apiId}>API {index + 1}: {api?.name || 'Unknown'}</li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              {(isExporting || isConcurrentExporting) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Export Progress</span>
                    <span>{isConcurrentExporting ? concurrentOverallProgress : exportProgress}%</span>
                  </div>
                  <Progress value={isConcurrentExporting ? concurrentOverallProgress : exportProgress} className="w-full" />
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">{isConcurrentExporting ? concurrentExportStatus : exportStatus}</p>
                    <div className="flex items-center gap-4">
                      {exportTotalItems > 0 && !isConcurrentExporting && (
                        <span className="text-primary font-medium">
                          Estimated: ~{exportTotalItems} items
                        </span>
                      )}
                      {isConcurrentExporting && concurrentExportProgress.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">API Progress:</span>
                          {concurrentExportProgress.map((apiProgress, index) => {
                            const progressPercent = apiProgress.totalPages > 0 
                              ? Math.round((apiProgress.currentPage / apiProgress.totalPages) * 100)
                              : 0;
                            return (
                              <div key={apiProgress.apiKeyId} className="flex items-center gap-2 text-xs">
                                <span className="w-12 truncate">API {index + 1}</span>
                                <Progress value={progressPercent} className="flex-1 h-1" />
                                <span className="w-8 text-right">{progressPercent}%</span>
                                <span className="text-muted-foreground">({apiProgress.processedItems} items)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(isExporting || currentExportTaskId) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (currentExportTaskId) {
                              // Cancel background task
                              cancelTask(currentExportTaskId);
                            }
                            setIsExporting(false);
                            setCurrentExportTaskId(null);
                            setExportStatus('Export cancelled by user');
                            toast({
                              title: "Export Cancelled",
                              description: "Export has been cancelled",
                              variant: "destructive"
                            });
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {exportResults && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <div className="text-2xl font-bold">{exportResults.totalFound}</div>
                      <div className="text-sm text-muted-foreground">Total Products</div>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <div className="text-2xl font-bold">{exportResults.categories.size}</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <div className="text-center">
                        <Badge variant={getStatusBadgeVariant(selectedExportStatus)}>
                          {getProductStatusText(selectedExportStatus)}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">Status</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button onClick={downloadExportResults} className="w-48">
                      <Download className="h-4 w-4 mr-2" />
                      Download Excel Report
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>The Excel file contains:</p>
                    <ul className="list-disc list-inside ml-4 mt-2">
                      <li>Summary sheet with category breakdown and export settings</li>
                      <li>Complete products list with selected columns</li>
                      <li>Individual sheets for top 10 categories by product count</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Export History */}
              {savedExportHistory.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Export History
                    </CardTitle>
                    <CardDescription>
                      Recent export activities (last 10)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {savedExportHistory.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${
                              entry.status === 'completed' ? 'bg-green-500' :
                              entry.status === 'cancelled' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                             <div>
                               <div className="font-medium text-sm">
                                 {(entry.metadata as any)?.categories || 'Export'} - {entry.total_items} items
                               </div>
                               <div className="text-xs text-muted-foreground">
                                 {new Date(entry.created_at).toLocaleString()}
                                 {(entry.metadata as any)?.apiKeys > 1 && ` • ${(entry.metadata as any)?.apiKeys} API keys`}
                               </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              entry.status === 'completed' ? 'default' :
                              entry.status === 'cancelled' ? 'secondary' : 'destructive'
                            }>
                              {entry.status}
                            </Badge>
                             {entry.error_message && (
                               <Badge variant="outline" className="text-xs max-w-32 truncate">
                                 {entry.error_message}
                               </Badge>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* API Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  API Management
                </CardTitle>
                <CardDescription>
                  Configure and manage your Sunsky API credentials for product searching and importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${hasCredentials ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <span className="font-medium">
                          {hasCredentials ? 'Connected' : 'Not Connected'}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {hasCredentials 
                            ? 'Your API credentials are configured and ready to use.' 
                            : 'Please configure your API credentials below to enable importing.'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={hasCredentials ? 'default' : 'destructive'}>
                      {hasCredentials ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* API Credentials Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">API Credentials</h3>
                    <SunskyCredentialsManager onCredentialsChanged={checkCredentialsStatus} />
                  </div>

                  {/* Available APIs List */}
                  {availableAPIs.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Available API Keys</h3>
                      <div className="grid gap-3">
                        {availableAPIs.map((api) => (
                          <div key={api.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${api.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="font-medium">{api.name}</span>
                              <Badge variant={api.is_active ? 'default' : 'secondary'}>
                                {api.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                             <div className="flex items-center gap-2">
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => toggleApiKeyActive(api.id, !api.is_active)}
                               >
                                 {api.is_active ? 'Deactivate' : 'Activate'}
                               </Button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Job Details Dialog */}
      <Dialog open={showJobDetailsDialog} onOpenChange={setShowJobDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Job Details - {selectedJob?.type && selectedJob.type.charAt(0).toUpperCase() + selectedJob.type.slice(1)} Import
            </DialogTitle>
            <DialogDescription>
              View detailed information about this import job
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge 
                    variant={
                      selectedJob.status === 'completed' ? 'default' :
                      selectedJob.status === 'processing' ? 'secondary' :
                      selectedJob.status === 'failed' ? 'destructive' : 'outline'
                    }
                    className="w-fit"
                  >
                    {selectedJob.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Job Type</Label>
                  <div className="font-medium capitalize">{selectedJob.type}</div>
                </div>
              </div>

              {/* Progress Information */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">Progress</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedJob.total_items || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedJob.processed_items}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{selectedJob.success_count}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                </div>
                
                {selectedJob.total_items && selectedJob.total_items > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round((selectedJob.processed_items / selectedJob.total_items) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(selectedJob.processed_items / selectedJob.total_items) * 100} 
                      className="h-2" 
                    />
                  </div>
                )}
              </div>

              {/* Results Summary */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">Results</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedJob.success_count}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{selectedJob.error_count}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">Timeline</Label>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Created:</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedJob.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedJob.started_at && (
                    <div className="flex justify-between">
                      <span className="text-sm">Started:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedJob.started_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedJob.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm">Completed:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedJob.completed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Criteria */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">Search Criteria</Label>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedJob.criteria, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Error Details */}
              {selectedJob.last_error && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-muted-foreground">Error Details</Label>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="text-sm text-red-800 font-medium mb-2">Last Error:</div>
                    <div className="text-xs text-red-700 whitespace-pre-wrap">
                      {selectedJob.last_error}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Flags */}
              {(selectedJob.paused || selectedJob.cancelled) && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-muted-foreground">Flags</Label>
                  <div className="flex gap-2">
                    {selectedJob.paused && (
                      <Badge variant="secondary">Paused</Badge>
                    )}
                    {selectedJob.cancelled && (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={() => setShowJobDetailsDialog(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReAuthDialog
        open={showClearAuthDialog}
        onOpenChange={setShowClearAuthDialog}
        onSuccess={clearAllSKUs}
        title="Clear All SKUs - Authentication Required"
        description="This action will permanently delete all imported SKUs. Please confirm your identity to proceed."
      />
    </div>
  );
};

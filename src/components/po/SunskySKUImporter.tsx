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
import { Search, Plus, Download, AlertCircle, CheckCircle2, Package, Globe, Calendar, RefreshCw, Filter, Grid, List, Settings, Eye, Save, RotateCcw, Play, Pause, X, PauseCircle, PlayCircle, XCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DateRange } from "react-day-picker";
import { SunskyCredentialsManager } from "./SunskyCredentialsManager";
import { useSKUManager } from "@/hooks/useSKUManager";
import { useImportJobs } from "@/hooks/useImportJobs";
import { usePOOrders } from "@/hooks/usePOOrders";

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

export const SunskySKUImporter: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { sunskySKUs, isLoading: skusLoading, fetchSKUs, totalCount, refreshSKUs, addSKUs } = useSKUManager();
  const { jobs, isLoading: jobsLoading, createImportJob, fetchJobs } = useImportJobs();
  const { getPOModelNumbers } = usePOOrders();
  
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
  
  // Pagination for import jobs
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsPerPage] = useState(5);
  
  // API selection
  const [availableAPIs, setAvailableAPIs] = useState<Array<{id: string, name: string, is_active: boolean}>>([]);
  const [selectedAPI, setSelectedAPI] = useState<string>('');
  const [selectedSearchAPI, setSelectedSearchAPI] = useState<string>('');
  const [selectedJobAPI, setSelectedJobAPI] = useState<string>('');
  
  // SKU table column management - match search results headers
  const [skuTableHeaders, setSkuTableHeaders] = useState<string[]>([
    'sku_code', 'title', 'cost', 'currency', 'weight', 'country', 'created_at'
  ]);
  const [availableSkuHeaders] = useState<string[]>([
    'sku_code', 'title', 'cost', 'currency', 'weight', 'country', 'created_at', 'description'
  ]);

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

  const checkCredentialsStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sunsky_credentials')
        .select('is_active')
        .eq('user_id', profile?.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      setHasCredentials(!!data);
      
      // Load available APIs when checking credentials
      await loadAvailableAPIs();
    } catch (error) {
      console.error('Error checking credentials:', error);
      setHasCredentials(false);
    }
  };

  const callSunskyAPI = async (action: string, data: any, apiId?: string) => {
    console.log('Calling Sunsky API:', { action, data, apiId, selectedAPI });
    try {
      const { data: result, error } = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action, 
          ...data,
          apiId: apiId || selectedAPI // Use specified API or default
        }
      });

      console.log('Sunsky API response:', { result, error });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Sunsky API error:', error);
      throw error;
    }
  };

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
      
      if (result.success) {
        setCategories(result.data || []);
        // Reset subcategories when main categories change
        setSubCategories([]);
        setSelectedSubCategory('all');
        toast({
          title: "Success",
          description: `Loaded ${result.data?.length || 0} main categories`
        });
      } else {
        console.error('Categories API error:', result.error);
        throw new Error(result.error);
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
      
      if (result.success) {
        setSubCategories(result.data || []);
        console.log(`Loaded ${result.data?.length || 0} subcategories for category ${categoryId}`);
      } else {
        throw new Error(result.error);
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
      
      if (result.success) {
        setBrands(result.data || []);
        console.log('Set brands:', result.data?.length || 0);
        if (result.data?.length === 0) {
          toast({
            title: "Info",
            description: "No brands found for this category",
          });
        }
      } else {
        console.error('Brands API error:', result.error);
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
        pageSize: 20
      }, apiId || selectedSearchAPI);
      
      if (result.success) {
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
        throw new Error(result.error);
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
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
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
                description: productDetails.description || '',
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

  // Search PO model numbers in Sunsky and import matching items
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
          description: "No model numbers found in your PO orders to search",
          variant: "default"
        });
        return;
      }

      const uniqueModelNumbers = modelData.uniqueModels;

      // Create an import job for this PO search
      const { data: importJob, error: jobError } = await supabase
        .from('sunsky_import_jobs')
        .insert({
          user_id: profile?.id,
          type: 'po_search',
          criteria: { 
            source: 'po_model_numbers', 
            total_models: modelData.totalCount,
            unique_models: modelData.uniqueCount 
          },
          status: 'processing',
          total_items: modelData.totalCount,
          processed_items: 0,
          success_count: 0,
          error_count: 0,
          started_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (jobError) {
        console.error('Error creating import job:', jobError);
      }

      // Initialize stats - show total items correctly
      const initialStats = {
        totalItems: modelData.totalCount,
        searchedItems: 0,
        skippedItems: 0,
        matchedItems: 0,
        errorItems: 0,
        currentItem: ''
      };
      setPOSearchStats(initialStats);
      setPOSearchProgress(5);
      
      const batchSize = 10; // Process in batches to avoid overwhelming the API
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      // Normalize function to improve matching
      const normalizeModelNumber = (model: string) => {
        return model.trim().toLowerCase().replace(/[-_\s]/g, '');
      };

      for (let i = 0; i < uniqueModelNumbers.length; i += batchSize) {
        const batch = uniqueModelNumbers.slice(i, i + batchSize);
        
        for (const modelNumber of batch) {
          // Update current item being searched
          setPOSearchStats(prev => ({
            ...prev,
            currentItem: modelNumber
          }));

          try {
            let matchFound = false;
            let productToImport = null;

            // Strategy 1: Try exact match with getProductDetails if it looks like a Sunsky item number
            console.log(`Attempting direct lookup for model: ${modelNumber}`);
            if (modelNumber.match(/^[A-Z0-9]{6,}$/i)) {
              try {
                const detailResults = await callSunskyAPI('getProductDetails', {
                  itemNo: modelNumber
                });
                
                console.log(`Direct lookup response for ${modelNumber}:`, detailResults);
                
                if (detailResults?.result?.result === 'success' && detailResults.result.data) {
                  productToImport = detailResults.result.data;
                  matchFound = true;
                  console.log(`Direct match found for ${modelNumber}`, productToImport);
                } else {
                  console.log(`Direct lookup failed for ${modelNumber} - result structure:`, detailResults);
                }
              } catch (error) {
                console.log(`Direct lookup error for ${modelNumber}:`, error);
                // Check if it's a "record not found" error
                const errorMsg = error?.message || '';
                if (errorMsg.includes('这查看这条记录不存在') || errorMsg.includes('record') || errorMsg.includes('not') || errorMsg.includes('exist')) {
                  console.log(`Product ${modelNumber} not found in Sunsky, trying search`);
                } else {
                  console.error(`Unexpected direct lookup error for ${modelNumber}:`, error);
                }
              }
            } else {
              console.log(`Model ${modelNumber} doesn't match Sunsky pattern, skipping direct lookup`);
            }

            // Strategy 2: Search with broader parameters if no direct match
            if (!matchFound) {
              console.log(`Trying search for ${modelNumber}`);
              try {
                const searchResults = await callSunskyAPI('searchProducts', {
                  keyword: modelNumber,
                  page: 1,
                  pageSize: 10 // Get more results to find better matches
                });

                console.log(`Search response for ${modelNumber}:`, searchResults);

                if (searchResults?.result?.result === 'success' && searchResults.result.data?.products?.length > 0) {
                  console.log(`Found ${searchResults.result.data.products.length} products in search for ${modelNumber}`);
                  // Look for exact or close matches
                  const normalizedSearch = normalizeModelNumber(modelNumber);
                  let bestMatch = null;

                  for (const product of searchResults.result.data.products) {
                    const normalizedItem = normalizeModelNumber(product.itemNo || '');
                    const normalizedName = normalizeModelNumber(product.name || '');
                    
                    console.log(`Comparing ${normalizedSearch} with item: ${normalizedItem}, name: ${normalizedName}`);
                    
                    // Check for exact matches first
                    if (normalizedItem === normalizedSearch || 
                        normalizedName.includes(normalizedSearch) ||
                        normalizedSearch.includes(normalizedItem)) {
                      bestMatch = product;
                      console.log(`Found best match:`, product);
                      break;
                    }
                  }

                  if (bestMatch) {
                    // Get detailed information for the best match
                    try {
                      const detailResults = await callSunskyAPI('getProductDetails', {
                        itemNo: bestMatch.itemNo
                      });

                      console.log(`Detail results for best match ${bestMatch.itemNo}:`, detailResults);

                      if (detailResults?.result?.result === 'success' && detailResults.result.data) {
                        productToImport = detailResults.result.data;
                        matchFound = true;
                        console.log(`Search match found for ${modelNumber}: ${bestMatch.itemNo}`);
                      }
                    } catch (error) {
                      console.log(`Error getting details for matched product ${bestMatch.itemNo}:`, error);
                    }
                  } else {
                    console.log(`No suitable match found in search results for ${modelNumber}`);
                  }
                } else {
                  console.log(`Search returned no products for ${modelNumber}:`, searchResults);
                }
              } catch (error) {
                console.log(`Search failed for ${modelNumber}:`, error);
              }
            }

            console.log(`Final check for ${modelNumber}: matchFound=${matchFound}, productToImport=`, productToImport);
            
            if (matchFound && productToImport) {
              // Use upsert to handle duplicates gracefully
              try {
                console.log(`Attempting to import SKU: ${productToImport.itemNo}`);
                
                const { data: insertedData, error } = await supabase
                  .from('sunsky_skus')
                  .upsert({
                    user_id: profile?.id,
                    sku_code: productToImport.itemNo,
                    title: productToImport.name || '',
                    cost: productToImport.convertedPrice || parseFloat(productToImport.price || '0') || 0,
                    weight: productToImport.unitWeight ? parseFloat(productToImport.unitWeight) : 0,
                    currency: productToImport.convertedCurrency || 'USD',
                    country: profile?.country || 'UAE',
                    description: productToImport.description || '',
                    product_data: productToImport
                  }, {
                    onConflict: 'user_id,sku_code',
                    ignoreDuplicates: false
                  })
                  .select();

                if (!error) {
                  successCount++;
                  console.log(`Successfully imported/updated SKU: ${productToImport.itemNo}`, insertedData);
                } else {
                  console.error('Error upserting SKU:', error);
                  errorCount++;
                }
              } catch (dbError) {
                console.error('Database error upserting SKU:', dbError);
                errorCount++;
              }
            } else {
              skippedCount++;
              console.log(`No match found for model number: ${modelNumber}`, { 
                matchFound, 
                hasProductToImport: !!productToImport,
                productToImport: productToImport ? { itemNo: productToImport.itemNo, name: productToImport.name } : null
              });
            }

            processedCount++;
            
            // Update stats with local counters
            setPOSearchStats(prev => ({
              ...prev,
              searchedItems: processedCount,
              matchedItems: successCount,
              errorItems: errorCount,
              skippedItems: skippedCount
            }));

            // Update the import job progress
            if (importJob) {
              await supabase
                .from('sunsky_import_jobs')
                .update({
                  processed_items: processedCount,
                  success_count: successCount,
                  error_count: errorCount
                })
                .eq('id', importJob.id);
            }

          } catch (error) {
            console.error(`Error processing model number ${modelNumber}:`, error);
            errorCount++;
            processedCount++;
            
            setPOSearchStats(prev => ({
              ...prev,
              searchedItems: processedCount,
              errorItems: errorCount
            }));
            
            if (importJob) {
              await supabase
                .from('sunsky_import_jobs')
                .update({
                  processed_items: processedCount,
                  error_count: errorCount
                })
                .eq('id', importJob.id);
            }
          }
        }
        
        // Update progress based on processed unique models
        const progressPercentage = Math.min(90, (processedCount / uniqueModelNumbers.length) * 85 + 5);
        setPOSearchProgress(progressPercentage);
      }

      setPOSearchProgress(95);
      
      // Complete the import job
      if (importJob) {
        await supabase
          .from('sunsky_import_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', importJob.id);
      }
      
      // Force refresh the SKU list and jobs list to show new imports
      console.log('Force refreshing SKU list after PO import...');
      try {
        // Clear cache and force refresh
        await fetchSKUs(1, false); // Force refresh without cache
        await fetchJobs();
        console.log('SKU list and jobs refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Fallback: try the refresh function
        try {
          await refreshSKUs();
        } catch (fallbackError) {
          console.error('Fallback refresh also failed:', fallbackError);
        }
      }
      
      setPOSearchProgress(100);
      setPOSearchStats(prev => ({ ...prev, currentItem: 'Complete!' }));

      const finalStats = poSearchStats;
      toast({
        title: "PO Model Number Search Complete",
        description: `Found and imported ${finalStats.matchedItems} items from ${finalStats.totalItems} model numbers. ${finalStats.skippedItems} items not found, ${finalStats.errorItems} errors.`,
        variant: finalStats.matchedItems > 0 ? "default" : "default"
      });

    } catch (error) {
      console.error('Error searching PO model numbers:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search PO model numbers",
        variant: "destructive"
      });
    } finally {
      setIsSearchingPO(false);
      setPOSearchProgress(0);
      setPOSearchStats({
        totalItems: 0,
        searchedItems: 0,
        skippedItems: 0,
        matchedItems: 0,
        errorItems: 0,
        currentItem: ''
      });
    }
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search & Import</TabsTrigger>
          <TabsTrigger value="jobs">Import Jobs</TabsTrigger>
          <TabsTrigger value="skus">Imported SKUs</TabsTrigger>
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
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {poSearchStats.searchedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Searched</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">
                          {poSearchStats.matchedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Matched</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-yellow-600">
                          {poSearchStats.skippedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Skipped</div>
                      </div>
                      
                      <div className="bg-card p-3 rounded-lg border">
                        <div className="text-2xl font-bold text-red-600">
                          {poSearchStats.errorItems}
                        </div>
                        <div className="text-xs text-muted-foreground">Errors</div>
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
                        <div key={job.id} className="border rounded-lg p-4">
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
                                  onClick={() => pauseJob(job.id)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {job.status === 'processing' && job.paused && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resumeJob(job.id)}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {(job.status === 'processing' || job.status === 'queued') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelJob(job.id)}
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
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {availableSkuHeaders.map((header) => (
                          <DropdownMenuCheckboxItem
                            key={header}
                            checked={skuTableHeaders.includes(header)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSkuTableHeaders([...skuTableHeaders, header]);
                              } else {
                                setSkuTableHeaders(skuTableHeaders.filter(h => h !== header));
                              }
                            }}
                          >
                            {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </DropdownMenuCheckboxItem>
                        ))}
                        <div className="border-t pt-2 mt-2">
                          <Button 
                            onClick={saveColumnPreferences}
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Preferences
                          </Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button 
                      onClick={() => fetchSKUs(1, false)}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    
                    <Button 
                      onClick={clearAllSKUs}
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
                        {sunskySKUs.map((sku) => (
                          <TableRow key={sku.id}>
                            {skuTableHeaders.map((header) => (
                              <TableCell key={header} className={header === 'sku_code' ? 'font-mono' : header === 'title' ? 'max-w-xs truncate' : header === 'created_at' ? 'text-sm text-muted-foreground' : ''}>
                                {header === 'created_at' 
                                  ? new Date(sku[header as keyof typeof sku] as string).toLocaleDateString()
                                  : header === 'cost' && sku.cost
                                  ? sku.cost.toFixed(2)
                                  : (sku[header as keyof typeof sku] as string) || '-'
                                }
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                                onClick={() => {
                                  setSelectedAPI(api.id);
                                  setSelectedSearchAPI(api.id);
                                  setSelectedJobAPI(api.id);
                                }}
                              >
                                Set as Default
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
    </div>
  );
};

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
import { Search, Plus, Download, AlertCircle, CheckCircle2, Package, Globe, Calendar, RefreshCw, Filter, Grid, List, Settings, Eye, Save, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DateRange } from "react-day-picker";
import { SunskyCredentialsManager } from "./SunskyCredentialsManager";
import { useSKUManager } from "@/hooks/useSKUManager";
import { useImportJobs } from "@/hooks/useImportJobs";

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
  code: string;
  name: string;
  parentId: number;
  status: number;
  shortName?: string;
  hsCode?: string;
  gmtModified?: string;
  level?: number;
  hasChildren?: boolean;
}

interface SunskyBrand {
  id: number;
  name: string;
  code?: string;
}

interface SearchFilters {
  keyword?: string;
  categoryId?: string;
  brandId?: string;
  brandName?: string;
  leadTimeLevel?: string;
  priceMin?: number;
  priceMax?: number;
  stockMin?: number;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const SunskySKUImporter: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { sunskySKUs, isLoading: skusLoading, fetchSKUs, totalCount } = useSKUManager();
  const { jobs, isLoading: jobsLoading, createImportJob, fetchJobs } = useImportJobs();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [leadTimeLevel, setLeadTimeLevel] = useState<string>('');
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedProduct, setSelectedProduct] = useState<SunskyProduct | null>(null);
  const [categoryFetchMode, setCategoryFetchMode] = useState<'top' | 'all' | 'modified'>('top');
  const [modifiedSinceDate, setModifiedSinceDate] = useState<string>('');
  const [fetchingCategories, setFetchingCategories] = useState(false);
  
  // Header management
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([
    'itemNo', 'name', 'brandName', 'stock', 'leadTime', 'warehouse', 'price', 'convertedPrice'
  ]);
  const [showHeaderSelector, setShowHeaderSelector] = useState(false);

  // Load categories on mount and when credentials change
  useEffect(() => {
    if (hasCredentials) {
      loadCategories();
      fetchSKUs();
      fetchJobs();
    }
  }, [hasCredentials]);

  // Load subcategories when main category changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all' && hasCredentials) {
      loadSubCategories(parseInt(selectedCategory));
    } else {
      setSubCategories([]);
      setSelectedSubCategory('all');
    }
  }, [selectedCategory, hasCredentials]);

  const checkCredentialsStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCredentialsStatus' }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setHasCredentials(data.hasCredentials);
      }
    } catch (error) {
      console.error('Error checking credentials status:', error);
      setHasCredentials(false);
    }
  };

  useEffect(() => {
    checkCredentialsStatus();
  }, []);

  const loadCategories = async (mode: 'top' | 'all' | 'modified' = 'top', modifiedSince?: string) => {
    setFetchingCategories(true);
    try {
      const requestBody: any = { action: 'getCategories' };
      
      if (mode === 'top') {
        requestBody.parentId = 0;
      } else if (mode === 'all') {
        // Don't set parentId to get all categories
      } else if (mode === 'modified' && modifiedSince) {
        requestBody.gmtModifiedStart = modifiedSince;
      }

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: requestBody
      });

      if (error) throw error;

      if (data.result === 'success') {
        setCategories(data.data || []);
        toast({
          title: "Categories Loaded",
          description: `Successfully loaded ${data.data?.length || 0} categories`,
        });
      } else {
        console.warn('Categories API returned:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load Sunsky categories. Please check your API credentials.",
        variant: "destructive",
      });
    } finally {
      setFetchingCategories(false);
    }
  };

  const loadSubCategories = async (parentId: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getCategories', parentId }
      });

      if (error) throw error;

      if (data.result === 'success') {
        setSubCategories(data.data || []);
      } else {
        console.warn('Sub-categories API returned:', data);
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Error loading sub-categories:', error);
      setSubCategories([]);
    }
  };

  const searchProducts = async (page = 1) => {
    if (!hasCredentials) {
      toast({
        title: "No API Credentials",
        description: "Please configure your Sunsky API credentials first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const searchParams: any = {
        action: 'searchProducts',
        page,
        pageSize: 20,
        status: 1 // Only valid products
      };

      // Use subcategory if selected, otherwise use main category
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        searchParams.categoryId = selectedSubCategory;
      } else if (selectedCategory && selectedCategory !== 'all') {
        searchParams.categoryId = selectedCategory;
      }

      if (searchTerm.trim()) {
        searchParams.keyword = searchTerm.trim();
      }

      if (selectedBrand.trim()) {
        searchParams.brandName = selectedBrand.trim();
      }

      if (leadTimeLevel) {
        searchParams.leadTimeLevel = leadTimeLevel;
      }

      if (dateRange?.from) {
        // Format date for Sunsky API: MM/dd/yyyy HH:mm:ss
        const fromDate = new Date(dateRange.from);
        searchParams.gmtModifiedStart = `${(fromDate.getMonth() + 1).toString().padStart(2, '0')}/${fromDate.getDate().toString().padStart(2, '0')}/${fromDate.getFullYear()} 00:00:00`;
      }

      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        searchParams.dateTo = `${(toDate.getMonth() + 1).toString().padStart(2, '0')}/${toDate.getDate().toString().padStart(2, '0')}/${toDate.getFullYear()} 23:59:59`;
      }

      console.log('Search parameters:', searchParams);

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: searchParams
      });

      if (error) throw error;

      if (data.result === 'success') {
        const products = data.data?.result || [];
        setProducts(products);
        setTotalPages(data.data?.pageCount || 1);
        setCurrentPage(page);
        
        // Analyze available headers from the response
        analyzeAvailableHeaders(products);
      } else {
        throw new Error(data.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: "Error",
        description: "Failed to search Sunsky products. Please check your API credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductDetails = async (itemNo: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: { action: 'getProductDetails', itemNo }
      });

      if (error) throw error;

      if (data.result === 'success') {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get product details');
      }
    } catch (error) {
      console.error('Error getting product details:', error);
      return null;
    }
  };

  const createCategoryImportJob = async () => {
    try {
      console.log('Creating import job with selectedCategory:', selectedCategory);
      
      const criteria: any = {};
      
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        criteria.categoryId = selectedSubCategory;
        console.log('Using subcategory:', selectedSubCategory);
      } else if (selectedCategory && selectedCategory !== 'all') {
        criteria.categoryId = selectedCategory;
        console.log('Using category:', selectedCategory);
      } else {
        throw new Error('Please select a category');
      }
      
      if (dateRange?.from) {
        criteria.dateFrom = dateRange.from.toISOString();
      }
      
      if (dateRange?.to) {
        criteria.dateTo = dateRange.to.toISOString();
      }

      console.log('Import job criteria:', criteria);
      
      await createImportJob('category', criteria);
      
    } catch (error) {
      console.error('Error creating import job:', error);
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSelectedBrand('');
    setLeadTimeLevel('');
    setPriceMin('');
    setPriceMax('');
    setStockMin('');
    setDateRange(undefined);
    setProducts([]);
    setSelectedProducts(new Set());
    setCurrentPage(1);
  };

  const toggleProductSelection = (itemNo: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(itemNo)) {
      newSelection.delete(itemNo);
    } else {
      newSelection.add(itemNo);
    }
    setSelectedProducts(newSelection);
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.itemNo)));
    }
  };

  const importSelectedSKUs = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one product to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const selectedSkus = products
        .filter(p => selectedProducts.has(p.itemNo))
        .map(p => ({ itemNo: p.itemNo }));

      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'importSKUs',
          skus: selectedSkus
        }
      });

      if (error) throw error;

      if (data.result === 'success') {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${data.data.imported} SKUs`,
        });
        
        // Clear selection
        setSelectedProducts(new Set());
        
        // Refresh products list
        searchProducts(currentPage);
      } else {
        throw new Error(data.message || 'Failed to import SKUs');
      }
    } catch (error) {
      console.error('Error importing SKUs:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import SKUs",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'AED': return 'AED';
      case 'SAR': return 'SAR';
      case 'USD': return '$';
      default: return currency;
    }
  };

  // Available headers with their display names and descriptions
  const headerDefinitions = {
    itemNo: { label: 'Item No', description: 'Product item number/SKU' },
    name: { label: 'Product Name', description: 'Full product name' },
    brandName: { label: 'Brand', description: 'Brand/manufacturer name' },
    stock: { label: 'Stock', description: 'Available quantity' },
    leadTime: { label: 'Lead Time', description: 'Shipping/production time' },
    warehouse: { label: 'Warehouse', description: 'Fulfillment location' },
    price: { label: 'Price (USD)', description: 'Original USD price' },
    convertedPrice: { label: 'Local Price', description: 'Price in local currency' },
    description: { label: 'Description', description: 'Product description' },
    categoryId: { label: 'Category ID', description: 'Product category identifier' },
    moq: { label: 'MOQ', description: 'Minimum order quantity' },
    unitWeight: { label: 'Weight', description: 'Unit weight' },
    unitLength: { label: 'Length', description: 'Unit length (mm)' },
    unitWidth: { label: 'Width', description: 'Unit width (mm)' },
    unitHeight: { label: 'Height', description: 'Unit height (mm)' },
    packQty: { label: 'Pack Qty', description: 'Quantity per package' },
    barcode: { label: 'Barcode', description: 'Product barcode' },
    gmtListed: { label: 'Listed Date', description: 'Date product was listed' },
    gmtModified: { label: 'Modified Date', description: 'Last modification date' },
    picCount: { label: 'Images', description: 'Number of product images' },
    modelLabel: { label: 'Model Label', description: 'Model classification (Color, Size, etc.)' },
    oem: { label: 'OEM', description: 'OEM support available' },
    withLogo: { label: 'With Logo', description: 'Logo customization available' },
    containsBattery: { label: 'Has Battery', description: 'Contains battery' },
    clearance: { label: 'Clearance', description: 'Clearance item' },
    orgPrice: { label: 'Original Price', description: 'Original price (if on sale)' },
    status: { label: 'Status', description: 'Product status code' },
    groupItemNo: { label: 'Group Item No', description: 'Base item number for variants' },
    leadTimeLevel: { label: 'Lead Time Level', description: 'Lead time category (1-5)' },
    packWeight: { label: 'Pack Weight', description: 'Package weight (kg)' },
    packLength: { label: 'Pack Length', description: 'Package length (mm)' },
    packWidth: { label: 'Pack Width', description: 'Package width (mm)' },
    packHeight: { label: 'Pack Height', description: 'Package height (mm)' }
  };

  // Analyze products and extract available headers
  const analyzeAvailableHeaders = (products: SunskyProduct[]) => {
    if (products.length === 0) return;
    
    const headers = new Set<string>();
    products.forEach(product => {
      Object.keys(product).forEach(key => {
        if (headerDefinitions[key as keyof typeof headerDefinitions]) {
          headers.add(key);
        }
      });
    });
    
    setAvailableHeaders(Array.from(headers).sort());
  };

  // Save header preferences
  const saveHeaderPreferences = () => {
    localStorage.setItem('sunsky-selected-headers', JSON.stringify(selectedHeaders));
    toast({
      title: "Preferences Saved",
      description: "Your header preferences have been saved for future sessions",
    });
  };

  // Load header preferences
  const loadHeaderPreferences = () => {
    const saved = localStorage.getItem('sunsky-selected-headers');
    if (saved) {
      try {
        const headers = JSON.parse(saved);
        setSelectedHeaders(headers);
        toast({
          title: "Preferences Loaded",
          description: "Your saved header preferences have been restored",
        });
      } catch (error) {
        console.error('Error loading header preferences:', error);
      }
    }
  };

  // Reset to default headers
  const resetHeadersToDefault = () => {
    setSelectedHeaders(['itemNo', 'name', 'brandName', 'stock', 'leadTime', 'warehouse', 'price', 'convertedPrice']);
    toast({
      title: "Headers Reset",
      description: "Header selection has been reset to default",
    });
  };

  // Format field value for display
  const formatFieldValue = (value: any, fieldKey: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (fieldKey) {
      case 'stock':
        return <Badge variant={value > 0 ? "default" : "secondary"}>{value}</Badge>;
      case 'price':
        return `$${value}`;
      case 'convertedPrice':
        return value ? `${getCurrencySymbol(profile?.country === 'KSA' ? 'SAR' : 'AED')} ${Number(value).toFixed(2)}` : '-';
      case 'unitWeight':
        return value ? `${value}g` : '-';
      case 'unitLength':
      case 'unitWidth':
      case 'unitHeight':
      case 'packLength':
      case 'packWidth':
      case 'packHeight':
        return value ? `${value}mm` : '-';
      case 'packWeight':
        return value ? `${value}kg` : '-';
      case 'oem':
      case 'withLogo':
      case 'containsBattery':
      case 'clearance':
        return value ? 'Yes' : 'No';
      case 'gmtListed':
      case 'gmtModified':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'name':
      case 'description':
        return <span className="max-w-xs truncate block" title={value}>{value}</span>;
      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sunsky Product Importer</h1>
          <p className="text-muted-foreground mt-2">
            Search and import products from Sunsky-Online marketplace
          </p>
        </div>
        {profile && (
          <Badge variant="outline">
            <Globe className="mr-2 h-4 w-4" />
            {profile.country} ({profile.country === 'KSA' ? 'SAR' : 'AED'})
          </Badge>
        )}
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials">API Connection</TabsTrigger>
          <TabsTrigger value="search" disabled={!hasCredentials}>Search Products</TabsTrigger>
          <TabsTrigger value="imported">Imported SKUs & Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-6">
          <SunskyCredentialsManager 
            onCredentialsChanged={() => {
              checkCredentialsStatus();
            }}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          {!hasCredentials ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">API Configuration Required</h3>
                <p className="text-muted-foreground text-center">
                  Please configure your Sunsky API credentials in the API Connection tab first
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Category Browser */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="h-5 w-5" />
                    Category Browser
                  </CardTitle>
                  <CardDescription>
                    Fetch and browse Sunsky product categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fetch-mode">Fetch Mode</Label>
                      <Select value={categoryFetchMode} onValueChange={(value: 'top' | 'all' | 'modified') => setCategoryFetchMode(value)}>
                        <SelectTrigger id="fetch-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top Level Categories</SelectItem>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="modified">Modified Since Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {categoryFetchMode === 'modified' && (
                      <div className="space-y-2">
                        <Label htmlFor="modified-since">Modified Since</Label>
                        <Input
                          id="modified-since"
                          type="datetime-local"
                          value={modifiedSinceDate}
                          onChange={(e) => setModifiedSinceDate(e.target.value)}
                          placeholder="Select date and time"
                        />
                      </div>
                    )}

                    <div className="flex items-end">
                      <Button 
                        onClick={() => {
                          if (categoryFetchMode === 'modified' && !modifiedSinceDate) {
                            toast({
                              title: "Date Required",
                              description: "Please select a modified since date",
                              variant: "destructive",
                            });
                            return;
                          }
                          const formattedDate = categoryFetchMode === 'modified' 
                            ? new Date(modifiedSinceDate).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })
                            : undefined;
                          loadCategories(categoryFetchMode, formattedDate);
                        }}
                        disabled={fetchingCategories}
                        className="w-full"
                      >
                        {fetchingCategories ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Fetch Categories
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Loaded {categories.length} categories successfully. Use the search filters below to find products.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Search Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">Product Search</Label>
                      <Input
                        id="search"
                        placeholder="Enter keyword..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand Name</Label>
                      <Input
                        id="brand"
                        placeholder="Enter brand name..."
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger id="category">
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

                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Sub-Category</Label>
                      <Select 
                        value={selectedSubCategory} 
                        onValueChange={setSelectedSubCategory}
                        disabled={selectedCategory === 'all' || subCategories.length === 0}
                      >
                        <SelectTrigger id="subcategory">
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sub-Categories</SelectItem>
                          {subCategories.map((subCategory) => (
                            <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                              {subCategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Advanced Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="leadtime">Lead Time Level</Label>
                      <Select value={leadTimeLevel} onValueChange={setLeadTimeLevel}>
                        <SelectTrigger id="leadtime">
                          <SelectValue placeholder="Select lead time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Lead Times</SelectItem>
                          <SelectItem value="1">1-3 days</SelectItem>
                          <SelectItem value="2">4-7 days</SelectItem>
                          <SelectItem value="3">1-2 weeks</SelectItem>
                          <SelectItem value="4">2-4 weeks</SelectItem>
                          <SelectItem value="5">1+ months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pricemin">Min Price (USD)</Label>
                      <Input
                        id="pricemin"
                        type="number"
                        placeholder="0.00"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pricemax">Max Price (USD)</Label>
                      <Input
                        id="pricemax"
                        type="number"
                        placeholder="999.99"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stockmin">Min Stock Quantity</Label>
                      <Input
                        id="stockmin"
                        type="number"
                        placeholder="1"
                        value={stockMin}
                        onChange={(e) => setStockMin(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range (Modified)</Label>
                      <DatePickerWithRange
                        date={dateRange}
                        onDateChange={setDateRange}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => searchProducts(1)} disabled={loading}>
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Search Products
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetAllFilters}>
                      <Filter className="mr-2 h-4 w-4" />
                      Reset All Filters
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                      title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
                    >
                      {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                    </Button>
                    
                    <Dialog open={showHeaderSelector} onOpenChange={setShowHeaderSelector}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Table Headers
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Customize Table Headers
                          </DialogTitle>
                          <DialogDescription>
                            Select which columns you want to display in the product table. {availableHeaders.length} headers available from current data.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Header actions */}
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={loadHeaderPreferences} 
                              variant="outline" 
                              size="sm"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Load Saved
                            </Button>
                            <Button 
                              onClick={saveHeaderPreferences} 
                              variant="outline" 
                              size="sm"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save Current
                            </Button>
                            <Button 
                              onClick={resetHeadersToDefault} 
                              variant="outline" 
                              size="sm"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reset to Default
                            </Button>
                          </div>
                          
                          <Separator />
                          
                          {/* Current selection summary */}
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Currently selected: {selectedHeaders.length} headers</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedHeaders.map(header => (
                                <Badge key={header} variant="default" className="text-xs">
                                  {headerDefinitions[header as keyof typeof headerDefinitions]?.label || header}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Header selection grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {availableHeaders.map(header => {
                              const definition = headerDefinitions[header as keyof typeof headerDefinitions];
                              if (!definition) return null;
                              
                              return (
                                <div key={header} className="flex items-start space-x-3 p-3 border rounded-lg">
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
                                  <div className="flex-1 min-w-0">
                                    <label 
                                      htmlFor={header} 
                                      className="text-sm font-medium cursor-pointer block"
                                    >
                                      {definition.label}
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {definition.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {availableHeaders.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-4" />
                              <p>No product data available yet.</p>
                              <p className="text-sm">Search for products to see available headers.</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              {products.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Search Results ({products.length} items)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {selectedProducts.size > 0 && (
                          <Button 
                            onClick={importSelectedSKUs}
                            disabled={importing}
                            size="sm"
                          >
                            {importing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                Importing {selectedProducts.size} SKUs...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Import {selectedProducts.size} Selected SKUs
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {importing && (
                      <div className="mb-4">
                        <Progress value={importProgress} className="w-full" />
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
                            {selectedHeaders.map(header => {
                              const definition = headerDefinitions[header as keyof typeof headerDefinitions];
                              return (
                                <TableHead key={header}>
                                  {definition?.label || header}
                                </TableHead>
                              );
                            })}
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
                              {selectedHeaders.map(header => (
                                <TableCell key={header} className={header === 'itemNo' ? 'font-mono' : ''}>
                                  {formatFieldValue(product[header as keyof SunskyProduct], header)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => searchProducts(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => searchProducts(currentPage + 1)}
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

              {/* Empty State */}
              {!loading && products.length === 0 && searchTerm === '' && selectedCategory === 'all' && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Start Your Product Search</h3>
                    <p className="text-muted-foreground text-center">
                      Use the filters above to search for products from Sunsky marketplace
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* No Results */}
              {!loading && products.length === 0 && (searchTerm !== '' || selectedCategory !== 'all') && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                    <p className="text-muted-foreground text-center">
                      Try adjusting your search filters or keywords
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="imported">
          <div className="space-y-6">
            {/* Import Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Create Import Task
                </CardTitle>
                <CardDescription>
                  Create background import jobs to process large product catalogs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <Select value="category">
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">Import by Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                </div>

                <Button 
                  onClick={createCategoryImportJob} 
                  disabled={!selectedCategory || selectedCategory === 'all' || jobsLoading}
                  className="w-full"
                >
                  {jobsLoading ? 'Creating...' : 'Create Import Task'}
                </Button>
              </CardContent>
            </Card>

            {/* Import Jobs List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Import Jobs
                </CardTitle>
                <CardDescription>
                  Monitor the status of your import tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No import jobs created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'processing' ? 'secondary' :
                                job.status === 'failed' ? 'destructive' : 'outline'
                              }
                            >
                              {job.status}
                            </Badge>
                            <span className="font-medium capitalize">{job.type}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {job.total_items && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{job.processed_items}/{job.total_items}</span>
                            </div>
                            <Progress 
                              value={(job.processed_items / job.total_items) * 100} 
                              className="h-2" 
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Success: {job.success_count}</span>
                              <span>Errors: {job.error_count}</span>
                            </div>
                          </div>
                        )}
                        
                        {job.last_error && (
                          <div className="mt-2 text-sm text-destructive">
                            Error: {job.last_error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
                  <Button 
                    onClick={() => fetchSKUs()}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
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
                          <TableHead>SKU Code</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Imported</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sunskySKUs.map((sku) => (
                          <TableRow key={sku.id}>
                            <TableCell className="font-mono">{sku.sku_code}</TableCell>
                            <TableCell className="max-w-xs truncate" title={sku.title}>
                              {sku.title || '-'}
                            </TableCell>
                            <TableCell>
                              {sku.cost ? `${sku.cost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>{sku.currency || '-'}</TableCell>
                            <TableCell>{sku.country || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(sku.created_at).toLocaleDateString()}
                            </TableCell>
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
      </Tabs>
    </div>
  );
};

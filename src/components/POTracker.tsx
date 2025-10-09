// POTracker component for Amazon purchase orders - updated
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw, Printer, Zap, Image as ImageIcon, CheckSquare, Square, ArrowUpDown, AlertTriangle, FileText, ArrowLeft } from 'lucide-react';
import { SortableTableHeader } from '@/components/order-processing/SortableTableHeader';
import { useToast } from '@/hooks/use-toast';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
import { POReportsSection } from '@/components/po/POReportsSection';
import { POPrintDialog } from '@/components/po/POPrintDialog';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useProductImages } from '@/hooks/useProductImages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, LabelElement, LabelSize } from '@/types/label';

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
  status: 'pending' | 'placed' | 'received' | 'cancelled' | 'closed';
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
  sunsky_sku?: any;
}

interface POGroup {
  poNumber: string;
  orders: POOrder[];
}

export const POTracker = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<POOrder['status'] | 'all'>('all');
  const [printedFilter, setPrintedFilter] = useState<'all' | 'printed' | 'not-printed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof POOrder | 'combined_title'>('po_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [originalOrderPreserved, setOriginalOrderPreserved] = useState(false);
  
  // Print Labels state - Two-step flow
  const [labelsStep, setLabelsStep] = useState<'list' | 'print'>('list');
  const [selectedPOForLabels, setSelectedPOForLabels] = useState<string | null>(null);
  const [selectedPOsForLabels, setSelectedPOsForLabels] = useState<Set<string>>(new Set()); // Multi-select
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [debouncedLabelSearch, setDebouncedLabelSearch] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'po_number'>('all');
  const [selectedForPrint, setSelectedForPrint] = useState<Map<string, number>>(new Map());
  const [labelCurrentPage, setLabelCurrentPage] = useState(1);
  const [labelItemsPerPage, setLabelItemsPerPage] = useState(20);
  
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
        return { ...defaultPrintSettings, ...JSON.parse(stored) };
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
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
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
  
  const [qzConnected, setQzConnected] = useState(false);
  const [selectedPOsForBulkClose, setSelectedPOsForBulkClose] = useState<Set<string>>(new Set());
  const [disabledPOs, setDisabledPOs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('poTracker_disabledPOs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showBulkCloseConfirm, setShowBulkCloseConfirm] = useState(false);
  const [isClosingPOs, setIsClosingPOs] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingItems, setPrintingItems] = useState<Set<string>>(new Set());
  const [preventTableReorder, setPreventTableReorder] = useState(false);
  
  // Print Dialog State
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>('single');
  const [printOrders, setPrintOrders] = useState<POOrder[]>([]);
  
  // Inventory data for matching
  const [inventoryData, setInventoryData] = useState<{
    asinInventory: any[];
    skuInventory: any[];
  }>({
    asinInventory: [],
    skuInventory: []
  });

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
  const handleSort = (field: keyof POOrder | 'combined_title') => {
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

  const loadPrinters = async () => {
    try {
      const printers = await qzConnectionManager.getPrinters();
      setAvailablePrinters(printers);
      
      // Set default printer
      const defaultPrinter = await qzConnectionManager.getDefaultPrinter();
      if (defaultPrinter) {
        setSelectedPrinter(defaultPrinter);
      } else if (printers.length > 0) {
        setSelectedPrinter(printers[0]);
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
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
  const { profile, loading: profileLoading } = useUserProfile();
  const { selectedCountry } = useCountry();
  const { getImageByAsin, productImages, isLoading: imagesLoading, refreshImages } = useProductImages();
  const { toast } = useToast();
  // Function to handle bulk PO closing
  const handleBulkClosePOs = async (poNumbers: string[]) => {
    setIsClosingPOs(true);
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .in('po_number', poNumbers)
        .eq('user_id', profile?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${poNumbers.length} PO${poNumbers.length !== 1 ? 's' : ''} closed successfully.`,
      });

      fetchPOOrders(true);
    } catch (error) {
      console.error('Error closing POs:', error);
      toast({
        title: "Error",
        description: "Failed to close POs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClosingPOs(false);
      setSelectedPOsForBulkClose(new Set());
      setShowBulkCloseConfirm(false);
    }
  };

  // Function to handle individual PO closing
  const handleClosePO = async (poNumber: string) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('po_number', poNumber)
        .eq('user_id', profile?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `PO ${poNumber} closed successfully.`,
      });

      fetchPOOrders(true);
    } catch (error) {
      console.error('Error closing PO:', error);
      toast({
        title: "Error",
        description: `Failed to close PO ${poNumber}. Please try again.`,
        variant: "destructive",
      });
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
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${todayOrders.length} PO orders uploaded today from ${selectedCountry}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const orderIds = todayOrders.map(order => order.id);
      await deletePOOrders(orderIds);
      toast({
        title: "Success",
        description: `Deleted ${todayOrders.length} PO orders from ${selectedCountry}`,
      });
    } catch (error) {
      console.error('Error deleting today\'s orders:', error);
      toast({
        title: "Error",
        description: "Failed to delete today's orders",
        variant: "destructive",
      });
    }
  };

  // Query to fetch available label templates with full data
  const { data: labelTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['label-templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('label_templates')
        .select('id, name, description, canvas_data, width, height')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching label templates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // New query to fetch deduplicated PO metrics from database
  const { data: comprehensiveMetrics, isLoading: isLoadingComprehensiveMetrics, refetch: refetchComprehensiveMetrics, error: comprehensiveMetricsError } = useQuery({
    queryKey: ['po-comprehensive-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching comprehensive PO metrics for user:', user.id);

      const { data, error } = await supabase.rpc('get_po_comprehensive_metrics', {
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
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Keep the existing PO group metrics query for the grouped view
  const { data: poGroupMetrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['po-group-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching PO group metrics (includes all items)...');
      const { data, error } = await supabase.rpc('get_po_group_metrics', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching PO group metrics:', error);
        throw error;
      }

      console.log('📊 PO group metrics fetched:', data?.length, 'POs');
      return data as Array<{
        po_number: string;
        distinct_skus: number;
        asn_quantity: number;
      }>;
    },
    enabled: !!profile?.id,
    staleTime: 0, // Force fresh data
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
      const { data: { user } } = await supabase.auth.getUser();
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
      sampleOrders: poOrders.slice(0, 2).map(o => ({ po: o.po_number, country: o.country }))
    });
  }, [poOrders, isLoading, selectedCountry]);

  const initializeQZ = async () => {
    try {
      const connected = await qzConnectionManager.connect();
      if (connected) {
        const printers = await qzConnectionManager.getPrinters();
        setAvailablePrinters(printers);
        
        // Set default printer
        const defaultPrinter = await qzConnectionManager.getDefaultPrinter();
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0]);
        }
        
        toast({
          title: "QZ Tray Connected",
          description: `Found ${printers.length} printer(s)`,
        });
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
    }
  };

  // Refetch metrics when PO orders change - Fixed to prevent infinite loop
  useEffect(() => {
    if (!isLoading && refetchMetrics && refetchComprehensiveMetrics) {
      refetchMetrics();
      refetchComprehensiveMetrics();
    }
  }, [poOrders?.length, isLoading]); // Only depend on length, not the functions

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
        const { data, error } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(asinPage * pageSize, (asinPage + 1) * pageSize - 1);
        
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
        const { data, error } = await supabase
          .from('sku_inventory')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(skuPage * pageSize, (skuPage + 1) * pageSize - 1);
        
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

  // Function to find inventory match - Show serial numbers even for items with 0 quantity
  const findInventoryMatch = (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string, orderSunskySku?: any) => {
    if (!asin && !sunskySku && !poSku && !modelNumber) {
      return null;
    }

    // Check ASIN inventory FIRST - show serial numbers even if quantity is 0
    if (asin && inventoryData?.asinInventory?.length > 0) {
      const asinMatches = inventoryData.asinInventory.filter(item => 
        item.asin && item.asin.trim().toUpperCase() === asin.trim().toUpperCase()
      );
      
      console.log('🔍 findInventoryMatch for ASIN:', asin, {
        totalInventoryItems: inventoryData.asinInventory.length,
        matchesFound: asinMatches.length,
        matches: asinMatches.map(m => ({
          asin: m.asin,
          serial: m.serial_number,
          qty: m.quantity
        }))
      });
      
      if (asinMatches.length > 0) {
        // Get all serial numbers from matching items (regardless of quantity)
        const serialNumbers = asinMatches
          .filter(item => item.serial_number && item.serial_number.trim())
          .map(item => item.serial_number.trim());
        
        const totalQuantity = asinMatches.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        
        console.log('📋 Serial numbers extracted:', {
          asin,
          serialNumbers,
          totalQuantity
        });
        
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

    // Check SKU inventory by multiple identifiers
    if (inventoryData?.skuInventory?.length > 0) {
      const skusToCheck = [sunskySku, poSku, modelNumber, asin].filter(Boolean);
      
      for (const sku of skusToCheck) {
        const skuMatch = inventoryData.skuInventory.find(item => 
          (item.sku_number && item.sku_number.trim().toUpperCase() === sku.trim().toUpperCase()) ||
          (item.asin && item.asin.trim().toUpperCase() === sku.trim().toUpperCase())
        );
        
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
  };

  // Fetch inventory data when profile loads
  useEffect(() => {
    console.log('🚀 POTracker mounted, profile:', profile?.id);
    if (profile?.id) {
      console.log('🚀 Calling fetchInventoryData...');
      fetchInventoryData();
    }
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

  // Filter orders for label printing (exclude truly cancelled orders but keep fulfilled ones)
  const labelEligibleOrders = useMemo(() => {
    return poOrders.filter(order => order.status !== 'cancelled');
  }, [poOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...poOrders];
    
    console.log('🔍 FILTERING START:', {
      totalOrders: poOrders.length,
      selectedCountry,
      searchQuery,
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
    
    // Use debounced search for labels tab to improve performance
    const currentSearchQuery = activeTab === 'labels' ? debouncedLabelSearch.trim() : searchQuery.trim();
    
    if (currentSearchQuery) {
      // Support multi-item search with space-separated values
      // Trim and split, filtering out any empty strings from extra spaces
      const searchTerms = currentSearchQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term && term.length > 0); // Ensure we only have non-empty terms
      
      console.log('🔍 FILTERING DEBUG: Search terms:', searchTerms, 'Search type:', searchType);
      
      // Only filter if we have valid search terms
      if (searchTerms.length > 0) {
        filtered = filtered.filter(order => {
          // Check if ANY search term matches based on selected search type
          return searchTerms.some(lowerCaseQuery => {
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
              const basicSkuMatch = order.sku_code?.toLowerCase().includes(lowerCaseQuery) ||
                order.model_number?.toLowerCase().includes(lowerCaseQuery);
              
              const inventoryMatch = findInventoryMatch(
                order.asin, 
                order.sunsky_sku?.sku_code, 
                order.sku_code, 
                order.model_number,
                order.sunsky_sku
              );
              
              if (inventoryMatch && inventoryMatch.type === 'SKU' && inventoryMatch.inventoryItem) {
                const item = inventoryMatch.inventoryItem;
                return basicSkuMatch || 
                  item.sku_number?.toLowerCase().includes(lowerCaseQuery) ||
                  item.asin?.toLowerCase().includes(lowerCaseQuery);
              }
              
              return basicSkuMatch;
            }
            
            if (searchType === 'serial') {
              // Search serial numbers from inventory
              const inventoryMatch = findInventoryMatch(
                order.asin, 
                order.sunsky_sku?.sku_code, 
                order.sku_code, 
                order.model_number,
                order.sunsky_sku
              );
              
              if (inventoryMatch) {
                // Check ASIN inventory serial numbers
                if (inventoryMatch.serialNumbers && inventoryMatch.serialNumbers.length > 0) {
                  return inventoryMatch.serialNumbers.some(serial => 
                    serial?.toLowerCase().includes(lowerCaseQuery)
                  );
                }
                // Check SKU inventory serial number (bin number)
                if (inventoryMatch.serialNumber) {
                  return inventoryMatch.serialNumber.toLowerCase().includes(lowerCaseQuery);
                }
              }
              return false;
            }
            
            if (searchType === 'title') {
              return order.title?.toLowerCase().includes(lowerCaseQuery);
            }
            
            if (searchType === 'po_number') {
              return order.po_number.toLowerCase().includes(lowerCaseQuery);
            }
            
            // Default 'all' - search across all fields
            const basicMatch = order.po_number.toLowerCase().includes(lowerCaseQuery) ||
              order.sku_code?.toLowerCase().includes(lowerCaseQuery) ||
              order.asin?.toLowerCase().includes(lowerCaseQuery) ||
              order.model_number?.toLowerCase().includes(lowerCaseQuery) ||
              order.title?.toLowerCase().includes(lowerCaseQuery);
            
            // Check inventory serial numbers and SKU for 'all' search
            const inventoryMatch = findInventoryMatch(
              order.asin, 
              order.sunsky_sku?.sku_code, 
              order.sku_code, 
              order.model_number,
              order.sunsky_sku
            );
            
            let inventoryDataMatch = false;
            if (inventoryMatch) {
              // Check ASIN inventory serial numbers
              if (inventoryMatch.serialNumbers && inventoryMatch.serialNumbers.length > 0) {
                inventoryDataMatch = inventoryMatch.serialNumbers.some(serial => 
                  serial?.toLowerCase().includes(lowerCaseQuery)
                );
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
                inventoryDataMatch = inventoryDataMatch || 
                  item.sku_number?.toLowerCase().includes(lowerCaseQuery) ||
                  item.asin?.toLowerCase().includes(lowerCaseQuery);
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
    
    // Apply sorting (only if table reordering is not prevented)
    if (!preventTableReorder) {
      console.log('🔄 SORT: Applying sort - Field:', sortField, 'Direction:', sortDirection, 'Items to sort:', filtered.length);
      
      filtered.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;
        
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
    
    console.log('🔍 FILTERING DEBUG: Final filtered orders:', filtered.length);
    return filtered;
  }, [poOrders, searchQuery, debouncedLabelSearch, searchType, statusFilter, sortField, sortDirection, activeTab, viewMode, selectedPOsForLabels, labelEligibleOrders, preventTableReorder, selectedCountry, inventoryData]);

  // Filtered PO Groups for labels search
  const filteredPOGroups = useMemo(() => {
    const groups: { [key: string]: POOrder[] } = {};
    
    // Use labelSearchQuery for the labels tab, searchQuery for others
    const query = activeTab === 'labels' ? labelSearchQuery : searchQuery;
    // For labels tab, use poOrders directly (excluding only cancelled), for other tabs use all orders
    let ordersToFilter = activeTab === 'labels' 
      ? poOrders.filter(order => order.status !== 'cancelled') 
      : [...poOrders];
    
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
      ordersToFilter = ordersToFilter.filter(order =>
        order.po_number.toLowerCase().includes(lowerCaseQuery) ||
        order.asin?.toLowerCase().includes(lowerCaseQuery) ||
        order.model_number?.toLowerCase().includes(lowerCaseQuery) ||
        order.title?.toLowerCase().includes(lowerCaseQuery)
      );
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
  }, [poOrders, labelEligibleOrders, labelSearchQuery, searchQuery, activeTab, selectedCountry]);

  const groupedPOOrders = useMemo(() => {
    const groups: { [key: string]: POOrder[] } = {};
    filteredOrders.forEach(order => {
      if (!groups[order.po_number]) {
        groups[order.po_number] = [];
      }
      groups[order.po_number].push(order);
    });

    const poGroups: POGroup[] = Object.entries(groups).map(([poNumber, orders]) => ({
      poNumber,
      orders
    }));

    // Debug specific PO grouping
    const debugPO = '8RGH1C7S';
    const debugGroup = poGroups.find(group => group.poNumber === debugPO);
    if (debugGroup) {
      console.log(`🔍 FRONTEND DEBUG: PO ${debugPO} grouped with ${debugGroup.orders.length} orders, total quantity:`, 
        debugGroup.orders.reduce((sum, order) => sum + (order.quantity || 0), 0));
    } else {
      console.log(`🔍 FRONTEND DEBUG: PO ${debugPO} not found in grouped orders`);
    }

    return poGroups;
  }, [filteredOrders]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPOGroups = useMemo(() => {
    return groupedPOOrders.slice(startIndex, endIndex);
  }, [groupedPOOrders, startIndex, endIndex]);

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
    try {
      const selectedOrders = poOrders.filter(order => selectedForPrint.has(order.id));
      
      // Generate ZPL for each selected item using selected template
      let allZPLCodes: string[] = [];
      
      for (const order of selectedOrders) {
        const customQuantity = selectedForPrint.get(order.id) || 1;
        const copies = printSettings.copiesByQuantity ? customQuantity : customQuantity;
        
        for (let i = 0; i < copies; i++) {
          let zplCode = generateZPLFromTemplate(order, printSettings);
          allZPLCodes.push(zplCode);
        }
      }

      // Print all labels
      if (allZPLCodes.length === 0) {
        throw new Error("No labels generated");
      }

      // Set printer darkness
      const darknessCommand = `~SD${printSettings.darkness.toString().padStart(2, '0')}`;
      const finalZPL = darknessCommand + '\n' + allZPLCodes.join('\n');

      await qzConnectionManager.print(finalZPL, selectedPrinter);

      toast({
        title: "Labels printed successfully",
        description: `Printed ${allZPLCodes.length} labels to ${selectedPrinter}`,
      });

      // Update printed quantities for each order in database
      console.log('🖨️ Updating print status for', selectedOrders.length, 'orders');
      const updatePromises = selectedOrders.map(async (order) => {
        const customQuantity = selectedForPrint.get(order.id) || 1;
        const copies = printSettings.copiesByQuantity ? customQuantity : customQuantity;
        const newPrintedQuantity = (order.printed_quantity || 0) + copies;
        console.log(`🖨️ Updating order ${order.id}: printed_quantity ${order.printed_quantity || 0} + ${copies} = ${newPrintedQuantity}`);
        
        const { error } = await supabase
          .from('po_orders')
          .update({ 
            is_printed: true,
            printed_quantity: newPrintedQuantity
          })
          .eq('id', order.id);
          
        if (error) {
          console.error(`❌ Failed to update order ${order.id}:`, error);
          throw error;
        }
        
        return { success: true, orderId: order.id, newPrintedQuantity };
      });

      const results = await Promise.all(updatePromises);
      console.log('🖨️ Database updates completed:', results);
      
      // Force refresh to get updated data and maintain current view state
      await fetchPOOrders(true);
      console.log('🖨️ Data refresh completed');
      
      setSelectedForPrint(new Map());

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

  // Generate ZPL from template with proper sizing
  const generateZPLFromTemplate = (order: POOrder, settings: typeof printSettings): string => {
    const { template, dpi, pageSize } = settings;
    
    // Check if it's a custom template
    if (template !== 'default' && template !== 'compact' && template !== 'detailed' && template !== 'minimal' && labelTemplates) {
      const customTemplate = labelTemplates.find(t => t.id === template);
      if (customTemplate) {
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
        
      default: // 'default'
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
        width: Math.round((settings.customWidth / 25.4) * dpi), // Convert mm to dots
        height: Math.round((settings.customHeight / 25.4) * dpi)
      };
    }
    
    const presets = {
      '4x6': { width: Math.round(4.0 * dpi), height: Math.round(6.0 * dpi) },
      '4x3': { width: Math.round(4.0 * dpi), height: Math.round(3.0 * dpi) },
      '2x1': { width: Math.round(2.0 * dpi), height: Math.round(1.0 * dpi) },
      '3x2': { width: Math.round(3.0 * dpi), height: Math.round(2.0 * dpi) },
      'default': { width: Math.round(4.0 * dpi), height: Math.round(6.0 * dpi) }
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
        headers: ['sku', 'title', 'quantity', 'po_number', 'status', 'asin', 'model_number', 'PO Number'],
        data: [[
          order.sku_code || order.model_number || order.asin || 'N/A',
          order.title || 'No title available',
          order.quantity.toString(),
          order.po_number,
          order.status,
          order.asin || 'No ASIN',
          order.model_number || 'No model',
          order.po_number  // Add duplicate with different case
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
    const blob = new Blob([finalZPL], { type: 'text/plain' });
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
      description: `Downloaded ${allZPLCodes.length} labels`,
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

      const copies = customQuantity || (printSettings.copiesByQuantity ? order.quantity : printSettings.copies);
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
        description: `Printed ${allZPLCodes.length} label(s) for ${order.sku_code || order.model_number || order.asin}`,
      });

      // Update printed quantity in database
      const newPrintedQuantity = (order.printed_quantity || 0) + copies;
      
      console.log(`🖨️ Single print: Updating order ${order.id}: printed_quantity ${order.printed_quantity || 0} + ${copies} = ${newPrintedQuantity}`);
      
      const { error } = await supabase
        .from('po_orders')
        .update({ 
          is_printed: true,
          printed_quantity: newPrintedQuantity
        })
        .eq('id', order.id);
        
      if (error) {
        console.error(`❌ Failed to update single order ${order.id}:`, error);
        throw error;
      }

      console.log('🖨️ Single print: Database update completed, refreshing data...');
      // Force refresh to get updated data
      await fetchPOOrders(true);
      console.log('🖨️ Single print: Data refresh completed');

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

  const paginatedDetailedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Purchase Order Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your purchase orders across all suppliers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchPOOrders(true)}>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: isLoading ? 'running' : 'paused' }} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => refreshImages()}>
            <ImageIcon className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: imagesLoading ? 'running' : 'paused' }} />
            Images
          </Button>
        </div>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 bg-muted/30 rounded-lg p-1 border border-border shadow-soft">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <Package className="h-4 w-4" />
            PO Overview
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <FileUp className="h-4 w-4" />
            Uploads
          </TabsTrigger>
          <TabsTrigger 
            value="labels" 
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Labels
          </TabsTrigger>
          <TabsTrigger 
            value="reports" 
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger 
            value="close" 
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <X className="h-4 w-4" />
            Close PO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Package className="h-5 w-5" />
                  {viewMode === 'grouped' ? 'Unique PO Numbers' : 'Total Line Items'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {viewMode === 'grouped' ? 
                    (comprehensiveMetrics?.unique_po_numbers || groupedPOOrders.length) :
                    (comprehensiveMetrics?.total_line_items || poOrders.length)
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  {viewMode === 'grouped' ? 
                    `Line Items: ${comprehensiveMetrics?.total_line_items || poOrders.length}` :
                    `Qty: ${comprehensiveMetrics?.total_quantity || poOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}`
                  }
                </div>
                <p className="text-muted-foreground mt-1">
                  {viewMode === 'grouped' ? 'Unique POs with total line items' : 'All line items across POs'}
                </p>
                {isLoadingComprehensiveMetrics && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading metrics...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Total Matched Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {poOrders.filter(order => order.sunsky_sku !== null).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {poOrders.filter(order => order.sunsky_sku !== null).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">SKUs matched with supplier</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Truck className="h-5 w-5" />
                  Total Placed Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.placed_line_items || poOrders.filter(order => ['placed', 'received'].includes(order.status)).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.placed_quantity || poOrders.filter(order => ['placed', 'received'].includes(order.status)).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">Orders placed with supplier</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Clock className="h-5 w-5" />
                  Total Pending Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.pending_line_items || poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.pending_quantity || poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">Matched items awaiting order placement</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Orders Summary
                {isLoadingMetrics && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Search PO number, ASIN, model, serial number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm border-2 border-border focus:border-primary"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log('🔄 Refresh button clicked - loading ALL POs');
                          await fetchPOOrders(true); // Force load ALL orders
                          refetchComprehensiveMetrics();
                          refetchMetrics();
                          toast({
                            title: "Success",
                            description: "All PO data reloaded successfully",
                          });
                        } catch (error) {
                          console.error('Error refreshing PO data:', error);
                          toast({
                            title: "Error",
                            description: "Failed to refresh PO data",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                      title="Reload ALL PO orders from database"
                      className="border-2 border-primary text-primary hover:bg-primary/10"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reload All
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Bulk Close Actions */}
                    {selectedPOsForBulkClose.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                        <Badge variant="outline">
                          {selectedPOsForBulkClose.size} PO{selectedPOsForBulkClose.size !== 1 ? 's' : ''} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkCloseConfirm(true)}
                          disabled={isClosingPOs}
                        >
                          {isClosingPOs ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          Close Selected
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPOsForBulkClose(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center border-2 border-border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grouped')}
                        className="h-8 border border-transparent hover:border-border"
                      >
                        Grouped
                      </Button>
                      <Button
                        variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('detailed')}
                        className="h-8 border border-transparent hover:border-border"
                      >
                        Line Items
                      </Button>
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as POOrder['status'] | 'all')}>
                      <SelectTrigger className="w-[180px] border-2 border-border focus:border-primary">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Statuses</SelectItem>
                         <SelectItem value="pending">Pending</SelectItem>
                         <SelectItem value="ordered">Ordered</SelectItem>
                         <SelectItem value="shipped">Shipped</SelectItem>
                         <SelectItem value="delivered">Delivered</SelectItem>
                         <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="closed">Fulfilled from Stock</SelectItem>
                         <SelectItem value="partial-fulfilled">Partial Fulfilled</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selected POs Filter Indicator */}
                {activeTab === 'overview' && viewMode === 'detailed' && selectedPOsForLabels.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Showing items from {selectedPOsForLabels.size} selected PO{selectedPOsForLabels.size !== 1 ? 's' : ''}: 
                        <span className="font-mono ml-1">
                          {Array.from(selectedPOsForLabels).join(', ')}
                        </span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPOsForLabels(new Set())}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear filter
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border-2 border-border overflow-hidden">
                  {viewMode === 'grouped' ? (
                    <div className="grid">
                       <div className="grid grid-cols-[45px_70px_minmax(140px,1fr)_100px_110px_110px_100px_90px_200px] bg-muted/50 border-b">
                         <div className="p-2 font-medium text-sm">
                              <input
                                type="checkbox"
                                checked={selectedPOsForBulkClose.size > 0 && Array.from(selectedPOsForBulkClose).length === groupedPOOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length}
                                onChange={(e) => {
                                  const currentPagePOs = groupedPOOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(group => group.poNumber);
                                  if (e.target.checked) {
                                    setSelectedPOsForBulkClose(prev => new Set([...prev, ...currentPagePOs.filter(po => !groupedPOOrders.find(g => g.poNumber === po)?.orders.some(o => o.status === 'closed'))]));
                                  } else {
                                    setSelectedPOsForBulkClose(prev => {
                                      const newSet = new Set(prev);
                                      currentPagePOs.forEach(po => newSet.delete(po));
                                      return newSet;
                                    });
                                  }
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                         </div>
                         <div className="p-2 font-medium text-sm">Enable</div>
                         <div className="p-2 font-medium text-sm">PO Number</div>
                         <div className="p-2 font-medium text-sm">Ship To</div>
                         <div className="p-2 font-medium text-sm">PO Items</div>
                         <div className="p-2 font-medium text-sm">ASN Qty</div>
                         <div className="p-2 font-medium text-sm">Matched</div>
                         <div className="p-2 font-medium text-sm">Pending</div>
                         <div className="p-2 font-medium text-sm">Actions</div>
                       </div>
                      <div>
                         {paginatedPOGroups.map(({ poNumber, orders }) => {
                           const firstOrder = orders[0];
                           const ordersInPO = orders; // Alias for consistency
                           
                            // Get metrics from database function - includes ALL items
                            const dbMetrics = poGroupMetrics?.find(m => m.po_number === poNumber);
                            const totalLineItems = dbMetrics?.distinct_skus || orders.length;
                            // Use frontend calculation as fallback to ensure accuracy - count ALL items
                            const asnQuantity = dbMetrics?.asn_quantity || orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
                           
                            // Calculate matched percentage for display
                             const activeOrdersInPO = orders.filter((order: any) => 
                               order.status === 'pending' || order.status === 'placed' || order.status === 'received'
                             );
                             const matchedCount = activeOrdersInPO.filter((order: any) => {
                               const inventoryMatch = findInventoryMatch(
                                 order.asin, 
                                 order.sunsky_sku?.sku_code, 
                                 order.sku_code, 
                                 order.model_number,
                                 order.sunsky_sku
                               );
                               return inventoryMatch !== null;
                             }).length;
                            const matchedPercentage = activeOrdersInPO.length > 0 ? ((matchedCount / activeOrdersInPO.length) * 100).toFixed(0) : '0';
                           
                           const statusCounts = orders.reduce((counts: any, order: any) => {
                             counts[order.status] = (counts[order.status] || 0) + 1;
                             return counts;
                           }, {});

                           // Check if PO is closed
                            const isClosedPO = ordersInPO.every(order => order.status === 'closed');
                            const hasClosedItems = ordersInPO.some(order => order.status === 'closed');
                            
                            // Country-specific PO handling
                            const countryPrefix = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
                            const currencySymbol = selectedCountry === 'UAE' ? 'AED' : 'SAR';

                              const isDisabled = disabledPOs.has(poNumber);
                              
                              return (
                                <div 
                                  key={poNumber}
                                  className={`
                                    grid grid-cols-[45px_70px_minmax(140px,1fr)_100px_110px_110px_100px_90px_200px] border-b
                                    ${isClosedPO 
                                      ? 'opacity-50 bg-muted/40 pointer-events-none cursor-not-allowed' 
                                      : isDisabled
                                      ? 'opacity-40 bg-muted/10'
                                      : hasClosedItems 
                                      ? 'opacity-75 bg-muted/20' 
                                      : 'hover:bg-muted/10 transition-colors'
                                    }
                                  `}
                                >
                                  <div className="p-2 flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedPOsForBulkClose.has(poNumber)}
                                      onChange={(e) => {
                                        if (isClosedPO || isDisabled) return;
                                        const newSelected = new Set(selectedPOsForBulkClose);
                                        if (e.target.checked) {
                                          newSelected.add(poNumber);
                                        } else {
                                          newSelected.delete(poNumber);
                                        }
                                        setSelectedPOsForBulkClose(newSelected);
                                      }}
                                      disabled={isClosedPO || isDisabled}
                                      className={`h-4 w-4 rounded border-border ${isClosedPO || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    />
                                  </div>
                                  <div className="p-2 flex items-center">
                                    <Switch
                                      checked={!isDisabled}
                                      onCheckedChange={(checked) => {
                                        if (isClosedPO) return;
                                        const newDisabled = new Set(disabledPOs);
                                        if (checked) {
                                          newDisabled.delete(poNumber);
                                        } else {
                                          newDisabled.add(poNumber);
                                        }
                                        setDisabledPOs(newDisabled);
                                      }}
                                      disabled={isClosedPO}
                                      className="scale-75"
                                    />
                                  </div>
                                 <div className="p-2 font-medium flex items-center">
                                   <div className="flex items-center gap-2">
                                     <span className="text-xs opacity-60">{countryPrefix}</span>
                                     <Button 
                                       variant="link" 
                                       className={`p-0 h-auto font-medium text-left justify-start ${isClosedPO ? 'cursor-not-allowed' : ''}`}
                                       onClick={isClosedPO ? undefined : () => navigate(`/po-details/${poNumber}`)}
                                       disabled={isClosedPO}
                                     >
                                       {poNumber}
                                       {!isClosedPO && <ExternalLink className="h-3 w-3 ml-1" />}
                                     </Button>
                                     {isClosedPO && (
                                       <Badge variant="destructive" className="text-xs">
                                         CLOSED
                                       </Badge>
                                     )}
                                  </div>
                                </div>
                              <div className="p-2 flex items-center">
                                <div className="text-xs text-muted-foreground truncate">
                                  {(() => {
                                    const uniqueLocations = [...new Set(orders.map(o => o.ship_to_location).filter(Boolean))];
                                    if (uniqueLocations.length === 0) return '-';
                                    if (uniqueLocations.length === 1) return uniqueLocations[0];
                                    return `${uniqueLocations[0]} +${uniqueLocations.length - 1}`;
                                  })()}
                                </div>
                              </div>
                              <div className="p-2 flex items-center">
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{totalLineItems}</span>
                                  <span className="text-xs text-muted-foreground">SKUs</span>
                                </div>
                              </div>
                              <div className="p-2 flex items-center">
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{asnQuantity}</span>
                                  <span className="text-xs text-muted-foreground">units</span>
                                </div>
                              </div>
                              <div className="p-2 flex items-center">
                                <Badge variant={parseInt(matchedPercentage) >= 80 ? "default" : parseInt(matchedPercentage) >= 50 ? "secondary" : "destructive"} className="text-xs">
                                  {matchedPercentage}%
                                </Badge>
                              </div>
                              <div className="p-2 flex items-center justify-center">
                                <div className="text-sm font-medium">
                                  {activeOrdersInPO.filter(order => 
                                    order.status === 'pending' && 
                                    !order.supplier_order_number &&
                                    findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku) !== null
                                  ).length}
                                </div>
                              </div>
                                 <div className="p-2 flex items-center">
                                   <div className="flex items-center gap-1">
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => navigate(`/po-details/${poNumber}`)}
                                       disabled={isClosedPO}
                                       className="text-xs px-2 py-1 h-7"
                                     >
                                       View
                                     </Button>
                                     {!isClosedPO && (
                                       <>
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           onClick={() => {
                                             if (confirm(`Are you sure you want to close PO ${poNumber}? This action cannot be undone.`)) {
                                               handleClosePO(poNumber);
                                             }
                                           }}
                                           className="text-red-600 hover:text-red-700 text-xs px-2 py-1 h-7"
                                         >
                                           Close
                                         </Button>
                                         <Button 
                                           variant="destructive" 
                                           size="sm"
                                           onClick={() => {
                                             if (confirm(`Are you sure you want to DELETE PO ${poNumber}? This will permanently remove all ${activeOrdersInPO.length} items from this PO.\n\nThis action cannot be undone.`)) {
                                               handleDeletePO(poNumber, activeOrdersInPO);
                                             }
                                           }}
                                           className="text-xs px-2 py-1 h-7"
                                         >
                                           <X className="h-3 w-3" />
                                         </Button>
                                       </>
                                     )}
                                   </div>
                                 </div>
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Image</TableHead>
                            <SortableTableHeader
                              label="PO Number"
                              sortKey="po_number"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Ship To"
                              sortKey="ship_to_location"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="ASIN"
                              sortKey="asin"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Model/SKU"
                              sortKey="sku_code"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Title"
                              sortKey="title"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Quantity"
                              sortKey="quantity"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <SortableTableHeader
                              label="Status"
                              sortKey="status"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <TableHead>Matched</TableHead>
                            <SortableTableHeader
                              label="Cost"
                              sortKey="unit_cost"
                              currentSort={sortField}
                              currentDirection={sortDirection}
                              onSort={handleSort}
                            />
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                       <TableBody>
                          {paginatedDetailedOrders.map((order) => {
                            const isClosedOrder = order.status === 'closed';
                            const countryPrefix = selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦';
                            const currencySymbol = selectedCountry === 'UAE' ? 'AED' : 'SAR';
                            
                            return (
                              <TableRow 
                                key={order.id}
                                className={`
                                  ${isClosedOrder 
                                    ? 'opacity-50 bg-muted/40 pointer-events-none cursor-not-allowed' 
                                    : 'hover:bg-muted/10 transition-colors'
                                  }
                                `}
                              >
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
                                    <Button 
                                      variant="link" 
                                      className={`p-0 h-auto font-medium text-left justify-start ${isClosedOrder ? 'cursor-not-allowed' : ''}`}
                                      onClick={isClosedOrder ? undefined : () => navigate(`/po-details/${order.po_number}`)}
                                      disabled={isClosedOrder}
                                    >
                                      {order.po_number}
                                      {!isClosedOrder && <ExternalLink className="h-3 w-3 ml-1" />}
                                    </Button>
                                    {isClosedOrder && (
                                      <Badge variant="destructive" className="text-xs">
                                        CLOSED
                                      </Badge>
                                    )}
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
                                 {order.model_number && (
                                   <div className="text-sm font-medium">{order.model_number}</div>
                                 )}
                                 {order.sku_code && order.sku_code !== order.model_number && (
                                   <div className="text-xs text-muted-foreground">{order.sku_code}</div>
                                 )}
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
                                  <Badge 
                                    variant={
                                      order.status === 'received' ? 'default' :
                                      order.status === 'placed' ? 'secondary' :
                                      order.status === 'pending' ? 'destructive' :
                                      order.status === 'closed' ? 'secondary' :
                                      'outline'
                                    }
                                  >
                                   {order.status}
                                 </Badge>
                               </TableCell>
                            <TableCell>
                              <Badge variant={order.sunsky_sku ? 'default' : 'destructive'}>
                                {order.sunsky_sku ? 'Matched' : 'No Match'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.unit_cost && (
                                  <div className="text-sm font-medium">
                                    {order.currency} {order.unit_cost}
                                  </div>
                                )}
                                {order.total_cost && (
                                  <div className="text-xs text-muted-foreground">
                                    Total: {order.currency} {order.total_cost}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setPrintMode('single');
                                        setPrintOrders([order]);
                                        setPrintDialogOpen(true);
                                      }}
                                      title="Print this item"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/po-details/${order.po_number}`)}
                                      disabled={isClosedOrder}
                                    >
                                      Details
                                    </Button>
                                  </div>
                                </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                    </Table>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)}
                    {' '}(showing {viewMode === 'grouped' ? 'PO groups' : 'line items'})
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)))}
                    disabled={currentPage === Math.ceil((viewMode === 'grouped' ? groupedPOOrders.length : filteredOrders.length) / itemsPerPage)}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('🔄 Manual reload ALL POs triggered');
                      fetchPOOrders(true);
                    }}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load All POs
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteTodayUploads}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete Today's {selectedCountry} Uploads
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              {isLoading && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {processingStatus || 'Processing Files...'}
                    </span>
                  </div>
                  <Progress 
                    value={processingProgress || 20} 
                    className="h-2" 
                  />
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {processingProgress < 30 ? 'Parsing and validating file contents...' :
                     processingProgress < 60 ? 'Mapping columns and validating data...' :
                     processingProgress < 90 ? 'Importing data and matching SKUs...' :
                     'Finalizing import process...'}
                  </p>
                </div>
              )}
              
              <POFileUpload 
                onFilesUpload={(data) => {
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
                      description: `Successfully imported ${mappedData.length} items for ${selectedCountry} operations`,
                    });
                    
                    setTimeout(() => {
                      setProcessingProgress(0);
                      setProcessingStatus('');
                    }, 2000);
                    fetchPOOrders(true);
                  }).catch((error) => {
                    setProcessingProgress(0);
                    setProcessingStatus('');
                    console.error('Error processing files:', error);
                  });
                }}
                isLoading={isLoading}
                loadingProgress={loadingProgress}
                loadingStatus={loadingStatus}
                currentPO={currentPO}
                currentItem={currentItem}
                uploadStats={uploadStats}
                poProgress={poProgress}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels" className="space-y-6">
          {labelsStep === 'list' ? (
            // Step 1: PO List View
            <Card>
              <CardHeader>
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
                    {/* Search Bar and Controls */}
                     <div className="flex items-center gap-4">
                       <div className="relative flex-1">
                         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search PO number, ASIN, model, serial number..."
                            value={labelSearchQuery}
                            onChange={(e) => {
                              console.log('Label search query changed to:', e.target.value);
                              setLabelSearchQuery(e.target.value);
                            }}
                            className="pl-9 pr-9 border-2 border-border focus:border-primary"
                          />
                        {labelSearchQuery && (
                          <Button
                            variant="ghost" 
                            size="sm"
                            className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2"
                            onClick={() => {
                              console.log('Clearing label search');
                              setLabelSearchQuery('');
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {filteredPOGroups.length} PO{filteredPOGroups.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                     {/* Multi-select Controls */}
                     {selectedPOsForLabels.size > 0 && (
                       <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary">
                             {selectedPOsForLabels.size} PO{selectedPOsForLabels.size !== 1 ? 's' : ''} selected
                           </Badge>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setSelectedPOsForLabels(new Set())}
                           >
                             Clear selection
                           </Button>
                         </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline"
                              disabled={selectedPOsForLabels.size === 0 || Array.from(selectedPOsForLabels).every(poNumber => {
                                const poGroup = filteredPOGroups.find(g => g.poNumber === poNumber);
                                return poGroup?.orders.every(order => order.status === 'closed') || false;
                              })}
                              onClick={() => {
                                // Get ALL orders for selected POs directly from poOrders (not filtered groups)
                                const selectedPONumbers = Array.from(selectedPOsForLabels);
                                
                                console.log('🖨️ Print Preview: Selected POs:', selectedPONumbers.join(', '));
                                console.log('🖨️ Total poOrders in state:', poOrders.length);
                                
                                // Get ALL orders for these PO numbers - no aggregation, no filtering except by PO number and cancelled status
                                const selectedOrders = poOrders.filter(order => 
                                  selectedPONumbers.includes(order.po_number) && 
                                  order.status !== 'cancelled'
                                );
                                
                                console.log('🖨️ Orders passed to print dialog:', selectedOrders.length);
                                selectedPONumbers.forEach(po => {
                                  const ordersForPO = selectedOrders.filter(o => o.po_number === po);
                                  const uniqueASINs = new Set(ordersForPO.map(o => o.asin));
                                  console.log(`  - ${po}: ${ordersForPO.length} items, ${ordersForPO.reduce((sum, o) => sum + o.quantity, 0)} units, ${uniqueASINs.size} ASINs`);
                                });
                                
                                setPrintMode('bulk');
                                setPrintOrders(selectedOrders);
                                setPrintDialogOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Print Preview
                            </Button>
                            <Button 
                              variant="outline"
                              disabled={Array.from(selectedPOsForLabels).every(poNumber => {
                                const poGroup = filteredPOGroups.find(g => g.poNumber === poNumber);
                                return poGroup?.orders.every(order => order.status === 'closed') || false;
                              })}
                              onClick={() => {
                                console.log('🔍 VIEW ITEMS DEBUG: Selected POs:', Array.from(selectedPOsForLabels));
                                
                                // Go directly to print labels interface with selected POs
                                setSelectedPOForLabels(Array.from(selectedPOsForLabels)[0]); // Set first PO for compatibility
                                setLabelsStep('print'); // Go directly to print interface
                                setActiveTab('labels'); // Switch to labels tab
                                
                                // Preserve original order for printing - disable sorting
                                setOriginalOrderPreserved(true);
                                setSortField('po_number'); // Reset to original order
                                setSortDirection('asc');
                                
                                console.log('🔍 VIEW ITEMS DEBUG: Switched to print labels interface with original order preserved');
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              View Items
                            </Button>
                            <Button 
                              disabled={Array.from(selectedPOsForLabels).every(poNumber => {
                                const poGroup = filteredPOGroups.find(g => g.poNumber === poNumber);
                                return poGroup?.orders.every(order => order.status === 'closed') || false;
                              })}
                              onClick={() => {
                                setLabelsStep('print');
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Labels
                            </Button>
                          </div>
                       </div>
                     )}

                  {/* PO Groups List */}
                  <div className="rounded-lg border-2 border-border overflow-hidden">
                    {filteredPOGroups.length === 0 ? (
                      <Card className="p-8">
                        <div className="text-center">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
                          <p className="text-muted-foreground mb-4">
                            {labelSearchQuery ? 'No POs match your search criteria.' : 'Upload some PO data to start printing labels.'}
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveTab('upload')}
                          >
                            <FileUp className="h-4 w-4 mr-2" />
                            Upload PO Data
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid">
                        {/* Header */}
                        <div className="grid grid-cols-[50px_minmax(150px,1fr)_150px_120px_120px_minmax(150px,1fr)] bg-muted/50 border-b">
                          <div className="p-3 font-medium text-sm">Select</div>
                          <div className="p-3 font-medium text-sm">PO Number</div>
                          <div className="p-3 font-medium text-sm">Ship To</div>
                          <div className="p-3 font-medium text-sm">Items</div>
                          <div className="p-3 font-medium text-sm">Quantity</div>
                          <div className="p-3 font-medium text-sm">Actions</div>
                        </div>
                        
                        {/* Body */}
                        <div>
                          {filteredPOGroups.map((group) => {
                        // Get the primary ship-to location from first selected PO
                        const selectedShipToLocation = (() => {
                          if (selectedPOsForLabels.size === 0) return null;
                          const firstSelectedPO = filteredPOGroups.find(g => selectedPOsForLabels.has(g.poNumber));
                          if (!firstSelectedPO) return null;
                          const locations = [...new Set(firstSelectedPO.orders.map(o => o.ship_to_location).filter(Boolean))];
                          return locations.length > 0 ? locations[0] : null;
                        })();
                        
                        // Get this group's primary ship-to location
                        const groupShipToLocation = (() => {
                          const locations = [...new Set(group.orders.map(o => o.ship_to_location).filter(Boolean))];
                          return locations.length > 0 ? locations[0] : null;
                        })();
                        
                        // Check if this PO should be disabled due to different ship-to location
                        const isDisabledByLocation = selectedShipToLocation && 
                          groupShipToLocation && 
                          selectedShipToLocation !== groupShipToLocation &&
                          !selectedPOsForLabels.has(group.poNumber);
                        
                        const isClosedPO = group.orders.every(order => order.status === 'closed');
                        const hasClosedItems = group.orders.some(order => order.status === 'closed');
                        
                        return (
                          <div 
                            key={group.poNumber}
                            className={`
                              grid grid-cols-[50px_minmax(150px,1fr)_150px_120px_120px_minmax(150px,1fr)] border-b cursor-pointer
                              ${isClosedPO
                                ? 'opacity-50 bg-muted/40 pointer-events-none cursor-not-allowed'
                                : isDisabledByLocation
                                ? 'opacity-40 bg-muted/10 pointer-events-none cursor-not-allowed'
                                : hasClosedItems 
                                ? 'opacity-75 bg-muted/20'
                                : selectedPOsForLabels.has(group.poNumber)
                                ? 'bg-primary/5 hover:bg-primary/10'
                                : 'hover:bg-muted/10 transition-colors'
                              }
                            `}
                            onClick={() => {
                              // Prevent interaction if closed or disabled by location
                              if (isClosedPO || isDisabledByLocation) return;
                              
                              const newSelected = new Set(selectedPOsForLabels);
                              if (newSelected.has(group.poNumber)) {
                                newSelected.delete(group.poNumber);
                              } else {
                                newSelected.add(group.poNumber);
                              }
                              setSelectedPOsForLabels(newSelected);
                            }}
                          >
                            {/* Checkbox Column */}
                            <div className="p-3 flex items-center justify-center">
                              {selectedPOsForLabels.has(group.poNumber) ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            
                            {/* PO Number Column */}
                            <div className="p-3 flex items-center gap-2">
                              <span className="text-xs opacity-60">
                                {selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦'}
                              </span>
                              <span className="font-semibold text-primary">{group.poNumber}</span>
                              {isClosedPO && (
                                <Badge variant="destructive" className="text-xs">CLOSED</Badge>
                              )}
                              {isDisabledByLocation && (
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  Different Location
                                </Badge>
                              )}
                            </div>
                            
                            {/* Ship To Column */}
                            <div className="p-3 flex items-center text-sm text-muted-foreground">
                              {(() => {
                                const uniqueLocations = [...new Set(group.orders.map(o => o.ship_to_location).filter(Boolean))];
                                if (uniqueLocations.length === 0) return '-';
                                if (uniqueLocations.length === 1) return uniqueLocations[0];
                                return `${uniqueLocations[0]} +${uniqueLocations.length - 1}`;
                              })()}
                            </div>
                            
                            {/* Items Column */}
                            <div className="p-3 flex items-center">
                              {(() => {
                                // Get metrics from database function - same as PO Overview
                                const dbMetrics = poGroupMetrics?.find(m => m.po_number === group.poNumber);
                                const itemCount = dbMetrics?.distinct_skus || group.orders.length;
                                return (
                                  <Badge variant="secondary" className="text-xs">
                                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                                  </Badge>
                                );
                              })()}
                            </div>
                            
                            {/* Quantity Column */}
                            <div className="p-3 flex items-center">
                              {(() => {
                                // Get metrics from database function - same as PO Overview
                                const dbMetrics = poGroupMetrics?.find(m => m.po_number === group.poNumber);
                                const totalQty = dbMetrics?.asn_quantity || group.orders.reduce((sum, order) => sum + order.quantity, 0);
                                return <span className="font-medium">{totalQty}</span>;
                              })()}
                            </div>
                            
                            {/* Actions Column */}
                            <div className="p-3 flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">
                                {group.orders.filter(o => o.is_printed).length}/{group.orders.length} Printed
                              </div>
                              <Badge 
                                variant={
                                  group.orders.every(o => o.is_printed) ? 'default' :
                                  group.orders.some(o => o.is_printed) ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {group.orders.every(o => o.is_printed) ? 'Complete' :
                                 group.orders.some(o => o.is_printed) ? 'Partial' :
                                 'Pending'}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={isClosedPO || isDisabledByLocation}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isClosedPO || isDisabledByLocation) return;
                                  setSelectedPOForLabels(group.poNumber);
                                  setSelectedPOsForLabels(new Set([group.poNumber]));
                                  setLabelsStep('print');
                                }}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {isClosedPO ? 'Closed' : isDisabledByLocation ? 'Different Location' : 'Print'}
                              </Button>
                            </div>
                          </div>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Step 2: Label Printing Interface
            <div className="space-y-6">
              {/* Header with Back Button */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                     <Button 
                       variant="outline" 
                       size="lg"
                       onClick={() => {
                         setLabelsStep('list');
                         setSelectedPOForLabels(null);
                         setSelectedPOsForLabels(new Set());
                         setSelectedForPrint(new Map());
                         setOriginalOrderPreserved(false); // Reset order preservation when going back
                       }}
                       className="font-semibold border-2 hover:bg-accent/50"
                     >
                       <ArrowLeft className="h-5 w-5 mr-2" />
                       Back to PO List
                     </Button>
                     <div>
                       <CardTitle className="flex items-center gap-2">
                         <Printer className="h-5 w-5" />
                         Print Labels - {selectedPOsForLabels.size > 1 ? `${selectedPOsForLabels.size} POs` : selectedPOForLabels || Array.from(selectedPOsForLabels)[0]}
                       </CardTitle>
                       <p className="text-muted-foreground text-sm mt-1">
                         Select items and configure print settings
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Enhanced Print Settings Panel with Collapsible Tabbed Interface */}
              <Card className="shadow-soft border-2 border-border bg-gradient-to-r from-card to-card/50">
                <CardHeader 
                  className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border cursor-pointer hover:from-primary/10 hover:to-accent/10 transition-all"
                  onClick={() => setIsPrintConfigCollapsed(!isPrintConfigCollapsed)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Printer className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          Print Configuration
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Customize your label printing settings and preview
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isPrintConfigCollapsed ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!isPrintConfigCollapsed && (
                <CardContent className="p-6 border-2 border-border border-t-0 rounded-t-none">
                  <Tabs defaultValue="template" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-gradient-subtle p-1 rounded-lg border border-border shadow-soft">
                      <TabsTrigger 
                        value="template" 
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-medium border border-transparent data-[state=active]:border-primary-dark rounded-md transition-all"
                      >
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        Template & Layout
                      </TabsTrigger>
                      <TabsTrigger 
                        value="quality" 
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-medium border border-transparent data-[state=active]:border-primary-dark rounded-md transition-all"
                      >
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        Print Quality
                      </TabsTrigger>
                      <TabsTrigger 
                        value="advanced" 
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-medium border border-transparent data-[state=active]:border-primary-dark rounded-md transition-all"
                      >
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
                          <Select 
                            value={printSettings.template} 
                            onValueChange={(value) => {
                              setPrintSettings(prev => ({ ...prev, template: value }));
                              
                              // Auto-size from template if it's a custom template and auto-size is enabled
                              if (value !== 'default' && value !== 'compact' && value !== 'detailed' && value !== 'minimal' && 
                                  printSettings.autoSizeFromTemplate && printSettings.pageSize === 'custom' && labelTemplates) {
                                const selectedTemplate = labelTemplates.find(t => t.id === value);
                                if (selectedTemplate) {
                                  setPrintSettings(prev => ({
                                    ...prev,
                                    customWidth: selectedTemplate.width || 100,
                                    customHeight: selectedTemplate.height || 60
                                  }));
                                }
                              }
                            }}
                          >
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
                              {labelTemplates?.map((template) => (
                                <SelectItem key={template.id} value={template.id} className="hover:bg-accent/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-2 bg-gradient-to-r from-primary to-accent rounded-sm"></div>
                                    {template.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Page Size with Visual Indicators */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Label Size</Label>
                            <Badge variant="outline" className="text-xs">Dimensions</Badge>
                          </div>
                          <Select 
                            value={printSettings.pageSize} 
                            onValueChange={(value) => {
                              setPrintSettings(prev => ({ ...prev, pageSize: value }));
                              
                              // Auto-size from template if custom template and auto-size enabled
                              if (value === 'custom' && printSettings.autoSizeFromTemplate && labelTemplates) {
                                const selectedTemplate = labelTemplates.find(t => t.id === printSettings.template);
                                if (selectedTemplate) {
                                  setPrintSettings(prev => ({
                                    ...prev,
                                    customWidth: selectedTemplate.width || 100,
                                    customHeight: selectedTemplate.height || 60
                                  }));
                                }
                              }
                            }}
                          >
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
                      {printSettings.pageSize === 'custom' && (
                        <div className="space-y-4 p-6 bg-gradient-to-br from-muted/30 to-muted/50 border border-border/30 rounded-xl animate-slide-down">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-primary/10 rounded-md">
                                <div className="w-3 h-3 bg-primary rounded-sm"></div>
                              </div>
                              <h4 className="text-sm font-semibold">Custom Label Dimensions</h4>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                id="auto-size"
                                type="checkbox"
                                checked={printSettings.autoSizeFromTemplate}
                                onChange={(e) => {
                                  const autoSize = e.target.checked;
                                  setPrintSettings(prev => ({ ...prev, autoSizeFromTemplate: autoSize }));
                                  
                                  // If enabling auto-size and we have a custom template selected
                                  if (autoSize && printSettings.template !== 'default' && printSettings.template !== 'compact' && 
                                      printSettings.template !== 'detailed' && printSettings.template !== 'minimal' && labelTemplates) {
                                    const selectedTemplate = labelTemplates.find(t => t.id === printSettings.template);
                                    if (selectedTemplate) {
                                      setPrintSettings(prev => ({
                                        ...prev,
                                        customWidth: selectedTemplate.width || 100,
                                        customHeight: selectedTemplate.height || 60
                                      }));
                                    }
                                  }
                                }}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                              <Label htmlFor="auto-size" className="text-sm font-medium">Auto-size from template</Label>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                Width (mm)
                              </Label>
                              <Input
                                type="number"
                                min="10"
                                max="300"
                                value={printSettings.customWidth}
                                onChange={(e) => setPrintSettings(prev => ({ 
                                  ...prev, 
                                  customWidth: Math.max(10, parseInt(e.target.value) || 100)
                                }))}
                                disabled={printSettings.autoSizeFromTemplate}
                                className="bg-background/70 border-border/50 focus:border-primary/50 transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-accent rounded-full"></div>
                                Height (mm)
                              </Label>
                              <Input
                                type="number"
                                min="10"
                                max="300"
                                value={printSettings.customHeight}
                                onChange={(e) => setPrintSettings(prev => ({ 
                                  ...prev, 
                                  customHeight: Math.max(10, parseInt(e.target.value) || 60)
                                }))}
                                disabled={printSettings.autoSizeFromTemplate}
                                className="bg-background/70 border-border/50 focus:border-primary/50 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="quality" className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* DPI Selection with Quality Indicators */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Print Quality (DPI)</Label>
                            <Badge variant="outline" className="text-xs">Resolution</Badge>
                          </div>
                          <Select 
                            value={printSettings.dpi.toString()} 
                            onValueChange={(value) => setPrintSettings(prev => ({ ...prev, dpi: parseInt(value) as 203 | 300 }))}
                          >
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
                            <Input
                              type="range"
                              min="0"
                              max="30"
                              value={printSettings.darkness}
                              onChange={(e) => setPrintSettings(prev => ({ 
                                ...prev, 
                                darkness: parseInt(e.target.value)
                              }))}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb"
                            />
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
                      <div className="p-6 bg-gradient-to-br from-muted/20 to-muted/40 border border-border/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-accent/10 rounded-md">
                            <div className="w-3 h-3 bg-accent rounded-sm"></div>
                          </div>
                          <h4 className="text-sm font-semibold">Copy Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg border border-border/30">
                            <input
                              id="copies-by-qty"
                              type="checkbox"
                              checked={printSettings.copiesByQuantity}
                              onChange={(e) => setPrintSettings(prev => ({ ...prev, copiesByQuantity: e.target.checked }))}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <div className="flex-1">
                              <Label htmlFor="copies-by-qty" className="text-sm font-medium cursor-pointer">
                                Print copies based on quantity
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Automatically print one label per item quantity
                              </p>
                            </div>
                          </div>
                          
                          {!printSettings.copiesByQuantity && (
                            <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border/30 animate-slide-down">
                              <Label className="text-sm font-medium">Fixed copies per item:</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPrintSettings(prev => ({ 
                                    ...prev, 
                                    copies: Math.max(1, prev.copies - 1)
                                  }))}
                                  className="h-8 w-8 p-0"
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={printSettings.copies}
                                  onChange={(e) => setPrintSettings(prev => ({ 
                                    ...prev, 
                                    copies: Math.max(1, parseInt(e.target.value) || 1)
                                  }))}
                                  className="w-16 text-center bg-background/70"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPrintSettings(prev => ({ 
                                    ...prev, 
                                    copies: Math.min(10, prev.copies + 1)
                                  }))}
                                  className="h-8 w-8 p-0"
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Enhanced Action Toolbar */}
                  <div className="mt-6 pt-6 border-t border-border/30">
                    {/* Status and Printer Section */}
                    <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border border-border/30">
                      <div className="flex items-center gap-4">
                        {qzConnected && availablePrinters.length > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-success rounded-full animate-glow-pulse"></div>
                              <Label className="text-sm font-medium">Printer:</Label>
                            </div>
                            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                              <SelectTrigger className="w-[220px] bg-background/70 border-border/50 hover:border-primary/50">
                                <SelectValue placeholder="Select printer" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border shadow-medium z-50">
                                {availablePrinters.map((printer) => (
                                  <SelectItem key={printer} value={printer} className="hover:bg-accent/50">
                                    <div className="flex items-center gap-2">
                                      <Printer className="h-3 w-3" />
                                      {printer}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <Badge 
                          variant={qzConnected ? 'default' : 'destructive'} 
                          className={`text-xs font-medium ${qzConnected ? 'bg-success/10 text-success-foreground' : ''}`}
                        >
                          {qzConnected ? (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                              QZ Connected ({availablePrinters.length} printers)
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>
                              QZ Disconnected
                            </div>
                          )}
                        </Badge>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          {selectedForPrint.size} selected
                        </div>
                      </div>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-card/50">
                      <div className="flex items-center gap-3">
                        {/* Preview Button */}
                        <Button 
                          variant="outline" 
                          size="lg"
                          disabled={selectedForPrint.size === 0}
                          className="group hover:shadow-soft transition-all border-2 border-border hover:border-primary"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-accent/10 rounded group-hover:bg-accent/20 transition-colors">
                              <div className="w-3 h-3 bg-accent rounded-sm"></div>
                            </div>
                            Preview Labels
                          </div>
                        </Button>

                        {/* Download Button */}
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={handleDownloadZPL}
                          disabled={selectedForPrint.size === 0}
                          className="group hover:shadow-soft transition-all border-2 border-border hover:border-primary"
                        >
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Download ZPL
                            {selectedForPrint.size > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {selectedForPrint.size}
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </div>
                      
                      {/* Primary Print Button */}
                      <Button 
                        size="lg"
                        onClick={handleDirectPrint}
                        disabled={selectedForPrint.size === 0 || !qzConnected || !selectedPrinter || isPrinting}
                        className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-glow hover:shadow-accent-glow transition-all group min-w-[180px] border-2 border-primary-dark"
                      >
                        {isPrinting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Printing...</span>
                            <div className="w-2 h-2 bg-background/50 rounded-full animate-bounce"></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            <span>Print Labels</span>
                            {selectedForPrint.size > 0 && (
                              <Badge variant="secondary" className="ml-1 bg-background/20 text-primary-foreground">
                                {selectedForPrint.size}
                              </Badge>
                            )}
                          </div>
                        )}
                      </Button>
                    </div>

                    {/* Connection Status Alert */}
                    {!qzConnected && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-lg animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-warning/10 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-warning" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-warning-foreground">
                                QZ Tray Connection Required
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Labels will be downloaded instead of printed directly
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={initializeQZ}
                            className="hover:bg-warning/10 hover:border-warning/30"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Connect QZ Tray
                          </Button>
                        </div>
                      </div>
                     )}
                  </div>
                </CardContent>
                )}
              </Card>

              {/* Enhanced Items Selection Table */}
              <Card className="shadow-soft border-border/50 bg-gradient-to-b from-card to-card/50">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Select Items to Print
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Choose which items to include in your print job
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Toolbar */}
                      <div className="flex items-center gap-3">
                        {originalOrderPreserved && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setOriginalOrderPreserved(false)}
                            className="text-xs hover:bg-accent/10 hover:border-accent/30 transition-colors"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Enable Sorting
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                           size="sm"
                            onClick={() => {
                              const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : (selectedPOForLabels ? [selectedPOForLabels] : []);
                              const allPOOrders = poOrders
                                .filter(order => selectedPOsList.includes(order.po_number))
                                .filter(order => order.status !== 'cancelled');
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
                          }}
                          className="hover:bg-primary/10 hover:border-primary/30 transition-colors"
                         >
                            {(() => {
                              const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : (selectedPOForLabels ? [selectedPOForLabels] : []);
                              const allPOOrders = poOrders
                                .filter(order => selectedPOsList.includes(order.po_number))
                                .filter(order => order.status !== 'cancelled');
                               const allSelected = allPOOrders.every(order => selectedForPrint.has(order.id));
                            return allSelected && allPOOrders.length > 0 ? (
                              <>
                                <Square className="h-3 w-3 mr-1" />
                                Unselect All
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-3 w-3 mr-1" />
                                Select All
                              </>
                            );
                          })()}
                        </Button>
                        
                        <Badge 
                          variant={selectedForPrint.size > 0 ? "default" : "outline"} 
                      className={`font-medium transition-colors ${
                        selectedForPrint.size > 0 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : ''
                      }`}
                        >
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedForPrint.size > 0 ? 'bg-primary' : 'bg-muted-foreground'
                            }`}></div>
                            {selectedForPrint.size} selected
                          </div>
                        </Badge>
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Enhanced Search Bar with Printed Filter */}
                  <div className="mb-6 space-y-4">
                    <div className="flex gap-2">
                      {/* Search Type Selector */}
                      <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                        <SelectTrigger className="w-[160px] h-12 border-2 border-primary/30 focus:border-primary bg-primary/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-[100]">
                          <SelectItem value="all">All Fields</SelectItem>
                          <SelectItem value="asin">ASIN Only</SelectItem>
                          <SelectItem value="sku">SKU Only</SelectItem>
                          <SelectItem value="serial">Serial Number</SelectItem>
                          <SelectItem value="title">Title Only</SelectItem>
                          <SelectItem value="po_number">PO Number</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Search Input */}
                      <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4 transition-colors" />
                        <Input
                          placeholder={
                            searchType === 'all' ? "Search by SKU, title, ASIN, serial number..." :
                            searchType === 'asin' ? "Search by ASIN..." :
                            searchType === 'sku' ? "Search by SKU..." :
                            searchType === 'serial' ? "Search by Serial Number..." :
                            searchType === 'title' ? "Search by Title..." :
                            "Search by PO Number..."
                          }
                          value={labelSearchQuery}
                          onChange={(e) => setLabelSearchQuery(e.target.value)}
                          className="pl-12 pr-12 h-12 bg-primary/5 border-2 border-primary/30 focus:border-primary hover:border-primary/50 transition-all duration-300 shadow-medium ring-2 ring-primary/10"
                        />
                        {labelSearchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setLabelSearchQuery('')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Printed Status Filter */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Filter by Print Status:</span>
                      <Select value={printedFilter} onValueChange={(value) => setPrintedFilter(value as 'all' | 'printed' | 'not-printed')}>
                        <SelectTrigger className="w-[180px] border-2 border-border focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Items</SelectItem>
                          <SelectItem value="printed">Printed Only</SelectItem>
                          <SelectItem value="not-printed">Not Printed</SelectItem>
                        </SelectContent>
                      </Select>
                      {printedFilter !== 'all' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrintedFilter('all')}
                          className="h-8 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Table Container with Borders and Grid */}
                  <div className="rounded-xl border-2 border-border overflow-hidden shadow-medium bg-gradient-to-b from-background to-background/50">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b-2 border-border">
                        <TableRow className="hover:bg-muted/50 border-b border-border">
                          <TableHead className="w-12 font-semibold border-r border-border/50 bg-muted/20">
                            <div className="flex items-center justify-center">
                              <CheckSquare className="h-4 w-4 text-foreground" />
                            </div>
                          </TableHead>
                          <TableHead className="w-20 font-semibold border-r border-border/50 bg-muted/20">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-foreground" />
                              <span className="text-foreground">Image</span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className={`cursor-pointer hover:bg-muted/50 select-none w-32 font-semibold transition-colors border-r border-border/50 bg-muted/20 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={() => !originalOrderPreserved && handleSort('sku_code')}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-foreground">SKU/Model</span>
                              {sortField === 'sku_code' && !originalOrderPreserved && (
                                <div className={`text-xs p-1 rounded bg-primary/10 text-primary ${
                                  sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
                                } transition-transform`}>
                                  ↑
                                </div>
                              )}
                              {originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' && (
                                <Badge variant="outline" className="text-xs ml-auto">Original Order</Badge>
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className={`cursor-pointer hover:bg-muted/50 select-none font-semibold transition-colors border-r border-border/50 bg-muted/20 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={() => !originalOrderPreserved && handleSort('combined_title')}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-accent rounded-full"></div>
                              <span className="text-foreground">Title & ASIN</span>
                              {sortField === 'combined_title' && !originalOrderPreserved && (
                                <div className={`text-xs p-1 rounded bg-accent/10 text-accent ${
                                  sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
                                } transition-transform`}>
                                  ↑
                                </div>
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold border-r border-border/50 bg-muted/20">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-foreground">Ship To</span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className={`cursor-pointer hover:bg-muted/50 select-none font-semibold transition-colors border-r border-border/50 bg-muted/20 ${originalOrderPreserved && activeTab === 'labels' && labelsStep === 'print' ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={() => !originalOrderPreserved && handleSort('quantity')}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald rounded-full"></div>
                              <span className="text-foreground">Quantity</span>
                              {sortField === 'quantity' && !originalOrderPreserved && (
                                <div className={`text-xs p-1 rounded bg-emerald/10 text-emerald-700 dark:text-emerald-300 ${
                                  sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
                                } transition-transform`}>
                                  ↑
                                </div>
                              )}
                            </div>
                           </TableHead>
                           <TableHead className="w-24 font-semibold border-r border-border/50 bg-muted/20">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-sky rounded-full"></div>
                               <span className="text-foreground">Print Qty</span>
                             </div>
                           </TableHead>
                           <TableHead className="font-semibold border-r border-border/50 bg-muted/20">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-cyan rounded-full"></div>
                               <span className="text-foreground">Status</span>
                               <Badge variant="outline" className="text-xs ml-2">
                                 Filtered
                               </Badge>
                             </div>
                           </TableHead>
                           <TableHead className="font-semibold bg-muted/20">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-secondary rounded-full"></div>
                               <span className="text-foreground">Actions</span>
                             </div>
                           </TableHead>
                        </TableRow>
                      </TableHeader>
                        <TableBody className="divide-y-2 divide-border">
                           {(() => {
                              const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : (selectedPOForLabels ? [selectedPOForLabels] : []);
                              
                              // Debug: Log the filtering steps
                              console.log('🔍 Print Labels Filtering Debug:', {
                                selectedPOs: selectedPOsList,
                                selectedCountry,
                                labelEligibleOrdersCount: labelEligibleOrders.length,
                                poOrdersCount: poOrders.length
                              });
                              
                               // Use poOrders directly (all orders including closed) and filter by selected POs
                                let ordersForSelectedPOs = poOrders
                                  .filter(order => {
                                    const poMatch = selectedPOsList.includes(order.po_number);
                                    const statusMatch = order.status !== 'cancelled'; // Exclude only cancelled
                                    return poMatch && statusMatch;
                                 })
                                 .filter(order => !labelSearchQuery || 
                                   order.po_number.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                                   order.sku_code?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                                   order.asin?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                                   order.model_number?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                                   order.title?.toLowerCase().includes(labelSearchQuery.toLowerCase())
                                 )
                                 .filter(order => {
                                   // Apply printed status filter
                                   if (printedFilter === 'all') return true;
                                   if (printedFilter === 'printed') return order.is_printed === true;
                                   if (printedFilter === 'not-printed') return !order.is_printed;
                                   return true;
                                 });
                               
                               // Apply sorting to labels tab (only if not preserving original order)
                               if (!originalOrderPreserved) {
                                 ordersForSelectedPOs.sort((a, b) => {
                                   let aValue: string | number | undefined;
                                   let bValue: string | number | undefined;
                                   
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
                                   
                                   // Handle numeric fields
                                   if (sortField === 'quantity' || sortField === 'unit_cost' || sortField === 'total_cost') {
                                     const aNum = Number(aValue) || 0;
                                     const bNum = Number(bValue) || 0;
                                     return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                                   }
                                   
                                   // Handle date fields
                                   if (sortField === 'order_date' || sortField === 'expected_delivery' || sortField === 'created_at' || sortField === 'updated_at') {
                                     const aDate = new Date(aValue as string).getTime();
                                     const bDate = new Date(bValue as string).getTime();
                                     return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
                                   }
                                   
                                   // Handle string fields
                                   const aStr = String(aValue).toLowerCase();
                                   const bStr = String(bValue).toLowerCase();
                                   
                                   if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
                                   if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
                                   return 0;
                                 });
                               }
                              
                              console.log('🔍 Print Labels After Filtering:', {
                                ordersCount: ordersForSelectedPOs.length,
                                totalQuantity: ordersForSelectedPOs.reduce((sum, o) => sum + (o.quantity || 0), 0),
                                statuses: [...new Set(ordersForSelectedPOs.map(o => o.status))]
                              });
                              
                              const startIndex = (labelCurrentPage - 1) * labelItemsPerPage;
                              const endIndex = startIndex + labelItemsPerPage;
                              const paginatedOrders = ordersForSelectedPOs.slice(startIndex, endIndex);
                             
                             return paginatedOrders.map((order, index) => (
                              <TableRow 
                                key={order.id} 
                                className={`group hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 transition-all duration-300 border-b border-border ${
                                   selectedForPrint.has(order.id) ? 'bg-primary/10 border-primary/30' : ''
                                } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                              >
                                {/* Enhanced Checkbox Cell */}
                                <TableCell className="w-12 border-r border-border/50 bg-background/50">
                                  <div className="flex items-center justify-center">
                                     <input
                                       type="checkbox"
                                       checked={selectedForPrint.has(order.id)}
                                       onChange={(e) => {
                                         const newSelected = new Map(selectedForPrint);
                                         if (e.target.checked) {
                                           newSelected.set(order.id, 1); // Default quantity of 1
                                         } else {
                                           newSelected.delete(order.id);
                                         }
                                         setSelectedForPrint(newSelected);
                                       }}
                                       className="h-4 w-4 rounded border-border accent-primary group-hover:scale-110 transition-transform"
                                     />
                                  </div>
                                </TableCell>

                                {/* Enhanced Image Cell */}
                                <TableCell className="w-20 border-r border-border/50">
                                  {(() => {
                                     const productImage = order.asin ? getImageByAsin(order.asin) : null;
                                     console.log('🖼️ Image lookup for ASIN:', order.asin, 'Found:', !!productImage, 'URL:', productImage?.image_url);
                                   return productImage ? (
                                     <Popover>
                                       <PopoverTrigger asChild>
                                         <div className="w-16 h-16 rounded-lg border border-border/30 overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary/50 hover:shadow-soft transition-all duration-300 group-hover:scale-105 bg-background/80">
                                           <img 
                                             src={productImage.image_url} 
                                             alt={`Product image for ${order.asin}`}
                                             className="w-full h-full object-contain"
                                             onError={(e) => {
                                               console.log('🖼️ Image failed to load:', productImage.image_url);
                                               e.currentTarget.style.display = 'none';
                                             }}
                                             onLoad={() => {
                                               console.log('🖼️ Image loaded successfully:', productImage.image_url);
                                             }}
                                           />
                                         </div>
                                       </PopoverTrigger>
                                       <PopoverContent side="left" className="w-80 p-3 bg-popover/95 backdrop-blur-sm border-border/50 shadow-strong">
                                         <div className="w-full h-64 rounded-xl overflow-hidden bg-background/50 border border-border/30">
                                           <img 
                                             src={productImage.image_url} 
                                             alt={`Product image for ${order.asin}`}
                                             className="w-full h-full object-contain"
                                           />
                                         </div>
                                         <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-muted/30 rounded-lg">
                                           <div className="w-2 h-2 bg-primary rounded-full"></div>
                                           <span className="text-xs font-mono text-muted-foreground">ASIN: {order.asin}</span>
                                         </div>
                                       </PopoverContent>
                                     </Popover>
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg border border-dashed border-border/30 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40 group-hover:from-muted/30 group-hover:to-muted/50 transition-all duration-300">
                                      <div className="text-center">
                                        <ImageIcon className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
                                        <div className="text-xs text-muted-foreground/70 font-medium">No Image</div>
                                        {order.asin && (
                                          <div className="text-xs text-muted-foreground/50 font-mono mt-1 bg-muted/30 px-1 rounded" title={`ASIN: ${order.asin}`}>
                                            {order.asin.slice(0, 6)}...
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                               </TableCell>

                                {/* Enhanced SKU/Model Cell */}
                                <TableCell className="w-32 border-r border-border/50">
                                  <div className="space-y-2">
                                    {order.sku_code && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                                        <div className="text-sm font-semibold font-mono break-words bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                                          {order.sku_code}
                                        </div>
                                      </div>
                                    )}
                                    {order.model_number && order.model_number !== order.sku_code && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0"></div>
                                        <div className="text-xs text-foreground font-mono break-words bg-accent/10 px-2 py-1 rounded-md border border-accent/20">
                                          {order.model_number}
                                        </div>
                                      </div>
                                    )}
                                    {!order.sku_code && !order.model_number && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-muted">N/A</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Enhanced Title & ASIN Cell */}
                                <TableCell className="border-r border-border/50">
                                 <div className="space-y-2">
                                   <div className="text-sm font-medium break-words text-foreground group-hover:text-primary/80 transition-colors" title={order.title}>
                                     {order.title || 'No title available'}
                                   </div>
                                     {order.asin && (
                                       <div className="flex items-center gap-2">
                                         <div className="w-1.5 h-1.5 bg-success rounded-full flex-shrink-0"></div>
                                         <div className="text-xs text-success font-mono bg-success/10 px-2 py-1 rounded-md border border-success/20">
                                           {order.asin}
                                         </div>
                                       </div>
                                     )}
                                     {(() => {
                                       const inventoryMatch = findInventoryMatch(
                                         order.asin, 
                                         order.sunsky_sku?.sku_code, 
                                         order.sku_code, 
                                         order.model_number,
                                         order.sunsky_sku
                                       );
                                       
                                       // Debug specific ASIN
                                       if (order.asin === 'B0DYG67SLZ' || order.asin === 'B0DYFRB7S6') {
                                         console.log('🐛 DEBUG ASIN in render:', order.asin, {
                                           inventoryMatch,
                                           hasSerialNumbers: inventoryMatch?.serialNumbers?.length > 0
                                         });
                                       }
                                       
                                       // Show inventory match information with serial numbers
                                       if (inventoryMatch) {
                                         // ASIN inventory matches - show serial numbers prominently
                                         if (inventoryMatch.type === 'ASIN') {
                                           if (inventoryMatch.serialNumbers && inventoryMatch.serialNumbers.length > 0) {
                                             return (
                                               <div className="flex items-center gap-2">
                                                 <div className="w-1.5 h-1.5 bg-success rounded-full flex-shrink-0"></div>
                                                 <div className="text-xs text-success font-mono bg-success/10 px-2 py-1 rounded-md border border-success/20">
                                                   SN: {inventoryMatch.serialNumbers.slice(0, 3).join(', ')}
                                                   {inventoryMatch.serialNumbers.length > 3 && ` +${inventoryMatch.serialNumbers.length - 3}`}
                                                 </div>
                                               </div>
                                             );
                                           } else if (inventoryMatch.quantity > 0) {
                                             return (
                                               <div className="flex items-center gap-2">
                                                 <div className="w-1.5 h-1.5 bg-success rounded-full flex-shrink-0"></div>
                                                 <div className="text-xs text-success font-medium bg-success/10 px-2 py-1 rounded-md border border-success/20">
                                                   In Stock ({inventoryMatch.quantity})
                                                 </div>
                                               </div>
                                             );
                                           }
                                         }
                                         
                                         // SKU inventory matches - show bin/serial number
                                         if (inventoryMatch.type.startsWith('SKU') && inventoryMatch.serialNumber) {
                                           return (
                                             <div className="flex items-center gap-2">
                                               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                                               <div className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                                 Bin: {inventoryMatch.serialNumber}
                                               </div>
                                             </div>
                                           );
                                         }
                                       }
                                       
                                       return null;
                                     })()}
                                 </div>
                                </TableCell>

                                 {/* Ship To Location Cell */}
                                 <TableCell className="border-r border-border/50">
                                   <div className="text-sm text-muted-foreground">
                                     {order.ship_to_location || '-'}
                                   </div>
                                 </TableCell>

                                 {/* Enhanced Quantity Cell */}
                                 <TableCell className="border-r border-border/50">
                                  <div className="space-y-2">
                                     <div className="space-y-2">
                                       {order.status === 'closed' && order.notes?.includes('Fulfilled from stock:') ? (
                                         <div className="space-y-2">
                                           <Badge variant="outline" className="bg-sky/10 text-sky-700 dark:text-sky-300 border-sky/30 font-mono">
                                              {(() => {
                                                const fulfilledMatch = order.notes?.match(/Fulfilled from stock:\s*(\d+)/);
                                                const originalMatch = order.notes?.match(/Original quantity:\s*(\d+)/);
                                                const fulfilledQty = fulfilledMatch ? parseInt(fulfilledMatch[1]) : 0;
                                                // If original quantity not in notes, assume fulfilled quantity was the original
                                                const originalQty = originalMatch ? parseInt(originalMatch[1]) : (fulfilledQty > 0 ? fulfilledQty : 1);
                                                return `Fulfilled: ${fulfilledQty}/${originalQty}`;
                                              })()}
                                           </Badge>
                                           <div className="flex items-center gap-1">
                                             <div className="w-1.5 h-1.5 bg-sky rounded-full flex-shrink-0"></div>
                                             <div className="text-xs text-muted-foreground font-medium">
                                               From Stock
                                             </div>
                                           </div>
                                         </div>
                                       ) : (
                                         <div className="flex items-center gap-2">
                                           <Badge variant="secondary" className="font-mono bg-emerald/10 text-emerald-700 dark:text-emerald-300 border-emerald/30">
                                             {order.quantity}
                                           </Badge>
                                           <div className="text-xs text-muted-foreground">items</div>
                                         </div>
                                       )}
                                     </div>
                                  </div>
                                </TableCell>

                                  {/* Enhanced Print Qty Cell */}
                                 <TableCell className="w-24 border-r border-border/50">
                                   <div className="flex items-center gap-2">
                                     <Input
                                       type="number"
                                       min="1"
                                       max="99"
                                       placeholder="Qty"
                                       className="w-16 h-9 text-center bg-background border-2 border-border focus:border-primary group-hover:border-primary/50 transition-colors font-mono text-foreground"
                                       value={selectedForPrint.has(order.id) ? (selectedForPrint.get(order.id) || 1) : ''}
                                       onChange={(e) => {
                                         const value = parseInt(e.target.value) || 1;
                                         if (selectedForPrint.has(order.id)) {
                                           const newSelected = new Map(selectedForPrint);
                                           newSelected.set(order.id, value);
                                           setSelectedForPrint(newSelected);
                                         }
                                       }}
                                       disabled={!selectedForPrint.has(order.id) || printingItems.has(order.id)}
                                     />
                                     {!selectedForPrint.has(order.id) && (
                                       <span className="text-xs text-muted-foreground whitespace-nowrap">Select first</span>
                                     )}
                                   </div>
                                 </TableCell>

                                {/* Enhanced Status Cell */}
                                <TableCell className="border-r border-border/50">
                                  <div className="flex flex-col gap-2">
                                    <Badge 
                                      variant={order.printed_quantity > 0 ? 'default' : 'outline'}
                                      className={`text-xs font-medium ${
                                        order.printed_quantity > 0 
                                          ? 'bg-success/10 text-success border-success/30' 
                                          : 'bg-muted/10 border-muted-foreground/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          order.printed_quantity > 0 ? 'bg-success' : 'bg-muted-foreground'
                                        }`}></div>
                                        {order.printed_quantity || 0}/{order.quantity} printed
                                      </div>
                                    </Badge>
                                    {order.printed_quantity > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-warning rounded-full flex-shrink-0"></div>
                                        <span className="text-xs text-foreground font-medium">
                                          {order.quantity - (order.printed_quantity || 0)} remaining
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Enhanced Actions Cell */}
                                <TableCell>
                                  <div className="flex flex-col gap-2">
                                    {/* Main Print Button */}
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const printQty = selectedForPrint.get(order.id) || 1;
                                        handleSingleItemPrint(order, printQty);
                                       }}
                                       disabled={
                                         !qzConnected || 
                                         !selectedPrinter || 
                                         printingItems.has(order.id) ||
                                         !selectedForPrint.has(order.id) ||
                                         !selectedForPrint.get(order.id) ||
                                         selectedForPrint.get(order.id) <= 0
                                       }
                                        className={`w-full border-2 transition-all duration-300 ${
                                          printingItems.has(order.id) 
                                            ? 'bg-primary/10 border-primary text-primary' 
                                            : 'border-border hover:border-primary hover:bg-primary/5 hover:text-primary'
                                        }`}
                                    >
                                     {printingItems.has(order.id) ? (
                                       <div className="flex items-center gap-2">
                                         <Loader2 className="h-3 w-3 animate-spin" />
                                         <span className="text-xs">Printing...</span>
                                       </div>
                                     ) : (
                                       <div className="flex items-center gap-2">
                                         <Printer className="h-3 w-3" />
                                         <span className="text-xs font-medium">Print</span>
                                       </div>
                                     )}
                                   </Button>
                                   
                                   {/* Reprint Already Printed Quantity */}
                                   {order.printed_quantity > 0 && (
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => {
                                         handleSingleItemPrint(order, order.printed_quantity);
                                       }}
                                       disabled={
                                         !qzConnected || 
                                         !selectedPrinter || 
                                         printingItems.has(order.id)
                                       }
                                       className="w-full border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 text-blue-600 transition-all duration-300"
                                     >
                                       <div className="flex items-center gap-2">
                                         <RefreshCw className="h-3 w-3" />
                                         <span className="text-xs font-medium">Reprint ({order.printed_quantity})</span>
                                       </div>
                                     </Button>
                                   )}
                                   
                                   {/* Mark as Printed (without printing) */}
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     onClick={async () => {
                                       const printQty = selectedForPrint.get(order.id) || 1;
                                       try {
                                         // Update printed quantity without actual printing
                                         const newPrintedQty = (order.printed_quantity || 0) + printQty;
                                         const { error } = await supabase
                                           .from('po_orders')
                                           .update({ 
                                             printed_quantity: newPrintedQty,
                                             is_printed: true
                                           })
                                           .eq('id', order.id);
                                         
                                         if (error) throw error;
                                         
                                         toast({
                                           title: "Marked as Printed",
                                           description: `${printQty} labels marked as printed for ${order.asin || order.sku_code}`,
                                         });
                                         
                                         // Refresh the orders
                                         fetchPOOrders();
                                       } catch (error) {
                                         console.error('Error marking as printed:', error);
                                         toast({
                                           title: "Error",
                                           description: "Failed to mark as printed",
                                           variant: "destructive"
                                         });
                                       }
                                     }}
                                     disabled={
                                       !selectedForPrint.has(order.id) ||
                                       !selectedForPrint.get(order.id) ||
                                       selectedForPrint.get(order.id) <= 0
                                     }
                                     className="w-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700 text-green-600 transition-all duration-300"
                                   >
                                     <div className="flex items-center gap-2">
                                       <CheckCircle className="h-3 w-3" />
                                       <span className="text-xs font-medium">Mark Printed</span>
                                     </div>
                                   </Button>
                                 </div>
                               </TableCell>
                              </TableRow>
                            ));
                          })()}
                       </TableBody>
                     </Table>
                   </div>
                   
                     {/* Enhanced Pagination Controls */}
                       {(() => {
                        const selectedPOsList = selectedPOsForLabels.size > 0 ? Array.from(selectedPOsForLabels) : (selectedPOForLabels ? [selectedPOForLabels] : []);
                        const ordersForSelectedPOs = poOrders
                          .filter(order => selectedPOsList.includes(order.po_number))
                          .filter(order => order.status !== 'cancelled')
                          .filter(order => !labelSearchQuery ||
                            order.po_number.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                            order.sku_code?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                            order.asin?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                            order.model_number?.toLowerCase().includes(labelSearchQuery.toLowerCase()) ||
                            order.title?.toLowerCase().includes(labelSearchQuery.toLowerCase())
                          );
                        const totalPages = Math.ceil(ordersForSelectedPOs.length / labelItemsPerPage);
                       
                       if (totalPages <= 1) return null;
                       
                       return (
                         <div className="flex items-center justify-between px-6 py-4 border-t border-border/30 bg-gradient-to-r from-muted/20 to-muted/30">
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLabelCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={labelCurrentPage === 1}
                              className="hover:bg-primary/10 hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-primary/20 to-accent/20"></div>
                                Previous
                              </div>
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                                const pageNum = Math.max(1, Math.min(totalPages - 4, labelCurrentPage - 2)) + i;
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={pageNum === labelCurrentPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setLabelCurrentPage(pageNum)}
                                    className={`w-8 h-8 p-0 ${
                                      pageNum === labelCurrentPage 
                                        ? 'bg-primary text-primary-foreground shadow-glow' 
                                        : 'hover:bg-accent/10 hover:border-accent/30'
                                    } transition-all`}
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLabelCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={labelCurrentPage === totalPages}
                              className="hover:bg-primary/10 hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                Next
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-accent/20 to-primary/20"></div>
                              </div>
                            </Button>
                          </div>
                        </div>
                        );
                      })()}
                  </CardContent>
               </Card>
             </div>
           )}
         </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <POReportsSection 
            poOrders={filteredOrders}
            inventoryData={inventoryData?.asinInventory || []}
            skuInventoryData={inventoryData?.skuInventory || []}
          />
        </TabsContent>

        <TabsContent value="close" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="h-5 w-5" />
                Close Purchase Orders
              </CardTitle>
              <p className="text-muted-foreground">
                Close purchase orders when they are complete or no longer needed. This action cannot be undone.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Input
                      type="text"
                      placeholder="Search PO number, ASIN, model, serial number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm border-2 border-border focus:border-primary"
                    />
                  
                  <div className="flex items-center gap-2">
                    {/* Bulk Close Actions */}
                    {selectedPOsForBulkClose.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                        <Badge variant="outline">
                          {selectedPOsForBulkClose.size} PO{selectedPOsForBulkClose.size !== 1 ? 's' : ''} selected
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBulkCloseConfirm(true)}
                          disabled={isClosingPOs}
                        >
                          {isClosingPOs ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Closing...
                            </>
                          ) : 'Close Selected'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPOsForBulkClose(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Close PO Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-left font-medium">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPOsForBulkClose.size > 0 && Array.from(selectedPOsForBulkClose).length === groupedPOOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).filter(g => !g.orders.some(o => o.status === 'closed')).length}
                              onChange={(e) => {
                                const currentPagePOs = groupedPOOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(g => g.poNumber).filter(po => !groupedPOOrders.find(g => g.poNumber === po)?.orders.some(o => o.status === 'closed'));
                                if (e.target.checked) {
                                  setSelectedPOsForBulkClose(prev => new Set([...prev, ...currentPagePOs]));
                                } else {
                                  setSelectedPOsForBulkClose(prev => {
                                    const newSet = new Set(prev);
                                    currentPagePOs.forEach(po => newSet.delete(po));
                                    return newSet;
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            PO Number
                          </div>
                        </TableHead>
                        <TableHead className="p-2 text-left font-medium">Items</TableHead>
                        <TableHead className="p-2 text-left font-medium">Status</TableHead>
                        <TableHead className="p-2 text-left font-medium">Total Value</TableHead>
                        <TableHead className="p-2 text-left font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedPOOrders
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map(({ poNumber, orders }) => {
                          const isClosedPO = orders.some(order => order.status === 'closed');
                          const totalValue = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
                          const currency = orders[0]?.currency || 'USD';
                          const statusCounts = orders.reduce((acc, order) => {
                            acc[order.status] = (acc[order.status] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);

                          return (
                            <TableRow key={poNumber} className={isClosedPO ? 'opacity-50' : ''}>
                              <TableCell className="p-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedPOsForBulkClose.has(poNumber)}
                                    onChange={(e) => {
                                      if (isClosedPO) return;
                                      const newSelected = new Set(selectedPOsForBulkClose);
                                      if (e.target.checked) {
                                        newSelected.add(poNumber);
                                      } else {
                                        newSelected.delete(poNumber);
                                      }
                                      setSelectedPOsForBulkClose(newSelected);
                                    }}
                                    disabled={isClosedPO}
                                    className="rounded"
                                  />
                                  <span className="font-medium">{poNumber}</span>
                                  {isClosedPO && (
                                    <Badge variant="outline" className="text-xs">
                                      Closed
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="p-2">{orders.length}</TableCell>
                              <TableCell className="p-2">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(statusCounts).map(([status, count]) => (
                                    <Badge key={status} variant="outline" className="text-xs">
                                      {status}: {count}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="p-2 font-semibold">
                                {totalValue.toLocaleString('en-US', { 
                                  style: 'currency', 
                                  currency: currency 
                                })}
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/po-details?po=${poNumber}`)}
                                    disabled={isClosedPO}
                                  >
                                    View Details
                                  </Button>
                                  {!isClosedPO && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to close PO ${poNumber}? This action cannot be undone.`)) {
                                          handleClosePO(poNumber);
                                        }
                                      }}
                                      className="text-destructive-foreground"
                                    >
                                      Close PO
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {groupedPOOrders.length > itemsPerPage && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, groupedPOOrders.length)} of {groupedPOOrders.length} POs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {Math.ceil(groupedPOOrders.length / itemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(groupedPOOrders.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(groupedPOOrders.length / itemsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Bulk Close Confirmation Dialog */}
      <Dialog open={showBulkCloseConfirm} onOpenChange={setShowBulkCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk PO Close</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to close the following {selectedPOsForBulkClose.size} PO{selectedPOsForBulkClose.size !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {Array.from(selectedPOsForBulkClose).map(poNumber => (
                <div key={poNumber} className="text-sm font-mono">
                  {poNumber}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBulkCloseConfirm(false)}
                disabled={isClosingPOs}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleBulkClosePOs(Array.from(selectedPOsForBulkClose))}
                disabled={isClosingPOs}
              >
                {isClosingPOs ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  `Close ${selectedPOsForBulkClose.size} PO${selectedPOsForBulkClose.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      
      </Dialog>

      {/* Print Dialog */}
      <POPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        orders={printOrders}
        mode={printMode}
        title={printMode === 'single' ? 'Print Item' : 'Print Purchase Order Items'}
      />
    </div>
  );
};

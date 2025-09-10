// POTracker component for Amazon purchase orders
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw, Printer, Zap, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
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
  external_id?: string;
  external_id_type?: string;
  sku_code?: string; // Keep for backward compatibility
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'closed' | 'partial-fulfilled';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof POOrder | 'combined_title'>('po_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Print Labels state - Two-step flow
  const [labelsStep, setLabelsStep] = useState<'list' | 'print'>('list');
  const [selectedPOForLabels, setSelectedPOForLabels] = useState<string | null>(null);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [labelCurrentPage, setLabelCurrentPage] = useState(1);
  const [labelItemsPerPage, setLabelItemsPerPage] = useState(20);
  const [printSettings, setPrintSettings] = useState({
    template: 'default',
    copies: 1,
    copiesByQuantity: true,
    pageSize: 'default',
    dpi: 203 as 203 | 300,
    darkness: 10,
    customWidth: 100,
    customHeight: 60,
    autoSizeFromTemplate: true
  });
  
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

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

  // Sorting handler
  const handleSort = (field: keyof POOrder | 'combined_title') => {
    console.log('Sorting by field:', field, 'Current direction:', sortDirection);
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
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
  
  const { poOrders, isLoading, fetchPOOrders, processPOFiles, deletePOOrders, updatePrintStatus } = usePOOrders();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const { getImageByAsin } = useProductImages();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Delete all PO orders for fresh upload
  const handleDeleteAllPO = async () => {
    await deletePOOrders();
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

      console.log('🔄 Fetching deduplicated PO metrics for user:', user.id);

      const { data, error } = await supabase.rpc('get_po_dashboard_summary', {
        user_id_param: user.id
      });

      if (error) {
        console.error('❌ Error fetching deduplicated metrics:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      console.log('📊 Deduplicated metrics result:', data);
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

      const { data, error } = await supabase.rpc('get_po_group_metrics', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching PO group metrics:', error);
        throw error;
      }

      return data as Array<{
        po_number: string;
        distinct_skus: number;
        asn_quantity: number;
      }>;
    },
    enabled: !!profile?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (profile?.id && selectedCountry) {
      fetchPOOrders();
      initializeQZ();
    }
  }, [profile?.id, selectedCountry, fetchPOOrders]);

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

  // Refetch metrics when PO orders change
  useEffect(() => {
    if (!isLoading && refetchMetrics && refetchComprehensiveMetrics) {
      refetchMetrics();
      refetchComprehensiveMetrics();
    }
  }, [poOrders, isLoading, refetchMetrics, refetchComprehensiveMetrics]);

  const filteredOrders = useMemo(() => {
    let filtered = [...poOrders];
    
    // Use appropriate search query based on active tab
    const currentSearchQuery = activeTab === 'labels' ? labelSearchQuery : searchQuery;
    
    if (currentSearchQuery) {
      const lowerCaseQuery = currentSearchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.po_number.toLowerCase().includes(lowerCaseQuery) ||
        order.sku_code?.toLowerCase().includes(lowerCaseQuery) ||
        order.asin?.toLowerCase().includes(lowerCaseQuery) ||
        order.model_number?.toLowerCase().includes(lowerCaseQuery) ||
        order.title?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Apply sorting
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
      
      // Convert to string for comparison if needed
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [poOrders, searchQuery, labelSearchQuery, statusFilter, sortField, sortDirection, activeTab]);

  // Filtered PO Groups for labels search
  const filteredPOGroups = useMemo(() => {
    const groups: { [key: string]: POOrder[] } = {};
    
    // Use labelSearchQuery for the labels tab, searchQuery for others
    const query = activeTab === 'labels' ? labelSearchQuery : searchQuery;
    let ordersToFilter = [...poOrders];

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
  }, [poOrders, labelSearchQuery, searchQuery, activeTab]);

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
        const copies = printSettings.copiesByQuantity ? order.quantity : printSettings.copies;
        
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

      // Mark items as printed in database and clear selection after successful print
      const orderIds = selectedOrders.map(order => order.id);
      await updatePrintStatus(orderIds, true);
      setSelectedForPrint(new Set());

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
        sku_code: order.sku_code,
        model_number: order.model_number,
        asin: order.asin,
        title: order.title,
        quantity: order.quantity,
        po_number: order.po_number,
        status: order.status
      });

      const dataset: LabelDataset = {
        id: 'po-data',
        name: 'PO Order Data',
        description: 'Purchase Order Data',
        headers: ['sku', 'title', 'quantity', 'po_number', 'status', 'asin', 'model_number'],
        data: [[
          order.sku_code || order.model_number || order.asin || 'N/A',
          order.title || 'No title available',
          order.quantity.toString(),
          order.po_number,
          order.status,
          order.asin || 'No ASIN',
          order.model_number || 'No model'
        ]],
        rowCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Dataset created for printing:', dataset);

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

  // Print single item
  const handleSingleItemPrint = async (order: POOrder) => {
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
      const copies = printSettings.copiesByQuantity ? order.quantity : printSettings.copies;
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

      // Mark item as printed in database
      await updatePrintStatus([order.id], true);

    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to print label",
        variant: "destructive"
      });
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
          <Button variant="outline" size="sm" onClick={() => fetchPOOrders()}>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: isLoading ? 'running' : 'paused' }} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            PO Overview
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Uploads
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Labels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
              <div className="space-y-6">
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
                          (comprehensiveMetrics?.total_active_orders || poOrders.length)
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {viewMode === 'grouped' ? 
                          `Line Items: ${comprehensiveMetrics?.total_active_orders || poOrders.length}` :
                          `Qty: ${comprehensiveMetrics?.total_active_quantity || poOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}`
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
                        {(comprehensiveMetrics?.ordered_orders || 0) + (comprehensiveMetrics?.shipped_orders || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {poOrders.filter(order => ['ordered', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + (order.quantity || 0), 0)}
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
                        {comprehensiveMetrics?.pending_orders || poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).reduce((sum, order) => sum + (order.quantity || 0), 0)}
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
                        <Input
                          type="text"
                          placeholder="Search PO number, ASIN, model..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded-lg p-1">
                            <Button
                              variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setViewMode('grouped')}
                              className="h-8"
                            >
                              Grouped
                            </Button>
                            <Button
                              variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setViewMode('detailed')}
                              className="h-8"
                            >
                              Line Items
                            </Button>
                          </div>
                          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as POOrder['status'] | 'all')}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="all">All Statuses</SelectItem>
                               <SelectItem value="pending">Pending</SelectItem>
                               <SelectItem value="ordered">Ordered</SelectItem>
                               <SelectItem value="shipped">Shipped</SelectItem>
                               <SelectItem value="delivered">Delivered</SelectItem>
                               <SelectItem value="cancelled">Cancelled</SelectItem>
                               <SelectItem value="closed">Closed</SelectItem>
                               <SelectItem value="partial-fulfilled">Partial Fulfilled</SelectItem>
                             </SelectContent>
                          </Select>
                          <Select value={sortBy} onValueChange={(value) => setSortBy(value as keyof POOrder)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="po_number">PO Number</SelectItem>
                              <SelectItem value="model_number">Model Number</SelectItem>
                              <SelectItem value="quantity">Quantity</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                              <SelectItem value="order_date">Order Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Grouped View */}
                      {viewMode === 'grouped' && (
                        <div className="space-y-4">
                          {paginatedPOGroups.map((group, index) => (
                            <Card key={`${group.poNumber}-${index}`} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <h3 className="font-semibold text-lg">{group.poNumber}</h3>
                                      <p className="text-muted-foreground">
                                        {group.lineItems} line items • Total Qty: {group.totalQuantity}
                                      </p>
                                    </div>
                                    <Badge variant={
                                      group.matchedItems === group.lineItems ? 'default' : 
                                      group.matchedItems > 0 ? 'secondary' : 'outline'
                                    }>
                                      {group.matchedItems}/{group.lineItems} Matched
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/po-details?po=${encodeURIComponent(group.poNumber)}`)}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPOGroups.length)} of {filteredPOGroups.length} PO groups
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="px-3 py-1 bg-muted rounded text-sm">
                                {currentPage}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={currentPage * ITEMS_PER_PAGE >= filteredPOGroups.length}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed View */}
                      {viewMode === 'detailed' && (
                        <div className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>PO Number</TableHead>
                                  <TableHead>Model Number</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Qty</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>SKU Match</TableHead>
                                  <TableHead>Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedDetailedOrders.map((order) => {
                                  const productImage = productImages[order.asin || ''] || '/placeholder.svg';
                                  
                                  return (
                                    <TableRow key={order.id}>
                                      <TableCell className="font-medium">{order.po_number}</TableCell>
                                      <TableCell>{order.model_number}</TableCell>
                                      <TableCell className="max-w-xs truncate">
                                        <div className="flex items-center gap-2">
                                          <img 
                                            src={productImage} 
                                            alt={order.title || 'Product'} 
                                            className="w-8 h-8 rounded object-cover"
                                          />
                                          <span className="truncate">{order.title}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>{order.quantity}</TableCell>
                                      <TableCell>
                                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {order.sunsky_sku ? (
                                          <Badge variant="default">Matched</Badge>
                                        ) : (
                                          <Badge variant="outline">No Match</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => navigate(`/po-details?po=${encodeURIComponent(order.po_number)}`)}
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} line items
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="px-3 py-1 bg-muted rounded text-sm">
                                {currentPage}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={currentPage * ITEMS_PER_PAGE >= filteredOrders.length}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Purchase Orders</CardTitle>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload a CSV file containing purchase orders to track.
                </p>
              </CardContent>
            </CardHeader>
            <CardContent>
              <POFileUpload 
                onComplete={() => {
                  refetch();
                  setProcessingProgress(0);
                  setProcessingStatus('');
                }} 
                onProgress={(progress, status) => {
                  setProcessingProgress(progress);
                  setProcessingStatus(status);
                }}
                onError={(error) => {
                  refetch();
                  setProcessingProgress(0);
                  setProcessingStatus('');
                  console.error('Error processing files:', error);
                }} 
                isLoading={isLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels" className="space-y-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Purchase Orders</CardTitle>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Upload a CSV file containing purchase orders to track.
                      </p>
                    </CardContent>
                  </CardHeader>
                  <CardContent>
                    <POFileUpload 
                      onComplete={() => {
                        refetch();
                        setProcessingProgress(0);
                        setProcessingStatus('');
                      }} 
                      onProgress={(progress, status) => {
                        setProcessingProgress(progress);
                        setProcessingStatus(status);
                      }}
                      onError={(error) => {
                        refetch();
                        setProcessingProgress(0);
                        setProcessingStatus('');
                        console.error('Error processing files:', error);
                      }} 
                      isLoading={isLoading} 
                    />
                  </CardContent>
                </Card>
              </div>
            )
          },
          {
            value: "labels",
            label: "Print Labels",
            content: (
              <div className="space-y-6">
                {labelsStep === 'list' ? (
                  // Step 1: PO List View
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        Print Labels - Select Purchase Order
                      </CardTitle>
                      <p className="text-muted-foreground">
                        Choose a purchase order to print labels for its items
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Input
                          type="text"
                          placeholder="Search PO number, ASIN, model..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="max-w-sm"
                        />

                        {filteredPOGroups.map((group, index) => (
                          <Card key={`${group.poNumber}-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4" onClick={() => {
                              setSelectedPOForLabels(group.poNumber);
                              setLabelsStep('items');
                            }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <h3 className="font-semibold text-lg">{group.poNumber}</h3>
                                    <p className="text-muted-foreground">
                                      {group.lineItems} line items • Total Qty: {group.totalQuantity}
                                    </p>
                                  </div>
                                  <Badge variant={
                                    group.matchedItems === group.lineItems ? 'default' : 
                                    group.matchedItems > 0 ? 'secondary' : 'outline'
                                  }>
                                    {group.matchedItems}/{group.lineItems} Matched
                                  </Badge>
                                </div>
                                <Button variant="outline" size="sm">
                                  Select for Printing
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : labelsStep === 'items' ? (
                  // Step 2: Items Selection
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Printer className="h-5 w-5" />
                          Print Labels - Select Items
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLabelsStep('list');
                              setSelectedPOForLabels('');
                              setSelectedItemsForPrint([]);
                            }}
                          >
                            ← Back to PO List
                          </Button>
                          <p className="text-muted-foreground">
                            PO: {selectedPOForLabels} - Select items to print labels for
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const poItems = filteredOrders.filter(order => order.po_number === selectedPOForLabels);
                                if (selectedItemsForPrint.length === poItems.length) {
                                  setSelectedItemsForPrint([]);
                                } else {
                                  setSelectedItemsForPrint(poItems.map(order => order.id));
                                }
                              }}
                            >
                              {selectedItemsForPrint.length === filteredOrders.filter(order => order.po_number === selectedPOForLabels).length ? 'Deselect All' : 'Select All'}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {selectedItemsForPrint.length} items selected for printing
                            </span>
                          </div>

                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">Select</TableHead>
                                  <TableHead>Model</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Qty</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>SKU Match</TableHead>
                                  <TableHead>Print Status</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredOrders
                                  .filter(order => order.po_number === selectedPOForLabels)
                                  .map((order) => {
                                    const productImage = productImages[order.asin || ''] || '/placeholder.svg';
                                    
                                    return (
                                      <TableRow key={order.id}>
                                        <TableCell>
                                          <input
                                            type="checkbox"
                                            checked={selectedItemsForPrint.includes(order.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedItemsForPrint(prev => [...prev, order.id]);
                                              } else {
                                                setSelectedItemsForPrint(prev => prev.filter(id => id !== order.id));
                                              }
                                            }}
                                            className="rounded"
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium">{order.model_number}</TableCell>
                                        <TableCell className="max-w-xs truncate">
                                          <div className="flex items-center gap-2">
                                            <img 
                                              src={productImage} 
                                              alt={order.title || 'Product'} 
                                              className="w-8 h-8 rounded object-cover"
                                            />
                                            <span className="truncate">{order.title}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>
                                          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {order.sunsky_sku ? (
                                            <Badge variant="default">Matched</Badge>
                                          ) : (
                                            <Badge variant="outline">No Match</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={order.is_printed ? "default" : "outline"}>
                                            {order.is_printed ? "Printed" : "Not Printed Yet"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleSingleItemPrint(order)}
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>

                          {selectedItemsForPrint.length > 0 && (
                            <Button 
                              onClick={() => setLabelsStep('print')}
                              className="w-full"
                            >
                              Continue to Print Settings ({selectedItemsForPrint.length} items)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  // Step 3: Print Settings & Preview
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Printer className="h-5 w-5" />
                            Print Settings
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLabelsStep('items');
                              }}
                            >
                              ← Back to Items
                            </Button>
                            <p className="text-muted-foreground">
                              Configure your label printing settings
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Template Selection */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Label Template</h3>
                            <div className="space-y-2">
                              <Label>Template Type</Label>
                              <Select value={templateType} onValueChange={(value: 'predefined' | 'custom') => setTemplateType(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="predefined">Predefined Template</SelectItem>
                                  <SelectItem value="custom">Custom Template</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {templateType === 'predefined' && (
                              <div className="space-y-2">
                                <Label>Select Template</Label>
                                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="basic">Basic Label</SelectItem>
                                    <SelectItem value="detailed">Detailed Label</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {templateType === 'custom' && (
                              <div className="space-y-2">
                                <Label>Custom Template</Label>
                                <Select value={customTemplateId || ''} onValueChange={setCustomTemplateId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={userTemplates?.length ? "Select custom template" : "No custom templates available"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {userTemplates?.map((template) => (
                                      <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {(!userTemplates || userTemplates.length === 0) && (
                                  <p className="text-sm text-muted-foreground">
                                    No custom templates found. Create one in the Label Designer.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Page Size Selection */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Page Settings</h3>
                            <div className="space-y-2">
                              <Label>Page Size</Label>
                              <Select value={pageSize} onValueChange={setPageSize}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="4x6">4" × 6"</SelectItem>
                                  <SelectItem value="3x5">3" × 5"</SelectItem>
                                  <SelectItem value="2x4">2" × 4"</SelectItem>
                                  <SelectItem value="custom">Custom Size</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {pageSize === 'custom' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Width (inches)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={customWidth}
                                    onChange={(e) => setCustomWidth(e.target.value)}
                                    placeholder="4.0"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Height (inches)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={customHeight}
                                    onChange={(e) => setCustomHeight(e.target.value)}
                                    placeholder="6.0"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Print Quality */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Print Quality</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>DPI (Dots Per Inch)</Label>
                                <Select value={dpi} onValueChange={setDpi}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="203">203 DPI (Standard)</SelectItem>
                                    <SelectItem value="300">300 DPI (High)</SelectItem>
                                    <SelectItem value="600">600 DPI (Ultra)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Darkness (0-30)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="30"
                                  value={darkness}
                                  onChange={(e) => setDarkness(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Printer Selection */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Printer Settings</h3>
                            <div className="space-y-2">
                              <Label>Select Printer</Label>
                              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a printer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePrinters.map((printer) => (
                                    <SelectItem key={printer} value={printer}>
                                      {printer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleDirectPrint}
                              disabled={!qzConnected || isGeneratingZPL || selectedItemsForPrint.length === 0 || !selectedPrinter}
                              className="flex-1"
                            >
                              {isGeneratingZPL ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Labels ({selectedItemsForPrint.length})
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleDownloadZPL}
                              disabled={isGeneratingZPL || selectedItemsForPrint.length === 0}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download ZPL
                            </Button>
                          </div>

                          {printProgress > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Printing Progress</span>
                                <span>{Math.round(printProgress)}%</span>
                              </div>
                              <Progress value={printProgress} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Print Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            if (selectedItemsForPrint.length === 0) {
                              return (
                                <div className="text-center py-8 text-muted-foreground">
                                  No items selected for preview
                                </div>
                              );
                            }

                            const firstSelectedOrder = poOrders.find(order => order.id === selectedItemsForPrint[0]);
                            if (!firstSelectedOrder) {
                              return (
                                <div className="text-center py-8 text-muted-foreground">
                                  Order not found
                                </div>
                              );
                            }

                            // Generate preview based on template type
                            if (templateType === 'predefined') {
                              const dimensions = getLabelDimensions();
                              return (
                                <div 
                                  className="border rounded bg-white p-4 text-black text-xs font-mono"
                                  style={{ 
                                    width: `${dimensions.width / 2}px`, 
                                    height: `${dimensions.height / 2}px`,
                                    transform: 'scale(0.8)',
                                    transformOrigin: 'top left'
                                  }}
                                >
                                  <div className="space-y-1">
                                    <div className="font-bold">PO: {firstSelectedOrder.po_number}</div>
                                    <div className="text-[10px]">Model: {firstSelectedOrder.model_number}</div>
                                    <div className="text-[10px] truncate">Title: {firstSelectedOrder.title}</div>
                                    <div className="text-[10px]">Qty: {firstSelectedOrder.quantity}</div>
                                    {selectedTemplate === 'detailed' && (
                                      <>
                                        <div className="text-[10px]">ASIN: {firstSelectedOrder.asin}</div>
                                        <div className="text-[10px]">Status: {firstSelectedOrder.status}</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-center py-8 text-muted-foreground">
                                  Custom template preview not available
                                </div>
                              );
                            }
                          })()}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
      />
    </div>
  );
};

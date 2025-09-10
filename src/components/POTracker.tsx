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
        <TabsList className="grid w-full grid-cols-3 h-12 bg-gradient-subtle rounded-xl shadow-elegant p-1 border border-border/20">
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
                  </div>
                </div>

                <div className="rounded-lg border">
                  {viewMode === 'grouped' ? (
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>PO Number</TableHead>
                           <TableHead>PO Items</TableHead>
                           <TableHead>ASN Quantity</TableHead>
                           <TableHead>Matched %</TableHead>
                           <TableHead>Status Breakdown</TableHead>
                           <TableHead>Actions</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                        {paginatedPOGroups.map(({ poNumber, orders }) => {
                          const firstOrder = orders[0];
                          
                          // Get metrics from database function
                          const dbMetrics = poGroupMetrics?.find(m => m.po_number === poNumber);
                          const totalLineItems = dbMetrics?.distinct_skus || 0;
                          const asnQuantity = dbMetrics?.asn_quantity || 0;
                          
                          // Calculate matched percentage for display
                          const activeOrdersInPO = orders.filter((order: any) => 
                            order.status === 'pending' || order.status === 'ordered' || order.status === 'shipped'
                          );
                          const matchedCount = activeOrdersInPO.filter((order: any) => order.sunsky_sku !== null).length;
                          const matchedPercentage = activeOrdersInPO.length > 0 ? ((matchedCount / activeOrdersInPO.length) * 100).toFixed(0) : '0';
                          
                          const statusCounts = orders.reduce((counts: any, order: any) => {
                            counts[order.status] = (counts[order.status] || 0) + 1;
                            return counts;
                          }, {});

                           return (
                             <TableRow key={poNumber}>
                               <TableCell className="font-medium">
                                <Button 
                                  variant="link" 
                                  className="p-0 h-auto font-medium text-left justify-start"
                                  onClick={() => navigate(`/po-details/${poNumber}`)}
                                >
                                  {poNumber}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{totalLineItems}</span>
                                  <span className="text-xs text-muted-foreground">distinct SKU lines</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{asnQuantity}</span>
                                  <span className="text-xs text-muted-foreground">active units</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={parseInt(matchedPercentage) >= 80 ? "default" : parseInt(matchedPercentage) >= 50 ? "secondary" : "destructive"}>
                                    {matchedPercentage}%
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {matchedCount}/{activeOrdersInPO.length} matched
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(statusCounts).map(([status, count]) => (
                                    <Badge key={status} variant="outline" className="text-xs">
                                      {status}: {count as number}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/po-details/${poNumber}`)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>PO Number</TableHead>
                          <TableHead>ASIN</TableHead>
                          <TableHead>Model/SKU</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Matched</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDetailedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-medium text-left justify-start"
                                onClick={() => navigate(`/po-details/${order.po_number}`)}
                              >
                                {order.po_number}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
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
                                  order.status === 'delivered' ? 'default' :
                                  order.status === 'shipped' ? 'secondary' :
                                  order.status === 'ordered' ? 'outline' :
                                  order.status === 'pending' ? 'destructive' :
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
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/po-details/${order.po_number}`)}
                                >
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
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
              <CardTitle>Upload Purchase Orders</CardTitle>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload a CSV file containing purchase orders to track.
                </p>
              </CardContent>
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
              
              <POFileUpload onFilesUpload={(data) => {
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
                setProcessingStatus('Importing to database and matching SKUs...');

                processPOFiles(mappedData, []).then(() => {
                  setProcessingProgress(100);
                  setProcessingStatus('Import completed successfully!');
                  setTimeout(() => {
                    setProcessingProgress(0);
                    setProcessingStatus('');
                  }, 2000);
                  fetchPOOrders();
                }).catch((error) => {
                  setProcessingProgress(0);
                  setProcessingStatus('');
                  console.error('Error processing files:', error);
                });
              }} isLoading={isLoading} />
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
                   {/* Search Bar */}
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1 max-w-sm">
                       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                       <Input
                         placeholder="Search PO number, ASIN, model..."
                         value={labelSearchQuery}
                         onChange={(e) => {
                           console.log('Label search query changed to:', e.target.value);
                           setLabelSearchQuery(e.target.value);
                         }}
                         className="pl-9 pr-9"
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

                  {/* PO Groups List */}
                  <div className="space-y-2">
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
                      filteredPOGroups.map((group) => (
                        <Card 
                          key={group.poNumber} 
                          className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary/30 hover:border-l-primary"
                          onClick={() => {
                            setSelectedPOForLabels(group.poNumber);
                            setLabelsStep('print');
                          }}
                        >
                           <CardContent className="p-4">
                             <div className="flex items-center justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-2">
                                   <h3 className="text-base font-semibold text-primary">
                                     {group.poNumber}
                                   </h3>
                                   <Badge variant="secondary" className="text-xs">
                                     {group.orders.length} item{group.orders.length !== 1 ? 's' : ''}
                                   </Badge>
                                 </div>
                                 
                                  {/* Summary Info */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                                    <div>
                                      <span className="font-medium">Qty:</span> {group.orders.reduce((sum, order) => sum + order.quantity, 0)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Labels:</span>{' '}
                                      <span className="text-xs">
                                        {group.orders.filter(o => o.is_printed).length}/{group.orders.length} Printed
                                      </span>
                                      <Badge 
                                        variant={
                                          group.orders.every(o => o.is_printed) ? 'default' :
                                          group.orders.some(o => o.is_printed) ? 'secondary' :
                                          'outline'
                                        }
                                        className="text-xs ml-2"
                                      >
                                        {group.orders.every(o => o.is_printed) ? 'Complete' :
                                         group.orders.some(o => o.is_printed) ? 'Partial' :
                                         'Pending'}
                                      </Badge>
                                    </div>
                                  </div>
                               </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPOForLabels(group.poNumber);
                                    setLabelsStep('print');
                                  }}
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Labels
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
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
                      size="sm"
                      onClick={() => {
                        setLabelsStep('list');
                        setSelectedPOForLabels(null);
                        setSelectedForPrint(new Set());
                      }}
                    >
                      ← Back to PO List
                    </Button>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        Print Labels - {selectedPOForLabels}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">
                        Select items and configure print settings
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Print Settings Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Print Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Template Selection */}
                      <div className="space-y-2">
                        <Label>Template</Label>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            {labelTemplates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    {/* Page Size */}
                    <div className="space-y-2">
                      <Label>Page Size</Label>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="default">Default (4x6)</SelectItem>
                          <SelectItem value="4x6">4" x 6"</SelectItem>
                          <SelectItem value="4x3">4" x 3"</SelectItem>
                          <SelectItem value="3x2">3" x 2"</SelectItem>
                          <SelectItem value="2x1">2" x 1"</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* DPI Selection */}
                    <div className="space-y-2">
                      <Label>DPI Quality</Label>
                      <Select 
                        value={printSettings.dpi.toString()} 
                        onValueChange={(value) => setPrintSettings(prev => ({ ...prev, dpi: parseInt(value) as 203 | 300 }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="203">203 DPI (Standard)</SelectItem>
                          <SelectItem value="300">300 DPI (High Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Darkness */}
                    <div className="space-y-2">
                      <Label>Darkness (0-30)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={printSettings.darkness}
                        onChange={(e) => setPrintSettings(prev => ({ 
                          ...prev, 
                          darkness: Math.min(30, Math.max(0, parseInt(e.target.value) || 10))
                        }))}
                      />
                    </div>
                  </div>

                  {/* Custom Size Controls */}
                  {printSettings.pageSize === 'custom' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Custom Label Size</h4>
                        <div className="flex items-center space-x-2">
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
                            className="h-4 w-4 rounded border-border"
                          />
                          <Label htmlFor="auto-size" className="text-sm">Auto-size from template</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Width (mm)</Label>
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Height (mm)</Label>
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
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* Copy Settings */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        id="copies-by-qty"
                        type="checkbox"
                        checked={printSettings.copiesByQuantity}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, copiesByQuantity: e.target.checked }))}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor="copies-by-qty" className="text-sm">Print copies per quantity</Label>
                    </div>
                    
                    {!printSettings.copiesByQuantity && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Copies per item:</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={printSettings.copies}
                          onChange={(e) => setPrintSettings(prev => ({ 
                            ...prev, 
                            copies: Math.max(1, parseInt(e.target.value) || 1)
                          }))}
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Printer Selection & Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4">
                      {qzConnected && availablePrinters.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Printer:</Label>
                          <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select printer" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              {availablePrinters.map((printer) => (
                                <SelectItem key={printer} value={printer}>
                                  {printer}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Badge variant={qzConnected ? 'default' : 'destructive'} className="text-xs">
                        {qzConnected ? `QZ Connected (${availablePrinters.length} printers)` : 'QZ Disconnected'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadZPL}
                        disabled={selectedForPrint.size === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download ZPL
                      </Button>
                      
                      <Button 
                        onClick={handleDirectPrint}
                        disabled={selectedForPrint.size === 0 || !qzConnected || !selectedPrinter || isPrinting}
                      >
                        {isPrinting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        Print Labels ({selectedForPrint.size})
                      </Button>
                    </div>
                  </div>

                  {/* Connection Status */}
                  {!qzConnected && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          QZ Tray not connected. Labels will be downloaded instead of printed directly.
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={initializeQZ}
                          className="ml-auto"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items Selection Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Select Items to Print</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const poOrders = filteredOrders.filter(order => order.po_number === selectedPOForLabels);
                          const currentPageIds = new Set(poOrders.map(order => order.id));
                          const allSelected = Array.from(currentPageIds).every(id => selectedForPrint.has(id));
                          
                          if (allSelected) {
                            setSelectedForPrint(prev => {
                              const newSet = new Set(prev);
                              currentPageIds.forEach(id => newSet.delete(id));
                              return newSet;
                            });
                          } else {
                            setSelectedForPrint(prev => new Set([...prev, ...currentPageIds]));
                          }
                        }}
                      >
                        {(() => {
                          const poOrders = filteredOrders.filter(order => order.po_number === selectedPOForLabels);
                          const allSelected = poOrders.every(order => selectedForPrint.has(order.id));
                          return allSelected && poOrders.length > 0 ? 'Unselect All' : 'Select All';
                        })()}
                      </Button>
                      <Badge variant="outline">
                        {selectedForPrint.size} selected
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by SKU, title, ASIN..."
                        value={labelSearchQuery}
                        onChange={(e) => setLabelSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      {labelSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setLabelSearchQuery('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead className="w-16">Image</TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none w-32"
                            onClick={() => handleSort('sku_code')}
                          >
                            <div className="flex items-center gap-1">
                              SKU/Model
                              {sortField === 'sku_code' && (
                                <span className="text-xs">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('combined_title')}
                          >
                            <div className="flex items-center gap-1">
                              Title & ASIN
                              {sortField === 'combined_title' && (
                                <span className="text-xs">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={() => handleSort('quantity')}
                          >
                            <div className="flex items-center gap-1">
                              Qty
                              {sortField === 'quantity' && (
                                <span className="text-xs">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Print Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                       <TableBody>
                         {(() => {
                           const ordersForSelectedPO = filteredOrders.filter(order => order.po_number === selectedPOForLabels);
                           const startIndex = (labelCurrentPage - 1) * labelItemsPerPage;
                           const endIndex = startIndex + labelItemsPerPage;
                           const paginatedOrders = ordersForSelectedPO.slice(startIndex, endIndex);
                           
                           return paginatedOrders.map((order) => (
                             <TableRow key={order.id}>
                               <TableCell>
                                 <input
                                   type="checkbox"
                                   checked={selectedForPrint.has(order.id)}
                                   onChange={(e) => {
                                     const newSelected = new Set(selectedForPrint);
                                     if (e.target.checked) {
                                       newSelected.add(order.id);
                                     } else {
                                       newSelected.delete(order.id);
                                     }
                                     setSelectedForPrint(newSelected);
                                   }}
                                   className="h-4 w-4 rounded border-border"
                                 />
                               </TableCell>
                                   <TableCell>
                                     {(() => {
                                       const productImage = order.asin ? getImageByAsin(order.asin) : null;
                                       return productImage ? (
                                         <div className="relative group">
                                           <img 
                                             src={productImage.image_url} 
                                             alt={productImage.image_name || order.title || 'Product'} 
                                             className="w-16 h-16 rounded border object-cover cursor-pointer transition-transform hover:scale-105"
                                             onError={(e) => {
                                               e.currentTarget.style.display = 'none';
                                               e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                             }}
                                           />
                                           {/* Hover preview */}
                                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                             <div className="bg-background border border-border rounded-lg shadow-lg p-2">
                                               <img 
                                                 src={productImage.image_url} 
                                                 alt={productImage.image_name || order.title || 'Product'} 
                                                 className="w-48 h-48 object-contain rounded"
                                               />
                                               <div className="text-xs text-muted-foreground mt-1 max-w-48 truncate">
                                                 {productImage.image_name || order.title || 'Product Image'}
                                               </div>
                                             </div>
                                           </div>
                                         </div>
                                       ) : (
                                         <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center">
                                           <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                           </svg>
                                         </div>
                                       );
                                     })()}
                                   </TableCell>
                                 <TableCell className="w-32">
                                   <div className="space-y-1">
                                     {order.sku_code && (
                                       <div className="text-sm font-medium font-mono break-words">{order.sku_code}</div>
                                     )}
                                     {order.model_number && order.model_number !== order.sku_code && (
                                       <div className="text-xs text-muted-foreground font-mono break-words">{order.model_number}</div>
                                     )}
                                     {!order.sku_code && !order.model_number && (
                                       <span className="text-xs text-muted-foreground">N/A</span>
                                     )}
                                   </div>
                                 </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium break-words whitespace-pre-wrap" title={order.title}>
                                      {order.title || 'No title'}
                                    </div>
                                    {order.asin && (
                                      <div className="text-xs text-muted-foreground font-mono">{order.asin}</div>
                                    )}
                                  </div>
                                </TableCell>
                               <TableCell>
                                 <Badge variant="secondary" className="font-mono">
                                   {order.quantity}
                                 </Badge>
                               </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={order.is_printed ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    {order.is_printed ? 'Printed' : 'Not Printed Yet'}
                                  </Badge>
                                </TableCell>
                               <TableCell>
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   onClick={() => handleSingleItemPrint(order)}
                                   disabled={!qzConnected || !selectedPrinter}
                                   className="w-full"
                                 >
                                   <Printer className="h-3 w-3 mr-1" />
                                   Print
                                 </Button>
                               </TableCell>
                             </TableRow>
                           ));
                         })()}
                       </TableBody>
                     </Table>
                   </div>
                   
                   {/* Pagination Controls */}
                   {(() => {
                     const ordersForSelectedPO = filteredOrders.filter(order => order.po_number === selectedPOForLabels);
                     const totalPages = Math.ceil(ordersForSelectedPO.length / labelItemsPerPage);
                     
                     if (totalPages <= 1) return null;
                     
                     return (
                       <div className="flex items-center justify-between px-2 py-4 border-t">
                         <div className="flex items-center space-x-2">
                           <p className="text-sm text-muted-foreground">
                             Page {labelCurrentPage} of {totalPages} ({ordersForSelectedPO.length} items)
                           </p>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setLabelCurrentPage(prev => Math.max(1, prev - 1))}
                             disabled={labelCurrentPage === 1}
                           >
                             Previous
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setLabelCurrentPage(prev => Math.min(totalPages, prev + 1))}
                             disabled={labelCurrentPage === totalPages}
                           >
                             Next
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

      </Tabs>
    </div>
  );
};

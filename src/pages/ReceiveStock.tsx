import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useStockReceiving } from '@/hooks/useStockReceiving';
import { useReceivingHistory } from '@/hooks/useReceivingHistory';
import { useCountry } from '@/contexts/CountryContext';
import { useQueryClient } from '@tanstack/react-query';
import { ItemSearchBar, ItemSearchBarRef } from '@/components/stock-receiving/ItemSearchBar';
import { QuantityConfirmDialog } from '@/components/stock-receiving/QuantityConfirmDialog';
import { RecentActivityFeed } from '@/components/stock-receiving/RecentActivityFeed';
import { PriorityPOList } from '@/components/stock-receiving/PriorityPOList';

import { ReceivingDashboard } from '@/components/stock-receiving/ReceivingDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertCircle, CheckCircle2, Loader2, Package, ChevronDown, Users, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, PrintSettings } from '@/types/label';
import { QZConnectionManager } from '@/utils/qz-connection-manager';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
  serial_number?: string;
}
interface ActivityItem {
  id: string;
  success: boolean;
  identifier: string;
  destination: string;
  quantity: number;
  printed: boolean;
  timestamp: Date;
  error?: string;
  template_type?: 'po' | 'inventory';
}

export default function ReceiveStock() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  usePageTracking({
    category: 'Inventory',
    subcategory: 'Stock Receiving',
    pageTitle: 'Receive Stock'
  });
  
  const {
    selectedCountry
  } = useCountry();
  const queryClient = useQueryClient();
  const {
    isProcessing,
    processSingleItem,
    testConnection
  } = useStockReceiving();
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [directPrintEnabled, setDirectPrintEnabled] = useState(false);
  const [printDarkness, setPrintDarkness] = useState(10);
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);
  const [poTemplates, setPoTemplates] = useState<any[]>([]);
  const [inventoryTemplates, setInventoryTemplates] = useState<any[]>([]);
  const [selectedPoTemplate, setSelectedPoTemplate] = useState<string>('');
  const [selectedInventoryTemplate, setSelectedInventoryTemplate] = useState<string>('');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [receivingHistoryOpen, setReceivingHistoryOpen] = useState(false);
  const searchBarRef = useRef<ItemSearchBarRef>(null);

  // Dashboard metrics state
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalPOs: 0,
    receivedToday: 0,
    pendingCount: 0,
    groupCount: 0,
  });

  // Load dashboard metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [poResult, pendingResult, historyResult, groupResult] = await Promise.all([
          supabase.from('po_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('po_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'placed']),
          supabase.from('receiving_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', today.toISOString()),
          supabase.from('po_groups').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
        ]);

        const totalPOs = poResult.count || 0;
        const pendingCount = pendingResult.count || 0;

        setDashboardMetrics({
          totalPOs,
          receivedToday: historyResult.count || 0,
          pendingCount,
          groupCount: groupResult.count || 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      }
    };
    
    if (!isCheckingAuth) loadMetrics();
  }, [isCheckingAuth]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🔐 Auth Check - Session:', session?.user?.id || 'No session');
        
        if (error) {
          console.error('❌ Auth Check - Error:', error.message);
        }
        
        if (!session) {
          console.warn('⚠️ No active session - Redirecting to auth');
          toast.error('Please sign in to access this page');
          navigate('/auth');
          return;
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('❌ Auth Check - Exception:', error);
        toast.error('Authentication error');
        navigate('/auth');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth State Changed:', event, session?.user?.id || 'No session');
      
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Helper to convert item to dataset format (same as Inventory page)
  const createDatasetFromItem = (item: any, result: any, poNumbers?: string, priority?: number): LabelDataset => {
    return {
      id: 'receive-stock-data',
      name: 'Received Stock Data',
      description: 'Stock receiving item',
      headers: ['PO Number', 'Priority', 'ASIN', 'SKU', 'Title', 'Serial', 'Quantity', 'Status', 'Date'],
      data: [[poNumbers || 'N/A', priority?.toString() || '3', item.asin || 'N/A', item.sku_code || 'N/A', item.title || 'No Title', item.serial_number || 'N/A', item.quantity.toString(), result.template_type === 'po' ? 'Fulfilled' : 'In Stock', new Date().toLocaleDateString()]],
      rowCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };
  const getAutoPrintConfig = () => {
    return {
      enabled: localStorage.getItem('stock-receiving-auto-print') === 'true',
      preferDirectPrint: localStorage.getItem('stock-receiving-direct-print') === 'true',
      darkness: parseInt(localStorage.getItem('stock-receiving-print-darkness') || '10', 10)
    };
  };
  const saveAutoPrintConfig = (config: {
    enabled: boolean;
    preferDirectPrint: boolean;
    darkness?: number;
  }) => {
    localStorage.setItem('stock-receiving-auto-print', config.enabled.toString());
    localStorage.setItem('stock-receiving-direct-print', config.preferDirectPrint.toString());
    if (config.darkness !== undefined) {
      localStorage.setItem('stock-receiving-print-darkness', config.darkness.toString());
    }
  };

  useEffect(() => {
    checkConnection();

    const config = getAutoPrintConfig();
    setAutoPrintEnabled(config.enabled);
    setDirectPrintEnabled(config.preferDirectPrint);
    setPrintDarkness(config.darkness);

    const savedPoTemplate = localStorage.getItem('stock-receiving-po-template-id');
    const savedInventoryTemplate = localStorage.getItem('stock-receiving-inventory-template-id');
    if (savedPoTemplate) setSelectedPoTemplate(savedPoTemplate);
    if (savedInventoryTemplate) setSelectedInventoryTemplate(savedInventoryTemplate);

    loadTemplates(savedPoTemplate, savedInventoryTemplate);

    if (config.preferDirectPrint) {
      loadPrinters();
    }
  }, []);
  const loadTemplates = async (savedPoTemplate?: string | null, savedInventoryTemplate?: string | null) => {
    try {
      const {
        data: poData
      } = await supabase.from('label_templates').select('id, name, description').or('name.ilike.%po%,name.ilike.%purchase%,description.ilike.%po%').order('created_at', {
        ascending: false
      });

      const {
        data: invData
      } = await supabase.from('label_templates').select('id, name, description').or('name.ilike.%inventory%,name.ilike.%warehouse%,name.ilike.%stock%').order('created_at', {
        ascending: false
      });
      setPoTemplates(poData || []);
      setInventoryTemplates(invData || []);

      if (poData && poData.length > 0 && !savedPoTemplate) {
        setSelectedPoTemplate(poData[0].id);
        localStorage.setItem('stock-receiving-po-template-id', poData[0].id);
      }
      if (invData && invData.length > 0 && !savedInventoryTemplate) {
        setSelectedInventoryTemplate(invData[0].id);
        localStorage.setItem('stock-receiving-inventory-template-id', invData[0].id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };
  const loadPrinters = async () => {
    console.log('🖨️ loadPrinters called, directPrintEnabled:', directPrintEnabled);
    setLoadingPrinters(true);
    try {
      const {
        QZConnectionManager
      } = await import('@/utils/qz-connection-manager');
      const qzManager = QZConnectionManager.getInstance();
      await qzManager.connect();
      const printers = await qzManager.getPrinters();
      console.log('🖨️ Printers retrieved:', printers.length, printers);
      setAvailablePrinters(printers);
      console.log('🖨️ State updated with printers');

      const savedPrinter = localStorage.getItem('stock-receiving-default-printer');
      if (savedPrinter && printers.includes(savedPrinter)) {
        console.log('🖨️ Auto-selecting saved printer:', savedPrinter);
        setSelectedPrinter(savedPrinter);
      } else {
        const zebraPrinter = printers.find((p: string) => p.toLowerCase().includes('zebra'));
        if (zebraPrinter) {
          console.log('🖨️ Auto-selecting Zebra printer:', zebraPrinter);
          setSelectedPrinter(zebraPrinter);
          localStorage.setItem('stock-receiving-default-printer', zebraPrinter);
        }
      }
      toast.success(`Found ${printers.length} printer(s)`);
    } catch (error) {
      console.error('❌ Failed to load printers:', error);
      setAvailablePrinters([]);
      toast.error('Failed to load printers. Make sure QZ Tray is running.');
    } finally {
      setLoadingPrinters(false);
    }
  };
  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const result = await testConnection();
      setConnectionStatus(result.connected ? 'connected' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    }
  };
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    await checkConnection();
    setIsTestingConnection(false);
  };

  const handleItemSelect = (result: SearchResult) => {
    setSelectedItem(result);
    setShowDialog(true);
  };

  const handleConfirm = async (data: {
    quantity: number;
    serial_number?: string;
    supplier_name?: string;
    notes?: string;
    autoPrint: boolean;
    manualPOAllocations?: Array<{ po_id: string; po_number: string; quantity: number; priority?: number }>;
  }) => {
    if (!selectedItem) return;

    if (data.autoPrint && directPrintEnabled && !selectedPrinter) {
      toast.error('Please select a printer first', {
        description: 'Click the Refresh button to load available printers',
        duration: 5000
      });
      return;
    }
    const item = {
      asin: selectedItem.asin,
      sku_code: selectedItem.sku_code,
      model_number: selectedItem.model_number,
      title: selectedItem.title,
      quantity: data.quantity,
      serial_number: data.serial_number,
      supplier_name: data.supplier_name,
      notes: data.notes,
      country: selectedCountry
    };
    const receivePromise = processSingleItem(
      item, 
      true, 
      undefined, 
      selectedCountry,
      data.manualPOAllocations
    );

    let printPromise: Promise<boolean> | null = null;
    
    if (data.autoPrint && directPrintEnabled && selectedPrinter) {
      const templateType = (selectedItem.type === 'inventory' || selectedItem.type === 'recent') ? 'inventory' : 'po';
      console.log(`[Auto-Print] Item type: ${selectedItem.type}, Using template: ${templateType}`);
      const templateId = templateType === 'po' ? selectedPoTemplate : selectedInventoryTemplate;
      
      if (templateId) {
        printPromise = (async () => {
          try {
            const { data: template, error: templateError } = await supabase
              .from('label_templates')
              .select('*')
              .eq('id', templateId)
              .single();

            if (templateError || !template) {
              console.error('[Auto-Print] Template fetch error:', templateError);
              toast.error('Failed to load label template');
              return false;
            }

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

            const receiveResult = await receivePromise;
            
            const resultItem = Array.isArray(receiveResult) && receiveResult.length > 0 
              ? receiveResult[0] 
              : null;
            const manualPOAllocations = resultItem?.manual_po_allocations || data.manualPOAllocations || [];

            console.log('[Auto-Print] Using allocations from response:', manualPOAllocations);

            const poNumbers = manualPOAllocations?.map(a => a.po_number).join(', ') || 'N/A';
            const priority = manualPOAllocations?.[0]?.priority || 3;

            if (manualPOAllocations && manualPOAllocations.length > 0) {
              console.log(`✅ [Stock Receiving] Item allocated to:`, {
                po_numbers: poNumbers,
                priority: priority,
                allocations: manualPOAllocations
              });
              
              toast.success(`Allocated to PO ${poNumbers} (Priority: ${priority})`, {
                description: `Printing label with correct PO and priority`,
                duration: 3000
              });
            } else {
              console.log(`📦 [Stock Receiving] Item going to inventory (no PO match)`);
            }

            if (data.serial_number && manualPOAllocations.length === 0) {
              console.warn('⚠️ [Print] Serial number provided for inventory item. Ensure inventory template has "Serial Number" field mapped!');
              console.log('[Print] Serial Number:', data.serial_number);
            }

            const dataset: LabelDataset = {
              id: 'receive-stock',
              name: 'Stock Receiving',
              description: 'Stock receiving data',
              headers: ['PO Number', 'Priority', 'ASIN', 'SKU', 'Model', 'Title', 'Quantity', 'Serial Number'],
              data: [[
                poNumbers,
                String(priority),
                item.asin || '',
                item.sku_code || '',
                item.model_number || '',
                item.title || '',
                String(data.quantity),
                data.serial_number || ''
              ]],
              rowCount: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            console.log('[Print] Dataset created:', {
              template_type: manualPOAllocations.length > 0 ? 'po' : 'inventory',
              po_numbers: poNumbers,
              priority: priority,
              serial_number: data.serial_number || '(none)',
              dataset_row: dataset.data[0]
            });

            const printSettings: PrintSettings = {
              format: 'zpl',
              paperSize: 'custom',
              orientation: 'portrait',
              dpi: 203,
              copies: data.quantity,
              labelsPerPage: 1,
              margin: 0,
              darkness: printDarkness
            };

            const templateType = manualPOAllocations.length > 0 ? 'po' : 'inventory';
            if (templateType === 'inventory') {
              console.log('📋 [Print] Using INVENTORY template');
              console.log('⚠️ [Print] If serial number is not showing, check your inventory template:');
              console.log('   1. Open Label Designer');
              console.log('   2. Edit your inventory template');
              console.log('   3. Add a Text element');
              console.log('   4. In the Data tab, select column: "Serial Number" (index 7)');
              console.log('   5. Save template');
            } else {
              console.log('📋 [Print] Using PO template');
            }

            const zplCode = PrintService.generateZPL(labelDoc, dataset, printSettings);
            
            const qzManager = QZConnectionManager.getInstance();
            await qzManager.print(zplCode, selectedPrinter);
            console.log('[Auto-Print] ✅ Label printed successfully');
            return true;
          } catch (err) {
            console.error('[Auto-Print] ❌ Print error:', err);
            toast.error('Failed to print label');
            return false;
          }
        })();
      }
    }

    const results = await receivePromise;
    
    if (!results || results.length === 0 || !results[0].success) {
      console.error('[Receive] Failed to process item:', results);
      toast.error('Failed to receive item. Please check logs.');
      setShowDialog(false);
      setSelectedItem(null);
      return;
    }
    
    if (results && results.length > 0) {
      const result = results[0];

      let destination = 'Inventory';
      let templateType: 'po' | 'inventory' = 'inventory';
      if (result.matched_pos && result.matched_pos.length > 0) {
        const poNumbers = result.matched_pos.map((p: any) => p.po_number || p).join(', ');
        destination = `PO ${poNumbers}`;
        templateType = 'po';
      }

      const activity: ActivityItem = {
        id: `${Date.now()}-${Math.random()}`,
        success: result.success,
        identifier: item.asin || item.sku_code || item.model_number || 'Unknown',
        destination,
        quantity: data.quantity,
        printed: false,
        timestamp: new Date(),
        template_type: templateType,
        error: result.error
      };

      if (printPromise && result.success) {
        await printPromise;
      }
      setLocalActivities(prev => [activity, ...prev]);

      queryClient.invalidateQueries({
        queryKey: ['asin-inventory']
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-analytics']
      });
      toast.success(`Received ${data.quantity} unit(s)`);
      
      setTimeout(() => {
        searchBarRef.current?.focusAndSelect();
      }, 100);
    }
    setShowDialog(false);
    setSelectedItem(null);
  };

  const handleClearActivities = () => {
    setLocalActivities([]);
    toast.success('Local activity cleared');
  };
  const handleAutoPrintChange = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    const config = getAutoPrintConfig();
    saveAutoPrintConfig({
      ...config,
      enabled
    });
  };
  const handleDirectPrintChange = async (enabled: boolean) => {
    console.log('🔄 Direct print changed to:', enabled);
    setDirectPrintEnabled(enabled);
    const config = getAutoPrintConfig();
    saveAutoPrintConfig({
      ...config,
      preferDirectPrint: enabled
    });

    if (enabled) {
      console.log('🖨️ Loading printers because direct print was enabled');
      await loadPrinters();
    } else {
      setAvailablePrinters([]);
      setSelectedPrinter('');
    }
  };
  const handlePoTemplateChange = (templateId: string) => {
    setSelectedPoTemplate(templateId);
    localStorage.setItem('stock-receiving-po-template-id', templateId);
  };
  const handleInventoryTemplateChange = (templateId: string) => {
    setSelectedInventoryTemplate(templateId);
    localStorage.setItem('stock-receiving-inventory-template-id', templateId);
  };
  const handleDarknessChange = (value: number[]) => {
    const darkness = value[0];
    setPrintDarkness(darkness);
    saveAutoPrintConfig({
      enabled: autoPrintEnabled,
      preferDirectPrint: directPrintEnabled,
      darkness
    });
    console.log('🖨️ Print darkness set to:', darkness);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Dashboard Metrics */}
        <ReceivingDashboard
          totalPOs={dashboardMetrics.totalPOs}
          receivedToday={dashboardMetrics.receivedToday}
          pendingCount={dashboardMetrics.pendingCount}
          groupCount={dashboardMetrics.groupCount}
        />

        {/* Search Section - Enhanced */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Receive Items
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      connectionStatus === 'connected' ? 'bg-emerald' : connectionStatus === 'error' ? 'bg-destructive' : 'bg-warning animate-pulse'
                    )} />
                  </CardTitle>
                  <CardDescription>
                    Search by ASIN, SKU, or Model Number to receive inventory
                  </CardDescription>
                </div>
              </div>
              
              {/* Print Settings Sheet */}
              <Sheet open={printSettingsOpen} onOpenChange={setPrintSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Print Settings</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    {/* Auto-print toggle */}
                    <div className="flex items-center gap-2">
                      <Switch id="auto-print-sheet" checked={autoPrintEnabled} onCheckedChange={handleAutoPrintChange} />
                      <Label htmlFor="auto-print-sheet" className="text-sm cursor-pointer">
                        Auto-print labels after receiving
                      </Label>
                    </div>
                    
                    {autoPrintEnabled && (
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        <div className="flex items-center gap-2">
                          <Switch id="direct-print-sheet" checked={directPrintEnabled} onCheckedChange={handleDirectPrintChange} />
                          <Label htmlFor="direct-print-sheet" className="text-sm cursor-pointer">
                            Use direct printing (QZ Tray)
                          </Label>
                        </div>

                        {directPrintEnabled && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="default-printer-sheet" className="text-sm font-medium">
                                Default Printer
                              </Label>
                              <Button type="button" variant="ghost" size="sm" onClick={loadPrinters} disabled={loadingPrinters}>
                                {loadingPrinters ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading...</> : 'Refresh'}
                              </Button>
                            </div>
                            
                            {!selectedPrinter && availablePrinters.length === 0 && !loadingPrinters && (
                              <Alert className="border-warning/50 bg-warning/10">
                                <AlertCircle className="w-4 h-4 text-warning" />
                                <AlertDescription className="text-sm">
                                  No printers found. Make sure QZ Tray is running and click Refresh.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {!selectedPrinter && availablePrinters.length > 0 && (
                              <Alert className="border-warning/50 bg-warning/10">
                                <AlertCircle className="w-4 h-4 text-warning" />
                                <AlertDescription className="text-sm">
                                  ⚠️ No printer selected - labels won't print! Select one below.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <Select value={selectedPrinter} onValueChange={value => {
                              setSelectedPrinter(value);
                              localStorage.setItem('stock-receiving-default-printer', value);
                              toast.success(`Printer set to: ${value}`);
                            }} disabled={loadingPrinters}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={loadingPrinters ? 'Loading printers...' : availablePrinters.length > 0 ? 'Select printer...' : 'No printers found'} />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePrinters.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    {loadingPrinters ? 'Loading...' : 'No printers found'}
                                  </SelectItem>
                                ) : availablePrinters.map(printer => (
                                  <SelectItem key={printer} value={printer}>{printer}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedPrinter && (
                              <p className="text-xs text-emerald">✓ Will print to: {selectedPrinter}</p>
                            )}
                          </div>
                        )}

                        {/* Darkness Control */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Print Darkness: {printDarkness}</Label>
                            <span className="text-xs text-muted-foreground">(0–30)</span>
                          </div>
                          <Slider min={0} max={30} step={1} value={[printDarkness]} onValueChange={handleDarknessChange} className="w-full" />
                        </div>

                        {/* Template Selection */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PO Label Template</Label>
                            <Select value={selectedPoTemplate} onValueChange={handlePoTemplateChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select PO template..." />
                              </SelectTrigger>
                              <SelectContent>
                                {poTemplates.length === 0 ? (
                                  <SelectItem value="none" disabled>No PO templates found</SelectItem>
                                ) : poTemplates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Inventory Label Template</Label>
                            <Select value={selectedInventoryTemplate} onValueChange={handleInventoryTemplateChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select inventory template..." />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryTemplates.length === 0 ? (
                                  <SelectItem value="none" disabled>No inventory templates found</SelectItem>
                                ) : inventoryTemplates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardHeader>
          <CardContent>
            <ItemSearchBar 
              ref={searchBarRef}
              onItemSelect={handleItemSelect} 
              disabled={isProcessing} 
              country={selectedCountry} 
            />
          </CardContent>
        </Card>

        {/* Priority PO Management */}
        <PriorityPOList />

        {/* Receiving History */}
        <Collapsible open={receivingHistoryOpen} onOpenChange={setReceivingHistoryOpen}>
          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald/10 p-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald" />
                  </div>
                  <div>
                    <CardTitle>Receiving History</CardTitle>
                    <CardDescription>
                      Complete history of all received items
                    </CardDescription>
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-lg">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", receivingHistoryOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <RecentActivityFeed 
                  activities={localActivities}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Quantity Confirm Dialog */}
      <QuantityConfirmDialog
        open={showDialog}
        onClose={() => {
          setShowDialog(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onConfirm={handleConfirm}
        processing={isProcessing}
        initialSerialNumber={selectedItem?.serial_number}
        country={selectedCountry}
      />
    </div>
  );
}

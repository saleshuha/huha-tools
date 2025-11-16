import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useStockReceiving } from '@/hooks/useStockReceiving';
import { useReceivingHistory } from '@/hooks/useReceivingHistory';
import { useCountry } from '@/contexts/CountryContext';
import { useQueryClient } from '@tanstack/react-query';
import { ItemSearchBar } from '@/components/stock-receiving/ItemSearchBar';
import { QuantityConfirmDialog } from '@/components/stock-receiving/QuantityConfirmDialog';
import { RecentActivityFeed } from '@/components/stock-receiving/RecentActivityFeed';
import { PriorityPOList } from '@/components/stock-receiving/PriorityPOList';
import { POGroupManager } from '@/components/stock-receiving/POGroupManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, CheckCircle2, Loader2, Package, ChevronDown, Users } from 'lucide-react';
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
  // Local activities state for immediate feedback before DB sync
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth State Changed:', event, session?.user?.id || 'No session');
      
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Helper to convert item to dataset format (same as Inventory page)
  const createDatasetFromItem = (item: any, result: any, poNumbers?: string): LabelDataset => {
    return {
      id: 'receive-stock-data',
      name: 'Received Stock Data',
      description: 'Stock receiving item',
      headers: ['PO Number', 'ASIN', 'SKU', 'Title', 'Serial', 'Quantity', 'Status', 'Date'],
      data: [[poNumbers || 'N/A', item.asin || 'N/A', item.sku_code || 'N/A', item.title || 'No Title', item.serial_number || 'N/A', item.quantity.toString(), result.template_type === 'po' ? 'Fulfilled' : 'In Stock', new Date().toLocaleDateString()]],
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

    // Load print preferences
    const config = getAutoPrintConfig();
    setAutoPrintEnabled(config.enabled);
    setDirectPrintEnabled(config.preferDirectPrint);
    setPrintDarkness(config.darkness);

    // Load template preferences
    const savedPoTemplate = localStorage.getItem('stock-receiving-po-template-id');
    const savedInventoryTemplate = localStorage.getItem('stock-receiving-inventory-template-id');
    if (savedPoTemplate) setSelectedPoTemplate(savedPoTemplate);
    if (savedInventoryTemplate) setSelectedInventoryTemplate(savedInventoryTemplate);

    // Load templates
    loadTemplates(savedPoTemplate, savedInventoryTemplate);

    // Auto-load printers if direct print is enabled
    if (config.preferDirectPrint) {
      loadPrinters();
    }
  }, []);
  const loadTemplates = async (savedPoTemplate?: string | null, savedInventoryTemplate?: string | null) => {
    try {
      // Load PO templates
      const {
        data: poData
      } = await supabase.from('label_templates').select('id, name, description').or('name.ilike.%po%,name.ilike.%purchase%,description.ilike.%po%').order('created_at', {
        ascending: false
      });

      // Load Inventory templates
      const {
        data: invData
      } = await supabase.from('label_templates').select('id, name, description').or('name.ilike.%inventory%,name.ilike.%warehouse%,name.ilike.%stock%').order('created_at', {
        ascending: false
      });
      setPoTemplates(poData || []);
      setInventoryTemplates(invData || []);

      // Auto-select first template if none selected
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

      // Auto-select saved printer or first Zebra printer
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
    manualPOAllocations?: Array<{ po_id: string; po_number: string; quantity: number }>;
  }) => {
    if (!selectedItem) return;

    // Validate printer selection if auto-print is enabled
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
    const results = await processSingleItem(
      item, 
      true, 
      undefined, 
      selectedCountry,
      data.manualPOAllocations
    );
    if (results && results.length > 0) {
      const result = results[0];

      // Determine destination and template type
      let destination = 'Inventory';
      let templateType: 'po' | 'inventory' = 'inventory';
      if (result.matched_pos && result.matched_pos.length > 0) {
        const poNumbers = result.matched_pos.map((a: any) => a.po_number).join(', ');
        destination = `PO ${poNumbers}`;
        templateType = 'po';
      }

      // Create activity item
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

      // Auto-print if requested (using PrintService - same as Inventory page)
      if (data.autoPrint && result.success && directPrintEnabled && selectedPrinter) {
        try {
          console.log('[Auto-Print] Starting with PrintService method...');

          // Select appropriate template based on type
          const templateId = templateType === 'po' ? selectedPoTemplate : selectedInventoryTemplate;
          if (!templateId) {
            toast.error('No template selected for auto-print');
            return;
          }

          // Fetch template from database
          const {
            data: template,
            error: templateError
          } = await supabase.from('label_templates').select('*').eq('id', templateId).single();
          if (templateError || !template) {
            console.error('[Auto-Print] Template fetch error:', templateError);
            toast.error('Failed to load label template');
          } else {
            // Create LabelDoc from template (same as Inventory)
            const labelDoc: LabelDoc = {
              id: template.id,
              name: template.name,
              size: {
                width: template.width || 100,
                height: template.height || 60,
                unit: 'mm'
              },
              elements: template.canvas_data?.elements || [],
              createdAt: template.created_at,
              updatedAt: template.updated_at
            };

            // Create dataset with item data
            const dataset = createDatasetFromItem(
              item,
              { template_type: templateType },
              result.matched_pos && result.matched_pos.length > 0
                ? result.matched_pos.map((a: any) => a.po_number).join(', ')
                : undefined
            );

            // Get print settings
            const printSettings: PrintSettings = {
              format: 'zpl',
              dpi: 203,
              darkness: printDarkness,
              copies: 1,
              orientation: 'portrait',
              paperSize: 'custom',
              labelsPerPage: 1,
              margin: 0
            };

            // Generate ZPL using PrintService (proven method)
            const zplCode = PrintService.generateZPL(labelDoc, dataset, printSettings);
            console.log('[Auto-Print] Generated ZPL length:', zplCode.length);
            console.log('[Auto-Print] ZPL preview:', zplCode.substring(0, 200));

            // Print using QZ Tray (same as Inventory)
            const qzManager = QZConnectionManager.getInstance();
            await qzManager.print(zplCode, selectedPrinter);
            toast.success(`Label printed to ${selectedPrinter}`);
            activity.printed = true;
          }
        } catch (error) {
          console.error('[Auto-Print] Failed:', error);
          toast.error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          activity.printed = false;
        }
      }
      setLocalActivities(prev => [activity, ...prev]);

      // Invalidate queries to refresh inventory display
      queryClient.invalidateQueries({
        queryKey: ['asin-inventory']
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-analytics']
      });
      toast.success(`Received ${data.quantity} unit(s)`);
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

    // Load printers when enabling direct print
    if (enabled) {
      console.log('🖨️ Loading printers because direct print was enabled');
      await loadPrinters();
    } else {
      // Clear printer selection when disabling
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
  // Show loading state while checking auth
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

  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Smart Stock Receiving</h1>
          <p className="text-muted-foreground">
            Universal inventory receiving with automatic PO matching
          </p>
        </div>

        {/* Connection Status */}
        

        {/* Activity Summary */}
        {localActivities.length > 0 || history.length > 0}

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Receive Items
            </CardTitle>
            <CardDescription>
              Search by ASIN, SKU, or Model Number to receive inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ItemSearchBar onItemSelect={handleItemSelect} disabled={isProcessing} country={selectedCountry} />

            {/* Print Settings - Collapsible */}
            <Collapsible open={printSettingsOpen} onOpenChange={setPrintSettingsOpen} className="space-y-4 pt-4 border-t border-border/50">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full p-2 hover:bg-muted/50">
                  <span className="text-sm font-medium">Print Settings</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", printSettingsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                {/* Auto-print toggle */}
                <div className="flex items-center gap-2">
                  <Switch id="auto-print" checked={autoPrintEnabled} onCheckedChange={handleAutoPrintChange} />
                  <Label htmlFor="auto-print" className="text-sm cursor-pointer">
                    Auto-print labels after receiving
                  </Label>
                </div>
                
                {/* Print settings when auto-print is enabled */}
                {autoPrintEnabled && <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    {/* Direct printing toggle */}
                    <div className="flex items-center gap-2">
                      <Switch id="direct-print" checked={directPrintEnabled} onCheckedChange={handleDirectPrintChange} />
                      <Label htmlFor="direct-print" className="text-sm cursor-pointer">
                        Use direct printing (QZ Tray)
                      </Label>
                    </div>

                    {/* Printer Selection */}
                    {directPrintEnabled && <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="default-printer" className="text-sm font-medium">
                            Default Printer
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={loadPrinters} disabled={loadingPrinters}>
                            {loadingPrinters ? <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Loading...
                              </> : 'Refresh'}
                          </Button>
                        </div>
                        
                        {/* Warning if no printer selected */}
                        {!selectedPrinter && availablePrinters.length === 0 && !loadingPrinters && <Alert className="border-amber-500/50 bg-amber-500/10">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <AlertDescription className="text-amber-600 text-sm">
                              No printers found. Make sure QZ Tray is running and click Refresh.
                            </AlertDescription>
                          </Alert>}
                        
                        {!selectedPrinter && availablePrinters.length > 0 && <Alert className="border-amber-500/50 bg-amber-500/10">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <AlertDescription className="text-amber-600 text-sm">
                              ⚠️ No printer selected - labels won't print! Select one below.
                            </AlertDescription>
                          </Alert>}
                        
                        <Select value={selectedPrinter} onValueChange={value => {
                    console.log('🖨️ Printer selected:', value);
                    setSelectedPrinter(value);
                    localStorage.setItem('stock-receiving-default-printer', value);
                    toast.success(`Printer set to: ${value}`);
                  }} disabled={loadingPrinters}>
                          <SelectTrigger id="default-printer" className="w-full">
                            <SelectValue placeholder={loadingPrinters ? 'Loading printers...' : availablePrinters.length > 0 ? 'Select printer...' : 'No printers found'} />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrinters.length === 0 ? <SelectItem value="none" disabled>
                                {loadingPrinters ? 'Loading...' : 'No printers found'}
                              </SelectItem> : availablePrinters.map(printer => <SelectItem key={printer} value={printer}>
                                  {printer}
                                </SelectItem>)}
                          </SelectContent>
                        </Select>
                        {!loadingPrinters && availablePrinters.length === 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="w-3 h-3" />
                            <span>Make sure QZ Tray is running, then click Refresh</span>
                          </div>}
                        {!loadingPrinters && availablePrinters.length > 0 && !selectedPrinter && <p className="text-xs text-amber-600">
                            ⚠️ Please select a printer
                          </p>}
                        {selectedPrinter && <p className="text-xs text-green-600">
                            ✓ Will print to: {selectedPrinter}
                          </p>}
                      </div>}

                    {/* Darkness Control */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="print-darkness" className="text-sm font-medium">
                          Print Darkness: {printDarkness}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          (0 = Lightest, 30 = Darkest)
                        </span>
                      </div>
                      <Slider id="print-darkness" min={0} max={30} step={1} value={[printDarkness]} onValueChange={handleDarknessChange} className="w-full" />
                      <p className="text-xs text-muted-foreground">
                        Adjust print darkness for Zebra printers. Default is 10.
                      </p>
                    </div>

                    {/* Template Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PO Template Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="po-template" className="text-sm font-medium">
                          PO Label Template
                        </Label>
                        <Select value={selectedPoTemplate} onValueChange={handlePoTemplateChange}>
                          <SelectTrigger id="po-template" className="w-full">
                            <SelectValue placeholder="Select PO template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {poTemplates.length === 0 ? <SelectItem value="none" disabled>
                                No PO templates found
                              </SelectItem> : poTemplates.map(template => <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>)}
                          </SelectContent>
                        </Select>
                        {poTemplates.length === 0 && <p className="text-xs text-muted-foreground">
                            Create a template in Label Designer
                          </p>}
                      </div>

                      {/* Inventory Template Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="inventory-template" className="text-sm font-medium">
                          Inventory Label Template
                        </Label>
                        <Select value={selectedInventoryTemplate} onValueChange={handleInventoryTemplateChange}>
                          <SelectTrigger id="inventory-template" className="w-full">
                            <SelectValue placeholder="Select inventory template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryTemplates.length === 0 ? <SelectItem value="none" disabled>
                                No inventory templates found
                              </SelectItem> : inventoryTemplates.map(template => <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>)}
                          </SelectContent>
                        </Select>
                        {inventoryTemplates.length === 0 && <p className="text-xs text-muted-foreground">
                            Create a template in Label Designer
                          </p>}
                      </div>
                    </div>
                  </div>}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Priority PO Management */}
        <div className="mb-6">
          <PriorityPOList />
        </div>

        {/* Comprehensive Receiving History */}
        <Collapsible open={receivingHistoryOpen} onOpenChange={setReceivingHistoryOpen}>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Receiving History</CardTitle>
                  <CardDescription>
                    Complete history of all received items with pagination
                  </CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
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
    </div>;
}
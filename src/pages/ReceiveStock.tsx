import { useState, useEffect } from 'react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useStockReceiving } from '@/hooks/useStockReceiving';
import { useReceivingHistory } from '@/hooks/useReceivingHistory';
import { ItemSearchBar } from '@/components/stock-receiving/ItemSearchBar';
import { QuantityConfirmDialog } from '@/components/stock-receiving/QuantityConfirmDialog';
import { RecentActivityFeed } from '@/components/stock-receiving/RecentActivityFeed';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { autoPrintLabel, getAutoPrintConfig, saveAutoPrintConfig } from '@/utils/auto-label-printer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
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
  usePageTracking({
    category: 'Inventory',
    subcategory: 'Stock Receiving',
    pageTitle: 'Receive Stock'
  });
  
  const {
    isProcessing,
    processSingleItem,
    testConnection
  } = useStockReceiving();

  const { 
    history, 
    isLoading: historyLoading, 
    loadMore, 
    hasMore 
  } = useReceivingHistory(50);

  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // Local activities state for immediate feedback before DB sync
  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [directPrintEnabled, setDirectPrintEnabled] = useState(false);
  const [poTemplates, setPoTemplates] = useState<any[]>([]);
  const [inventoryTemplates, setInventoryTemplates] = useState<any[]>([]);
  const [selectedPoTemplate, setSelectedPoTemplate] = useState<string>('');
  const [selectedInventoryTemplate, setSelectedInventoryTemplate] = useState<string>('');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Load print preferences
    const config = getAutoPrintConfig();
    setAutoPrintEnabled(config.enabled);
    setDirectPrintEnabled(config.preferDirectPrint);
    
    // Load template preferences
    const savedPoTemplate = localStorage.getItem('stock-receiving-po-template-id');
    const savedInventoryTemplate = localStorage.getItem('stock-receiving-inventory-template-id');
    if (savedPoTemplate) setSelectedPoTemplate(savedPoTemplate);
    if (savedInventoryTemplate) setSelectedInventoryTemplate(savedInventoryTemplate);
    
    // Load templates
    loadTemplates(savedPoTemplate, savedInventoryTemplate);
    
    // Load printers
    loadPrinters();
  }, []);

  const loadTemplates = async (savedPoTemplate?: string | null, savedInventoryTemplate?: string | null) => {
    try {
      // Load PO templates
      const { data: poData } = await supabase
        .from('label_templates')
        .select('id, name, description')
        .or('name.ilike.%po%,name.ilike.%purchase%,description.ilike.%po%')
        .order('created_at', { ascending: false });

      // Load Inventory templates
      const { data: invData } = await supabase
        .from('label_templates')
        .select('id, name, description')
        .or('name.ilike.%inventory%,name.ilike.%warehouse%,name.ilike.%stock%')
        .order('created_at', { ascending: false });

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
      const { QZConnectionManager } = await import('@/utils/qz-connection-manager');
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
  }) => {
    if (!selectedItem) return;

    const item = {
      asin: selectedItem.asin,
      sku_code: selectedItem.sku_code,
      model_number: selectedItem.model_number,
      title: selectedItem.title,
      quantity: data.quantity,
      serial_number: data.serial_number,
      supplier_name: data.supplier_name,
      notes: data.notes,
    };

    const results = await processSingleItem(item, true);
    
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

      // Auto-print if requested
      if (data.autoPrint && result.success) {
        const printConfig = getAutoPrintConfig();
        // Map POAllocation to expected format
        const poAllocations = result.matched_pos?.map((po: any) => ({
          po_number: po.po_number,
          quantity: po.quantity_allocated
        })) || [];
        
        // Select appropriate template based on type
        const templateId = templateType === 'po' ? selectedPoTemplate : selectedInventoryTemplate;
        
        const printed = await autoPrintLabel(
          {
            success: result.success,
            item,
            po_allocations: poAllocations,
            inventory_id: result.inventory_id,
            template_type: templateType
          },
          { ...printConfig, enabled: true, defaultPrinter: selectedPrinter },
          templateId
        );
        activity.printed = printed;
      }

      setLocalActivities(prev => [activity, ...prev]);
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
    saveAutoPrintConfig({ ...config, enabled });
  };

  const handleDirectPrintChange = async (enabled: boolean) => {
    console.log('🔄 Direct print changed to:', enabled);
    setDirectPrintEnabled(enabled);
    const config = getAutoPrintConfig();
    saveAutoPrintConfig({ ...config, preferDirectPrint: enabled });
    
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Smart Stock Receiving</h1>
          <p className="text-muted-foreground">
            Universal inventory receiving with automatic PO matching
          </p>
        </div>

        {/* Connection Status */}
        <Alert className={`mb-6 ${
          connectionStatus === 'connected' 
            ? 'border-green-500/50 bg-green-500/5' 
            : connectionStatus === 'error'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-primary/50 bg-primary/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
              {connectionStatus === 'connected' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
              <AlertDescription>
                {connectionStatus === 'checking' && 'Checking connection...'}
                {connectionStatus === 'connected' && 'Connected to processing service'}
                {connectionStatus === 'error' && 'Connection error - some features may not work'}
              </AlertDescription>
            </div>
            {connectionStatus === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
              </Button>
            )}
          </div>
        </Alert>

        {/* Activity Summary */}
        {(localActivities.length > 0 || history.length > 0) && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-medium text-foreground">Receiving Active</p>
                    <p className="text-sm text-muted-foreground">
                      {history.length + localActivities.length} items in history
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearActivities}>
                  Clear History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            <ItemSearchBar
              onItemSelect={handleItemSelect}
              disabled={isProcessing}
            />

            {/* Print Settings */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              {/* Auto-print toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-print"
                  checked={autoPrintEnabled}
                  onCheckedChange={handleAutoPrintChange}
                />
                <Label htmlFor="auto-print" className="text-sm cursor-pointer">
                  Auto-print labels after receiving
                </Label>
              </div>
              
              {/* Print settings when auto-print is enabled */}
              {autoPrintEnabled && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  {/* Direct printing toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="direct-print"
                      checked={directPrintEnabled}
                      onCheckedChange={handleDirectPrintChange}
                    />
                    <Label htmlFor="direct-print" className="text-sm cursor-pointer">
                      Use direct printing (QZ Tray)
                    </Label>
                  </div>

                  {/* Printer Selection */}
                  {directPrintEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="default-printer" className="text-sm font-medium">
                          Default Printer
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadPrinters}
                          disabled={loadingPrinters}
                        >
                          {loadingPrinters ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Refresh'
                          )}
                        </Button>
                      </div>
                      <Select
                        value={selectedPrinter}
                        onValueChange={(value) => {
                          console.log('🖨️ Printer selected:', value);
                          setSelectedPrinter(value);
                          localStorage.setItem('stock-receiving-default-printer', value);
                          toast.success(`Printer set to: ${value}`);
                        }}
                        disabled={loadingPrinters}
                      >
                        <SelectTrigger id="default-printer" className="w-full">
                          <SelectValue placeholder={loadingPrinters ? 'Loading printers...' : availablePrinters.length > 0 ? 'Select printer...' : 'No printers found'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePrinters.length === 0 ? (
                            <SelectItem value="none" disabled>
                              {loadingPrinters ? 'Loading...' : 'No printers found'}
                            </SelectItem>
                          ) : (
                            availablePrinters.map((printer) => (
                              <SelectItem key={printer} value={printer}>
                                {printer}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {!loadingPrinters && availablePrinters.length === 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3" />
                          <span>Make sure QZ Tray is running, then click Refresh</span>
                        </div>
                      )}
                      {!loadingPrinters && availablePrinters.length > 0 && !selectedPrinter && (
                        <p className="text-xs text-amber-600">
                          ⚠️ Please select a printer
                        </p>
                      )}
                      {selectedPrinter && (
                        <p className="text-xs text-green-600">
                          ✓ Will print to: {selectedPrinter}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Template Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PO Template Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="po-template" className="text-sm font-medium">
                        PO Label Template
                      </Label>
                      <Select
                        value={selectedPoTemplate}
                        onValueChange={handlePoTemplateChange}
                      >
                        <SelectTrigger id="po-template" className="w-full">
                          <SelectValue placeholder="Select PO template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {poTemplates.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No PO templates found
                            </SelectItem>
                          ) : (
                            poTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {poTemplates.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Create a template in Label Designer
                        </p>
                      )}
                    </div>

                    {/* Inventory Template Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="inventory-template" className="text-sm font-medium">
                        Inventory Label Template
                      </Label>
                      <Select
                        value={selectedInventoryTemplate}
                        onValueChange={handleInventoryTemplateChange}
                      >
                        <SelectTrigger id="inventory-template" className="w-full">
                          <SelectValue placeholder="Select inventory template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryTemplates.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No inventory templates found
                            </SelectItem>
                          ) : (
                            inventoryTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {inventoryTemplates.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Create a template in Label Designer
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comprehensive Receiving History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Receiving History</CardTitle>
            <CardDescription>
              Complete history of all received items with pagination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed 
              activities={[
                // Show local activities first (immediate feedback)
                ...localActivities,
                // Then show persisted history from database
                ...history.map(h => ({
                  id: h.id,
                  success: h.success,
                  identifier: h.asin || h.sku_code || h.model_number || 'Unknown',
                  destination: h.destination_type === 'po' 
                    ? `PO ${h.destination_details?.po_numbers?.join(', ') || ''}`
                    : 'Inventory',
                  quantity: h.quantity,
                  printed: h.printed,
                  timestamp: new Date(h.created_at),
                  error: h.error_message,
                  template_type: h.destination_type as 'po' | 'inventory'
                }))
              ]}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={historyLoading}
            />
          </CardContent>
        </Card>
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
      />
    </div>
  );
}

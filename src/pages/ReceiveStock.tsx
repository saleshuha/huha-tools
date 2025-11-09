import { useState, useEffect } from 'react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useStockReceiving } from '@/hooks/useStockReceiving';
import { ItemSearchBar } from '@/components/stock-receiving/ItemSearchBar';
import { QuantityConfirmDialog } from '@/components/stock-receiving/QuantityConfirmDialog';
import { RecentActivityFeed } from '@/components/stock-receiving/RecentActivityFeed';
import { SessionHistory } from '@/components/stock-receiving/SessionHistory';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { autoPrintLabel, getAutoPrintConfig, saveAutoPrintConfig } from '@/utils/auto-label-printer';

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
    currentSession,
    isProcessing,
    createSession,
    processSingleItem,
    endSession,
    loadSessions,
    testConnection,
    sessions,
  } = useStockReceiving();

  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [directPrintEnabled, setDirectPrintEnabled] = useState(false);

  useEffect(() => {
    loadSessions();
    checkConnection();
    initializeSession();
    
    // Load print preferences
    const config = getAutoPrintConfig();
    setAutoPrintEnabled(config.enabled);
    setDirectPrintEnabled(config.preferDirectPrint);
  }, []);

  const initializeSession = async () => {
    if (!currentSession) {
      await createSession('Auto-created receiving session');
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
    if (!selectedItem || !currentSession) return;

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

    const results = await processSingleItem(item, true, currentSession.id);
    
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
        
        const printed = await autoPrintLabel(
          {
            success: result.success,
            item,
            po_allocations: poAllocations,
            inventory_id: result.inventory_id,
            template_type: templateType
          },
          { ...printConfig, enabled: true }
        );
        activity.printed = printed;
      }

      setActivities(prev => [activity, ...prev]);
      toast.success(`Received ${data.quantity} unit(s)`);
    }

    setShowDialog(false);
    setSelectedItem(null);
  };

  const handleEndSession = async () => {
    if (currentSession) {
      await endSession(currentSession.id);
      setActivities([]);
      toast.success('Session ended');
      // Create new session
      await createSession('Auto-created receiving session');
    }
  };

  const handleAutoPrintChange = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    const config = getAutoPrintConfig();
    saveAutoPrintConfig({ ...config, enabled });
  };

  const handleDirectPrintChange = (enabled: boolean) => {
    setDirectPrintEnabled(enabled);
    const config = getAutoPrintConfig();
    saveAutoPrintConfig({ ...config, preferDirectPrint: enabled });
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

        {/* Active Session Indicator */}
        {currentSession && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-medium text-foreground">Active Session</p>
                    <p className="text-sm text-muted-foreground">
                      {activities.length} items received
                    </p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleEndSession}>
                  End Session
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
              disabled={!currentSession || isProcessing}
            />

            {/* Print Settings */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-border/50">
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
              
              {autoPrintEnabled && (
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Real-time processing results for current session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed activities={activities} />
          </CardContent>
        </Card>

        {/* Session History */}
        <SessionHistory sessions={sessions} onEndSession={endSession} />
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

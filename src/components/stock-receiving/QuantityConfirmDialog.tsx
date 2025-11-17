import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ChevronDown, AlertTriangle, ExternalLink, Package, Users } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProductImages } from '@/hooks/useProductImages';
import { ImagePreview } from './ImagePreview';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent' | 'po_group';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
  serial_number?: string;
  image_url?: string;
  po_numbers?: string[];
  priority?: number;
  po_group?: {
    id: string;
    name: string;
    total_quantity: number;
    po_ids: string[];
    po_numbers: string[];
  };
}

interface ManualPOAllocation {
  po_number: string;  // Primary identifier - backend will find matching item
  quantity: number;
  priority?: number;
}

interface QuantityConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  item: SearchResult | null;
  onConfirm: (data: {
    quantity: number;
    serial_number?: string;
    autoPrint: boolean;
    manualPOAllocations?: ManualPOAllocation[];
  }) => void;
  processing?: boolean;
  initialSerialNumber?: string;
  country?: string;
}

export function QuantityConfirmDialog({
  open,
  onClose,
  item,
  onConfirm,
  processing = false,
  initialSerialNumber,
  country = 'UAE'
}: QuantityConfirmDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [qzConnected, setQzConnected] = useState(false);
  
  // Auto-determined POs from search result group
  const [availablePOs, setAvailablePOs] = useState<any[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  
  // Product image from item (already fetched in search)
  const productImage = item?.image_url;

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSerialNumber(initialSerialNumber || '');
      setAvailablePOs([]);
      
      // Load auto-print preference from localStorage
      const savedAutoPrint = localStorage.getItem('stock-receiving-auto-print');
      setAutoPrintEnabled(savedAutoPrint === 'true' || savedAutoPrint === null);
      
      // Set up connection listener for reactive status updates
      const handleConnectionChange = (connected: boolean) => {
        setQzConnected(connected);
      };
      
      qzConnectionManager.addConnectionListener(handleConnectionChange);
      
      // Attempt connection
      qzConnectionManager.connect().catch(err => {
        console.error('QZ Tray connection failed:', err);
        setQzConnected(false);
      });
      
      // Load POs from the search result group
      if (item) {
        loadAvailablePOs();
      }
      
      // Cleanup listener when dialog closes
      return () => {
        qzConnectionManager.removeConnectionListener(handleConnectionChange);
      };
    }
  }, [open, initialSerialNumber, item]);


  const loadAvailablePOs = async () => {
    if (!item) return;
    
    setLoadingPOs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get PO numbers from search result (either from po_group or direct po_numbers)
      const poNumbers = item.po_group?.po_numbers || item.po_numbers;
      
      if (poNumbers && poNumbers.length > 0) {
        // Load only the specific POs from the search result, filtered by current item
        let query = supabase
          .from('po_orders')
          .select('*')
          .eq('user_id', user.id)
          .in('po_number', poNumbers)
          .in('status', ['pending', 'placed', 'shipped', 'closed']);

        // Filter by current item's identifiers (ASIN/SKU/Model)
        const conditions = [];
        if (item.asin) conditions.push(`asin.eq.${item.asin}`);
        if (item.sku_code) conditions.push(`sku_code.eq.${item.sku_code}`);
        if (item.model_number) conditions.push(`model_number.eq.${item.model_number}`);

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailablePOs(data || []);
      } else {
        // Fallback: For inventory/recent items without PO numbers, load matching POs
        let query = supabase
          .from('po_orders')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['pending', 'placed', 'shipped', 'closed']);

        // Add filters based on item identifiers
        const conditions = [];
        if (item.asin) conditions.push(`asin.eq.${item.asin}`);
        if (item.sku_code) conditions.push(`sku_code.eq.${item.sku_code}`);
        if (item.model_number) conditions.push(`model_number.eq.${item.model_number}`);
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailablePOs(data || []);
      }
    } catch (error) {
      console.error('Failed to load POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleSubmit = (autoPrint: boolean) => {
    // Save auto-print preference
    localStorage.setItem('stock-receiving-auto-print', String(autoPrintEnabled));
    
    // Automatically allocate to the POs from the search result group
    const manualAllocations: ManualPOAllocation[] = [];
    
    if (availablePOs.length > 0) {
      // Distribute quantity across the POs
      let remainingQty = quantity;
      
      for (const po of availablePOs) {
        if (remainingQty <= 0) break;
        
        // For PO and PO_GROUP items, we already loaded the correct POs by PO number
        // For inventory items, we need to verify the match since we loaded by OR conditions
        if (item.type === 'inventory' || item.type === 'recent') {
          const poMatchesItem = 
            (item.asin && po.asin === item.asin) ||
            (item.sku_code && po.sku_code === item.sku_code) ||
            (item.model_number && po.model_number === item.model_number);
          
          if (!poMatchesItem) {
            console.log('[Stock Receiving] Inventory item - Skipping non-matching PO:', {
              poNumber: po.po_number,
              poAsin: po.asin,
              poSku: po.sku_code,
              poModel: po.model_number,
              itemAsin: item.asin,
              itemSku: item.sku_code,
              itemModel: item.model_number
            });
            continue;
          }
        }
        
        const allocateQty = Math.min(po.quantity, remainingQty);
        manualAllocations.push({
          po_number: po.po_number,  // Let backend find the correct item by ASIN/SKU/Model
          quantity: allocateQty,
          priority: po.priority || 3
        });
        remainingQty -= allocateQty;
        
        console.log(`[Stock Receiving] Allocated ${allocateQty} to PO ${po.po_number} (Priority: ${po.priority || 3})`);
      }
    }
    
    // Invalidate and aggressively refetch PO orders cache
    console.log('🔄 Invalidating PO orders cache after stock receiving');
    queryClient.invalidateQueries({ queryKey: ['po-orders'] });

    // Force an immediate background refetch with delay to allow edge function to complete
    setTimeout(() => {
      queryClient.refetchQueries({ 
        queryKey: ['po-orders'],
        type: 'active' 
      }).then(() => {
        console.log('✅ PO orders cache refetched after receiving');
      });
    }, 2000);
    
    onConfirm({
      quantity,
      serial_number: serialNumber || undefined,
      autoPrint: autoPrint && autoPrintEnabled,
      manualPOAllocations: manualAllocations.length > 0 ? manualAllocations : undefined
    });
    
    // Show notification about refreshing PO Tracker
    setTimeout(() => {
      toast({
        title: "✅ Stock Received & PO Updated",
        description: (
          <div className="space-y-1">
            <p>Item received successfully and PO marked as printed.</p>
            <p className="font-semibold text-primary mt-2">
              📋 PO Tracker will auto-refresh, or click "Hard Refresh" to see changes immediately.
            </p>
          </div>
        ),
        duration: 7000,
      });
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !processing) {
      e.preventDefault();
      handleSubmit(true); // Enter key triggers print & receive
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Confirm Receiving Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* QZ Tray Status Alert */}
          {!qzConnected && autoPrintEnabled && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="space-y-2">
                  <p className="font-medium">QZ Tray not connected</p>
                  <p>Please start QZ Tray application and ensure it's connected.</p>
                  <p className="text-xs opacity-75">
                    Go to Settings → QZ Tray Setup or{' '}
                    <a href="/qz-tray" target="_blank" className="underline">open QZ Tray settings</a>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {qzConnected && autoPrintEnabled && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                ✅ QZ Tray Connected - Ready to print
              </AlertDescription>
            </Alert>
          )}
          {/* Item Info */}
          <div className="p-3 bg-accent/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {item.asin ? 'ASIN' : item.sku_code ? 'SKU' : 'Model'}
              </span>
              <span className="text-sm font-bold text-foreground">
                {item.asin || item.sku_code || item.model_number}
              </span>
            </div>
            {item.title && (
              <div className="text-sm text-muted-foreground truncate">
                {item.title}
              </div>
            )}
          </div>

          {/* PO Details - Breakdown by PO */}
          {loadingPOs && (
            <div className="p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading PO details...
              </div>
            </div>
          )}

          {!loadingPOs && availablePOs.length > 0 && (
            <Collapsible defaultOpen={availablePOs.length <= 5}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-accent/30 rounded-lg hover:bg-accent/40 transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">
                    Found in {availablePOs.length} PO{availablePOs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 transition-transform" />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 space-y-2">
                {availablePOs.map((po) => (
                  <div
                    key={po.id}
                    className="border rounded-lg p-3 bg-muted/30 space-y-2"
                  >
                    {/* PO Number - Prominent at top */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-sm font-semibold cursor-pointer hover:bg-primary/20"
                          onClick={() => navigate(`/po-tracker?search=${po.po_number}`)}
                        >
                          📋 PO: {po.po_number}
                        </Badge>
                        
                        {/* Priority Badge */}
                        {po.priority && po.priority < 6 && (
                          <Badge variant="outline" className="text-sm">
                            Priority {po.priority}
                          </Badge>
                        )}
                        
                        {po.priority && po.priority >= 6 && (
                          <Badge variant="outline" className="text-sm border-dashed text-muted-foreground">
                            Auto-Priority {po.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Info */}
                <div className="space-y-2">
                  {/* Total Quantity */}
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Ordered:</span>{' '}
                      <span className="font-bold text-foreground">{po.quantity} units</span>
                    </div>
                  </div>
                  
                  {/* Printed vs Pending Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Already Printed */}
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <div className="text-xs text-muted-foreground mb-0.5">✅ Already Printed</div>
                      <div className="font-bold text-green-700 dark:text-green-400">
                        {po.printed_quantity || 0} units
                      </div>
                      {po.label_printed_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(po.label_printed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {/* Still Pending */}
                    <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                      <div className="text-xs text-muted-foreground mb-0.5">⏳ Still Pending</div>
                      <div className="font-bold text-orange-700 dark:text-orange-400">
                        {po.quantity - (po.printed_quantity || 0)} units
                      </div>
                      {po.quantity === (po.printed_quantity || 0) && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Fully Received ✓
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {po.printed_quantity && po.printed_quantity > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(po.printed_quantity / po.quantity) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {Math.round((po.printed_quantity / po.quantity) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                    
                    {/* Additional Info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status: {po.status}</span>
                      {po.supplier_name && <span>• Supplier: {po.supplier_name}</span>}
                    </div>
                  </div>
                ))}
                
                {/* Total Summary */}
                <div className="p-3 bg-primary/5 rounded border border-primary/20 space-y-2">
                  {/* Total Ordered */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total Ordered Across All {availablePOs.length} PO{availablePOs.length !== 1 ? 's' : ''}:
                    </span>
                    <span className="font-bold text-primary">
                      {availablePOs.reduce((sum, po) => sum + po.quantity, 0)} units
                    </span>
                  </div>
                  
                  {/* Already Printed Total */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-400">✅ Already Printed:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      {availablePOs.reduce((sum, po) => sum + (po.printed_quantity || 0), 0)} units
                    </span>
                  </div>
                  
                  {/* Still Pending Total */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700 dark:text-orange-400">⏳ Still Pending:</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">
                      {availablePOs.reduce((sum, po) => sum + (po.quantity - (po.printed_quantity || 0)), 0)} units
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-semibold">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Serial Number - Only for inventory items */}
          {item.type !== 'po' && item.type !== 'po_group' && (
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="serial" className="font-semibold text-primary">
                  📦 Serial/Bin Number
                </Label>
                <span className="text-xs text-muted-foreground">Will print on label</span>
              </div>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Enter serial number (e.g., SN123456)"
                className="font-mono text-base border-primary/30 focus-visible:ring-primary"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {initialSerialNumber ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ Auto-fetched from inventory: {serialNumber || 'N/A'}
                  </span>
                ) : serialNumber ? (
                  `Will print: ${serialNumber}`
                ) : (
                  'If empty, label will show "N/A"'
                )}
              </p>
            </div>
          )}


          {/* Auto-Print Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-print" className="cursor-pointer">Auto-print label after receiving</Label>
            </div>
            <Switch
              id="auto-print"
              checked={autoPrintEnabled}
              onCheckedChange={setAutoPrintEnabled}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={processing}
            className="sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={processing}
            className="sm:flex-none"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Receive Only'
            )}
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={processing}
            className="sm:flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                🖨️ Receive & Print
                <span className="ml-2 text-xs opacity-70">(Enter)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

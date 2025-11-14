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
  po_group?: {
    id: string;
    name: string;
    total_quantity: number;
    po_ids: string[];
    po_numbers: string[];
  };
}

interface ManualPOAllocation {
  po_id: string;
  po_number: string;
  quantity: number;
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
  const [quantity, setQuantity] = useState(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [qzConnected, setQzConnected] = useState(false);
  
  // Manual PO selection state
  const [poSectionOpen, setPoSectionOpen] = useState(false);
  const [availablePOs, setAvailablePOs] = useState<any[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPOs, setSelectedPOs] = useState<Map<string, number>>(new Map());
  const [remainingQty, setRemainingQty] = useState(0);
  
  // Product image from item (already fetched in search)
  const productImage = item?.image_url;

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSerialNumber(initialSerialNumber || '');
      setSelectedPOs(new Map());
      setAvailablePOs([]);
      setPoSectionOpen(false);
      
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
      
      // Load available POs for manual selection
      if (item) {
        loadAvailablePOs();
      }
      
      // Cleanup listener when dialog closes
      return () => {
        qzConnectionManager.removeConnectionListener(handleConnectionChange);
      };
    }
  }, [open, initialSerialNumber, item]);

  // Calculate remaining quantity whenever quantity or selections change
  useEffect(() => {
    const totalAllocated = Array.from(selectedPOs.values()).reduce((sum, qty) => sum + qty, 0);
    setRemainingQty(Math.max(0, quantity - totalAllocated));
  }, [quantity, selectedPOs]);

  const loadAvailablePOs = async () => {
    if (!item) return;
    
    setLoadingPOs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build query to find matching POs (including closed ones for manual selection)
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
    } catch (error) {
      console.error('Failed to load POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handlePOToggle = (po: any, checked: boolean) => {
    setSelectedPOs(prev => {
      const newMap = new Map(prev);
      if (checked) {
        // Default allocate the minimum of PO need or remaining quantity
        const allocateQty = Math.min(po.quantity, quantity);
        newMap.set(po.id, allocateQty);
      } else {
        newMap.delete(po.id);
      }
      return newMap;
    });
  };

  const handlePOQuantityChange = (poId: string, qty: number) => {
    setSelectedPOs(prev => {
      const newMap = new Map(prev);
      newMap.set(poId, Math.max(0, qty));
      return newMap;
    });
  };

  const handleSubmit = (autoPrint: boolean) => {
    // Save auto-print preference
    localStorage.setItem('stock-receiving-auto-print', String(autoPrintEnabled));
    
    // Build manual PO allocations if any selected
    const manualAllocations: ManualPOAllocation[] = [];
    selectedPOs.forEach((qty, poId) => {
      const po = availablePOs.find(p => p.id === poId);
      if (po && qty > 0) {
        manualAllocations.push({
          po_id: poId,
          po_number: po.po_number,
          quantity: qty
        });
      }
    });
    
    onConfirm({
      quantity,
      serial_number: serialNumber || undefined,
      autoPrint: autoPrint && autoPrintEnabled,
      manualPOAllocations: manualAllocations.length > 0 ? manualAllocations : undefined
    });
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
            <div className="text-xs text-primary font-medium">
              {item.context}
            </div>
          </div>

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

          {/* Manual PO Selection - Collapsible */}
          <Collapsible open={poSectionOpen} onOpenChange={setPoSectionOpen} className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <span className="text-sm font-medium">
                  Select Purchase Orders (Optional)
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", poSectionOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              {loadingPOs ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading POs...
                </div>
              ) : availablePOs.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No matching POs found
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Manually select which POs to fulfill. Unchecked POs will use automatic matching.
                  </p>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availablePOs.map((po) => {
                      const isSelected = selectedPOs.has(po.id);
                      const allocatedQty = selectedPOs.get(po.id) || 0;
                      const isClosed = po.status === 'closed';
                      
                      return (
                        <div 
                          key={po.id}
                          className={cn(
                            "p-3 rounded-lg border transition-all",
                            isSelected ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`po-${po.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => handlePOToggle(po, checked as boolean)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label 
                                  htmlFor={`po-${po.id}`}
                                  className="font-semibold cursor-pointer hover:text-primary"
                                  onClick={() => navigate(`/po-tracker?search=${po.po_number}`)}
                                >
                                  {po.po_number}
                                  <ExternalLink className="w-3 h-3 inline ml-1" />
                                </Label>
                                
                                <Badge 
                                  variant={isClosed ? 'secondary' : po.status === 'pending' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {po.status.toUpperCase()}
                                </Badge>

                                {po.priority && po.priority !== 3 && (
                                  <Badge 
                                    variant={po.priority <= 2 ? 'destructive' : 'outline'} 
                                    className="text-xs"
                                  >
                                    {po.priority === 1 ? '⚡ Highest' : 
                                     po.priority === 2 ? '🔴 High' : 
                                     po.priority === 4 ? '🔵 Low' : 
                                     po.priority === 5 ? '⬇️ Lowest' : 'Normal'}
                                  </Badge>
                                )}
                                
                                {isClosed && (
                                  <span className="flex items-center gap-1 text-xs text-warning">
                                    <AlertTriangle className="w-3 h-3" />
                                    Already fulfilled
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                Need: {po.quantity} units
                              </div>
                              
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`qty-${po.id}`} className="text-xs">
                                    Allocate:
                                  </Label>
                                  <Input
                                    id={`qty-${po.id}`}
                                    type="number"
                                    min="0"
                                    max={quantity}
                                    value={allocatedQty}
                                    onChange={(e) => handlePOQuantityChange(po.id, parseInt(e.target.value) || 0)}
                                    className="w-20 h-8 text-sm"
                                  />
                                  <span className="text-xs text-muted-foreground">units</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Allocation Summary */}
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Receiving:</span>
                      <span className="font-semibold">{quantity} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Allocated to POs:</span>
                      <span className="font-semibold text-primary">
                        {Array.from(selectedPOs.values()).reduce((sum, qty) => sum + qty, 0)} units
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining to Inventory:</span>
                      <span className="font-semibold text-success">
                        {remainingQty} units
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Serial Number - HIGHLIGHTED */}
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

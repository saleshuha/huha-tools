import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Package, Printer, Hash } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
  po_number: string;
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
  const [availablePOs, setAvailablePOs] = useState<any[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSerialNumber(initialSerialNumber || '');
      setAvailablePOs([]);
      
      const savedAutoPrint = localStorage.getItem('stock-receiving-auto-print');
      setAutoPrintEnabled(savedAutoPrint === 'true' || savedAutoPrint === null);
      
      const handleConnectionChange = (connected: boolean) => {
        setQzConnected(connected);
      };
      
      qzConnectionManager.addConnectionListener(handleConnectionChange);
      qzConnectionManager.connect().catch(err => {
        console.error('QZ Tray connection failed:', err);
        setQzConnected(false);
      });
      
      if (item) {
        loadAvailablePOs();
      }
      
      return () => {
        qzConnectionManager.removeConnectionListener(handleConnectionChange);
      };
    }
  }, [open, item, initialSerialNumber]);

  const loadAvailablePOs = async () => {
    if (!item) return;
    setLoadingPOs(true);
    
    try {
      let query = supabase.from('po_orders').select('*');

      if (item.type === 'po_group' && item.po_group) {
        query = query.in('po_number', item.po_group.po_numbers);
      } else if (item.po_numbers && item.po_numbers.length > 0) {
        query = query.in('po_number', item.po_numbers);
      }

      // Filter by specific ASIN/SKU/Model being received
      const conditions = [];
      if (item.asin) conditions.push(`asin.eq.${item.asin}`);
      if (item.sku_code) conditions.push(`sku_code.eq.${item.sku_code}`);
      if (item.model_number) conditions.push(`model_number.eq.${item.model_number}`);

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
      
      if (!item.po_numbers || item.po_numbers.length === 0) {
        const filters = [];
        if (item.asin) filters.push(supabase.from('po_orders').select('*').eq('asin', item.asin).eq('country', country));
        if (item.sku_code) filters.push(supabase.from('po_orders').select('*').eq('sku_code', item.sku_code).eq('country', country));
        if (item.model_number) filters.push(supabase.from('po_orders').select('*').eq('model_number', item.model_number).eq('country', country));
        
        if (filters.length === 0) {
          setLoadingPOs(false);
          return;
        }

        const results = await Promise.all(filters.map(f => f));
        const combinedData = results.flatMap(r => r.data || []);
        const uniquePos = Array.from(new Map(combinedData.map(po => [po.id, po])).values());
        setAvailablePOs(uniquePos.sort((a, b) => (a.priority || 999) - (b.priority || 999)));
        setLoadingPOs(false);
        return;
      }

      const { data, error } = await query.eq('country', country);
      if (error) throw error;
      
      const sortedPOs = (data || []).sort((a, b) => (a.priority || 999) - (b.priority || 999));
      setAvailablePOs(sortedPOs);
    } catch (error) {
      console.error('Error loading POs:', error);
      toast({
        title: "Error loading PO details",
        description: "Failed to fetch purchase orders.",
        variant: "destructive",
      });
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleSubmit = async (withPrint: boolean = false) => {
    localStorage.setItem('stock-receiving-auto-print', String(autoPrintEnabled));

    const manualPOAllocations: ManualPOAllocation[] = [];
    let remainingQty = quantity;
    
    for (const po of availablePOs) {
      if (remainingQty <= 0) break;
      const allocateQty = Math.min(remainingQty, po.quantity - (po.printed_quantity || 0));
      if (allocateQty > 0) {
        manualPOAllocations.push({
          po_number: po.po_number,
          quantity: allocateQty,
          priority: po.priority
        });
        remainingQty -= allocateQty;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['po-orders'] });

    onConfirm({
      quantity,
      serial_number: serialNumber || undefined,
      autoPrint: withPrint && autoPrintEnabled,
      manualPOAllocations: manualPOAllocations.length > 0 ? manualPOAllocations : undefined,
    });

    toast({
      title: "Stock Received",
      description: `Successfully received ${quantity} unit(s)`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !processing) {
      e.preventDefault();
      handleSubmit(true);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Confirm Receiving Details</DialogTitle>
        </DialogHeader>

        {/* Scrollable PO details */}
        <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
          {!qzConnected && autoPrintEnabled && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-medium">QZ Tray not connected</p>
                <p className="text-xs">Please start QZ Tray to enable auto-printing.</p>
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

          <div className="p-3 bg-accent/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {item.asin ? 'ASIN' : item.sku_code ? 'SKU' : 'Model'}
              </span>
              <span className="text-sm font-bold">
                {item.asin || item.sku_code || item.model_number}
              </span>
            </div>
            {item.title && <div className="text-sm text-muted-foreground truncate">{item.title}</div>}
          </div>

          {loadingPOs && (
            <div className="p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading PO details...
              </div>
            </div>
          )}

          {!loadingPOs && availablePOs.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 bg-accent/30 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    Found in {availablePOs.length} PO{availablePOs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {availablePOs.map((po) => (
                  <div key={po.id} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-sm font-semibold cursor-pointer hover:bg-primary/20"
                        onClick={() => navigate(`/po-tracker?search=${po.po_number}`)}
                      >
                        📋 PO: {po.po_number}
                      </Badge>
                      {po.priority && po.priority < 6 && (
                        <Badge variant="outline" className="text-sm">Priority {po.priority}</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Total Ordered:</span>{' '}
                        <span className="font-bold">{po.quantity} units</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <div className="text-xs text-muted-foreground">✅ Already Printed</div>
                          <div className="font-bold text-green-700 dark:text-green-400">{po.printed_quantity || 0} units</div>
                          {po.label_printed_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(po.label_printed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                          <div className="text-xs text-muted-foreground">⏳ Still Pending</div>
                          <div className="font-bold text-orange-700 dark:text-orange-400">
                            {po.quantity - (po.printed_quantity || 0)} units
                          </div>
                        </div>
                      </div>
                      
                      {po.printed_quantity > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${(po.printed_quantity / po.quantity) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round((po.printed_quantity / po.quantity) * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-primary/5 rounded border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Ordered:</span>
                    <span className="font-bold text-primary">{availablePOs.reduce((s, po) => s + po.quantity, 0)} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-400">✅ Already Printed:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">{availablePOs.reduce((s, po) => s + (po.printed_quantity || 0), 0)} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700 dark:text-orange-400">⏳ Still Pending:</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">{availablePOs.reduce((s, po) => s + (po.quantity - (po.printed_quantity || 0)), 0)} units</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed input section */}
        <div className="space-y-4 py-4 border-t bg-background">
          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-semibold">Quantity *</Label>
            <Input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="text-lg font-semibold" autoFocus />
          </div>

          {item.type !== 'po' && item.type !== 'po_group' && (
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                <Label htmlFor="serial" className="font-semibold">Serial Number (Optional)</Label>
              </div>
              <Input id="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Enter serial number" className="font-mono" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="auto-print" className="font-semibold cursor-pointer">Auto-print Label</Label>
                <p className="text-xs text-muted-foreground">Print immediately after receiving</p>
              </div>
            </div>
            <Switch id="auto-print" checked={autoPrintEnabled} onCheckedChange={setAutoPrintEnabled} />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={processing || quantity < 1}>
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Receive Only'}
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={processing || quantity < 1 || (autoPrintEnabled && !qzConnected)}>
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Printer className="w-4 h-4 mr-2" />Receive & Print</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

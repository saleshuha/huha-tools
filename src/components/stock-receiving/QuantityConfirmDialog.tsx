import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Package, Printer, Hash, Plus } from 'lucide-react';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ImagePreview } from './ImagePreview';
import { cn } from '@/lib/utils';

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
  const [maxQuantity, setMaxQuantity] = useState<number>(999);
  const [productImage, setProductImage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSerialNumber(initialSerialNumber || '');
      setAvailablePOs([]);
      setProductImage(item?.image_url || null);
      
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
        // Fetch product image if not provided
        if (!item.image_url && item.asin) {
          supabase
            .from('product_images')
            .select('image_url')
            .eq('asin', item.asin)
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data }) => {
              if (data && data.length > 0) {
                setProductImage(data[0].image_url);
              }
            });
        }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        setLoadingPOs(false);
        return;
      }

      const isInventoryItem = item.type === 'inventory';
      let allPOs: any[] = [];

      const itemMatchConditions: string[] = [];
      if (item.asin) itemMatchConditions.push(`asin.eq.${item.asin}`);
      if (item.sku_code) itemMatchConditions.push(`sku_code.eq.${item.sku_code}`);
      if (item.model_number) itemMatchConditions.push(`model_number.eq.${item.model_number}`);

      if (item.type === 'po_group' && item.po_group) {
        let query = supabase.from('po_orders').select('*')
          .eq('user_id', user.id)
          .in('po_number', item.po_group.po_numbers)
          .in('status', ['pending', 'placed'])
          .eq('country', country);

        if (itemMatchConditions.length > 0) query = query.or(itemMatchConditions.join(','));

        const { data, error } = await query;
        if (error) throw error;
        allPOs = data || [];
      } else if (item.po_numbers && item.po_numbers.length > 0) {
        let query = supabase.from('po_orders').select('*')
          .eq('user_id', user.id)
          .in('po_number', item.po_numbers)
          .in('status', ['pending', 'placed'])
          .eq('country', country);

        if (itemMatchConditions.length > 0) query = query.or(itemMatchConditions.join(','));

        const { data, error } = await query;
        if (error) throw error;
        allPOs = data || [];
      } else {
        // Search by ASIN/SKU/model across all POs
        const filters = [];
        if (item.asin) filters.push(supabase.from('po_orders').select('*').eq('user_id', user.id).eq('asin', item.asin).in('status', ['pending', 'placed']).eq('country', country));
        if (item.sku_code) filters.push(supabase.from('po_orders').select('*').eq('user_id', user.id).eq('sku_code', item.sku_code).in('status', ['pending', 'placed']).eq('country', country));
        if (item.model_number) filters.push(supabase.from('po_orders').select('*').eq('user_id', user.id).eq('model_number', item.model_number).in('status', ['pending', 'placed']).eq('country', country));
        
        if (filters.length > 0) {
          const results = await Promise.all(filters.map(f => f));
          const combinedData = results.flatMap(r => r.data || []);
          allPOs = Array.from(new Map(combinedData.map(po => [po.id, po])).values());
        }
      }

      // Filter out fully printed POs and merge duplicate lines from the same PO
      const pendingPOs: any[] = allPOs.filter((po: any) => po.quantity - (po.printed_quantity || 0) > 0);
      const mergedPOs: any[] = Array.from(
        pendingPOs.reduce((acc, po: any) => {
          const key = po.po_number || po.id;
          const existing = acc.get(key);

          if (!existing) {
            acc.set(key, { ...po });
          } else {
            existing.quantity = (existing.quantity || 0) + (po.quantity || 0);
            existing.printed_quantity = (existing.printed_quantity || 0) + (po.printed_quantity || 0);
            existing.priority = Math.min(existing.priority ?? 999, po.priority ?? 999);
          }

          return acc;
        }, new Map<string, any>()).values()
      ).filter((po: any) => po.quantity - (po.printed_quantity || 0) > 0);

      const sortedPOs: any[] = mergedPOs.sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999));
      setAvailablePOs(sortedPOs);

      const totalPending = sortedPOs.reduce((sum: number, po: any) => {
        return sum + (po.quantity - (po.printed_quantity || 0));
      }, 0);

      // For inventory items with no pending POs, allow unlimited receiving
      if (isInventoryItem && totalPending === 0) {
        setMaxQuantity(999);
      } else if (totalPending > 0) {
        setMaxQuantity(totalPending);
      } else {
        // No POs at all — allow receiving (e.g. new item)
        setMaxQuantity(999);
      }
    } catch (error) {
      console.error('Error loading POs:', error);
      setMaxQuantity(999); // Don't block on error
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
    if (quantity > maxQuantity) {
      toast({
        title: "Quantity Exceeds Available",
        description: `You can only receive up to ${maxQuantity} unit(s) for this item.`,
        variant: "destructive",
      });
      return;
    }

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

  const totalOrdered = availablePOs.reduce((s, po) => s + po.quantity, 0);
  const totalPrinted = availablePOs.reduce((s, po) => s + (po.printed_quantity || 0), 0);
  const totalPending = totalOrdered - totalPrinted;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Confirm Receiving Details</DialogTitle>
        </DialogHeader>

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
            <Alert className="border-emerald/50 bg-emerald/10">
              <AlertDescription className="text-sm text-emerald">
                ✅ QZ Tray Connected - Ready to print
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-accent/30 rounded-xl space-y-3">
            <div className="flex items-start gap-4">
              <ImagePreview
                imageUrl={productImage || undefined}
                alt={item.title || 'Product'}
                size="lg"
                className="shrink-0 rounded-lg"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.asin ? 'ASIN' : item.sku_code ? 'SKU' : 'Model'}
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {item.asin || item.sku_code || item.model_number}
                  </span>
                </div>
                {item.title && <div className="text-sm text-muted-foreground line-clamp-2">{item.title}</div>}
              </div>
            </div>
          </div>

          {loadingPOs && (
            <div className="p-4 bg-accent/30 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading PO details...
              </div>
            </div>
          )}

          {!loadingPOs && item.type === 'inventory' && availablePOs.length === 0 && (
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Receiving to Inventory — no pending POs
                </span>
              </div>
            </div>
          )}

          {!loadingPOs && availablePOs.length > 0 && (
            <div className="space-y-3">
              <div className={cn(
                "p-3 rounded-xl border",
                item.type === 'inventory'
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-primary/5 border-primary/20"
              )}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {item.type === 'inventory'
                      ? `Also found in ${availablePOs.length} pending PO${availablePOs.length !== 1 ? 's' : ''}`
                      : `Found in ${availablePOs.length} PO${availablePOs.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {availablePOs.map((po) => {
                  const pending = po.quantity - (po.printed_quantity || 0);
                  const progress = po.printed_quantity > 0 ? (po.printed_quantity / po.quantity) * 100 : 0;
                  
                  return (
                    <div key={po.id} className="border rounded-xl p-4 bg-card space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-sm font-semibold cursor-pointer hover:bg-primary/20"
                          onClick={() => navigate(`/po-tracker?search=${po.po_number}`)}
                        >
                          📋 PO: {po.po_number}
                        </Badge>
                        {po.priority && po.priority < 6 && (
                          <Badge variant="outline" className="text-xs">Priority {po.priority}</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Ordered</div>
                          <div className="font-bold text-foreground">{po.quantity}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald/10">
                          <div className="text-xs text-emerald">Printed</div>
                          <div className="font-bold text-emerald">{po.printed_quantity || 0}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-warning/10">
                          <div className="text-xs text-warning">Pending</div>
                          <div className="font-bold text-warning">{pending}</div>
                        </div>
                      </div>
                      
                      {po.printed_quantity > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Ordered:</span>
                    <span className="font-bold text-primary">{totalOrdered} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald">✅ Already Printed:</span>
                    <span className="font-semibold text-emerald">{totalPrinted} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-warning">⏳ Still Pending:</span>
                    <span className="font-semibold text-warning">{totalPending} units</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 py-4 border-t bg-background">
          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-semibold">
              Quantity * 
              <span className="text-xs text-muted-foreground ml-2">
                (Max: {maxQuantity})
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input 
                id="quantity" 
                type="number" 
                min="1" 
                max={maxQuantity}
                value={quantity} 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(val, maxQuantity));
                }}
                className="text-lg font-semibold flex-1 h-12 rounded-lg" 
                autoFocus 
              />
              <div className="flex gap-1">
                {[1, 5, 10].map((inc) => (
                  <Button
                    key={inc}
                    variant="outline"
                    size="sm"
                    className="h-12 px-3 rounded-lg font-semibold"
                    onClick={() => setQuantity(prev => Math.min(prev + inc, maxQuantity))}
                    disabled={quantity >= maxQuantity}
                  >
                    <Plus className="w-3 h-3 mr-0.5" />{inc}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {item.type !== 'po' && item.type !== 'po_group' && (
            <div className="space-y-2 p-3 bg-primary/5 rounded-xl border-2 border-primary/20">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                <Label htmlFor="serial" className="font-semibold">Serial Number (Optional)</Label>
              </div>
              <Input id="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Enter serial number" className="font-mono rounded-lg" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border">
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
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={processing || quantity < 1 || quantity > maxQuantity} className="rounded-lg">
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Receive Only'}
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={processing || quantity < 1 || quantity > maxQuantity || (autoPrintEnabled && !qzConnected)} className="rounded-lg">
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Printer className="w-4 h-4 mr-2" />Receive & Print</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

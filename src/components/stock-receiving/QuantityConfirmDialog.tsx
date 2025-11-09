import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import qz from 'qz-tray';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
}

interface QuantityConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  item: SearchResult | null;
  onConfirm: (data: {
    quantity: number;
    serial_number?: string;
    supplier_name?: string;
    notes?: string;
    autoPrint: boolean;
  }) => void;
  processing?: boolean;
}

export function QuantityConfirmDialog({
  open,
  onClose,
  item,
  onConfirm,
  processing = false
}: QuantityConfirmDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [qzConnected, setQzConnected] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSerialNumber('');
      setSupplierName('');
      setNotes('');
      
      // Load auto-print preference from localStorage
      const savedAutoPrint = localStorage.getItem('stock-receiving-auto-print');
      setAutoPrintEnabled(savedAutoPrint === 'true' || savedAutoPrint === null); // Default to true
      
      // Check QZ Tray connection status
      checkQZConnection();
    }
  }, [open]);

  const checkQZConnection = async () => {
    try {
      // First check if already connected
      if (qz.websocket.isActive()) {
        setQzConnected(true);
        return;
      }
      
      // If not connected, try to connect
      const { QZConnectionManager } = await import('@/utils/qz-connection-manager');
      const qzManager = QZConnectionManager.getInstance();
      await qzManager.connect();
      
      // Check status after connection attempt
      const isConnected = qz.websocket.isActive();
      setQzConnected(isConnected);
    } catch (error) {
      console.error('QZ Tray connection check failed:', error);
      setQzConnected(false);
    }
  };

  const handleSubmit = (autoPrint: boolean) => {
    // Save auto-print preference
    localStorage.setItem('stock-receiving-auto-print', String(autoPrintEnabled));
    
    onConfirm({
      quantity,
      serial_number: serialNumber || undefined,
      supplier_name: supplierName || undefined,
      notes: notes || undefined,
      autoPrint: autoPrint && autoPrintEnabled
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
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Confirm Receiving Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QZ Tray Status Alert */}
          {!qzConnected && autoPrintEnabled && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                QZ Tray not connected. Please start QZ Tray to enable printing.
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
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label htmlFor="serial">Serial/Bin Number (Optional)</Label>
            <Input
              id="serial"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g., SN123456"
            />
          </div>

          {/* Supplier Name */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier Name (Optional)</Label>
            <Input
              id="supplier"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g., Sunsky"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, AlertCircle } from 'lucide-react';

interface ConsolidatedPO {
  po_number: string;
  quantity: number;
  ship_to_location?: string;
}

interface FulfillFromStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderInfo: {
    asin?: string;
    title?: string;
    po_number: string;
    quantity: number;
    isConsolidated: boolean;
    consolidatedOrders?: ConsolidatedPO[];
  } | null;
  onConfirm: (poNumber: string, quantity: number) => Promise<void>;
  isLoading?: boolean;
}

export function FulfillFromStockDialog({
  open,
  onOpenChange,
  orderInfo,
  onConfirm,
  isLoading = false,
}: FulfillFromStockDialogProps) {
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [step, setStep] = useState<'select-po' | 'enter-quantity'>('select-po');

  // Reset state when dialog opens/closes or orderInfo changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPO('');
      setQuantity('');
      setStep('select-po');
    }
    onOpenChange(newOpen);
  };

  // Initialize based on whether it's consolidated
  const handleDialogOpen = () => {
    if (!orderInfo) return;
    
    if (orderInfo.isConsolidated) {
      setStep('select-po');
      setSelectedPO('');
    } else {
      setStep('enter-quantity');
      setSelectedPO(orderInfo.po_number);
    }
    setQuantity(orderInfo.quantity.toString());
  };

  const handleNext = () => {
    if (step === 'select-po' && selectedPO) {
      const selectedPOData = orderInfo?.consolidatedOrders?.find(po => po.po_number === selectedPO);
      if (selectedPOData) {
        setQuantity(selectedPOData.quantity.toString());
      }
      setStep('enter-quantity');
    }
  };

  const handleBack = () => {
    setStep('select-po');
  };

  const handleConfirm = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return;
    
    await onConfirm(selectedPO, qty);
    handleOpenChange(false);
  };

  if (!orderInfo) return null;

  const maxQuantity = step === 'enter-quantity' && orderInfo.isConsolidated
    ? orderInfo.consolidatedOrders?.find(po => po.po_number === selectedPO)?.quantity || orderInfo.quantity
    : orderInfo.quantity;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      handleOpenChange(newOpen);
      if (newOpen) handleDialogOpen();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Fulfill from Stock
          </DialogTitle>
          <DialogDescription>
            {orderInfo.isConsolidated 
              ? 'Select which PO to fulfill from stock, then enter the quantity'
              : 'Enter the quantity to fulfill from in-stock inventory'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium text-foreground line-clamp-2">
              {orderInfo.title || 'No title available'}
            </div>
            {orderInfo.asin && (
              <Badge variant="outline" className="font-mono text-xs">
                {orderInfo.asin}
              </Badge>
            )}
          </div>

          {/* Step 1: Select PO (for consolidated items) */}
          {orderInfo.isConsolidated && step === 'select-po' && (
            <div className="space-y-3">
              <Label>Select Purchase Order</Label>
              <Select value={selectedPO} onValueChange={setSelectedPO}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a PO to fulfill from..." />
                </SelectTrigger>
                <SelectContent>
                  {orderInfo.consolidatedOrders?.map((po) => (
                    <SelectItem key={po.po_number} value={po.po_number}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="font-mono">{po.po_number}</span>
                        <span className="text-muted-foreground text-xs">
                          {po.quantity} units
                          {po.ship_to_location && ` • ${po.ship_to_location}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <p>
                  This item is merged from {orderInfo.consolidatedOrders?.length} POs. 
                  Select which PO you want to fulfill from your in-stock inventory.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Enter Quantity */}
          {step === 'enter-quantity' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="quantity">Quantity to Fulfill</Label>
                <Badge variant="secondary" className="font-mono">
                  Max: {maxQuantity}
                </Badge>
              </div>
              
              {orderInfo.isConsolidated && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">From PO:</span>
                  <Badge variant="outline" className="font-mono">
                    {selectedPO}
                  </Badge>
                </div>
              )}

              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity..."
                className="font-mono text-lg"
                autoFocus
              />
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-green-50 dark:bg-green-950/30 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <p>
                  This will mark the items as fulfilled from your in-stock inventory and 
                  update the PO status accordingly.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'enter-quantity' && orderInfo.isConsolidated && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
          )}
          
          {step === 'select-po' ? (
            <Button onClick={handleNext} disabled={!selectedPO || isLoading}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading || !quantity || parseInt(quantity) <= 0 || parseInt(quantity) > maxQuantity}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Fulfilling...' : 'Fulfill from Stock'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

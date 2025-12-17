import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Minus, Plus } from 'lucide-react';

interface PrintQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  defaultQuantity?: number;
  onConfirm: (quantity: number) => void;
}

export function PrintQuantityDialog({
  open,
  onOpenChange,
  itemName,
  defaultQuantity = 1,
  onConfirm
}: PrintQuantityDialogProps) {
  const [quantity, setQuantity] = useState(defaultQuantity);

  const handleConfirm = () => {
    if (quantity > 0) {
      onConfirm(quantity);
      onOpenChange(false);
    }
  };

  const incrementQty = () => setQuantity(prev => Math.min(prev + 1, 100));
  const decrementQty = () => setQuantity(prev => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Labels
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Printing label for: <span className="font-mono font-medium text-foreground">{itemName}</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="printQty">Number of labels to print</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={decrementQty}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                id="printQty"
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(val, 1), 100));
                }}
                className="h-10 text-center font-mono text-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={incrementQty}
                disabled={quantity >= 100}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={quantity < 1}>
            <Printer className="w-4 h-4 mr-2" />
            Print {quantity} Label{quantity > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';

interface DisableItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AsinInventoryItem[];
  onConfirm: () => void;
}

export function DisableItemsDialog({ open, onOpenChange, items, onConfirm }: DisableItemsDialogProps) {
  const [understood, setUnderstood] = useState(false);

  const handleConfirm = () => {
    if (understood) {
      onConfirm();
      setUnderstood(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setUnderstood(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Disable Inventory Items?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-4 pt-4">
            <p className="font-semibold text-foreground">
              You are about to disable {items.length} item{items.length > 1 ? 's' : ''}. This will have the following effects:
            </p>
            
            <ul className="list-disc list-inside space-y-2 ml-2 text-muted-foreground">
              <li>Items will be <strong className="text-foreground">hidden from exports</strong></li>
              <li>Items will be <strong className="text-foreground">excluded from restock calculations</strong></li>
              <li>Items will <strong className="text-foreground">not appear in active inventory by default</strong></li>
              <li>Items will <strong className="text-foreground">remain in the database</strong> and can be re-enabled later</li>
            </ul>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 max-h-60 overflow-y-auto">
              <p className="font-semibold mb-3 text-foreground">Items to be disabled:</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-sm p-2 rounded bg-background">
                    <div className="flex-1">
                      <div className="font-mono font-semibold">{item.asin}</div>
                      <div className="text-muted-foreground">
                        Serial: {item.serialNumber}
                        {item.sku && ` • SKU: ${item.sku}`}
                        {item.title && (
                          <div className="truncate text-xs mt-1">{item.title}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 mt-4">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <Label
                htmlFor="understand"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I understand that these items will be disabled and excluded from exports, restock calculations, and other operations
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!understood}
          >
            Disable {items.length} Item{items.length > 1 ? 's' : ''}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

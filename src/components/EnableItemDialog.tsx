import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';

interface EnableItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AsinInventoryItem | null;
  onConfirm: () => void;
}

export function EnableItemDialog({ open, onOpenChange, item, onConfirm }: EnableItemDialogProps) {
  if (!item) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-xl">Enable Inventory Item?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-4 pt-4">
            <p className="font-semibold text-foreground">
              You are about to enable this item. This will:
            </p>
            
            <ul className="list-disc list-inside space-y-2 ml-2 text-muted-foreground">
              <li>Item will be <strong className="text-foreground">included in exports</strong></li>
              <li>Item will be <strong className="text-foreground">included in restock calculations</strong></li>
              <li>Item will <strong className="text-foreground">appear in active inventory</strong></li>
              <li>Item will <strong className="text-foreground">be available for all operations</strong></li>
            </ul>

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <p className="font-semibold mb-2 text-foreground">Item to be enabled:</p>
              <div className="flex items-start gap-2 text-sm p-2 rounded bg-background">
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
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
          >
            Enable Item
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

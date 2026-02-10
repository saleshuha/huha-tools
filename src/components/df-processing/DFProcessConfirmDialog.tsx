import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DFOrderItem } from './types';

interface DFProcessConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DFOrderItem[];
  onConfirm: () => void;
}

export function DFProcessConfirmDialog({ open, onOpenChange, items, onConfirm }: DFProcessConfirmDialogProps) {
  const totalDeduction = items.reduce((sum, i) => sum + i.itemQuantity, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Stock Deduction</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to process {items.length} order{items.length > 1 ? 's' : ''} and deduct {totalDeduction} unit{totalDeduction > 1 ? 's' : ''} from inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[200px] overflow-y-auto space-y-1 text-sm">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
              <span className="font-mono text-xs">{item.orderId}</span>
              <span className="text-muted-foreground text-xs">
                {item.availableQty} → {Math.max(0, (item.availableQty || 0) - item.itemQuantity)}
              </span>
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              ...and {items.length - 10} more
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Process & Deduct Stock
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

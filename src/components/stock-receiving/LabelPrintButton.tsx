import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { LabelPrintDialog } from '@/components/inventory/LabelPrintDialog';

interface LabelPrintButtonProps {
  receivedItems: Array<{
    inventory_id: string;
    asin?: string;
    sku?: string;
    title?: string;
    quantity: number;
    serial_number?: string;
    po_numbers?: string;
    priority?: number;
  }>;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function LabelPrintButton({ receivedItems, disabled, variant = 'outline', size = 'sm' }: LabelPrintButtonProps) {
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  // Convert received items to format expected by LabelPrintDialog
  const printableItems = receivedItems.map(item => ({
    id: item.inventory_id,
    asin: item.asin,
    sku: item.sku,
    title: item.title || item.asin || item.sku || 'Unknown Item',
    quantity: item.quantity,
    po_numbers: item.po_numbers,
    priority: item.priority,
    type: (item.asin && item.sku ? 'mixed' : item.asin ? 'asin' : 'sku') as 'asin' | 'sku' | 'mixed'
  }));

  const inventoryType = printableItems.some(i => i.type === 'mixed') 
    ? 'mixed' 
    : printableItems[0]?.type || 'asin';

  return (
    <>
      <Button
        onClick={() => setShowLabelDialog(true)}
        disabled={disabled || receivedItems.length === 0}
        variant={variant}
        size={size}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Labels ({receivedItems.length})
      </Button>

      <LabelPrintDialog
        open={showLabelDialog}
        onOpenChange={setShowLabelDialog}
        selectedItems={printableItems}
        inventoryType={inventoryType}
      />
    </>
  );
}

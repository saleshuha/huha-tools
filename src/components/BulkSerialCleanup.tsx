import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, Hash, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';
import { supabase } from '@/integrations/supabase/client';

interface BulkSerialCleanupProps {
  inventory: AsinInventoryItem[];
  onComplete: () => void;
}

export function BulkSerialCleanup({ inventory, onComplete }: BulkSerialCleanupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const { toast } = useToast();

  // Find items with 0 stock that have serial numbers
  const zeroStockWithSerials = useMemo(() => {
    return inventory.filter(item => {
      const hasSerial = item.serialNumber && item.serialNumber.trim() !== '' && item.serialNumber !== '-';
      const hasAdditionalSerials = item.additionalSerialNumbers && item.additionalSerialNumbers.length > 0;
      return item.quantity === 0 && (hasSerial || hasAdditionalSerials);
    });
  }, [inventory]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(zeroStockWithSerials.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);
    let successCount = 0;
    let errorCount = 0;

    const selectedItems = zeroStockWithSerials.filter(item => selectedIds.has(item.id));

    for (const item of selectedItems) {
      try {
        // Parse the primary serial number to check if it falls in a category range
        const serialNum = parseInt(item.serialNumber || '0', 10);
        
        // Clear primary serial number
        const { error } = await (supabase as any)
          .from('asin_inventory')
          .update({ 
            serial_number: '', 
            additional_serial_numbers: null 
          })
          .eq('id', item.id);

        if (error) throw error;

        // Decrement items_used in serial_range_directory if serial falls within a range
        if (serialNum > 0) {
          const { data: rangeData } = await (supabase as any)
            .from('serial_range_directory')
            .select('id, items_used')
            .lte('range_start', serialNum)
            .gte('range_end', serialNum)
            .maybeSingle();

          if (rangeData && rangeData.items_used > 0) {
            await (supabase as any)
              .from('serial_range_directory')
              .update({ 
                items_used: rangeData.items_used - 1, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', rangeData.id);
          }
        }

        successCount++;
      } catch (err) {
        console.error('Failed to clear serial for', item.asin, err);
        errorCount++;
      }
      setProcessedCount(prev => prev + 1);
    }

    toast({
      title: "Serial Numbers Cleaned",
      description: `Cleared ${successCount} item(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    setSelectedIds(new Set());
    setIsProcessing(false);
    setProcessedCount(0);
    onComplete();
  };

  const allSelected = zeroStockWithSerials.length > 0 && selectedIds.size === zeroStockWithSerials.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setSelectedIds(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          <span>Clean Serials</span>
          {zeroStockWithSerials.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-destructive/10 text-destructive text-xs">
              {zeroStockWithSerials.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Clean Serial Numbers (0 Stock Items)
          </DialogTitle>
        </DialogHeader>

        {zeroStockWithSerials.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-sm">No items with 0 stock have serial numbers. All clean!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({zeroStockWithSerials.length} items)
                </span>
              </div>
              {selectedIds.size > 0 && (
                <Badge variant="outline">{selectedIds.size} selected</Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-1">
                {zeroStockWithSerials.map(item => {
                  const allSerials = [
                    item.serialNumber,
                    ...(item.additionalSerialNumbers || [])
                  ].filter(s => s && s.trim() !== '');

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleItem(item.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => handleToggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium">{item.asin}</span>
                          {item.sku && (
                            <Badge variant="outline" className="text-xs">{item.sku}</Badge>
                          )}
                        </div>
                        {item.title && (
                          <p className="text-xs text-muted-foreground truncate">{item.title}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {allSerials.map((serial, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-mono gap-1">
                              <Hash className="w-3 h-3" />
                              {serial}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Qty: 0
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-xs">
                This will permanently remove serial numbers from selected items. The serial numbers will be freed up for future inventory use.
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkRemove}
            disabled={selectedIds.size === 0 || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Clearing {processedCount}/{selectedIds.size}...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Remove Serials ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

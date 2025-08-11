import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BulkPOProcessorProps {
  onProcessComplete?: () => void;
}

export function BulkPOProcessor({ onProcessComplete }: BulkPOProcessorProps) {
  const [poNumbers, setPONumbers] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; details: string[] }>({
    success: 0,
    failed: 0,
    details: []
  });
  const { toast } = useToast();

  const processBulkPOs = async () => {
    if (!poNumbers.trim()) {
      toast({
        title: "Error",
        description: "Please enter PO numbers to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResults({ success: 0, failed: 0, details: [] });

    try {
      // Parse PO numbers - support comma, space, or newline separated
      const poList = poNumbers
        .split(/[,\s\n]+/)
        .map(po => po.trim())
        .filter(po => po.length > 0);

      let successCount = 0;
      let failedCount = 0;
      const details: string[] = [];

      for (const poNumber of poList) {
        try {
          // First, mark all delivered orders in this PO as closed
          const { data: deliveredOrders, error: selectError } = await supabase
            .from('po_orders')
            .select('id, status')
            .eq('po_number', poNumber)
            .eq('status', 'delivered');

          if (selectError) throw selectError;

          if (deliveredOrders && deliveredOrders.length > 0) {
            const { error: updateError } = await supabase
              .from('po_orders')
              .update({ status: 'closed' })
              .eq('po_number', poNumber)
              .eq('status', 'delivered');

            if (updateError) throw updateError;

            successCount++;
            details.push(`✓ ${poNumber}: Closed ${deliveredOrders.length} delivered items`);
          } else {
            failedCount++;
            details.push(`⚠ ${poNumber}: No delivered items found`);
          }
        } catch (error) {
          failedCount++;
          details.push(`✗ ${poNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResults({ success: successCount, failed: failedCount, details });

      toast({
        title: "Bulk Processing Complete",
        description: `Successfully processed ${successCount} POs, ${failedCount} failed`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0 && onProcessComplete) {
        onProcessComplete();
      }

      // Close dialog on success
      if (successCount > 0) {
        setTimeout(() => {
          setOpen(false);
          clearResults();
        }, 2000);
      }

    } catch (error) {
      console.error('Bulk processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process PO numbers",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setPONumbers('');
    setResults({ success: 0, failed: 0, details: [] });
  };

  const getPOCount = () => {
    return poNumbers
      .split(/[,\s\n]+/)
      .map(po => po.trim())
      .filter(po => po.length > 0).length;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Package className="h-4 w-4" />
          Bulk Close POs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk PO Processor
          </DialogTitle>
          <DialogDescription>
            Paste PO numbers to mark all delivered items as closed. Supports comma, space, or newline separated values.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">PO Numbers</label>
            <Textarea
              placeholder="Enter PO numbers (e.g., PO-001, PO-002, PO-003 or one per line)"
              value={poNumbers}
              onChange={(e) => setPONumbers(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Only delivered items within these POs will be marked as closed
            </p>
            {poNumbers.trim() && (
              <Badge variant="secondary">
                {getPOCount()} PO{getPOCount() !== 1 ? 's' : ''} to process
              </Badge>
            )}
          </div>

          {/* Results Display */}
          {(results.success > 0 || results.failed > 0) && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {results.success} Success
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {results.failed} Failed
                  </Badge>
                )}
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-1">
                {results.details.map((detail, index) => (
                  <div key={index} className="text-xs font-mono p-2 bg-background rounded">
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={processBulkPOs} 
            disabled={isProcessing || !poNumbers.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Process POs
              </>
            )}
          </Button>
          {(results.success > 0 || results.failed > 0) && (
            <Button variant="outline" onClick={clearResults}>
              Clear
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
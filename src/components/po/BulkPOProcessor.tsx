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

      // Batch process all PO numbers at once for better performance
      try {
        // First, try to find all POs with exact matches in a single query
        const { data: allOrders, error: fetchError } = await supabase
          .from('po_orders')
          .select('id, status, po_number')
          .in('po_number', poList)
          .neq('status', 'closed');

        if (fetchError) {
          console.error('Batch fetch error:', fetchError);
          throw new Error(`Failed to fetch orders: ${fetchError.message}`);
        }

        // Group found orders by PO number
        const foundPOsMap = new Map<string, any[]>();
        (allOrders as any)?.forEach((order: any) => {
          const po = order.po_number;
          if (!foundPOsMap.has(po)) {
            foundPOsMap.set(po, []);
          }
          foundPOsMap.get(po)?.push(order);
        });

        // Track which POs were found
        const processedPOs = new Set<string>();

        // Process exact matches first
        for (const inputPO of poList) {
          const trimmedPO = inputPO.trim();
          
          // Check for exact match
          let foundOrders = foundPOsMap.get(trimmedPO);
          let matchType = "exact";

          if (!foundOrders || foundOrders.length === 0) {
            // Check case-insensitive match
            for (const [dbPO, orders] of foundPOsMap.entries()) {
              if (dbPO.toLowerCase() === trimmedPO.toLowerCase()) {
                foundOrders = orders;
                matchType = "case-insensitive";
                break;
              }
            }
          }

          if (!foundOrders || foundOrders.length === 0) {
            // Check partial match
            for (const [dbPO, orders] of foundPOsMap.entries()) {
              if (dbPO.toLowerCase().includes(trimmedPO.toLowerCase()) || 
                  trimmedPO.toLowerCase().includes(dbPO.toLowerCase())) {
                foundOrders = orders;
                matchType = "partial";
                break;
              }
            }
          }

          if (foundOrders && foundOrders.length > 0) {
            // Get unique PO numbers from found orders
            const foundPONumbers = [...new Set(foundOrders.map(order => order.po_number))];
            processedPOs.add(trimmedPO);
            
            successCount++;
            details.push(`✓ ${trimmedPO}: Found ${foundOrders.length} items (${matchType} match) - POs: ${foundPONumbers.join(', ')}`);
          } else {
            failedCount++;
            details.push(`⚠ ${trimmedPO}: No matching orders found`);
          }
        }

        // Batch close all found orders
        if (allOrders && allOrders.length > 0) {
          const orderIds = allOrders.map(order => order.id);
          
          const { error: updateError } = await supabase
            .from('po_orders')
            .update({ status: 'closed' })
            .in('id', orderIds);

          if (updateError) {
            console.error('Batch update error:', updateError);
            throw new Error(`Failed to close orders: ${updateError.message}`);
          }

          // Update success details
          details.forEach((detail, index) => {
            if (detail.startsWith('✓')) {
              details[index] = detail.replace('Found', 'Closed');
            }
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        console.error('Batch processing error:', error);
        
        // Fall back to individual processing if batch fails
        for (const poNumber of poList) {
          failedCount++;
          details.push(`✗ ${poNumber}: ${errorMessage}`);
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
            Paste PO numbers to close all items in those POs. Supports comma, space, or newline separated values.
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
              All items within these POs will be marked as closed regardless of current status
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
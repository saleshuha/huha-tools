import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkPOProcessorProps {
  onBulkUpdate: (poNumbers: string[]) => Promise<void>;
}

export function BulkPOProcessor({ onBulkUpdate }: BulkPOProcessorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [poNumbers, setPONumbers] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const parsePONumbers = (input: string): string[] => {
    return input
      .split(/[,\n\r\t\s]+/)
      .map(po => po.trim())
      .filter(po => po.length > 0)
      .filter((po, index, array) => array.indexOf(po) === index); // Remove duplicates
  };

  const handleProcess = async () => {
    const poList = parsePONumbers(poNumbers);
    
    if (poList.length === 0) {
      toast({
        title: "No PO Numbers",
        description: "Please enter at least one PO number",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkUpdate(poList);
      setPONumbers('');
      setIsOpen(false);
      toast({
        title: "Success",
        description: `Processed ${poList.length} PO numbers`,
      });
    } catch (error) {
      console.error('Bulk processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process PO numbers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const previewPONumbers = parsePONumbers(poNumbers);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          Bulk Close POs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk PO Processing
          </DialogTitle>
          <DialogDescription>
            Paste PO numbers to mark them as delivered and close them. 
            Separate multiple PO numbers with commas, spaces, or new lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">PO Numbers</label>
            <Textarea
              placeholder="Enter PO numbers here...
Example:
PO001, PO002
PO003
PO004 PO005"
              value={poNumbers}
              onChange={(e) => setPONumbers(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {previewPONumbers.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <Badge variant="secondary">
                  {previewPONumbers.length} PO{previewPONumbers.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="max-h-32 overflow-y-auto bg-muted/50 rounded-md p-2">
                <div className="flex flex-wrap gap-1">
                  {previewPONumbers.map((po, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {po}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <div className="font-medium mb-1">This action will:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Find matching PO numbers</li>
                  <li>• Mark all delivered items as closed</li>
                  <li>• Update order status automatically</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              disabled={previewPONumbers.length === 0 || isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Process {previewPONumbers.length} PO{previewPONumbers.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
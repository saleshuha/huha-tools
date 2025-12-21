import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  sampleData: Record<string, string>[];
  onConfirm: (mapping: { identifierColumn: string; quantityColumn: string; sessionName: string }) => void;
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  headers,
  sampleData,
  onConfirm
}: ColumnMappingDialogProps) {
  const [identifierColumn, setIdentifierColumn] = useState<string>('');
  const [quantityColumn, setQuantityColumn] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>(`Match ${new Date().toLocaleDateString()}`);

  // Auto-detect columns on open
  useEffect(() => {
    if (open && headers.length > 0) {
      // Try to auto-detect identifier column
      const identifierKeywords = ['asin', 'sku', 'product', 'item', 'code', 'id'];
      const foundIdentifier = headers.find(h => 
        identifierKeywords.some(kw => h.toLowerCase().includes(kw))
      );
      if (foundIdentifier) setIdentifierColumn(foundIdentifier);
      else if (headers.length > 0) setIdentifierColumn(headers[0]);

      // Try to auto-detect quantity column
      const qtyKeywords = ['qty', 'quantity', 'amount', 'count', 'units', 'needed', 'required'];
      const foundQty = headers.find(h => 
        qtyKeywords.some(kw => h.toLowerCase().includes(kw))
      );
      if (foundQty) setQuantityColumn(foundQty);
      else if (headers.length > 1) setQuantityColumn(headers[1]);
    }
  }, [open, headers]);

  const handleConfirm = () => {
    if (identifierColumn && quantityColumn && sessionName) {
      onConfirm({ identifierColumn, quantityColumn, sessionName });
    }
  };

  const isValid = identifierColumn && quantityColumn && sessionName.trim();

  // Get sample values for preview
  const getSampleValues = (column: string) => {
    return sampleData.slice(0, 3).map(row => row[column] || '-').join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Map Columns for Matching</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Session Name */}
          <div className="space-y-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter a name for this matching session"
            />
          </div>

          {/* Identifier Column */}
          <div className="space-y-2">
            <Label>Identifier Column (ASIN or SKU) *</Label>
            <Select value={identifierColumn} onValueChange={setIdentifierColumn}>
              <SelectTrigger className={cn(!identifierColumn && 'border-destructive')}>
                <SelectValue placeholder="Select the column containing ASIN or SKU" />
              </SelectTrigger>
              <SelectContent>
                {headers.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {identifierColumn && (
              <p className="text-xs text-muted-foreground">
                Sample: {getSampleValues(identifierColumn)}
              </p>
            )}
          </div>

          {/* Quantity Column */}
          <div className="space-y-2">
            <Label>Quantity Column *</Label>
            <Select value={quantityColumn} onValueChange={setQuantityColumn}>
              <SelectTrigger className={cn(!quantityColumn && 'border-destructive')}>
                <SelectValue placeholder="Select the column containing quantities" />
              </SelectTrigger>
              <SelectContent>
                {headers.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {quantityColumn && (
              <p className="text-xs text-muted-foreground">
                Sample: {getSampleValues(quantityColumn)}
              </p>
            )}
          </div>

          {/* Validation Status */}
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-lg',
            isValid ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'
          )}>
            {isValid ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Ready to run matching on {sampleData.length} items</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Please select both identifier and quantity columns</span>
              </>
            )}
          </div>

          {/* Detection Info */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Auto-detection:</p>
            <p>The system will automatically detect whether your identifier column contains ASINs or SKUs and match against your inventory accordingly.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Run Matching
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ExportSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRows: number;
  onExport: (maxRows?: number) => void;
}

export const ExportSizeDialog = ({ open, onOpenChange, totalRows, onExport }: ExportSizeDialogProps) => {
  const [exportType, setExportType] = useState<'all' | 'limited'>('all');
  const [maxRows, setMaxRows] = useState<number>(10000);

  const handleExport = () => {
    if (exportType === 'all') {
      onExport();
    } else {
      onExport(maxRows);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Total rows to export: {totalRows.toLocaleString()}
            </p>
          </div>

          <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as 'all' | 'limited')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">Export all rows ({totalRows.toLocaleString()})</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="limited" id="limited" />
              <Label htmlFor="limited">Limit export rows</Label>
            </div>
          </RadioGroup>

          {exportType === 'limited' && (
            <div className="space-y-2">
              <Label htmlFor="maxRows">Maximum rows to export</Label>
              <Input
                id="maxRows"
                type="number"
                value={maxRows}
                onChange={(e) => setMaxRows(Number(e.target.value))}
                min={1}
                max={totalRows}
                placeholder="Enter maximum rows"
              />
              <p className="text-xs text-muted-foreground">
                Enter a number between 1 and {totalRows.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export {exportType === 'limited' ? `${maxRows.toLocaleString()} rows` : 'All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
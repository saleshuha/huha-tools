import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface POExportDialogProps {
  onExport: (options: ExportOptions) => void;
  totalItems: number;
  filteredItems: number;
  selectedItems: number;
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  scope: 'all' | 'filtered' | 'selected' | 'current-page';
  includeImages: boolean;
  columns: string[];
}

const AVAILABLE_COLUMNS = [
  { id: 'asin', label: 'ASIN' },
  { id: 'title', label: 'Product Title' },
  { id: 'sku_code', label: 'SKU Code' },
  { id: 'model_number', label: 'Model Number' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'unit_cost', label: 'Unit Cost' },
  { id: 'status', label: 'Status' },
  { id: 'tracking_number', label: 'Tracking Number' },
  { id: 'supplier_order_number', label: 'Supplier Order #' },
  { id: 'inventory_status', label: 'Inventory Status' },
  { id: 'inventory_quantity', label: 'Inventory Quantity' },
];

export function POExportDialog({
  onExport,
  totalItems,
  filteredItems,
  selectedItems,
}: POExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected' | 'current-page'>('filtered');
  const [includeImages, setIncludeImages] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((col) => col.id)
  );

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map((col) => col.id));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleExport = () => {
    onExport({
      format,
      scope,
      includeImages,
      columns: selectedColumns,
    });
    setOpen(false);
  };

  const getScopeLabel = () => {
    if (scope === 'all') return `All ${totalItems} items`;
    if (scope === 'filtered') return `Filtered ${filteredItems} items`;
    if (scope === 'selected') return `Selected ${selectedItems} items`;
    return 'Current page items';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Purchase Order</DialogTitle>
          <DialogDescription>
            Choose export format, scope, and which columns to include
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV (Comma-separated values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Scope Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Export Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  All items ({totalItems})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="cursor-pointer">
                  Filtered items ({filteredItems})
                </Label>
              </div>
              {selectedItems > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected" className="cursor-pointer">
                    Selected items ({selectedItems})
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Columns to Export</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-7 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg max-h-60 overflow-y-auto">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${column.id}`}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => handleColumnToggle(column.id)}
                  />
                  <Label
                    htmlFor={`col-${column.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Additional Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-images"
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
              />
              <Label htmlFor="include-images" className="text-sm cursor-pointer">
                Include product images (as URLs)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export {getScopeLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Settings, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Can't be hidden
}

interface POTableColumnManagerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'checkbox', label: 'Select', visible: true, required: true },
  { id: 'title', label: 'Product Information', visible: true, required: true },
  { id: 'quantity', label: 'Quantity', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'inventory', label: 'Inventory', visible: true },
  { id: 'tracking', label: 'Tracking', visible: true },
  { id: 'actions', label: 'Actions', visible: true, required: true },
];

export function POTableColumnManager({ columns, onColumnsChange }: POTableColumnManagerProps) {
  const [open, setOpen] = useState(false);
  const [localColumns, setLocalColumns] = useState(columns);

  const handleToggle = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId && !col.required ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalColumns(DEFAULT_COLUMNS);
  };

  const handleCancel = () => {
    setLocalColumns(columns);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>
            Show or hide columns in the table. Required columns cannot be hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {localColumns.map((column) => (
              <div key={column.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={column.id}
                    checked={column.visible}
                    onCheckedChange={() => handleToggle(column.id)}
                    disabled={column.required}
                  />
                  <Label
                    htmlFor={column.id}
                    className={`text-sm ${
                      column.required ? 'text-muted-foreground' : 'cursor-pointer'
                    }`}
                  >
                    {column.label}
                    {column.required && (
                      <span className="ml-2 text-xs text-muted-foreground">(Required)</span>
                    )}
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_COLUMNS };

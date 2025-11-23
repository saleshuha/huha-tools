import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Columns3, ChevronDown } from "lucide-react";

interface ColumnVisibilitySelectorProps {
  headers: string[];
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (columns: Set<string>) => void;
}

export function ColumnVisibilitySelector({
  headers,
  visibleColumns,
  onVisibleColumnsChange,
}: ColumnVisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (columnName: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnName)) {
      newVisible.delete(columnName);
    } else {
      newVisible.add(columnName);
    }
    onVisibleColumnsChange(newVisible);
  };

  const handleSelectAll = () => {
    onVisibleColumnsChange(new Set(headers));
  };

  const handleDeselectAll = () => {
    onVisibleColumnsChange(new Set());
  };

  return (
    <Card className="glass-container p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" />
            <span className="font-medium">Column Visibility</span>
            <span className="text-sm text-muted-foreground">
              ({visibleColumns.size} of {headers.length} visible)
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4 space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
            {headers.map((header) => (
              <div key={header} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${header}`}
                  checked={visibleColumns.has(header)}
                  onCheckedChange={() => handleToggle(header)}
                />
                <Label
                  htmlFor={`col-${header}`}
                  className="text-sm cursor-pointer truncate"
                  title={header}
                >
                  {header}
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnSelectorProps {
  headers: string[];
  imageColumnIndex: number;
  titleColumnIndex: number;
  onImageColumnChange: (index: number) => void;
  onTitleColumnChange: (index: number) => void;
  parsedData: Record<string, any>[];
}

export function ColumnSelector({
  headers,
  imageColumnIndex,
  titleColumnIndex,
  onImageColumnChange,
  onTitleColumnChange,
  parsedData,
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="glass-container p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Column Configuration</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="image-column" className="text-sm font-medium">
            Image Column
          </Label>
          <Select
            value={imageColumnIndex.toString()}
            onValueChange={(value) => onImageColumnChange(Number(value))}
          >
            <SelectTrigger id="image-column" className="bg-background">
              <SelectValue placeholder="Select image column" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-[100]">
              <SelectItem value="-1">No Image Column</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the column containing product image URLs
          </p>
          
          {imageColumnIndex >= 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview:</p>
              <div className="flex gap-2 flex-wrap">
                {parsedData
                  .slice(0, 5)
                  .map((row, idx) => {
                    const imageUrl = row[headers[imageColumnIndex]];
                    return imageUrl ? (
                      <img
                        key={idx}
                        src={imageUrl}
                        alt={`Preview ${idx + 1}`}
                        className="h-12 w-12 object-contain rounded border border-border bg-muted"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div key={idx} className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title-column" className="text-sm font-medium">
            Title Column
          </Label>
          <Select
            value={titleColumnIndex.toString()}
            onValueChange={(value) => onTitleColumnChange(Number(value))}
          >
            <SelectTrigger id="title-column" className="bg-background">
              <SelectValue placeholder="Select title column" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-[100]">
              <SelectItem value="-1">No Title Column</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the column to search by product title/name
          </p>
        </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
